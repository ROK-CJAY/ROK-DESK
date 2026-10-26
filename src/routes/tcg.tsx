import { createFileRoute } from "@tanstack/react-router";
import { TcgHome } from "@/components/app/landing";

export const Route = createFileRoute("/tcg")({
  component: TcgHome,
});
