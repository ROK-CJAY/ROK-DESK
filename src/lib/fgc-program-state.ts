import { EMPTY_FGC, type FgcPlayer, type FgcSet, type FgcState } from "@/lib/fgc-types";
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
    name: "",
    player: {
      "1": tshPlayer(fgc, main ?? null),
      ...(partner?.tag ? { "2": tshPlayer(fgc, partner) } : {}),
    },
  };
}

function slotFrom(fgc: FgcState, player: FgcPlayer | null) {
  return { name: "", player: { "1": tshPlayer(fgc, player) } };
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
  const slots: Record<string, unknown> = {};
  for (let index = 1; index <= 8; index += 1) slots[String(index)] = slotFrom(fgc, null);
  const body = {
    tournamentInfo: {
      tournamentName: fgc.event?.tournamentName || "",
      eventName: fgc.event?.name || "",
      logo: fgc.event?.icon || "",
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
      },
    },
    commentary,
    player_list: { slot: slots },
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
