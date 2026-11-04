import { overlayPin } from "@/lib/fgc-lanes";
import { useFgcStore } from "@/lib/fgc-store";

/** Approved ROK gameplay scoreboard, served same-origin from public/overlays/gameplay/. */
export const SCOREBOARD_ROK_HTML = "/overlays/gameplay/index.html";

/**
 * Scoreboard ROK. Transparent cam wells: P1 x28 y862, P2 x1556 y862, 336 × 189.
 * The page polls /api/fgc/gameplay itself (fgc=1), pinned to the same lane / board as the other FGC sources.
 */
export function FgcScoreboardRok() {
  const fgc = useFgcStore((s) => s.fgc);
  const pin = overlayPin();
  const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
  for (const key of ["source", "title", "api", "game", "slot"]) params.delete(key);
  params.set("fgc", "1");
  params.set("lane", pin.lane || fgc.laneId || "");
  params.set("board", pin.board || fgc.activeBoardId || "main");
  return (
    <div className="relative h-[1080px] w-[1920px] overflow-hidden bg-transparent">
      <iframe
        title="Scoreboard ROK"
        src={`${SCOREBOARD_ROK_HTML}?${params.toString()}`}
        className="absolute top-0 left-0 border-0 bg-transparent"
        style={{ width: 1920, height: 1080, colorScheme: "normal" }}
      />
    </div>
  );
}
