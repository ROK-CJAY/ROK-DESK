import { createFileRoute } from "@tanstack/react-router";
import { OverlayPage } from "@/components/overlays/overlay-page";
import { EventLogoView } from "@/components/overlays/event-logo";

export const Route = createFileRoute("/overlay/event-logo")({
  component: () => <OverlayPage source="event-logo" render={(desk) => <EventLogoView desk={desk} />} />,
});
