import { createFileRoute } from "@tanstack/react-router";
import { FgcStrike } from "@/components/fgc/fgc-strike";

export const Route = createFileRoute("/fgc/strike")({
  component: FgcStrike,
});
