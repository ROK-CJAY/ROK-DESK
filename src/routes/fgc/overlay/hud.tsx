import { createFileRoute } from "@tanstack/react-router";
import { FgcOverlay } from "@/components/fgc/fgc-overlays";

export const Route = createFileRoute("/fgc/overlay/hud")({
  component: function FgcOverlayPage() {
    const params = new URLSearchParams(window.location.search);
    const source = params.get("source") || "hud";
    const title = params.get("title") || "";
    return (
      <div className="h-screen w-screen overflow-hidden bg-transparent">
        <FgcOverlay source={source} titleId={title} />
      </div>
    );
  },
  ssr: false,
});

