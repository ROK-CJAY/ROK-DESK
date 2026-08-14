import { createFileRoute } from "@tanstack/react-router";
import { FloorClockOverlay } from "@/components/overlays/floor-clock";
import { useLiveTournament } from "@/components/overlays/use-live-tournament";

function FloorClockPage() {
  const tournament = useLiveTournament();
  return (
    <div className="h-dvh w-dvw overflow-hidden bg-ov-bg">
      {tournament ? <FloorClockOverlay tournament={tournament} /> : null}
    </div>
  );
}

export const Route = createFileRoute("/overlay/floor-clock")({
  component: FloorClockPage,
});
