export type FgcSetState = "pending" | "live" | "done";

export type FgcPlayer = {
  id: string;
  profileId: string;
  tag: string;
  prefix: string;
  realName: string;
  country: string;
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
  name: string;
  twitter: string;
  pronouns: string;
};

export type FgcSet = {
  id: string;
  phase: string;
  group: string;
  round: string;
  identifier: string;
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
};

export const EMPTY_FGC: FgcState = {
  url: "",
  event: null,
  sets: [],
  streamSetId: null,
  casters: [
    { id: "c1", name: "", twitter: "", pronouns: "" },
    { id: "c2", name: "", twitter: "", pronouns: "" },
  ],
  assetBase: "",
  rulesets: [],
  activeRulesetId: null,
  libraries: [],
  importedAt: null,
};

export function blankPlayer(partial?: Partial<FgcPlayer>): FgcPlayer {
  return {
    id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    profileId: "",
    tag: "",
    prefix: "",
    realName: "",
    country: "",
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
