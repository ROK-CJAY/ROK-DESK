import { createFileRoute } from "@tanstack/react-router";
import { ScaleFrame } from "@/components/overlays/scale-frame";
import { BracketOverlay } from "@/components/overlays/bracket";
import { useLiveTournament } from "@/components/overlays/use-live-tournament";

function BracketPage() {
  const tournament = useLiveTournament();
  return (
    <div className="h-screen w-screen bg-transparent">
      <ScaleFrame>{tournament ? <BracketOverlay tournament={tournament} /> : null}</ScaleFrame>
    </div>
  );
}

export const Route = createFileRoute("/overlay/bracket")({
  component: BracketPage,
});
