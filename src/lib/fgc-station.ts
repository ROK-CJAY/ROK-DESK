import { stageIconUrl } from "@/lib/fgc-assets";
import { loadFgcState } from "@/lib/fgc-program-state";
import { blankRuleset, libraryFor, type FgcRuleset, type FgcState } from "@/lib/fgc-types";
import { getSql } from "@/lib/db";
import { beginToSet, callToSet, loadToBoard, matchStageId, reportToSet, stagesForSet, type ToBoard, type ToSet } from "@/lib/startgg-to";
import { refreshStartggLogin } from "@/lib/startgg-oauth";

const LIVE = "to-live";
const BOARD = "to-board";
const BOARD_MS = 8000;

type ToLive = { slug: string; token: string; refreshToken: string; expiresAt: number };

export type StationView = {
  station: { id: string; name: string } | null;
  set: {
    id: string;
    phase: string;
    round: string;
    bestOf: number;
    p1: { id: string; name: string };
    p2: { id: string; name: string };
  } | null;
  ruleset: FgcRuleset | null;
  art: Record<string, string>;
  fallback: boolean;
};

let boardCache: { key: string; at: number; board: ToBoard } | null = null;

async function table() {
  const sql = await getSql();
  await sql.query(`
    create table if not exists fgc_state (
      id text primary key,
      payload text not null,
      updated_at timestamptz default CURRENT_TIMESTAMP not null
    )
  `);
  return sql;
}

async function readLive(): Promise<ToLive | null> {
  const sql = await table();
  const rows = await sql<{ payload: string }>`select payload from fgc_state where id = ${LIVE}`;
  if (!rows[0]) return null;
  try {
    const live = JSON.parse(rows[0].payload) as ToLive;
    return live.token && live.slug ? live : null;
  } catch {
    return null;
  }
}

async function writeLive(live: ToLive | null) {
  const sql = await table();
  if (!live) {
    await sql`delete from fgc_state where id = ${LIVE}`;
    boardCache = null;
    return;
  }
  const payload = JSON.stringify(live);
  await sql`
    insert into fgc_state (id, payload, updated_at)
    values (${LIVE}, ${payload}, CURRENT_TIMESTAMP)
    on conflict (id) do update set payload = ${payload}, updated_at = CURRENT_TIMESTAMP
  `;
}

export async function bindLive(slug: string, token: string, refreshToken: string, expiresAt: number) {
  const next = slug.trim();
  const access = token.trim();
  if (!next || !access) throw new Error("Open an event on the tournament desk first.");
  await writeLive({ slug: next, token: access, refreshToken: refreshToken.trim(), expiresAt: expiresAt || Date.now() + 3600_000 });
}

export async function clearLive() {
  await writeLive(null);
  const sql = await table();
  await sql`delete from fgc_state where id = ${BOARD}`;
}

async function session(requestUrl: string): Promise<ToLive> {
  const live = await readLive();
  if (!live) throw new Error("Open the event on the tournament desk first. This tablet uses that login.");
  if (!live.refreshToken || !live.expiresAt || live.expiresAt > Date.now() + 60_000) return live;
  try {
    const next = await refreshStartggLogin(requestUrl, live.refreshToken);
    const saved = { ...live, token: next.accessToken, refreshToken: next.refreshToken || live.refreshToken, expiresAt: next.expiresAt };
    await writeLive(saved);
    return saved;
  } catch {
    return live;
  }
}

async function boardOf(live: ToLive): Promise<ToBoard> {
  const key = `${live.slug}:${live.expiresAt}`;
  if (boardCache && boardCache.key === key && Date.now() - boardCache.at < BOARD_MS) return boardCache.board;
  const sql = await table();
  const rows = await sql<{ payload: string }>`select payload from fgc_state where id = ${BOARD}`;
  if (rows[0]) {
    try {
      const saved = JSON.parse(rows[0].payload) as { at: number; slug: string; board: ToBoard };
      if (saved.slug === live.slug && Date.now() - saved.at < BOARD_MS) {
        boardCache = { key, at: saved.at, board: saved.board };
        return saved.board;
      }
    } catch {
      // A bad cache row is replaced by the next fetch.
    }
  }
  const board = await loadToBoard(live.token, live.slug);
  const at = Date.now();
  boardCache = { key, at, board };
  const payload = JSON.stringify({ at, slug: live.slug, board });
  await sql`
    insert into fgc_state (id, payload, updated_at)
    values (${BOARD}, ${payload}, CURRENT_TIMESTAMP)
    on conflict (id) do update set payload = ${payload}, updated_at = CURRENT_TIMESTAMP
  `;
  return board;
}

function setOnStation(sets: ToSet[], stationId: string, streamId = "") {
  const rows = sets.filter((set) => set.state !== 3 && !set.winnerId && (set.stationId === stationId || (streamId && set.streamId === streamId)));
  return rows.find((set) => set.state === 6) ?? rows.find((set) => set.state === 2) ?? rows[0] ?? null;
}

function strikeRuleset(fgc: FgcState, stageNames: string[]): { ruleset: FgcRuleset | null; fallback: boolean } {
  const active = fgc.rulesets.find((item) => item.id === fgc.activeRulesetId) ?? fgc.rulesets[0] ?? null;
  if (active && (active.neutralStages.length || active.counterpickStages.length)) return { ruleset: active, fallback: false };
  if (!stageNames.length) return { ruleset: null, fallback: false };
  return {
    ruleset: { ...blankRuleset(), id: "event-stages", name: "Event stages", neutralStages: stageNames, strikeOrder: [1, 2, 1], banCount: 1 },
    fallback: true,
  };
}

function stageArt(fgc: FgcState, names: string[]) {
  const library = libraryFor(fgc);
  const art: Record<string, string> = {};
  if (!library) return art;
  for (const name of names) {
    const stage = library.stages.find((item) => item.name.localeCompare(name, undefined, { sensitivity: "base" }) === 0);
    if (stage) art[name] = stageIconUrl(fgc.assetBase, library.code, stage.code);
  }
  return art;
}

export async function stationView(stationId: string, requestUrl: string): Promise<StationView> {
  const live = await session(requestUrl);
  const board = await boardOf(live);
  const station = board.stations.find((item) => item.id === stationId) ?? null;
  const stream = board.streams.find((item) => item.id === stationId || item.stationId === stationId) ?? null;
  const spot = station ?? (stream ? { id: stream.stationId || stream.id, name: stream.name } : null);
  if (!spot) throw new Error("That station is not on the open event.");
  const fgc = await loadFgcState();
  const names = board.stages.map((stage) => stage.name);
  const { ruleset, fallback } = strikeRuleset(fgc, names);
  const listed = [...(ruleset?.neutralStages ?? []), ...(ruleset?.counterpickStages ?? [])];
  const set = setOnStation(board.sets, station?.id || spot.id, stream?.id || station?.streamId || "");
  return {
    station: { id: spot.id, name: spot.name },
    set: set
      ? {
          id: set.id,
          phase: set.phase,
          round: set.round,
          bestOf: set.bestOf || 3,
          p1: { id: set.p1.id, name: set.p1.name },
          p2: { id: set.p2.id, name: set.p2.name },
        }
      : null,
    ruleset,
    art: stageArt(fgc, listed.length ? listed : names),
    fallback,
  };
}

export async function reportStation(
  requestUrl: string,
  input: { stationId: string; setId: string; winnerId: string; score1: number; score2: number; stage: string; games?: { winnerId?: string; stage?: string }[] },
) {
  const live = await session(requestUrl);
  const board = await boardOf(live);
  const set = board.sets.find((item) => item.id === input.setId);
  const stream = board.streams.find((item) => item.id === input.stationId || item.stationId === input.stationId);
  const onSpot = !!set && (set.stationId === input.stationId || (!!stream && (set.streamId === stream.id || set.stationId === stream.stationId)));
  if (!set || !onSpot) throw new Error("That set is no longer on this station.");
  if (!input.winnerId) throw new Error("This set has no start.gg player to report.");
  const played = input.games?.length ? input.games : [{ winnerId: input.winnerId, stage: input.stage }];
  let stages: { id: string; name: string }[] = board.stages;
  if (played.some((game) => game.stage && !matchStageId(stages, game.stage))) {
    try {
      const remote = await stagesForSet(live.token, set.id);
      stages = [...stages, ...remote.filter((stage) => !stages.some((item) => item.id === stage.id))];
    } catch {
      // The event list is enough when the names already match.
    }
  }
  if (set.state !== 6 && set.state !== 3) {
    try {
      if (set.state !== 2) await callToSet(live.token, set.id);
      await beginToSet(live.token, set.id);
    } catch {
      // The report still goes through if the set was already called.
    }
  }
  await reportToSet(live.token, set.id, input.winnerId, input.score1, input.score2, {
    entrant1: set.p1.id,
    entrant2: set.p2.id,
    character1: set.p1.characterId,
    character2: set.p2.characterId,
    games: played.map((game) => ({
      winnerId: game.winnerId || input.winnerId,
      stageId: game.stage ? matchStageId(stages, game.stage) : "",
      character1: set.p1.characterId,
      character2: set.p2.characterId,
    })),
  });
  boardCache = null;
  const sql = await table();
  await sql`delete from fgc_state where id = ${BOARD}`;
}
