import { createFileRoute } from "@tanstack/react-router";
import { TournamentApp } from "@/components/tournament/to-app";

export const Route = createFileRoute("/tournament")({
  component: TournamentApp,
});
