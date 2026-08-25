import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { slugOf } from "@/lib/games";
import { useDeskStore } from "@/lib/desk-store";

export const Route = createFileRoute("/tablet")({
  ssr: false,
  validateSearch: (raw: Record<string, unknown>): { role?: "judge" | "player" | "caster" } => {
    if (raw.role === "player") return { role: "player" };
    if (raw.role === "judge") return { role: "judge" };
    if (raw.role === "caster") return { role: "caster" };
    return {};
  },
  component: TabletRedirect,
});

function TabletRedirect() {
  const navigate = useNavigate();
  const { role } = Route.useSearch();
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
      search: role === "player" ? { role: "player" } : role === "caster" ? { role: "caster" } : {},
      replace: true,
    });
  }, [ready, gameId, role, navigate]);

  return <div className="grid h-dvh place-items-center bg-bg text-muted">Opening tablet…</div>;
}