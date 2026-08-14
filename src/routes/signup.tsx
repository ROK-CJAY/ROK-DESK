import { createFileRoute } from "@tanstack/react-router";
import { SignupKiosk } from "@/components/signup/signup-kiosk";

export const Route = createFileRoute("/signup")({
  ssr: false,
  component: SignupKiosk,
});
