import { createFileRoute } from "@tanstack/react-router";
import { ScaleFrame } from "@/components/overlays/scale-frame";
import { OverlayLookRoot } from "@/components/overlays/overlay-look-root";
import { TopDecksOverlay } from "@/components/overlays/top-decks";
import { useLiveDesk } from "@/components/overlays/use-live-desk";
import { useLiveTournament } from "@/components/overlays/use-live-tournament";
import { viewTournament } from "@/lib/tournament-types";

export const Route = createFileRoute("/overlay/top-decks")({
  component: TopDecksRoute,
});

function TopDecksRoute() {
  const desk = useLiveDesk();
  const tournament = useLiveTournament();
  if (!desk || !tournament) return null;
  return (
    <div className="h-screen w-screen bg-transparent">
      <ScaleFrame>
        <OverlayLookRoot book={desk.overlayLook} source="top-decks">
          <TopDecksOverlay tournament={viewTournament(tournament, desk.gameId)} count={desk.topDeckCount} slots={desk.topDeckSlots} />
        </OverlayLookRoot>
      </ScaleFrame>
    </div>
  );
}
