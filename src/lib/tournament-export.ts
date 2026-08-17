import { extraFieldFor, gameOf, playerIdField } from "@/lib/games";
import { APP_VERSION } from "@/lib/version";
import { computeStandings, type Standing } from "@/lib/tournament-bracket";
import {
  DRAW_ID,
  championOf,
  matchEntrantIds,
  matchSlots,
  staffRoleLabel,
  type BracketMatch,
  type Entrant,
  type TournamentState,
} from "@/lib/tournament-types";
import { countFilledMons } from "@/lib/pokemon-vgc";

export type TournamentExport = {
  exportedAt: string;
  version: string;
  event: {
    name: string;
    gameId: TournamentState["gameId"];
    game: string;
    formatName: string;
    bracketType: TournamentState["bracketType"];
    size: number;
    bestOf: number;
    phase: TournamentState["phase"];
    swissRounds: number;
    champion: string;
  };
  staff: Array<{ name: string; role: string; note: string }>;
  players: Array<
    Entrant & {
      record: string;
      matchPoints: number;
      oppMatchWin: number;
      gamesFor: number;
      gamesAgainst: number;
      teamSize: number;
    }
  >;
  matches: Array<{
    id: string;
    label: string;
    side: string;
    round: number;
    position: number;
    status: "pending" | "complete";
    winner: string;
    players: Array<{ name: string; playerId: string; score: number; seed: number }>;
  }>;
  standings: Array<Standing & { name: string; playerId: string; deck: string; seed: number }>;
};

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function csv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]!);
  return [keys.join(","), ...rows.map((row) => keys.map((key) => csvCell(row[key])).join(","))].join("\n");
}

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "event"
  );
}

function nameOf(t: TournamentState, id: string | null): string {
  if (!id) return "";
  if (id === DRAW_ID) return "Draw";
  return t.entrants.find((e) => e.id === id)?.name ?? "";
}

export function recordsFor(t: TournamentState): Standing[] {
  if (t.bracketType === "swiss") return computeStandings(t);
  const rows = new Map<string, Standing>();
  for (const e of t.entrants) {
    rows.set(e.id, {
      entrantId: e.id,
      wins: 0,
      losses: 0,
      draws: 0,
      matchPoints: 0,
      oppMatchWin: 0,
      gamesFor: 0,
      gamesAgainst: 0,
    });
  }
  for (const match of t.matches) {
    const ids = matchEntrantIds(match);
    if (ids.length < 2) continue;
    const scores = new Map(matchSlots(match).map((row) => [row.slot.entrantId, row.slot.score] as const));
    for (const id of ids) {
      const row = rows.get(id);
      if (!row) continue;
      row.gamesFor += scores.get(id) ?? 0;
      row.gamesAgainst += ids.reduce((sum, other) => (other === id ? sum : sum + (scores.get(other) ?? 0)), 0);
    }
    if (!match.winnerId) continue;
    if (match.winnerId === DRAW_ID) {
      for (const id of ids) {
        const row = rows.get(id);
        if (!row) continue;
        row.draws += 1;
        row.matchPoints += 1;
      }
      continue;
    }
    for (const id of ids) {
      const row = rows.get(id);
      if (!row) continue;
      if (match.winnerId === id) {
        row.wins += 1;
        row.matchPoints += 3;
      } else {
        row.losses += 1;
      }
    }
  }
  return [...rows.values()].sort((a, b) => b.matchPoints - a.matchPoints || b.wins - a.wins || a.losses - b.losses);
}

export function buildTournamentExport(t: TournamentState): TournamentExport {
  const records = recordsFor(t);
  const byId = new Map(records.map((row) => [row.entrantId, row]));
  const champ = championOf(t);
  return {
    exportedAt: new Date().toISOString(),
    version: APP_VERSION,
    event: {
      name: t.name,
      gameId: t.gameId,
      game: gameOf(t.gameId).name,
      formatName: t.formatName,
      bracketType: t.bracketType,
      size: t.size,
      bestOf: t.bestOf,
      phase: t.phase,
      swissRounds: t.swissRounds,
      champion: champ?.name ?? "",
    },
    staff: (t.staff ?? []).map((row) => ({
      name: row.name,
      role: staffRoleLabel(row.role),
      note: row.note,
    })),
    players: t.entrants
      .slice()
      .sort((a, b) => a.seed - b.seed)
      .map((e) => {
        const rec = byId.get(e.id);
        return {
          ...e,
          record: rec ? `${rec.wins}-${rec.losses}-${rec.draws}` : "0-0-0",
          matchPoints: rec?.matchPoints ?? 0,
          oppMatchWin: rec?.oppMatchWin ?? 0,
          gamesFor: rec?.gamesFor ?? 0,
          gamesAgainst: rec?.gamesAgainst ?? 0,
          teamSize: countFilledMons(e.team),
        };
      }),
    matches: t.matches.map((match) => serializeMatch(t, match)),
    standings: records.map((row) => {
      const e = t.entrants.find((p) => p.id === row.entrantId);
      return {
        ...row,
        name: e?.name ?? "",
        playerId: e?.playerId ?? "",
        deck: e?.deck ?? "",
        seed: e?.seed ?? 0,
      };
    }),
  };
}

function serializeMatch(t: TournamentState, match: BracketMatch) {
  return {
    id: match.id,
    label: match.label,
    side: match.side,
    round: match.round,
    position: match.position,
    status: match.winnerId ? ("complete" as const) : ("pending" as const),
    winner: nameOf(t, match.winnerId),
    players: matchSlots(match).flatMap((row) => {
      const e = t.entrants.find((p) => p.id === row.slot.entrantId);
      if (!e) return [];
      return [{ name: e.name, playerId: e.playerId, score: row.slot.score, seed: e.seed }];
    }),
  };
}

function download(filename: string, body: string, type: string) {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportTournamentFiles(t: TournamentState) {
  const data = buildTournamentExport(t);
  const game = gameOf(t.gameId);
  const extra = extraFieldFor(t.gameId, t.formatName);
  const idField = playerIdField(t.gameId);
  const stamp = new Date().toISOString().slice(0, 10);
  const base = `rok-desk-${slug(game.short)}-${slug(t.name || "tournament")}-${stamp}`;

  download(`${base}.json`, JSON.stringify(data, null, 2), "application/json");

  if (data.staff.length) {
    download(
      `${base}-staff.csv`,
      csv(
        data.staff.map((row) => ({
          role: row.role,
          name: row.name,
          note: row.note,
        })),
      ),
      "text/csv",
    );
  }

  download(
    `${base}-players.csv`,
    csv(
      data.players.map((p) => ({
        seed: p.seed,
        name: p.name,
        handle: p.tag,
        player_id: p.playerId,
        player_id_type: idField.label,
        deck: p.deck,
        extra: p.extra,
        extra_label: extra.label,
        country: p.country,
        pronouns: p.pronouns,
        dropped: p.dropped ? "yes" : "",
        record: p.record,
        match_points: p.matchPoints,
        games_for: p.gamesFor,
        games_against: p.gamesAgainst,
        trainer_name: p.trainerName,
        switch_profile: p.switchProfile,
        age_division: p.ageDivision,
        birth_date: p.birthDate,
        team_size: p.teamSize,
      })),
    ),
    "text/csv",
  );

  download(
    `${base}-matches.csv`,
    csv(
      data.matches.map((m) => ({
        match: m.label,
        side: m.side,
        round: m.round,
        status: m.status,
        winner: m.winner,
        p1: m.players[0]?.name ?? "",
        p1_id: m.players[0]?.playerId ?? "",
        p1_score: m.players[0]?.score ?? "",
        p2: m.players[1]?.name ?? "",
        p2_id: m.players[1]?.playerId ?? "",
        p2_score: m.players[1]?.score ?? "",
        p3: m.players[2]?.name ?? "",
        p3_score: m.players[2]?.score ?? "",
        p4: m.players[3]?.name ?? "",
        p4_score: m.players[3]?.score ?? "",
      })),
    ),
    "text/csv",
  );

  download(
    `${base}-standings.csv`,
    csv(
      data.standings.map((row, i) => ({
        place: i + 1,
        name: row.name,
        player_id: row.playerId,
        seed: row.seed,
        deck: row.deck,
        wins: row.wins,
        losses: row.losses,
        draws: row.draws,
        match_points: row.matchPoints,
        omw: row.oppMatchWin,
        games_for: row.gamesFor,
        games_against: row.gamesAgainst,
      })),
    ),
    "text/csv",
  );

  if (t.gameId === "pokemon-vgc") {
    const teamRows = data.players.flatMap((p) =>
      p.team.map((mon, i) => ({
        player: p.name,
        player_id: p.playerId,
        slot: i + 1,
        species: mon.species,
        tera: mon.tera,
        ability: mon.ability,
        item: mon.item,
        move_1: mon.moves[0]?.name ?? "",
        move_2: mon.moves[1]?.name ?? "",
        move_3: mon.moves[2]?.name ?? "",
        move_4: mon.moves[3]?.name ?? "",
      })),
    );
    if (teamRows.some((row) => row.species)) {
      download(`${base}-teams.csv`, csv(teamRows), "text/csv");
    }
  }
}
