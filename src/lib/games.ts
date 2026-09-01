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
