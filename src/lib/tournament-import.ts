import { coerceDeskGameId } from "@/lib/games";
import {
  DRAW_ID,
  STAFF_ROLES,
  blankEntrant,
  blankStaff,
  clampBracketSize,
  clampCutSize,
  defaultTournament,
  emptySlot,
  parseTournament,
  snapshotDesk,
  type BracketMatch,
  type BracketSide,
  type BracketType,
  type Entrant,
  type SlotId,
  type StaffRole,
  type TournamentPhase,
  type TournamentState,
} from "@/lib/tournament-types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function num(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function lookLikeState(value: unknown): boolean {
  const row = asRecord(value);
  if (!row) return false;
  return typeof row.gameId === "string" && Array.isArray(row.entrants);
}

export function parseImportedTournament(raw: unknown): TournamentState | null {
  const data = typeof raw === "string" ? safeJson(raw) : raw;
  const row = asRecord(data);
  if (!row) return null;
  for (const nested of [row.state, row.tournament, row.desk]) {
    if (lookLikeState(nested)) {
      const parsed = parseTournament(nested);
      if (parsed) return parsed;
    }
  }
  if (lookLikeState(row)) {
    const parsed = parseTournament(row);
    if (parsed) return parsed;
  }
  return reconstructFromExport(row);
}

function reconstructFromExport(row: Record<string, unknown>): TournamentState | null {
  const event = asRecord(row.event);
  const players = asList(row.players);
  if (!event || players.length === 0 && asList(row.matches).length === 0 && !text(event.name)) return null;
  const base = defaultTournament();
  const gameId = coerceDeskGameId(event.gameId, event.formatName, base.gameId);
  const bracketType: BracketType =
    event.bracketType === "double" || event.bracketType === "swiss" ? event.bracketType : "single";
  const phase: TournamentPhase =
    event.phase === "complete" || event.phase === "running" ? event.phase : players.length ? "running" : "setup";
  const cutType = event.cutType === "double" ? "double" : "single";
  const entrants = players.map((item, i) => playerFromExport(item, i));
  const byId = new Map(entrants.map((e) => [e.id, e]));
  const byName = new Map<string, Entrant>();
  for (const e of entrants) {
    const key = e.name.trim().toLowerCase();
    if (key && !byName.has(key)) byName.set(key, e);
  }
  const matches = asList(row.matches).map((item, i) => matchFromExport(item, i, byId, byName));
  const staff = asList(row.staff).map((item) => staffFromExport(item));
  const bestOf = event.bestOf === 3 || event.bestOf === 5 || event.bestOf === 7 ? event.bestOf : 1;
  const imported: TournamentState = {
    ...base,
    name: text(event.name),
    streamChannel: text(event.streamChannel ?? event.stream_channel),
    gameId,
    formatName: text(event.formatName) || base.formatName,
    bracketType,
    size: clampBracketSize(num(event.size, Math.max(entrants.length, 2))),
    bestOf,
    phase,
    overlayView: bracketType === "swiss" ? "standings" : "full",
    swissRounds: Math.max(1, num(event.swissRounds, 3)),
    cutSize: clampCutSize(num(event.cutSize, 0)),
    cutType,
    entrants,
    matches,
    staff,
    streamMatchId: null,
    streamMatchId2: null,
    streamMatchId3: null,
    timerRunning: false,
    timerEndsAt: null,
    testMode: Boolean(row.testMode),
  };
  return {
    ...imported,
    desks: { [gameId]: snapshotDesk(imported) },
  };
}

function playerFromExport(item: unknown, index: number): Entrant {
  const p = asRecord(item) ?? {};
  return blankEntrant({
    id: text(p.id) || undefined,
    name: text(p.name),
    tag: text(p.tag ?? p.handle),
    pronouns: text(p.pronouns),
    country: text(p.country) || "US",
    deck: text(p.deck),
    extra: text(p.extra),
    seed: num(p.seed, index + 1),
    dropped: p.dropped === true || p.dropped === "yes",
    playerId: text(p.playerId ?? p.player_id),
    trainerName: text(p.trainerName ?? p.trainer_name),
    switchProfile: text(p.switchProfile ?? p.switch_profile),
    ageDivision: p.ageDivision === "juniors" || p.ageDivision === "seniors" || p.ageDivision === "masters" ? p.ageDivision : "",
    birthDate: text(p.birthDate ?? p.birth_date),
    ink1: text(p.ink1 ?? p.ink_1),
    ink2: text(p.ink2 ?? p.ink_2),
    photoUrl: text(p.photoUrl ?? p.photo_url),
    note: text(p.note),
    judgeNote: text(p.judgeNote ?? p.judge_notes),
    team: Array.isArray(p.team) ? p.team : undefined,
    decklist: Array.isArray(p.decklist) ? p.decklist : undefined,
  });
}

function staffFromExport(item: unknown) {
  const row = asRecord(item) ?? {};
  const roleText = text(row.role);
  const role =
    (STAFF_ROLES.find((r) => r.id === roleText || r.label === roleText)?.id as StaffRole | undefined) ?? "staff";
  return blankStaff({
    name: text(row.name),
    role,
    note: text(row.note),
  });
}

function matchFromExport(
  item: unknown,
  index: number,
  byId: Map<string, Entrant>,
  byName: Map<string, Entrant>,
): BracketMatch {
  const row = asRecord(item) ?? {};
  const side: BracketSide =
    row.side === "losers" || row.side === "grand" || row.side === "swiss" ? row.side : "winners";
  const seats = asList(row.players).map((seat) => asRecord(seat) ?? {});
  const slotOf = (id: SlotId, fallbackIndex: number) => {
    const found = seats.find((seat) => seat.slot === id) ?? seats[fallbackIndex];
    const player = resolvePlayer(found, byId, byName);
    return { entrantId: player?.id ?? null, score: num(found?.score, 0) };
  };
  const winnerName = text(row.winner);
  const winner =
    winnerName.toLowerCase() === "draw"
      ? DRAW_ID
      : resolvePlayer({ name: winnerName, playerId: "" }, byId, byName)?.id ?? null;
  return {
    id: text(row.id) || `import-${index}`,
    round: num(row.round, 1),
    position: num(row.position, index),
    side,
    p1: slotOf("p1", 0),
    p2: slotOf("p2", 1),
    p3: seats.length > 2 ? slotOf("p3", 2) : emptySlot(),
    p4: seats.length > 3 ? slotOf("p4", 3) : emptySlot(),
    winnerId: winner,
    nextWinnerMatchId: text(row.nextWinner || row.next_winner) || null,
    nextWinnerSlot: num(row.position, index) % 2 === 0 ? "p1" : "p2",
    nextLoserMatchId: text(row.nextLoser || row.next_loser) || null,
    nextLoserSlot: null,
    label: text(row.label || row.match) || `Match ${index + 1}`,
  };
}

function resolvePlayer(
  seat: Record<string, unknown> | undefined,
  byId: Map<string, Entrant>,
  byName: Map<string, Entrant>,
): Entrant | undefined {
  if (!seat) return undefined;
  const id = text(seat.id);
  if (id && byId.has(id)) return byId.get(id);
  const name = text(seat.name).trim().toLowerCase();
  if (name && byName.has(name)) return byName.get(name);
  const playerId = text(seat.playerId ?? seat.player_id);
  if (playerId) {
    for (const e of byId.values()) {
      if (e.playerId && e.playerId === playerId) return e;
    }
  }
  return undefined;
}

function safeJson(textValue: string): unknown {
  try {
    return JSON.parse(textValue) as unknown;
  } catch {
    return null;
  }
}

export async function readTournamentFile(file: File): Promise<TournamentState> {
  const textValue = await file.text();
  const parsed = parseImportedTournament(textValue);
  if (!parsed) throw new Error("This file is not a ROK Desk tournament JSON.");
  return parsed;
}
