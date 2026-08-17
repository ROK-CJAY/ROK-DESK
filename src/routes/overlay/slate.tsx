import { createFileRoute } from "@tanstack/react-router";
import { OverlayPage } from "@/components/overlays/overlay-page";
import { SlateView } from "@/components/overlays/graphics";

export const Route = createFileRoute("/overlay/slate")({
  component: () => <OverlayPage source="slate" render={(desk) => <SlateView desk={desk} />} />,
});
