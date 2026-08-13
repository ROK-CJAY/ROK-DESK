import { createFileRoute } from "@tanstack/react-router";
import { PodPad } from "@/components/pod/pod-pad";

export const Route = createFileRoute("/pod")({
  ssr: false,
  component: PodPad,
});
