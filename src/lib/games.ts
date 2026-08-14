export type GameId =
  | "pokemon-vgc"
  | "pokemon-tcg"
  | "one-piece"
  | "yugioh"
  | "mtg"
  | "lorcana"
  | "fab"
  | "swu"
  | "union-arena"
  | "generic";

export type ResourceKind = "pips" | "life" | "points";
export type ScorebugStyle = "bar" | "split";
export type BestOf = 1 | 3 | 5 | 7;

export type FormatFamily = "constructed" | "commander";

export type FormatPreset = {
  id: string;
  label: string;
  family?: FormatFamily;
  resourceStart?: number;
  resourceMax?: number;
  secondaryStart?: number;
  bestOf?: BestOf;
  seats?: 2 | 3 | 4;
};

export type GameDef = {
  id: GameId;
  name: string;
  short: string;
  category: "VGC" | "TCG" | "Tabletop";
  resource: {
    kind: ResourceKind;
    label: string;
    shortLabel: string;
    min: number;
    max: number;
    start: number;
    step: number;
    /** True when 0 means that player has won (prizes, remaining Pokemon). */
    invertWin: boolean;
    pips: boolean;
    pipStyle?: "dot" | "pokeball" | "team";
  };
  secondary?: {
    label: string;
    min: number;
    max: number;
    start: number;
    step: number;
  };
  extraLabel: string;
  extraPlaceholder: string;
  scoreLabel: string;
  formats: FormatPreset[];
  defaultBestOf: BestOf;
  defaultScorebug: ScorebugStyle;
};

export const GAME_LIST: GameDef[] = [
  {
    id: "pokemon-vgc",
    name: "Pokemon VGC",
    short: "VGC",
    category: "VGC",
    resource: {
      kind: "pips",
      label: "Pokemon remaining",
      shortLabel: "PKMN",
      min: 0,
      max: 6,
      start: 6,
      step: 1,
      invertWin: true,
      pips: true,
      pipStyle: "team",
    },
    extraLabel: "Team",
    extraPlaceholder: "Sun · Balance · Rain",
    scoreLabel: "Games",
    defaultBestOf: 3,
    defaultScorebug: "split",
    formats: [
      { id: "reg-i", label: "VGC 2026 Regulation I" },
      { id: "reg-h", label: "VGC 2026 Regulation H" },
      { id: "bo1", label: "Bo1 Swiss", bestOf: 1 },
    ],
  },
  {
    id: "pokemon-tcg",
    name: "Pokemon TCG",
    short: "PTCG",
    category: "TCG",
    resource: {
      kind: "pips",
      label: "Prize cards",
      shortLabel: "PRZ",
      min: 0,
      max: 6,
      start: 6,
      step: 1,
      invertWin: true,
      pips: true,
      pipStyle: "pokeball",
    },
    extraLabel: "Deck",
    extraPlaceholder: "Charizard ex · Raging Bolt",
    scoreLabel: "Games",
    defaultBestOf: 3,
    defaultScorebug: "bar",
    formats: [
      { id: "standard", label: "Standard" },
      { id: "expanded", label: "Expanded" },
      { id: "pocket", label: "Pocket", resourceStart: 3, resourceMax: 3 },
    ],
  },
  {
    id: "one-piece",
    name: "One Piece TCG",
    short: "OP",
    category: "TCG",
    resource: {
      kind: "pips",
      label: "Life",
      shortLabel: "LIFE",
      min: 0,
      max: 5,
      start: 5,
      step: 1,
      invertWin: true,
      pips: true,
    },
    secondary: { label: "DON!!", min: 0, max: 10, start: 1, step: 1 },
    extraLabel: "Leader",
    extraPlaceholder: "Saka · Luffy · Yamato",
    scoreLabel: "Games",
    defaultBestOf: 3,
    defaultScorebug: "bar",
    formats: [
      { id: "official", label: "Official" },
      { id: "life4", label: "4-life Leader", resourceStart: 4, resourceMax: 5 },
    ],
  },
  {
    id: "yugioh",
    name: "Yu-Gi-Oh!",
    short: "YGO",
    category: "TCG",
    resource: {
      kind: "life",
      label: "Life points",
      shortLabel: "LP",
      min: 0,
      max: 16000,
      start: 8000,
      step: 100,
      invertWin: true,
      pips: false,
    },
    extraLabel: "Deck",
    extraPlaceholder: "Tenpai · Yubel · Snake-Eye",
    scoreLabel: "Games",
    defaultBestOf: 3,
    defaultScorebug: "bar",
    formats: [
      { id: "tcg", label: "TCG Advanced" },
      { id: "md", label: "Master Duel" },
      { id: "edison", label: "Edison" },
      { id: "goat", label: "Goat" },
    ],
  },
  {
    id: "mtg",
    name: "Magic: The Gathering",
    short: "MTG",
    category: "TCG",
    resource: {
      kind: "life",
      label: "Life",
      shortLabel: "LIFE",
      min: 0,
      max: 99,
      start: 20,
      step: 1,
      invertWin: true,
      pips: false,
    },
    secondary: { label: "Poison", min: 0, max: 10, start: 0, step: 1 },
    extraLabel: "Deck",
    extraPlaceholder: "Domain Zoo · Izzet Phoenix",
    scoreLabel: "Games",
    defaultBestOf: 3,
    defaultScorebug: "bar",
    formats: [
      { id: "standard", label: "Standard", family: "constructed" },
      { id: "modern", label: "Modern", family: "constructed" },
      { id: "pioneer", label: "Pioneer", family: "constructed" },
      { id: "legacy", label: "Legacy", family: "constructed" },
      { id: "pauper", label: "Pauper", family: "constructed" },
      {
        id: "commander",
        label: "Commander",
        family: "commander",
        resourceStart: 40,
        resourceMax: 999,
        bestOf: 1,
        seats: 4,
      },
      {
        id: "cedh",
        label: "cEDH",
        family: "commander",
        resourceStart: 40,
        resourceMax: 999,
        bestOf: 1,
        seats: 4,
      },
      {
        id: "duel",
        label: "Duel Commander",
        family: "commander",
        resourceStart: 20,
        resourceMax: 999,
        bestOf: 3,
        seats: 2,
      },
    ],
  },
  {
    id: "lorcana",
    name: "Disney Lorcana",
    short: "Lorcana",
    category: "TCG",
    resource: {
      kind: "points",
      label: "Lore",
      shortLabel: "LORE",
      min: 0,
      max: 20,
      start: 0,
      step: 1,
      invertWin: false,
      pips: false,
    },
    extraLabel: "Ink / Deck",
    extraPlaceholder: "Amber/Steel · Ruby Aggro",
    scoreLabel: "Games",
    defaultBestOf: 3,
    defaultScorebug: "bar",
    formats: [{ id: "core", label: "Core Constructed" }],
  },
  {
    id: "fab",
    name: "Flesh and Blood",
    short: "FaB",
    category: "TCG",
    resource: {
      kind: "life",
      label: "Life",
      shortLabel: "LIFE",
      min: 0,
      max: 40,
      start: 20,
      step: 1,
      invertWin: true,
      pips: false,
    },
    extraLabel: "Hero",
    extraPlaceholder: "Dorinthea · Bravo · Azalea",
    scoreLabel: "Games",
    defaultBestOf: 3,
    defaultScorebug: "bar",
    formats: [
      { id: "cc", label: "Classic Constructed", resourceStart: 40, resourceMax: 40 },
      { id: "blitz", label: "Blitz", resourceStart: 20, resourceMax: 20 },
    ],
  },
  {
    id: "swu",
    name: "Star Wars Unlimited",
    short: "SWU",
    category: "TCG",
    resource: {
      kind: "life",
      label: "Base HP",
      shortLabel: "HP",
      min: 0,
      max: 40,
      start: 30,
      step: 1,
      invertWin: true,
      pips: false,
    },
    extraLabel: "Leader / Base",
    extraPlaceholder: "Vader · Sabine",
    scoreLabel: "Games",
    defaultBestOf: 3,
    defaultScorebug: "bar",
    formats: [{ id: "premier", label: "Premier" }],
  },
  {
    id: "union-arena",
    name: "Union Arena",
    short: "UA",
    category: "TCG",
    resource: {
      kind: "pips",
      label: "Life",
      shortLabel: "LIFE",
      min: 0,
      max: 7,
      start: 7,
      step: 1,
      invertWin: true,
      pips: true,
    },
    extraLabel: "Set / Character",
    extraPlaceholder: "JJK · CSM",
    scoreLabel: "Games",
    defaultBestOf: 3,
    defaultScorebug: "bar",
    formats: [{ id: "official", label: "Official" }],
  },
  {
    id: "generic",
    name: "Tabletop / Other",
    short: "TT",
    category: "Tabletop",
    resource: {
      kind: "points",
      label: "Points",
      shortLabel: "PTS",
      min: 0,
      max: 99,
      start: 0,
      step: 1,
      invertWin: false,
      pips: false,
    },
    extraLabel: "Faction / List",
    extraPlaceholder: "Army · Color · School",
    scoreLabel: "Games",
    defaultBestOf: 1,
    defaultScorebug: "bar",
    formats: [
      { id: "casual", label: "Casual" },
      { id: "tournament", label: "Tournament", bestOf: 3 },
    ],
  },
];

export const GAMES: Record<GameId, GameDef> = Object.fromEntries(
  GAME_LIST.map((g) => [g.id, g]),
) as Record<GameId, GameDef>;

export function isGameId(value: string): value is GameId {
  return value in GAMES;
}

export function gameOf(id: GameId): GameDef {
  return GAMES[id];
}

export function formatFamilyOf(preset?: FormatPreset): FormatFamily {
  return preset?.family ?? "constructed";
}

export function currentFormat(desk: { gameId: GameId; formatName: string }): FormatPreset | undefined {
  return gameOf(desk.gameId).formats.find((f) => f.label === desk.formatName);
}

export function currentFamily(desk: { gameId: GameId; formatName: string }): FormatFamily {
  return formatFamilyOf(currentFormat(desk));
}

export function formatsInFamily(game: GameDef, family: FormatFamily): FormatPreset[] {
  const list = game.formats.filter((f) => formatFamilyOf(f) === family);
  return list.length ? list : game.formats;
}

export function isCommanderLane(desk: { gameId: GameId; formatName: string }): boolean {
  return desk.gameId === "mtg" && currentFamily(desk) === "commander";
}

export function isCommanderPodFormat(gameId: GameId, formatName: string): boolean {
  if (gameId !== "mtg") return false;
  const preset = gameOf(gameId).formats.find((f) => f.label === formatName);
  return preset?.family === "commander" && (preset.seats ?? 2) >= 4;
}
