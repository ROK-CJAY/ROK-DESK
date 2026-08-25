import { type ReactNode } from "react";
import { ScaleFrame } from "@/components/overlays/scale-frame";
import { useLiveDesk } from "@/components/overlays/use-live-desk";
import { OverlayLookRoot } from "@/components/overlays/overlay-look-root";
import type { OverlaySourceId } from "@/components/desk/sources";
import type { DeskState, MatchSlot } from "@/lib/desk-types";
import type { GameId } from "@/lib/games";
import { useClockNow } from "@/lib/use-clock-now";

export function OverlayPage({
  render,
  gameId,
  source,
  slot = 1,
}: {
  render: (desk: DeskState, now: number) => ReactNode;
  gameId?: GameId;
  source?: OverlaySourceId;
  slot?: MatchSlot;
}) {
  const desk = useLiveDesk(gameId, 400, slot);
  const now = useClockNow({ live: Boolean(desk?.timerRunning), pauseWhenHidden: false });

  if (!desk) return null;

  return (
    <div className="relative h-screen w-screen bg-transparent">
      <ScaleFrame>
        <OverlayLookRoot book={desk.overlayLook} source={source}>
          {render(desk, now)}
        </OverlayLookRoot>
      </ScaleFrame>
    </div>
  );
}