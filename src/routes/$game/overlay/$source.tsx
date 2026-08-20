import { createFileRoute } from "@tanstack/react-router";
import { PinnedGameOverlay } from "@/components/overlays/pinned-game-overlay";
import { gameIdFromSlug } from "@/lib/games";

export const Route = createFileRoute("/$game/overlay/$source")({
  component: GameOverlaySource,
});

function GameOverlaySource() {
  const { game: slug, source } = Route.useParams();
  return <PinnedGameOverlay gameId={gameIdFromSlug(slug)} source={source} slot={1} />;
}
