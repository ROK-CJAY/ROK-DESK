import { extraFieldFor, GAME_IDS, gameOf, playerIdField, slugOf } from "@/lib/games";
import { APP_VERSION } from "@/lib/version";
import { computeStandings, eventChampion, topCutStarted, type Standing } from "@/lib/tournament-bracket";
import {
  DRAW_ID,
  matchEntrantIds,
  matchSlots,
  staffRoleLabel,
  viewTournament,
  type BracketMatch,
  type Entrant,
  type TournamentState,
} from "@/lib/tournament-types";
import { countFilledMons } from "@/lib/pokemon-vgc";
import { decklistCount } from "@/lib/decklist";
import { withDeskJudgeNotes } from "@/lib/judge-notes-sync";
import type { DeskState } from "@/lib/desk-types";
import { zipStore } from "@/lib/zip-store";
import { tournamentLooksLikeTest } from "@/lib/test-fixtures";

export type TournamentExport = {
  exportedAt: string;
  version: string;
  testMode: boolean;
  event: {
    name: string;
    streamChannel: string;
    gameId: TournamentState["gameId"];
    game: string;
    formatName: string;
    bracketType: TournamentState["bracketType"];
    size: number;
    bestOf: number;
    phase: TournamentState["phase"];
    swissRounds: number;
    cutSize: number;
    cutType: string;
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
    players: Array<{ name: string; playerId: string; score: number; seed: number; slot: string }>;
    nextWinner: string;
    nextLoser: string;
  }>;
  standings: Array<Standing & { name: string; playerId: string; deck: string; seed: number }>;
  judgeNotes: Array<{ name: string; playerId: string; seed: number; note: string }>;
  state?: TournamentState;
};

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function csv(rows: Array<Record<string, unknown>>, columns?: string[]): string {
  const keys = columns ?? (rows[0] ? Object.keys(rows[0]) : []);
  if (!keys.length) return "";
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

function moveName(mon: { moves?: Array<string | { name?: string } | undefined> }, index: number): string {
  const slot = mon.moves?.[index];
  if (!slot) return "";
  return typeof slot === "string" ? slot : (slot.name ?? "");
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
  const champ = eventChampion(t);
  return {
    exportedAt: new Date().toISOString(),
    version: APP_VERSION,
    testMode: tournamentLooksLikeTest(t),
    event: {
      name: t.name,
      streamChannel: t.streamChannel ?? "",
      gameId: t.gameId,
      game: gameOf(t.gameId).name,
      formatName: t.formatName,
      bracketType: t.bracketType,
      size: t.size,
      bestOf: t.bestOf,
      phase: t.phase,
      swissRounds: t.swissRounds,
      cutSize: t.cutSize ?? 0,
      cutType: t.cutSize ? t.cutType ?? "single" : "none",
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
    judgeNotes: t.entrants
      .filter((e) => e.judgeNote?.trim())
      .sort((a, b) => a.seed - b.seed)
      .map((e) => ({
        name: e.name,
        playerId: e.playerId,
        seed: e.seed,
        note: e.judgeNote.trim(),
      })),
    state: t,
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
      return [{ name: e.name, playerId: e.playerId, score: row.slot.score, seed: e.seed, slot: row.id }];
    }),
    nextWinner: match.nextWinnerMatchId ?? "",
    nextLoser: match.nextLoserMatchId ?? "",
  };
}

export function exportFileBase(t: TournamentState): string {
  const game = gameOf(t.gameId);
  const stamp = new Date().toISOString().slice(0, 10);
  const tag = tournamentLooksLikeTest(t) ? "test-" : "";
  return `rok-desk-${slug(game.short)}-${tag}${slug(t.name || "tournament")}-${stamp}`;
}

const EVENT_COLUMNS = [
  "game",
  "game_id",
  "name",
  "stream_channel",
  "format",
  "bracket",
  "size",
  "best_of",
  "phase",
  "swiss_rounds",
  "cut_size",
  "cut_type",
  "cut_started",
  "champion",
  "players",
  "matches",
  "require_decklist",
  "test_mode",
  "exported_at",
  "version",
] as const;

const PLAYER_COLUMNS = [
  "id",
  "seed",
  "name",
  "handle",
  "player_id",
  "player_id_type",
  "deck",
  "extra",
  "extra_label",
  "country",
  "pronouns",
  "dropped",
  "record",
  "match_points",
  "omw",
  "games_for",
  "games_against",
  "trainer_name",
  "switch_profile",
  "age_division",
  "birth_date",
  "ink_1",
  "ink_2",
  "photo_url",
  "team_size",
  "decklist_cards",
  "note",
  "judge_notes",
] as const;

const MATCH_COLUMNS = [
  "id",
  "match",
  "side",
  "round",
  "position",
  "status",
  "winner",
  "p1",
  "p1_id",
  "p1_seed",
  "p1_score",
  "p2",
  "p2_id",
  "p2_seed",
  "p2_score",
  "p3",
  "p3_id",
  "p3_seed",
  "p3_score",
  "p4",
  "p4_id",
  "p4_seed",
  "p4_score",
  "next_winner",
  "next_loser",
] as const;

const STANDING_COLUMNS = [
  "place",
  "name",
  "player_id",
  "seed",
  "deck",
  "wins",
  "losses",
  "draws",
  "match_points",
  "omw",
  "games_for",
  "games_against",
] as const;

const TEAM_COLUMNS = [
  "player",
  "player_id",
  "slot",
  "species",
  "dex",
  "tera",
  "ability",
  "item",
  "move_1",
  "move_2",
  "move_3",
  "move_4",
  "level",
  "nature",
  "hp",
  "atk",
  "def",
  "spa",
  "spd",
  "spe",
  "type_1",
  "type_2",
] as const;

function seat(m: TournamentExport["matches"][number], index: number) {
  return m.players[index];
}

function eventRow(t: TournamentState, data: TournamentExport): Record<string, unknown> {
  return {
    game: data.event.game,
    game_id: data.event.gameId,
    name: data.event.name,
    stream_channel: data.event.streamChannel,
    format: data.event.formatName,
    bracket: data.event.bracketType,
    size: data.event.size,
    best_of: data.event.bestOf,
    phase: data.event.phase,
    swiss_rounds: data.event.swissRounds,
    cut_size: data.event.cutSize,
    cut_type: data.event.cutType,
    cut_started: topCutStarted(t) ? "yes" : "",
    champion: data.event.champion,
    players: t.entrants.length,
    matches: t.matches.length,
    require_decklist: t.requireDecklist ? "yes" : "",
    test_mode: data.testMode ? "yes" : "",
    exported_at: data.exportedAt,
    version: data.version,
  };
}

function filesForGame(t: TournamentState, prefix = ""): Array<{ name: string; body: string }> {
  const data = buildTournamentExport(t);
  const extra = extraFieldFor(t.gameId, t.formatName);
  const idField = playerIdField(t.gameId);
  const p = prefix ? `${prefix}/` : "";
  const files: Array<{ name: string; body: string }> = [
    { name: `${p}tournament.json`, body: JSON.stringify(data, null, 2) },
    { name: `${p}event.csv`, body: csv([eventRow(t, data)], [...EVENT_COLUMNS]) },
    {
      name: `${p}players.csv`,
      body: csv(
        data.players.map((player) => ({
          id: player.id,
          seed: player.seed,
          name: player.name,
          handle: player.tag,
          player_id: player.playerId,
          player_id_type: idField.label,
          deck: player.deck,
          extra: player.extra,
          extra_label: extra.label,
          country: player.country,
          pronouns: player.pronouns,
          dropped: player.dropped ? "yes" : "",
          record: player.record,
          match_points: player.matchPoints,
          omw: Number((player.oppMatchWin ?? 0).toFixed(4)),
          games_for: player.gamesFor,
          games_against: player.gamesAgainst,
          trainer_name: player.trainerName,
          switch_profile: player.switchProfile,
          age_division: player.ageDivision,
          birth_date: player.birthDate,
          ink_1: player.ink1,
          ink_2: player.ink2,
          photo_url: player.photoUrl,
          team_size: player.teamSize,
          decklist_cards: decklistCount(player.decklist),
          note: player.note,
          judge_notes: player.judgeNote,
        })),
        [...PLAYER_COLUMNS],
      ),
    },
    {
      name: `${p}matches.csv`,
      body: csv(
        data.matches.map((m) => ({
          id: m.id,
          match: m.label,
          side: m.side,
          round: m.round,
          position: m.position,
          status: m.status,
          winner: m.winner,
          p1: seat(m, 0)?.name ?? "",
          p1_id: seat(m, 0)?.playerId ?? "",
          p1_seed: seat(m, 0)?.seed ?? "",
          p1_score: seat(m, 0)?.score ?? "",
          p2: seat(m, 1)?.name ?? "",
          p2_id: seat(m, 1)?.playerId ?? "",
          p2_seed: seat(m, 1)?.seed ?? "",
          p2_score: seat(m, 1)?.score ?? "",
          p3: seat(m, 2)?.name ?? "",
          p3_id: seat(m, 2)?.playerId ?? "",
          p3_seed: seat(m, 2)?.seed ?? "",
          p3_score: seat(m, 2)?.score ?? "",
          p4: seat(m, 3)?.name ?? "",
          p4_id: seat(m, 3)?.playerId ?? "",
          p4_seed: seat(m, 3)?.seed ?? "",
          p4_score: seat(m, 3)?.score ?? "",
          next_winner: m.nextWinner,
          next_loser: m.nextLoser,
        })),
        [...MATCH_COLUMNS],
      ),
    },
    {
      name: `${p}standings.csv`,
      body: csv(
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
          omw: Number(row.oppMatchWin.toFixed(4)),
          games_for: row.gamesFor,
          games_against: row.gamesAgainst,
        })),
        [...STANDING_COLUMNS],
      ),
    },
    {
      name: `${p}staff.csv`,
      body: csv(
        data.staff.map((row) => ({ role: row.role, name: row.name, note: row.note })),
        ["role", "name", "note"],
      ),
    },
    {
      name: `${p}decklists.csv`,
      body: csv(
        data.players.flatMap((player) =>
          (player.decklist ?? []).map((card) => ({
            player: player.name,
            player_id: player.playerId,
            seed: player.seed,
            qty: card.qty,
            name: card.name,
            set: card.set,
            number: card.number,
            type: card.type,
            card_id: card.id,
          })),
        ),
        ["player", "player_id", "seed", "qty", "name", "set", "number", "type", "card_id"],
      ),
    },
    {
      name: `${p}judge-notes.csv`,
      body: csv(
        data.players.map((player) => ({
          seed: player.seed,
          name: player.name,
          player_id: player.playerId,
          judge_notes: player.judgeNote ?? "",
        })),
        ["seed", "name", "player_id", "judge_notes"],
      ),
    },
  ];
  if (t.gameId === "pokemon-vgc") {
    files.push({
      name: `${p}teams.csv`,
      body: csv(
        data.players.flatMap((player) =>
          (player.team ?? []).map((mon, i) => ({
            player: player.name,
            player_id: player.playerId,
            slot: i + 1,
            species: mon.species,
            dex: mon.dex || "",
            tera: mon.tera,
            ability: mon.ability,
            item: mon.item,
            move_1: moveName(mon, 0),
            move_2: moveName(mon, 1),
            move_3: moveName(mon, 2),
            move_4: moveName(mon, 3),
            level: mon.level,
            nature: mon.nature,
            hp: mon.hp,
            atk: mon.atk,
            def: mon.def,
            spa: mon.spa,
            spd: mon.spd,
            spe: mon.spe,
            type_1: mon.types?.[0] ?? "",
            type_2: mon.types?.[1] ?? "",
          })),
        ),
        [...TEAM_COLUMNS],
      ),
    });
  }
  return files;
}

function gameHasArchive(t: TournamentState): boolean {
  return Boolean(t.name.trim() || t.entrants.length || t.matches.length || (t.staff ?? []).length);
}

export function tournamentExportFiles(t: TournamentState, desk?: DeskState | null): Array<{ name: string; body: string }> {
  const live = withDeskJudgeNotes(t, desk);
  const files = filesForGame(live);
  const others = GAME_IDS.filter((id) => id !== live.gameId)
    .map((id) => viewTournament(t, id))
    .filter(gameHasArchive);
  if (others.length) {
    files.unshift({
      name: "games.csv",
      body: csv(
        [live, ...others].map((row) => eventRow(row, buildTournamentExport(row))),
        [...EVENT_COLUMNS],
      ),
    });
    for (const game of others) {
      files.push(...filesForGame(game, slugOf(game.gameId)));
    }
  }
  return files;
}

export function tournamentExportZip(t: TournamentState, desk?: DeskState | null): { filename: string; blob: Blob } {
  const live = withDeskJudgeNotes(t, desk);
  const base = exportFileBase(live);
  return { filename: `${base}.zip`, blob: zipStore(tournamentExportFiles(live, desk)) };
}

export async function exportTournamentFiles(t: TournamentState, desk?: DeskState | null): Promise<string> {
  const { filename, blob } = tournamentExportZip(t, desk);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  return filename;
}
