import { createFileRoute } from "@tanstack/react-router";
import { OverlayPage } from "@/components/overlays/overlay-page";
import { TimerView } from "@/components/overlays/graphics";

export const Route = createFileRoute("/overlay/timer")({
  component: () => <OverlayPage render={(desk, now) => <TimerView desk={desk} now={now} />} />,
});
