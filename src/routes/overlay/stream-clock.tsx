import { createFileRoute } from "@tanstack/react-router";
import { FloorClockOverlay } from "@/components/overlays/floor-clock";
import { OverlayLookRoot } from "@/components/overlays/overlay-look-root";
import { useLiveTournament } from "@/components/overlays/use-live-tournament";
import { useLiveDesk } from "@/components/overlays/use-live-desk";

function StreamClockPage() {
  const tournament = useLiveTournament();
  const desk = useLiveDesk(tournament?.gameId, 400, 1);
  return (
    <div className="h-dvh w-dvw overflow-hidden bg-ov-bg">
      {tournament ? (
        <OverlayLookRoot book={desk?.overlayLook} source="stream-clock">
          <FloorClockOverlay tournament={tournament} desk={desk} variant="stream" />
        </OverlayLookRoot>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute("/overlay/stream-clock")({
  component: StreamClockPage,
});
