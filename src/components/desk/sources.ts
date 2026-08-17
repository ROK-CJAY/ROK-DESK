import { slugOf, type GameId } from "@/lib/games";

export type OverlaySourceId =
  | "hud"
  | "scorebug"
  | "versus"
  | "slate"
  | "casters"
  | "lower-third"
  | "winner"
  | "game-win"
  | "timer"
  | "resource"
  | "upcoming"
  | "bracket"
  | "floor-clock"
  | "roster"
  | "card"
  | "sponsors"
  | "event-logo";

export type OverlaySource = {
  id: OverlaySourceId;
  path: string;
  name: string;
  size: string;
  note: string;
};

export const OVERLAY_SOURCES: OverlaySource[] = [
  {
    id: "hud",
    path: "/overlay/hud",
    name: "HUD pack",
    size: "1920 × 1080",
    note: "Scorebug, clock, resources, casters, lower third, game / match win, sponsors — arrange them together.",
  },
  {
    id: "scorebug",
    path: "/overlay/scorebug",
    name: "Scorebug",
    size: "1920 × 1080",
    note: "Always-on names, score, resources. Drag in Arrange to park it.",
  },
  {
    id: "versus",
    path: "/overlay/versus",
    name: "Versus",
    size: "1920 × 1080",
    note: "Full-frame match intro. Cut to this between games.",
  },
  {
    id: "slate",
    path: "/overlay/slate",
    name: "Hold slate",
    size: "1920 × 1080",
    note: "Starting soon / BRB / thanks / tech. Hidden = fully transparent.",
  },
  {
    id: "casters",
    path: "/overlay/casters",
    name: "Casters",
    size: "1920 × 1080",
    note: "Dual caster plates. Drag each name independently.",
  },
  {
    id: "lower-third",
    path: "/overlay/lower-third",
    name: "Lower third",
    size: "1920 × 1080",
    note: "Toggle from Show control. Player, caster, or custom sting.",
  },
  {
    id: "winner",
    path: "/overlay/winner",
    name: "Match win",
    size: "1920 × 1080",
    note: "Punch Match P1 / P2 in Production. Also reports the result to the live bracket.",
  },
  {
    id: "game-win",
    path: "/overlay/game-win",
    name: "Game win",
    size: "1920 × 1080",
    note: "Punch Game P1 / P2 in Production. Resets remaining Pokemon / prizes for the next game.",
  },
  {
    id: "timer",
    path: "/overlay/timer",
    name: "Round clock",
    size: "1920 × 1080",
    note: "Corner clock. Drag to any safe area.",
  },
  {
    id: "resource",
    path: "/overlay/resource",
    name: "Resource plates",
    size: "1920 × 1080",
    note: "Big prizes / life / remaining Pokemon. Each side moves on its own.",
  },
  {
    id: "upcoming",
    path: "/overlay/upcoming",
    name: "Up next",
    size: "1920 × 1080",
    note: "Reads the queue. Park it on the intermission camera.",
  },
  {
    id: "bracket",
    path: "/overlay/bracket",
    name: "Bracket",
    size: "1920 × 1080",
    note: "TO bracket. Switch Full / Winners / Losers / Top 16 / Top 8 / Top 4 / Finals from Production.",
  },
  {
    id: "floor-clock",
    path: "/overlay/floor-clock",
    name: "Floor clock",
    size: "1920 × 1080",
    note: "Full-screen round clock for the rest of the room. Driven from Tournament, not the stream match.",
  },
  {
    id: "roster",
    path: "/overlay/roster",
    name: "VGC roster",
    size: "1920 × 1080",
    note: "Team preview. P1 sits on the right, P2 on the left. Punch P1 / P2 / Both from Show control.",
  },
  {
    id: "card",
    path: "/overlay/card",
    name: "Card",
    size: "1920 × 1080",
    note: "Judge card from the PTCG, MTG, SWU, YGO, OP, Riftbound, or Lorcana tablet. Search, then Show on stream.",
  },
  {
    id: "sponsors",
    path: "/overlay/sponsors",
    name: "Sponsors",
    size: "1920 × 1080",
    note: "Rotating sponsor logos. Add marks in Production. Hidden and fully transparent when the list is empty.",
  },
  {
    id: "event-logo",
    path: "/overlay/event-logo",
    name: "Event logo",
    size: "1920 × 1080",
    note: "Tournament mark. Upload in Event. Hidden and fully transparent when empty.",
  },
];

export function overlayPath(gameId: GameId, source: OverlaySourceId): string {
  return `/${slugOf(gameId)}/overlay/${source}`;
}
