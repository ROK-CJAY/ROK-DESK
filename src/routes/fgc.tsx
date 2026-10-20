import { createFileRoute } from "@tanstack/react-router";
import { FgcApp } from "@/components/fgc/fgc-app";

export const Route = createFileRoute("/fgc")({
  component: FgcApp,
});
