import type { GameId } from "./games-core";
import { GAME_LIST } from "./game-catalog";
import {
  casterTabletPath,
  playerTabletExtendedPath,
  playerTabletPath,
  signupPath,
  slugOf,
  tabletPath,
} from "./game-runtime";

export type TabletSlot = 1 | 2 | 3;
export type TabletSurface =
  | "judge"
  | "player"
  | "extended"
  | "caster"
  | "signup"
  | "floor-clock"
  | "stream-clock";

export const TABLET_SLOTS: { id: TabletSlot; label: string }[] = [
  { id: 1, label: "Stream" },
  { id: 2, label: "Floor 1" },
  { id: 3, label: "Floor 2" },
];

export const TABLET_SURFACES: { id: TabletSurface; label: string; needsSlot: boolean }[] = [
  { id: "judge", label: "Judge tablet", needsSlot: true },
  { id: "player", label: "Player tablet", needsSlot: true },
  { id: "extended", label: "Player extended", needsSlot: true },
  { id: "caster", label: "Commentary tablet", needsSlot: true },
  { id: "signup", label: "Walk-up sign-up", needsSlot: false },
  { id: "floor-clock", label: "Floor clock", needsSlot: false },
  { id: "stream-clock", label: "Stream clock", needsSlot: true },
];

export const TABLET_TITLES = GAME_LIST.map((g) => ({ id: g.id, label: g.short, name: g.name }));

export function tabletJoinPath(gameId: GameId, slot: TabletSlot, surface: TabletSurface): string {
  const slug = slugOf(gameId);
  if (surface === "signup") return signupPath(gameId);
  if (surface === "floor-clock") return `/${slug}/overlay/floor-clock`;
  if (surface === "stream-clock") {
    return slot === 1 ? `/${slug}/overlay/stream-clock` : `/${slug}/${slot}/overlay/stream-clock`;
  }
  if (surface === "player") return playerTabletPath(gameId, slot);
  if (surface === "extended") return playerTabletExtendedPath(gameId, slot);
  if (surface === "caster") return casterTabletPath(gameId, slot);
  return tabletPath(gameId, slot);
}

export function tabletJoinUrl(base: string, gameId: GameId, slot: TabletSlot, surface: TabletSurface): string {
  const root = base.replace(/\/+$/, "");
  return `${root}${tabletJoinPath(gameId, slot, surface)}`;
}

export function defaultTabletPort(): number {
  return 8080;
}
