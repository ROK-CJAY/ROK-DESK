import { useEffect, useLayoutEffect } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { PodPad } from "@/components/pod/pod-pad";
import { gameIdFromSlug } from "@/lib/games";
import { parseMatchSlot } from "@/lib/desk-types";
import { useDeskStore } from "@/lib/desk-store";

type TabletSearch = {
  role?: "judge" | "player";
};

export const Route = createFileRoute("/$game/$slot/tablet")({
  ssr: false,
  validateSearch: (raw: Record<string, unknown>): TabletSearch => {
    if (raw.role === "player") return { role: "player" };
    if (raw.role === "judge") return { role: "judge" };
    return {};
  },
  component: SlotTablet,
});

function SlotTablet() {
  const { game, slot } = Route.useParams();
  const { role } = Route.useSearch();
  const gameId = gameIdFromSlug(game);
  const matchSlot = parseMatchSlot(slot);
  const hydrate = useDeskStore((s) => s.hydrate);

  useLayoutEffect(() => {
    if (gameId && (slot === "1" || slot === "2" || slot === "3")) {
      useDeskStore.setState({ pinnedGameId: gameId, pinnedSlot: matchSlot });
    }
  }, [gameId, slot, matchSlot]);

  useEffect(() => {
    if (gameId && (slot === "1" || slot === "2" || slot === "3")) void hydrate(gameId, matchSlot);
  }, [gameId, matchSlot, slot, hydrate]);

  if (!gameId || (slot !== "1" && slot !== "2" && slot !== "3")) throw notFound();
  return <PodPad role={role === "player" ? "player" : "judge"} />;
}
