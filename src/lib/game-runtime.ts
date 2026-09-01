import type { FormatFamily, FormatPreset, GameDef, GameId } from "./games-core";
import { isMtgTitle, isPtcgTitle, isVgcTitle } from "./games-core";
import { GAME_SLUG, GAMES } from "./game-catalog";

export function isGameId(value: string): value is GameId {
  return value in GAMES;
}

export function gameOf(id: GameId): GameDef {
  return GAMES[id];
}

const RETIRED_GAMES: Record<string, GameId> = {
  fab: "pokemon-tcg",
  "union-arena": "pokemon-tcg",
  generic: "pokemon-tcg",
  ua: "pokemon-tcg",
  tt: "pokemon-tcg",
  commander: "mtg-commander",
  cedh: "mtg-commander",
  edh: "mtg-commander",
};

const SLUG_TO_GAME = Object.fromEntries(
  Object.entries(GAME_SLUG).map(([id, slug]) => [slug, id]),
) as Record<string, GameId>;

export function slugOf(gameId: GameId): string {
  return GAME_SLUG[gameId];
}

export function gameIdFromSlug(slug: string): GameId | null {
  const key = slug.trim().toLowerCase();
  if (isGameId(key)) return key;
  if (RETIRED_GAMES[key]) return RETIRED_GAMES[key]!;
  return SLUG_TO_GAME[key] ?? null;
}

export function coerceGameId(value: unknown, fallback: GameId = "pokemon-tcg"): GameId {
  if (typeof value !== "string") return fallback;
  return gameIdFromSlug(value) ?? fallback;
}

export function signupPath(gameId: GameId): string {
  return `/${slugOf(gameId)}/signup`;
}

export function tabletPath(gameId: GameId, slot: 1 | 2 | 3 = 1): string {
  if (slot === 2 || slot === 3) return `/${slugOf(gameId)}/${slot}/tablet`;
  return `/${slugOf(gameId)}/tablet`;
}

export function playerTabletPath(gameId: GameId, slot: 1 | 2 | 3 = 1): string {
  return `${tabletPath(gameId, slot)}?role=player`;
}

export function playerTabletExtendedPath(gameId: GameId, slot: 1 | 2 | 3 = 1): string {
  return `${tabletPath(gameId, slot)}?role=extended`;
}

export function casterTabletPath(gameId: GameId, slot: 1 | 2 | 3 = 1): string {
  return `${tabletPath(gameId, slot)}?role=caster`;
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

export function extraFieldFor(gameId: GameId, formatName: string): { label: string; placeholder: string } {
  const game = gameOf(gameId);
  if (isCommanderLane({ gameId, formatName })) {
    return { label: "Commander", placeholder: "Search Atraxa, Kinnan…" };
  }
  return { label: game.extraLabel, placeholder: game.extraPlaceholder };
}

export function formatCommanderLine(commander: string, partner = ""): string {
  const a = commander.trim();
  const b = partner.trim();
  if (a && b) return `${a} / ${b}`;
  return a || b;
}

export type PlayerIdField = {
  label: string;
  placeholder: string;
  hint: string;
  policyName: string;
  policyUrl: string;
};

export function playerIdField(gameId: GameId): PlayerIdField {
  switch (gameId) {
    case "pokemon-vgc":
    case "pokemon-vgc-seniors":
    case "pokemon-vgc-juniors":
    case "pokemon-tcg":
    case "pokemon-tcg-seniors":
    case "pokemon-tcg-juniors":
      return {
        label: "Play! Pokémon ID",
        placeholder: "1234567890",
        hint: "The number on your Play! Pokémon account.",
        policyName: "Pokémon Privacy Notice",
        policyUrl: "https://www.pokemon.com/us/privacy-notice",
      };
    case "one-piece":
      return {
        label: "Bandai TCG+ ID",
        placeholder: "000000000",
        hint: "Your Bandai TCG+ / Bandai App player ID.",
        policyName: "BANDAI TCG+ Privacy Policy",
        policyUrl: "https://lp.bandai-tcg-plus.com/privacy/en/",
      };
    case "yugioh":
      return {
        label: "KONAMI ID",
        placeholder: "000-000-000",
        hint: "Your KONAMI ID from the official app.",
        policyName: "KONAMI Privacy Notice",
        policyUrl: "https://legal.konami.com/kde/privacy/en-us/",
      };
    case "mtg":
    case "mtg-commander":
      return {
        label: "Wizards / PlayMTG ID",
        placeholder: "Wizards account ID",
        hint: "Your Wizards account or PlayMTG player ID.",
        policyName: "Wizards of the Coast Privacy Policy",
        policyUrl: "https://company.wizards.com/legal/wizards-coasts-privacy-policy",
      };
    case "lorcana":
      return {
        label: "PlayHub ID",
        placeholder: "PlayHub ID",
        hint: "Your Ravensburger PlayHub / companion ID.",
        policyName: "Ravensburger Privacy Policy",
        policyUrl: "https://www.ravensburger.us/discover/service/privacy-policy/index.html",
      };
    case "swu":
      return {
        label: "SWU-Stats / OP ID",
        placeholder: "Player ID",
        hint: "Your SWU-Stats or organized play ID.",
        policyName: "Asmodee Privacy Policy",
        policyUrl: "https://privacy.asmodee.com/",
      };
    case "riftbound":
      return {
        label: "Riot ID",
        placeholder: "Name#TAG",
        hint: "Riot ID linked on your Riftbound / Carde.io organized-play account.",
        policyName: "Riot Games Privacy Notice",
        policyUrl: "https://www.riotgames.com/en/privacy-notice",
      };
    default:
      return {
        label: "Player ID",
        placeholder: "ID number",
        hint: "Organized play or app ID for this game.",
        policyName: "event privacy notice",
        policyUrl: "",
      };
  }
}

const COMMANDER_FORMAT_LABELS = new Set(["Commander", "cEDH", "Duel Commander"]);

export function coerceDeskGameId(value: unknown, formatName?: unknown, fallback: GameId = "pokemon-tcg"): GameId {
  if (typeof value === "string") {
    const key = value.trim().toLowerCase();
    if (key === "edh" || key === "commander" || key === "cedh" || key === "mtg-commander") {
      return "mtg-commander";
    }
  }
  const id = coerceGameId(value, fallback);
  if (id === "mtg" && typeof formatName === "string" && COMMANDER_FORMAT_LABELS.has(formatName)) {
    return "mtg-commander";
  }
  return id;
}

export function isCommanderLane(desk: { gameId: GameId; formatName: string }): boolean {
  if (desk.gameId === "mtg-commander") return true;
  return desk.gameId === "mtg" && currentFamily(desk) === "commander";
}

const ROK_LAYOUT_GAMES: GameId[] = [
  "lorcana",
  "yugioh",
  "pokemon-tcg",
  "pokemon-tcg-seniors",
  "pokemon-tcg-juniors",
  "riftbound",
  "swu",
  "mtg",
  "one-piece",
];

export function supportsPlayLayout(desk: { gameId: GameId }): boolean {
  return (
    isPtcgTitle(desk.gameId) ||
    isVgcTitle(desk.gameId) ||
    desk.gameId === "yugioh" ||
    desk.gameId === "one-piece" ||
    desk.gameId === "lorcana"
  );
}

export function supportsRokLayout(desk: { gameId: GameId; formatName?: string }): boolean {
  if (!ROK_LAYOUT_GAMES.includes(desk.gameId)) return false;
  if (desk.formatName && isCommanderLane({ gameId: desk.gameId, formatName: desk.formatName })) {
    return false;
  }
  return true;
}

export function isCommanderPodFormat(gameId: GameId, formatName: string): boolean {
  if (!isMtgTitle(gameId)) return false;
  const preset = gameOf(gameId).formats.find((f) => f.label === formatName);
  return preset?.family === "commander" && (preset.seats ?? 2) >= 4;
}
