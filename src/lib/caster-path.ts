import { computeStandings } from "@/lib/tournament-bracket";
import {
  DRAW_ID,
  entrantById,
  matchById,
  matchEntrantIds,
  viewTournament,
  type BracketMatch,
  type Entrant,
  type SlotId,
  type TournamentState,
} from "@/lib/tournament-types";
import type { GameId } from "@/lib/games";
import type { DeckCard } from "@/lib/decklist";
import type { PlayerSide, SeatId } from "@/lib/desk-types";

export type CasterPlayed = {
  label: string;
  vs: string;
  result: "W" | "L" | "D" | "Bye";
};

export type CasterPath = {
  seed: number;
  dropped: boolean;
  record: string;
  place: number | null;
  matchPoints: number | null;
  omw: number | null;
  played: CasterPlayed[];
  now: { label: string; vs: string } | null;
  winTo: string | null;
  loseTo: string | null;
};

export type HeadToHead = {
  label: string;
  line: string;
  result: "W" | "L" | "D";
};

export function liveMatchForSlot(t: TournamentState, slot: 1 | 2 | 3): BracketMatch | null {
  const id = slot === 2 ? t.streamMatchId2 : slot === 3 ? t.streamMatchId3 : t.streamMatchId;
  return matchById(t, id);
}

/** Submitted lists for this title only (Masters vs Seniors vs Juniors stay separate). */
export function withDivisionDecklists<T extends { name: string; decklist?: DeckCard[] }>(
  players: T[],
  tournament: TournamentState,
  deskGameId: GameId,
  slot: 1 | 2 | 3,
): T[] {
  const book = viewTournament(tournament, deskGameId);
  const live = liveMatchForSlot(book, slot);
  if (live) {
    const ids = matchEntrantIds(live);
    return players.map((player, i) => {
      const list = ids[i] ? (entrantById(book, ids[i])?.decklist ?? []) : [];
      return { ...player, decklist: list };
    });
  }
  return players.map((player) => {
    const name = player.name.trim().toLowerCase();
    if (!name) return { ...player, decklist: [] };
    const hit = book.entrants.find((row) => row.name.trim().toLowerCase() === name);
    return { ...player, decklist: hit?.decklist?.length ? hit.decklist : [] };
  });
}

export function headToHeadFor(
  t: TournamentState,
  ids: string[],
  currentMatchId?: string | null,
): HeadToHead[] {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length < 2) return [];
  const rows: HeadToHead[] = [];
  for (const match of t.matches) {
    if (!match.winnerId || match.id === currentMatchId) continue;
    const inMatch = unique.filter((id) => matchEntrantIds(match).includes(id));
    if (inMatch.length < 2) continue;
    const names = inMatch.map((id) => entrantById(t, id)?.name.trim() || "TBD");
    if (match.winnerId === DRAW_ID) {
      rows.push({ label: match.label, line: names.join(" drew "), result: "D" });
      continue;
    }
    const winner = entrantById(t, match.winnerId)?.name.trim() || "Winner";
    const others = names.filter((n) => n !== winner);
    rows.push({
      label: match.label,
      line: others.length ? `${winner} beat ${others.join(" · ")}` : winner,
      result: "W",
    });
  }
  return rows;
}

function vsLine(t: TournamentState, match: BracketMatch, except: string): string {
  const names = matchEntrantIds(match)
    .filter((id) => id !== except)
    .map((id) => entrantById(t, id)?.name.trim() || "TBD");
  return names.join(" · ") || "TBD";
}

function sideRank(side: BracketMatch["side"]): number {
  if (side === "winners" || side === "swiss") return 0;
  if (side === "losers") return 1;
  return 2;
}

function resultOf(match: BracketMatch, id: string): CasterPlayed["result"] | null {
  if (!match.winnerId) return null;
  if (match.winnerId === DRAW_ID) return "D";
  const ids = matchEntrantIds(match);
  if (match.winnerId === id && ids.length <= 1) return "Bye";
  if (match.winnerId === id) return "W";
  return "L";
}

export function resolveCasterEntrant(
  t: TournamentState,
  player: PlayerSide,
  seat: SeatId,
  live: BracketMatch | null,
): Entrant | null {
  if (live) {
    const slot = live[seat as SlotId];
    const fromMatch = entrantById(t, slot?.entrantId ?? null);
    if (fromMatch) return fromMatch;
  }
  const name = player.name.trim().toLowerCase();
  if (!name) return null;
  const hits = t.entrants.filter((e) => e.name.trim().toLowerCase() === name);
  if (hits.length === 1) return hits[0];
  const tag = player.tag.trim().toLowerCase();
  if (tag) {
    const tagged = hits.find((e) => e.tag.trim().toLowerCase() === tag);
    if (tagged) return tagged;
  }
  return hits[0] ?? null;
}

export function casterPathFor(
  t: TournamentState,
  entrantId: string,
  live: BracketMatch | null,
): CasterPath | null {
  const e = entrantById(t, entrantId);
  if (!e) return null;

  const mine = t.matches
    .filter((m) => matchEntrantIds(m).includes(entrantId))
    .slice()
    .sort((a, b) => sideRank(a.side) - sideRank(b.side) || a.round - b.round || a.position - b.position);

  const played: CasterPlayed[] = [];
  for (const match of mine) {
    if (live && match.id === live.id && !match.winnerId) continue;
    const result = resultOf(match, entrantId);
    if (!result) continue;
    played.push({
      label: match.label,
      vs: vsLine(t, match, entrantId),
      result,
    });
  }

  const current =
    live && matchEntrantIds(live).includes(entrantId)
      ? live
      : (mine.find((m) => !m.winnerId) ?? null);

  const now = current
    ? { label: current.label, vs: vsLine(t, current, entrantId) }
    : null;

  let winTo: string | null = null;
  let loseTo: string | null = null;
  if (current && !current.winnerId && t.bracketType !== "swiss") {
    const winMatch = matchById(t, current.nextWinnerMatchId);
    winTo = winMatch?.label ?? (current.nextWinnerMatchId ? null : "Champion");
    const loseMatch = matchById(t, current.nextLoserMatchId);
    loseTo = loseMatch?.label ?? (current.nextLoserMatchId ? null : "Eliminated");
  }

  const swiss = t.bracketType === "swiss" ? computeStandings(t) : null;
  const row = swiss?.find((s) => s.entrantId === e.id) ?? null;
  const place = row && swiss ? swiss.findIndex((s) => s.entrantId === e.id) + 1 : null;
  const wins = row?.wins ?? played.filter((p) => p.result === "W" || p.result === "Bye").length;
  const losses = row?.losses ?? played.filter((p) => p.result === "L").length;
  const draws = row?.draws ?? played.filter((p) => p.result === "D").length;

  return {
    seed: e.seed,
    dropped: e.dropped,
    record: `${wins}–${losses}–${draws}`,
    place,
    matchPoints: row?.matchPoints ?? null,
    omw: row?.oppMatchWin ?? null,
    played,
    now,
    winTo,
    loseTo,
  };
}
