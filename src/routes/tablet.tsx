import { createFileRoute } from "@tanstack/react-router";
import { PodPad } from "@/components/pod/pod-pad";

export const Route = createFileRoute("/tablet")({
  ssr: false,
  component: PodPad,
});
