import { useEffect, useLayoutEffect } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { PodPad } from "@/components/pod/pod-pad";
import { gameIdFromSlug } from "@/lib/games";
import { useDeskStore } from "@/lib/desk-store";

type TabletSearch = {
  role?: "judge" | "player" | "caster";
};

export const Route = createFileRoute("/$game/tablet")({
  ssr: false,
  validateSearch: (raw: Record<string, unknown>): TabletSearch => {
    if (raw.role === "player") return { role: "player" };
    if (raw.role === "judge") return { role: "judge" };
    if (raw.role === "caster") return { role: "caster" };
    return {};
  },
  component: PinnedTablet,
});

function PinnedTablet() {
  const { game } = Route.useParams();
  const { role } = Route.useSearch();
  const gameId = gameIdFromSlug(game);
  const hydrate = useDeskStore((s) => s.hydrate);

  useLayoutEffect(() => {
    if (gameId) useDeskStore.setState({ pinnedGameId: gameId, pinnedSlot: 1 });
  }, [gameId]);

  useEffect(() => {
    if (gameId) void hydrate(gameId, 1);
  }, [gameId, hydrate]);

  if (!gameId) throw notFound();
  return <PodPad role={role === "player" ? "player" : role === "caster" ? "caster" : "judge"} />;
}