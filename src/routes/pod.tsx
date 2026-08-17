import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { slugOf } from "@/lib/games";
import { useDeskStore } from "@/lib/desk-store";

export const Route = createFileRoute("/pod")({
  ssr: false,
  component: PlayerTabletRedirect,
});

function PlayerTabletRedirect() {
  const navigate = useNavigate();
  const hydrate = useDeskStore((s) => s.hydrate);
  const ready = useDeskStore((s) => s.ready);
  const gameId = useDeskStore((s) => s.desk.gameId);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!ready) return;
    void navigate({
      to: "/$game/tablet",
      params: { game: slugOf(gameId) },
      search: { role: "player" },
      replace: true,
    });
  }, [ready, gameId, navigate]);

  return <div className="grid h-dvh place-items-center bg-bg text-muted">Opening player tablet…</div>;
}