import { EMPTY_FGC, type FgcPlayer, type FgcSet, type FgcState } from "@/lib/fgc-types";
import { stageIconUrl } from "@/lib/fgc-assets";
import { getSql } from "@/lib/db";

function assetUrl(base: string, game: string, code: string, skin: number) {
  const root = base.trim().replace(/\/$/, "");
  const host = root || "https://cdn.jsdelivr.net/gh/joaorb64/StreamHelperAssets@main";
  return `${host}/games/${game}/website/${code}_${skin}.png`;
}

function liveSet(fgc: FgcState) {
  return fgc.sets.find((set) => set.id === fgc.streamSetId) ?? fgc.sets.find((set) => set.state === "live") ?? fgc.sets[0] ?? null;
}

function libraryFor(fgc: FgcState) {
  return fgc.libraries.find((library) => library.game === fgc.event?.game) ?? fgc.libraries[0];
}

function playerLabel(player: FgcPlayer | null) {
  if (!player) return "";
  return [player.prefix, player.tag].filter(Boolean).join(" | ") || player.realName || "";
}

function emptyPlayer() {
  return {
    name: "",
    team: "",
    twitter: "",
    pronoun: "",
    real_name: "",
    seed: "",
    sponsor_logo: "",
    avatar: "",
    online_avatar: "",
    country: { asset: "", code: "" },
    state: { asset: "", code: "" },
    character: {},
  };
}

function characterOf(fgc: FgcState, player: FgcPlayer | null) {
  if (!player?.character) return {};
  const library = libraryFor(fgc);
  const names = [player.character, player.character2].filter(Boolean);
  const skins = [player.skin, player.skin2];
  const character: Record<string, unknown> = {};
  names.forEach((name, index) => {
    const known = library?.characters.find((item) => item.name.toLowerCase() === name.toLowerCase());
    const code = known?.code || name.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const asset = library ? assetUrl(fgc.assetBase, library.code, code, skins[index] || 0) : "";
    character[String(index + 1)] = {
      name,
      codename: code,
      assets: asset
        ? { "base_files/icon": { asset, average_size: { x: 512, y: 512 } } }
        : {},
    };
  });
  return character;
}

function tshPlayer(fgc: FgcState, player: FgcPlayer | null) {
  if (!player) return emptyPlayer();
  const country = player.country.trim();
  const code = country.length === 2 ? country.toLowerCase() : "";
  return {
    name: playerLabel(player),
    team: player.prefix || "",
    twitter: player.twitter || "",
    pronoun: player.pronouns || "",
    real_name: player.realName || "",
    seed: player.seed ?? "",
    sponsor_logo: "",
    avatar: "",
    online_avatar: "",
    country: { asset: code ? `assets/country_flag/${code}.png` : "", code: country },
    state: { asset: "", code: player.region || "" },
    character: characterOf(fgc, player),
  };
}

function tshTeam(fgc: FgcState, set: FgcSet | null, side: "p1" | "p2") {
  const main = side === "p1" ? set?.p1 : set?.p2;
  const partner = side === "p1" ? set?.p1b : set?.p2b;
  return {
    score: side === "p1" ? set?.score1 ?? 0 : set?.score2 ?? 0,
    losers: side === "p1" ? !!set?.losers1 : !!set?.losers2,
    name: side === "p1" ? set?.teamName1 || "" : set?.teamName2 || "",
    player: {
      "1": tshPlayer(fgc, main ?? null),
      ...(partner?.tag ? { "2": tshPlayer(fgc, partner) } : {}),
    },
  };
}

function roundKey(set: FgcSet) {
  if (set.roundNum) return set.roundNum;
  const text = set.round.toLowerCase();
  const losers = text.includes("loser");
  const sign = losers ? -1 : 1;
  if (text.includes("reset")) return 100;
  if (text.includes("grand")) return sign * 90;
  if (text.includes("semi")) return sign * 80;
  if (text.includes("quarter")) return sign * 70;
  const match = text.match(/round\s+(\d+)/);
  if (match) return sign * Number(match[1]);
  return losers ? -1 : 1;
}

function stageCard(fgc: FgcState, name: string) {
  const library = libraryFor(fgc);
  const stage = library?.stages.find((item) => item.name.toLowerCase() === name.toLowerCase());
  const code = stage?.code || name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return { name, codename: code, path: library ? stageIconUrl(fgc.assetBase, library.code, code) : "" };
}

function recentSets(fgc: FgcState, player: FgcPlayer | null) {
  if (!player?.tag) return {};
  const mine = fgc.sets.filter((set) => set.state === "done" && (set.p1?.tag === player.tag || set.p2?.tag === player.tag)).slice(-3);
  const out: Record<string, unknown> = {};
  mine.forEach((set, index) => {
    const mineIsFirst = set.p1?.tag === player.tag;
    const me = mineIsFirst ? set.p1 : set.p2;
    const opp = mineIsFirst ? set.p2 : set.p1;
    out[String(index)] = {
      phase_name: set.phase || "",
      phase_id: "",
      round_name: set.round || "",
      player_team: me?.prefix || "",
      player_name: me?.tag || "",
      player_score: mineIsFirst ? set.score1 : set.score2,
      oponent_team: opp?.prefix || "",
      oponent_name: opp?.tag || "",
      oponent_score: mineIsFirst ? set.score2 : set.score1,
      player_char: { character: characterOf(fgc, me ?? null) },
      oponent_char: { character: characterOf(fgc, opp ?? null) },
    };
  });
  return out;
}

function historySets(fgc: FgcState, player: FgcPlayer | null) {
  const event = fgc.event;
  const place = fgc.roster?.slots.findIndex((slot) => slot.players.some((item) => item.tag && item.tag === player?.tag)) ?? -1;
  return {
    "0": {
      tournament_name: event?.tournamentName || event?.name || "Tournament",
      event_name: event?.name || "",
      tournament_picture: event?.icon || "",
      placement: place >= 0 ? place + 1 : "",
      entrants: event?.entrants || fgc.sets.length || "",
    },
  };
}

function rulesetPayload(fgc: FgcState) {
  const ruleset = fgc.rulesets.find((item) => item.id === fgc.activeRulesetId) ?? fgc.rulesets[0];
  const library = libraryFor(fgc);
  const fallback = (library?.stages ?? []).slice(0, 9).map((stage) => stage.name);
  const neutral = ruleset && ruleset.neutralStages.length ? ruleset.neutralStages : fallback;
  return {
    neutralStages: neutral.map((name) => stageCard(fgc, name)),
    counterpickStages: (ruleset?.counterpickStages ?? []).map((name) => stageCard(fgc, name)),
    useDSR: ruleset?.dsr === "dsr",
    useMDSR: ruleset?.dsr === "mdsr",
    name: ruleset?.name || "",
    strikeOrder: ruleset?.strikeOrder?.length ? ruleset.strikeOrder : null,
    banCount: ruleset?.banCount || null,
  };
}

function queuePayload(fgc: FgcState) {
  const rows = fgc.sets.filter((set) => set.state !== "done" && (set.p1?.tag || set.p2?.tag)).slice(0, 8);
  const list = rows.length ? rows : fgc.sets.filter((set) => set.p1?.tag || set.p2?.tag).slice(0, 8);
  return list.map((set) => ({
    match: set.round || "",
    phase: set.phase || "",
    station: set.station || "",
    isCurrentEvent: true,
    team: { "1": tshTeam(fgc, set, "p1"), "2": tshTeam(fgc, set, "p2") },
  }));
}

function rosterPayload(fgc: FgcState) {
  const roster = fgc.roster;
  const count = Math.max(1, roster?.count || 8);
  const slots: Record<string, unknown> = {};
  for (let index = 1; index <= count; index += 1) {
    const entry = roster?.slots[index - 1];
    const players = entry?.players ?? [];
    const body: Record<string, unknown> = { "1": tshPlayer(fgc, players[0] ?? null) };
    if ((roster?.playersPerSlot || 1) > 1 && players[1]?.tag) body["2"] = tshPlayer(fgc, players[1]);
    slots[String(index)] = {
      name: entry?.teamName || "",
      score: roster?.showScores ? entry?.score ?? 0 : "",
      player: body,
    };
  }
  return { slot: slots };
}

function setRank(identifier: string) {
  const text = identifier.trim();
  const numeric = Number(text);
  if (text && Number.isFinite(numeric)) return numeric;
  let rank = 0;
  for (const char of text.toUpperCase()) {
    if (char < "A" || char > "Z") continue;
    rank = rank * 26 + (char.charCodeAt(0) - 64);
  }
  return rank || 9999;
}

function nextIndex(from: number, fromCount: number, toCount: number) {
  if (!toCount) return 0;
  if (toCount * 2 === fromCount) return Math.floor(from / 2);
  if (toCount === fromCount) return from;
  return Math.min(toCount - 1, Math.floor((from * toCount) / fromCount));
}

function bracketPayload(fgc: FgcState) {
  const options = fgc.bracketView;
  let sets = fgc.sets.filter((set) => set.p1?.tag || set.p2?.tag);
  if (options?.phase) sets = sets.filter((set) => set.phase === options.phase);
  if (options?.group) sets = sets.filter((set) => set.group === options.group);
  if (options?.winnersOnly) sets = sets.filter((set) => roundKey(set) > 0);
  if (options?.losersOnly) sets = sets.filter((set) => roundKey(set) < 0);
  const byRound = new Map<number, FgcSet[]>();
  for (const set of sets) {
    const key = roundKey(set);
    byRound.set(key, [...(byRound.get(key) ?? []), set]);
  }
  let keys = [...byRound.keys()];
  if (options?.top > 0) {
    const winners = keys.filter((key) => key > 0).sort((a, b) => a - b);
    const keepFrom = winners.find((key) => (byRound.get(key)?.length ?? 0) <= options.top / 2);
    if (keepFrom) {
      const next = keys.filter((key) => (key < 0 ? Math.abs(key) >= Math.max(1, keepFrom - 1) : key >= keepFrom));
      if (next.length) keys = next;
    }
  }
  const winnerKeys = keys.filter((key) => key > 0).sort((a, b) => a - b);
  const loserKeys = keys.filter((key) => key < 0).sort((a, b) => b - a);
  const ordered = [...winnerKeys, ...loserKeys];
  const players: Record<string, unknown> = {};
  const ids = new Map<string, number>();
  const pid = (player: FgcPlayer | null) => {
    if (!player?.tag) return -1;
    const key = player.id || player.tag;
    const known = ids.get(key);
    if (known) return known;
    const next = ids.size + 1;
    ids.set(key, next);
    players[String(next)] = { name: "", score: 0, player: { "1": tshPlayer(fgc, player) } };
    return next;
  };
  const rounds: Record<string, unknown> = {};
  ordered.forEach((key) => {
    const list = [...(byRound.get(key) ?? [])].sort(
      (a, b) => setRank(a.identifier) - setRank(b.identifier) || a.identifier.localeCompare(b.identifier),
    );
    const pool = key > 0 ? winnerKeys : loserKeys;
    const at = pool.indexOf(key);
    const nextRound = at >= 0 && at < pool.length - 1 ? pool[at + 1] : null;
    const nextCount = nextRound == null ? 0 : byRound.get(nextRound)?.length ?? 0;
    const body: Record<string, unknown> = {};
    list.forEach((set, index) => {
      body[String(index)] = {
        playerId: [pid(set.p1), pid(set.p2)],
        score: [set.score1, set.score2],
        completed: set.state === "done",
        nextWin: nextRound == null ? null : [nextRound, nextIndex(index, list.length, nextCount)],
      };
    });
    rounds[String(key)] = { name: list[0]?.round || `Round ${key}`, sets: body };
  });
  return {
    phase: options?.phase || "",
    phaseGroup: options?.group || "",
    players: { slot: players },
    bracket: {
      rounds: normalizeRounds(rounds as Record<string, BracketRound>),
      progressionsIn: options?.progressionsIn || 0,
      progressionsOut: options?.progressionsOut || 0,
      winnersOnlyProgressions: !!options?.winnersOnly,
    },
  };
}

type BracketRound = {
  name: string;
  sets: Record<string, { playerId: number[]; score: number[]; completed: boolean; nextWin: [number, number] | null }>;
};

function normalizeRounds(rounds: Record<string, BracketRound>) {
  const keys = Object.keys(rounds).map(Number).filter((key) => Number.isFinite(key));
  const winners = keys.filter((key) => key > 0).sort((a, b) => a - b);
  const losers = keys.filter((key) => key < 0).sort((a, b) => b - a);
  const map = new Map<number, number>();
  winners.forEach((key, index) => map.set(key, index + 1));
  losers.forEach((key, index) => map.set(key, -(index + 1)));
  const shifted: Record<string, BracketRound> = {};
  for (const key of [...winners, ...losers]) {
    const round = rounds[String(key)];
    const sets: BracketRound["sets"] = {};
    for (const [index, set] of Object.entries(round.sets)) {
      const next = set.nextWin;
      sets[index] = {
        ...set,
        nextWin: next && map.has(next[0]) ? [map.get(next[0]) as number, next[1]] : null,
      };
    }
    shifted[String(map.get(key))] = { name: round.name, sets };
  }
  return shifted;
}

export function programState(fgc: FgcState, preview = false) {
  const set = liveSet(fgc);
  const library = libraryFor(fgc);
  const commentary: Record<string, unknown> = {};
  fgc.casters.forEach((caster, index) => {
    commentary[String(index + 1)] = {
      name: caster.name || "",
      team: caster.prefix || "",
      pronoun: caster.pronouns || "",
      real_name: caster.realName || "",
      twitter: caster.twitter || "",
      country: { asset: "", code: caster.country || "" },
      state: { asset: "", code: caster.region || "" },
    };
  });
  const body = {
    tournamentInfo: {
      tournamentName: fgc.event?.tournamentName || "",
      eventName: fgc.event?.name || "",
      logo: fgc.event?.icon || "",
      numEntrants: fgc.event?.entrants || 0,
    },
    game: {
      name: fgc.event?.game || library?.game || "",
      codename: library?.code || "",
    },
    score: {
      "1": {
        team: {
          "1": tshTeam(fgc, set, "p1"),
          "2": tshTeam(fgc, set, "p2"),
        },
        match: set?.round || "",
        phase: set?.phase || "",
        best_of: set?.bestOf || 0,
        best_of_text: set?.bestOf ? `Best of ${set.bestOf}` : "",
        stage: set?.stage || "",
        score_left: set?.score1 ?? 0,
        score_right: set?.score2 ?? 0,
        station: "Main",
        last_sets: { "1": recentSets(fgc, set?.p1 ?? null), "2": recentSets(fgc, set?.p2 ?? null) },
        history_sets: { "1": historySets(fgc, set?.p1 ?? null), "2": historySets(fgc, set?.p2 ?? null) },
        stage_strike: { currGame: 0, selectedStage: null, strikedStages: [[]], strikedBy: [[], []], stagesPicked: [], stagesWon: [[], []], lastWinner: -1 },
        station_queue: queuePayload(fgc),
      },
      ruleset: rulesetPayload(fgc),
    },
    streamQueue: { Main: queuePayload(fgc) },
    commentary,
    player_list: rosterPayload(fgc),
    bracket: bracketPayload(fgc),
  };
  if (preview) fillPreview(body);
  const json = JSON.stringify(body);
  let hash = 2166136261;
  for (let i = 0; i < json.length; i += 1) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return { timestamp: (hash >>> 0) || 1, ...body };
}

function fillPreview(body: {
  tournamentInfo: { tournamentName: string; eventName: string };
  score: { "1": { team: { "1": { player: { "1": { name: string } } }; "2": { player: { "1": { name: string } } } }; match: string; phase: string; best_of_text: string } };
  commentary: Record<string, unknown>;
}) {
  const score = body.score["1"];
  if (!score.team["1"].player["1"].name) score.team["1"].player["1"].name = "Player 1";
  if (!score.team["2"].player["1"].name) score.team["2"].player["1"].name = "Player 2";
  if (!score.match) score.match = "Round 1";
  if (!score.phase) score.phase = "Winners";
  if (!score.best_of_text) score.best_of_text = "Best of 3";
  if (!body.tournamentInfo.tournamentName) body.tournamentInfo.tournamentName = "Tournament";
  if (!body.tournamentInfo.eventName) body.tournamentInfo.eventName = "Event";
  if (!Object.keys(body.commentary).length) {
    body.commentary["1"] = { name: "Caster 1", team: "", pronoun: "", real_name: "", twitter: "", country: { asset: "", code: "" }, state: { asset: "", code: "" } };
    body.commentary["2"] = { name: "Caster 2", team: "", pronoun: "", real_name: "", twitter: "", country: { asset: "", code: "" }, state: { asset: "", code: "" } };
  }
}

const STATE_ID = "live";

async function stateTable() {
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

export async function loadFgcState(): Promise<FgcState> {
  try {
    const sql = await stateTable();
    const rows = await sql<{ payload: string }>`select payload from fgc_state where id = ${STATE_ID}`;
    return rows[0] ? { ...EMPTY_FGC, ...(JSON.parse(rows[0].payload) as FgcState) } : EMPTY_FGC;
  } catch {
    return EMPTY_FGC;
  }
}

export async function saveFgcState(fgc: FgcState) {
  const sql = await stateTable();
  const payload = JSON.stringify(fgc);
  await sql`
    insert into fgc_state (id, payload, updated_at)
    values (${STATE_ID}, ${payload}, CURRENT_TIMESTAMP)
    on conflict (id) do update set payload = ${payload}, updated_at = CURRENT_TIMESTAMP
  `;
}
