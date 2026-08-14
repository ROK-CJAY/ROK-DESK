import { createFileRoute } from "@tanstack/react-router";
import { OverlayPage } from "@/components/overlays/overlay-page";
import { GameWinView } from "@/components/overlays/graphics";

export const Route = createFileRoute("/overlay/game-win")({
  component: () => <OverlayPage render={(desk) => <GameWinView desk={desk} />} />,
});
