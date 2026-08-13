import { createFileRoute } from "@tanstack/react-router";
import { OverlayPage } from "@/components/overlays/overlay-page";
import { VersusView } from "@/components/overlays/graphics";

export const Route = createFileRoute("/overlay/versus")({
  component: () => <OverlayPage render={(desk) => <VersusView desk={desk} />} />,
});
