import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/pod")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/tablet" });
  },
});
