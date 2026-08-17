import { createFileRoute } from "@tanstack/react-router";
import { OverlayPage } from "@/components/overlays/overlay-page";
import { HudView } from "@/components/overlays/graphics";

export const Route = createFileRoute("/overlay/hud")({
  component: () => <OverlayPage source="hud" render={(desk, now) => <HudView desk={desk} now={now} />} />,
});
