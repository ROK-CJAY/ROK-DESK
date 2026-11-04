import { createFileRoute } from "@tanstack/react-router";
import { GameplayFrame } from "@/components/overlays/gameplay-frame";
import { useLiveDesk } from "@/components/overlays/use-live-desk";
import { slugOf } from "@/lib/games";

export const Route = createFileRoute("/overlay/gameplay")({
  component: GameplayOverlay,
});

/** Unpinned: follows the title and table Production has selected. */
function GameplayOverlay() {
  const desk = useLiveDesk(undefined, 400);
  if (!desk) return null;
  return <GameplayFrame slug={slugOf(desk.gameId)} slot={desk.matchSlot ?? 1} search={window.location.search} />;
}
