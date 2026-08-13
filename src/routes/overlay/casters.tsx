import { createFileRoute } from "@tanstack/react-router";
import { OverlayPage } from "@/components/overlays/overlay-page";
import { CastersView } from "@/components/overlays/graphics";

export const Route = createFileRoute("/overlay/casters")({
  component: () => <OverlayPage render={(desk) => <CastersView desk={desk} />} />,
});
