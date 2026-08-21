import { createFileRoute } from "@tanstack/react-router";
import { InAppBrowser } from "@/components/app/in-app-browser";

export const Route = createFileRoute("/browser")({
  component: InAppBrowser,
});
