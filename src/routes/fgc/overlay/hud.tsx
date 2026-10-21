import { createFileRoute } from "@tanstack/react-router";
import { FgcOverlay } from "@/components/fgc/fgc-overlays";

export const Route = createFileRoute("/fgc/overlay/hud")({
  component: function FgcOverlayPage() {
    const source = new URLSearchParams(window.location.search).get("source") || "hud";
    return (
      <div className="h-screen w-screen overflow-hidden bg-transparent">
        <FgcOverlay source={source} />
      </div>
    );
  },
  ssr: false,
});

