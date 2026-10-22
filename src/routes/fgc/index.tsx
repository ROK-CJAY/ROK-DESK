import { createFileRoute } from "@tanstack/react-router";
import { FgcHome } from "@/components/fgc/fgc-app";

export const Route = createFileRoute("/fgc/")({
  component: FgcHome,
});
