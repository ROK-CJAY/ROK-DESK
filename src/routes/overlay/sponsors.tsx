import { createFileRoute } from "@tanstack/react-router";
import { OverlayPage } from "@/components/overlays/overlay-page";
import { SponsorsView } from "@/components/overlays/sponsors";

export const Route = createFileRoute("/overlay/sponsors")({
  component: () => (
    <OverlayPage source="sponsors" render={(desk, now) => <SponsorsView desk={desk} now={now} />} />
  ),
});
