import { createFileRoute } from "@tanstack/react-router";
import { FgcProduction } from "@/components/fgc/fgc-app";

export const Route = createFileRoute("/fgc/production")({
  component: FgcProduction,
});
