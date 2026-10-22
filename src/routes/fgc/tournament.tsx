import { createFileRoute } from "@tanstack/react-router";
import { FgcTournamentDesk } from "@/components/fgc/fgc-to";

export const Route = createFileRoute("/fgc/tournament")({
  component: FgcTournamentDesk,
});
