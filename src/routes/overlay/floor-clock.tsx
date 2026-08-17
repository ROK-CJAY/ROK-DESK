import { createFileRoute } from "@tanstack/react-router";
import { FloorClockOverlay } from "@/components/overlays/floor-clock";
import { OverlayLookRoot } from "@/components/overlays/overlay-look-root";
import { useLiveTournament } from "@/components/overlays/use-live-tournament";
import { useLiveDesk } from "@/components/overlays/use-live-desk";

function FloorClockPage() {
  const tournament = useLiveTournament();
  const desk = useLiveDesk();
  return (
    <div className="h-dvh w-dvw overflow-hidden bg-ov-bg">
      {tournament ? (
        <OverlayLookRoot book={desk?.overlayLook} source="floor-clock">
          <FloorClockOverlay tournament={tournament} desk={desk} />
        </OverlayLookRoot>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute("/overlay/floor-clock")({
  component: FloorClockPage,
});
