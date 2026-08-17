import { createFileRoute } from "@tanstack/react-router";
import { OverlayPage } from "@/components/overlays/overlay-page";
import { ResourceView } from "@/components/overlays/graphics";

export const Route = createFileRoute("/overlay/resource")({
  component: () => <OverlayPage source="resource" render={(desk) => <ResourceView desk={desk} />} />,
});
