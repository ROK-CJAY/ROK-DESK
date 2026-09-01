export const GAME_IDS = [
  "pokemon-vgc",
  "pokemon-vgc-seniors",
  "pokemon-vgc-juniors",
  "pokemon-tcg",
  "pokemon-tcg-seniors",
  "pokemon-tcg-juniors",
  "one-piece",
  "yugioh",
  "mtg",
  "mtg-commander",
  "lorcana",
  "swu",
  "riftbound",
] as const;

export type GameId = (typeof GAME_IDS)[number];

export type PlayAgeDivision = "masters" | "seniors" | "juniors";
export type PtcgDivision = PlayAgeDivision;

type PlayDivisionRow = { id: PlayAgeDivision; gameId: GameId; slug: string; label: string };

export const PTCG_DIVISIONS: PlayDivisionRow[] = [
  { id: "masters", gameId: "pokemon-tcg", slug: "ptcg", label: "Masters" },
  { id: "seniors", gameId: "pokemon-tcg-seniors", slug: "ptcg-seniors", label: "Seniors" },
  { id: "juniors", gameId: "pokemon-tcg-juniors", slug: "ptcg-juniors", label: "Juniors" },
];

export const VGC_DIVISIONS: PlayDivisionRow[] = [
  { id: "masters", gameId: "pokemon-vgc", slug: "vgc", label: "Masters" },
  { id: "seniors", gameId: "pokemon-vgc-seniors", slug: "vgc-seniors", label: "Seniors" },
  { id: "juniors", gameId: "pokemon-vgc-juniors", slug: "vgc-juniors", label: "Juniors" },
];

export function isPtcgTitle(gameId: GameId): boolean {
  return gameId === "pokemon-tcg" || gameId === "pokemon-tcg-seniors" || gameId === "pokemon-tcg-juniors";
}

export function isVgcTitle(gameId: GameId): boolean {
  return gameId === "pokemon-vgc" || gameId === "pokemon-vgc-seniors" || gameId === "pokemon-vgc-juniors";
}

export function isPlayPokemonTitle(gameId: GameId): boolean {
  return isPtcgTitle(gameId) || isVgcTitle(gameId);
}

export function ptcgDivisionOf(gameId: GameId): PlayAgeDivision | null {
  if (gameId === "pokemon-tcg-seniors") return "seniors";
  if (gameId === "pokemon-tcg-juniors") return "juniors";
  if (gameId === "pokemon-tcg") return "masters";
  return null;
}

export function vgcDivisionOf(gameId: GameId): PlayAgeDivision | null {
  if (gameId === "pokemon-vgc-seniors") return "seniors";
  if (gameId === "pokemon-vgc-juniors") return "juniors";
  if (gameId === "pokemon-vgc") return "masters";
  return null;
}

export function playAgeDivisionOf(gameId: GameId): PlayAgeDivision | null {
  return ptcgDivisionOf(gameId) ?? vgcDivisionOf(gameId);
}

export type TitleLane = { id: string; gameId: GameId; slug: string; label: string };

export const MTG_LANES: TitleLane[] = [
  { id: "constructed", gameId: "mtg", slug: "mtg", label: "Constructed" },
  { id: "commander", gameId: "mtg-commander", slug: "edh", label: "Commander" },
];

export function playDivisionsFor(gameId: GameId): TitleLane[] {
  if (isVgcTitle(gameId)) return VGC_DIVISIONS;
  if (isPtcgTitle(gameId)) return PTCG_DIVISIONS;
  if (isMtgTitle(gameId)) return MTG_LANES;
  return [];
}

export type TomTitleId = Extract<
  GameId,
  | "pokemon-vgc"
  | "pokemon-vgc-seniors"
  | "pokemon-vgc-juniors"
  | "pokemon-tcg"
  | "pokemon-tcg-seniors"
  | "pokemon-tcg-juniors"
>;

export const TOM_TITLE_IDS: TomTitleId[] = [
  "pokemon-tcg",
  "pokemon-tcg-seniors",
  "pokemon-tcg-juniors",
  "pokemon-vgc",
  "pokemon-vgc-seniors",
  "pokemon-vgc-juniors",
];

export function ptcgGameIdFor(division: PlayAgeDivision): GameId {
  return PTCG_DIVISIONS.find((d) => d.id === division)?.gameId ?? "pokemon-tcg";
}

export function vgcGameIdFor(division: PlayAgeDivision): GameId {
  return VGC_DIVISIONS.find((d) => d.id === division)?.gameId ?? "pokemon-vgc";
}

export function inferPlayAgeDivision(text: string): PlayAgeDivision | null {
  const t = text.toLowerCase();
  if (/\bjunior/.test(t) || /\bjr\b/.test(t)) return "juniors";
  if (/\bsenior/.test(t) || /\bsr\b/.test(t)) return "seniors";
  if (/\bmaster/.test(t)) return "masters";
  return null;
}

export const inferPtcgDivision = inferPlayAgeDivision;

export function titleStripActive(stripId: GameId, current: GameId): boolean {
  if (stripId === "pokemon-tcg") return isPtcgTitle(current);
  if (stripId === "pokemon-vgc") return isVgcTitle(current);
  if (stripId === "mtg") return isMtgTitle(current);
  return stripId === current;
}

export function titleStripTarget(stripId: GameId, current: GameId): GameId {
  if (stripId === "pokemon-tcg") return isPtcgTitle(current) ? current : "pokemon-tcg";
  if (stripId === "pokemon-vgc") return isVgcTitle(current) ? current : "pokemon-vgc";
  if (stripId === "mtg") return isMtgTitle(current) ? current : "mtg";
  return stripId;
}

export function isTomTitle(gameId: GameId): gameId is TomTitleId {
  return isPlayPokemonTitle(gameId);
}

export function tomTitleOf(gameId: GameId): TomTitleId {
  if (isTomTitle(gameId)) return gameId;
  return "pokemon-tcg";
}

export type ResourceKind = "pips" | "life" | "points";
export type ScorebugStyle = "bar" | "split" | "rok" | "play";
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
  category: "VGC" | "TCG";
  resource: {
    kind: ResourceKind;
    label: string;
    shortLabel: string;
    min: number;
    max: number;
    start: number;
    step: number;
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

export function isMtgTitle(gameId: GameId): boolean {
  return gameId === "mtg" || gameId === "mtg-commander";
}
