import { createFileRoute } from "@tanstack/react-router";
import { OverlayPage } from "@/components/overlays/overlay-page";
import { WinnerView } from "@/components/overlays/graphics";

export const Route = createFileRoute("/overlay/winner")({
  component: () => <OverlayPage source="winner" render={(desk) => <WinnerView desk={desk} />} />,
});
