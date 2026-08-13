import { createFileRoute } from "@tanstack/react-router";
import { OverlayPage } from "@/components/overlays/overlay-page";
import { RosterView } from "@/components/overlays/roster";

export const Route = createFileRoute("/overlay/roster")({
  component: () => (
    <OverlayPage render={(desk) => <RosterView desk={desk} />} />
  ),
});
