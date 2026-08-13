import { createFileRoute } from "@tanstack/react-router";
import { OverlayPage } from "@/components/overlays/overlay-page";
import { ScorebugView } from "@/components/overlays/scorebug";

export const Route = createFileRoute("/overlay/scorebug")({
  component: () => <OverlayPage render={(desk, now) => <ScorebugView desk={desk} now={now} />} />,
});
