import type { MatchSlot } from "@/lib/desk-types";

/** Static approved design, served same-origin from public/overlays/gameplay/. */
export const GAMEPLAY_OVERLAY_HTML = "/overlays/gameplay/index.html";

export function gameplayOverlaySrc(slug: string, slot: MatchSlot = 1, search = ""): string {
  const params = new URLSearchParams(search);
  // Pass-through extras (demo, frame, p1, s1, round, …) but the route owns game and slot.
  params.delete("api");
  params.set("game", slug);
  params.set("slot", String(slot));
  return `${GAMEPLAY_OVERLAY_HTML}?${params.toString()}`;
}

/**
 * Gameplay scoreboard (ROK red / charcoal, cam wells at P1 x28 y862 and P2 x1556 y862, 336×189).
 * The page polls /api/desk?game&slot itself, so this only frames it at 1920×1080.
 */
export function GameplayFrame({
  slug,
  slot = 1,
  search = "",
  fill = true,
}: {
  slug: string;
  slot?: MatchSlot;
  search?: string;
  /** true: full-viewport browser source. false: 1920×1080 box for a scaled preview. */
  fill?: boolean;
}) {
  const iframe = (
    <iframe
      title="Gameplay scoreboard"
      src={gameplayOverlaySrc(slug, slot, search)}
      className="absolute top-0 left-0 border-0 bg-transparent"
      style={{ width: 1920, height: 1080, colorScheme: "normal" }}
    />
  );
  if (!fill) return <div className="relative h-[1080px] w-[1920px] overflow-hidden bg-transparent">{iframe}</div>;
  return <div className="fixed inset-0 overflow-hidden bg-transparent">{iframe}</div>;
}
