import { createFileRoute } from "@tanstack/react-router";
import { OverlayPage } from "@/components/overlays/overlay-page";
import { LowerThirdView } from "@/components/overlays/graphics";

export const Route = createFileRoute("/overlay/lower-third")({
  component: () => <OverlayPage render={(desk) => <LowerThirdView desk={desk} />} />,
});
