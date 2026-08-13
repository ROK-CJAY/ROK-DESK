import { createFileRoute } from "@tanstack/react-router";
import { OverlayPage } from "@/components/overlays/overlay-page";
import { UpcomingView } from "@/components/overlays/graphics";

export const Route = createFileRoute("/overlay/upcoming")({
  component: () => <OverlayPage render={(desk) => <UpcomingView desk={desk} />} />,
});
