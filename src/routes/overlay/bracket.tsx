import { createFileRoute } from "@tanstack/react-router";
import { ScaleFrame } from "@/components/overlays/scale-frame";
import { BracketOverlay } from "@/components/overlays/bracket";
import { OverlayLookRoot } from "@/components/overlays/overlay-look-root";
import { useLiveTournament } from "@/components/overlays/use-live-tournament";
import { useLiveDesk } from "@/components/overlays/use-live-desk";

function BracketPage() {
  const tournament = useLiveTournament();
  const desk = useLiveDesk();
  return (
    <div className="h-screen w-screen bg-transparent">
      <ScaleFrame>
        {tournament ? (
          <OverlayLookRoot book={desk?.overlayLook} source="bracket">
            <BracketOverlay tournament={tournament} />
          </OverlayLookRoot>
        ) : null}
      </ScaleFrame>
    </div>
  );
}

export const Route = createFileRoute("/overlay/bracket")({
  component: BracketPage,
});
