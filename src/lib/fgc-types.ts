export type FgcSetState = "pending" | "live" | "done";

export type FgcOverlayId =
  | "hud"
  | "scoreboard-simple"
  | "scoreboard-topleft"
  | "scoreboard-4by3"
  | "scoreboard-ultimate"
  | "versus"
  | "versus-tekken"
  | "versus-pokken"
  | "casters"
  | "player-list"
  | "character-gallery"
  | "character-line"
  | "bracket"
  | "bracket-ultimate"
  | "top-8"
  | "top-n"
  | "last-sets"
  | "recent-sets"
  | "tournament-history"
  | "stage-strike"
  | "stream-queue"
  | "ruleset"
  | "world"
  | "lower"
  | "winner"
  | "custom";

export type FgcTitleLayer = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
};

export type FgcTitleElement = {
  id: string;
  kind: "text" | "rect" | "image";
  name: string;
  layer: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  x: number;
  y: number;
  w: number;
  h: number;
  bind: string;
  text: string;
  color: string;
  bg: string;
  size: number;
  align: "left" | "center" | "right";
  font: string;
  weight: number;
  src: string;
  imageKey: string;
  blend: string;
};

export type FgcTitle = {
  id: string;
  name: string;
  group: string;
  layers: FgcTitleLayer[];
  elements: FgcTitleElement[];
};

export type FgcPlayer = {
  id: string;
  profileId: string;
  tag: string;
  prefix: string;
  realName: string;
  country: string;
  flag: string;
  region: string;
  twitter: string;
  pronouns: string;
  character: string;
  skin: number;
  character2: string;
  skin2: number;
  seed: number | null;
};

export type FgcCaster = {
  id: string;
  profileId: string;
  prefix: string;
  name: string;
  realName: string;
  twitter: string;
  pronouns: string;
  country: string;
  flag: string;
  region: string;
};

export type FgcSet = {
  id: string;
  phase: string;
  group: string;
  round: string;
  identifier: string;
  streamName: string;
  station: string;
  queued: boolean;
  bestOf: number;
  stage: string;
  playersPerTeam: number;
  charactersPerPlayer: number;
  losers1: boolean;
  losers2: boolean;
  state: FgcSetState;
  winnerId: string | null;
  p1: FgcPlayer | null;
  p2: FgcPlayer | null;
  p1b: FgcPlayer | null;
  p2b: FgcPlayer | null;
  score1: number;
  score2: number;
};

export type FgcEvent = {
  id: string;
  name: string;
  slug: string;
  tournamentName: string;
  game: string;
  url: string;
  venue: string;
  shortLink: string;
  icon: string;
  ruleset: string;
  entrants: number;
  startAt: string;
  endAt: string;
};

export type FgcState = {
  url: string;
  event: FgcEvent | null;
  sets: FgcSet[];
  streamSetId: string | null;
  casters: FgcCaster[];
  assetBase: string;
  rulesets: FgcRuleset[];
  activeRulesetId: string | null;
  libraries: FgcLibrary[];
  importedAt: string | null;
  overlay: FgcOverlayId;
  titles: FgcTitle[];
  activeTitleId: string | null;
  tshLayout: string | null;
};

export const EMPTY_FGC: FgcState = {
  url: "",
  event: null,
  sets: [],
  streamSetId: null,
  casters: [
    { id: "c1", profileId: "", prefix: "", name: "", realName: "", twitter: "", pronouns: "", country: "", flag: "", region: "" },
    { id: "c2", profileId: "", prefix: "", name: "", realName: "", twitter: "", pronouns: "", country: "", flag: "", region: "" },
  ],
  assetBase: "",
  rulesets: [],
  activeRulesetId: null,
  libraries: [],
  importedAt: null,
  overlay: "hud",
  titles: [],
  activeTitleId: null,
  tshLayout: null,
};

export function blankPlayer(partial?: Partial<FgcPlayer>): FgcPlayer {
  return {
    id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    profileId: "",
    tag: "",
    prefix: "",
    realName: "",
    country: "",
    flag: "",
    region: "",
    twitter: "",
    pronouns: "",
    character: "",
    skin: 0,
    character2: "",
    skin2: 0,
    seed: null,
    ...partial,
  };
}

export function blankSet(): FgcSet {
  return {
    id: `manual-set-${Date.now()}`,
    phase: "",
    group: "",
    round: "",
    identifier: "",
    streamName: "",
    station: "",
    queued: false,
    bestOf: 3,
    stage: "",
    playersPerTeam: 1,
    charactersPerPlayer: 1,
    losers1: false,
    losers2: false,
    state: "live",
    winnerId: null,
    p1: blankPlayer(),
    p2: blankPlayer(),
    p1b: blankPlayer(),
    p2b: blankPlayer(),
    score1: 0,
    score2: 0,
  };
}
export type FgcCharacter = {
  name: string;
  code: string;
  skins: number;
  icon?: string;
};

export type FgcStage = {
  name: string;
  code: string;
};

export type FgcLibrary = {
  game: string;
  code: string;
  pack: string;
  version: string;
  startggGameId?: string;
  characters: FgcCharacter[];
  stages: FgcStage[];
};

export type FgcRuleset = {
  id: string;
  name: string;
  game: string;
  neutralStages: string[];
  counterpickStages: string[];
  strikeOrder: number[];
  banMode: "fixed" | "byGames";
  banCount: number;
  bansByGames: string;
  dsr: "none" | "dsr" | "mdsr";
};

export function blankRuleset(): FgcRuleset {
  return {
    id: `ruleset-${Date.now()}`,
    name: "New ruleset",
    game: "",
    neutralStages: [],
    counterpickStages: [],
    strikeOrder: [1, 2, 1],
    banMode: "fixed",
    banCount: 1,
    bansByGames: "3:3,5:2",
    dsr: "none",
  };
}
export function assetUrl(base: string, kind: "characters" | "stages", name: string): string {
  const root = base.trim().replace(/\/$/, "");
  const file = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!root || !file) return "";
  return `${root}/${kind}/${file}.png`;
}

export function flagOf(country: string): string {
  const code = FLAGS[country.trim().toLowerCase()];
  if (!code) return "";
  return [...code].map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0))).join("");
}

const FLAGS: Record<string, string> = {
  "united states": "US", "united kingdom": "GB", canada: "CA", mexico: "MX", japan: "JP", france: "FR", germany: "DE", spain: "ES", italy: "IT", brazil: "BR", australia: "AU", "south korea": "KR", korea: "KR", netherlands: "NL", sweden: "SE", norway: "NO", finland: "FI", denmark: "DK", poland: "PL", argentina: "AR", chile: "CL", peru: "PE", colombia: "CO", china: "CN", taiwan: "TW", "hong kong": "HK", philippines: "PH", india: "IN", "new zealand": "NZ", ireland: "IE", portugal: "PT", belgium: "BE", switzerland: "CH", austria: "AT", "czech republic": "CZ", "united arab emirates": "AE", "saudi arabia": "SA", "south africa": "ZA",
};

export function playerLabel(player: FgcPlayer | null): string {
  if (!player) return "TBD";
  const tag = player.tag.trim();
  const prefix = player.prefix.trim();
  if (prefix && tag) return `${prefix} | ${tag}`;
  return tag || player.realName || "TBD";
}

export function libraryFor(state: FgcState): FgcLibrary | null {
  const game = state.event?.game.trim().toLowerCase() ?? "";
  if (!game) return null;
  return (
    state.libraries.find((item) => item.game.trim().toLowerCase() === game) ??
    state.libraries.find((item) => game.includes(item.game.trim().toLowerCase()) || item.game.trim().toLowerCase().includes(game)) ??
    null
  );
}

export function streamSetOf(state: FgcState): FgcSet | null {
  if (!state.streamSetId) return null;
  return state.sets.find((set) => set.id === state.streamSetId) ?? null;
}
