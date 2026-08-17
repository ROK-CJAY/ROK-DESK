import { createFileRoute } from "@tanstack/react-router";
import { OverlayPage } from "@/components/overlays/overlay-page";
import { CardSpotlightView } from "@/components/overlays/card";

export const Route = createFileRoute("/overlay/card")({
  component: () => <OverlayPage source="card" render={(desk) => <CardSpotlightView desk={desk} />} />,
});
