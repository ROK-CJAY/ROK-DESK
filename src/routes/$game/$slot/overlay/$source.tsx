import { createFileRoute, notFound } from "@tanstack/react-router";
import { PinnedGameOverlay } from "@/components/overlays/pinned-game-overlay";
import { gameIdFromSlug } from "@/lib/games";
import { parseMatchSlot } from "@/lib/desk-types";

export const Route = createFileRoute("/$game/$slot/overlay/$source")({
  component: SlotOverlaySource,
});

function SlotOverlaySource() {
  const { game: slug, slot, source } = Route.useParams();
  if (slot !== "1" && slot !== "2") throw notFound();
  return <PinnedGameOverlay gameId={gameIdFromSlug(slug)} source={source} slot={parseMatchSlot(slot)} />;
}
