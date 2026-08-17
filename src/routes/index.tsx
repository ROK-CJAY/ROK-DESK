import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/components/app/landing";

export const Route = createFileRoute("/")({
  component: Landing,
});
