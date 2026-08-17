import { useEffect, useLayoutEffect } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { PodPad } from "@/components/pod/pod-pad";
import { gameIdFromSlug } from "@/lib/games";
import { useDeskStore } from "@/lib/desk-store";

export const Route = createFileRoute("/$game/tablet")({
  ssr: false,
  component: PinnedTablet,
});

function PinnedTablet() {
  const { game } = Route.useParams();
  const gameId = gameIdFromSlug(game);
  const hydrate = useDeskStore((s) => s.hydrate);

  useLayoutEffect(() => {
    if (gameId) useDeskStore.setState({ pinnedGameId: gameId });
  }, [gameId]);

  useEffect(() => {
    if (gameId) void hydrate(gameId);
  }, [gameId, hydrate]);

  if (!gameId) throw notFound();
  return <PodPad />;
}
