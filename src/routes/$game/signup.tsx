import { createFileRoute, notFound } from "@tanstack/react-router";
import { SignupKiosk } from "@/components/signup/signup-kiosk";
import { gameIdFromSlug } from "@/lib/games";

export const Route = createFileRoute("/$game/signup")({
  ssr: false,
  component: PinnedSignup,
});

function PinnedSignup() {
  const { game } = Route.useParams();
  const gameId = gameIdFromSlug(game);
  if (!gameId) throw notFound();
  return <SignupKiosk gameId={gameId} />;
}
