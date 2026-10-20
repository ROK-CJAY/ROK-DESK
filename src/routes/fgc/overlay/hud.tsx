import { createFileRoute } from "@tanstack/react-router";
import { FgcHud } from "@/components/overlays/fgc-hud";

export const Route = createFileRoute("/fgc/overlay/hud")({
  component: () => (
    <div className="h-screen w-screen overflow-hidden bg-transparent">
      <FgcHud />
    </div>
  ),
  ssr: false,
});
