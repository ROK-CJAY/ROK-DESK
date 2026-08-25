import { notFound } from "@tanstack/react-router";
import { OverlayPage } from "@/components/overlays/overlay-page";
import {
  CastersView,
  GameWinView,
  HudView,
  LowerThirdView,
  ResourceView,
  SlateView,
  TimerView,
  UpcomingView,
  VersusView,
  WinnerView,
} from "@/components/overlays/graphics";
import { CardSpotlightView } from "@/components/overlays/card";
import { EventLogoView } from "@/components/overlays/event-logo";
import { SponsorsView } from "@/components/overlays/sponsors";
import { ScorebugView } from "@/components/overlays/scorebug";
import { RosterView } from "@/components/overlays/roster";
import { BracketOverlay } from "@/components/overlays/bracket";
import { FloorClockOverlay } from "@/components/overlays/floor-clock";
import { OverlayLookRoot } from "@/components/overlays/overlay-look-root";
import { useLiveDesk } from "@/components/overlays/use-live-desk";
import { useLiveTournament } from "@/components/overlays/use-live-tournament";
import { ScaleFrame } from "@/components/overlays/scale-frame";
import { type GameId } from "@/lib/games";
import { viewTournament } from "@/lib/tournament-types";
import type { OverlaySourceId } from "@/components/desk/sources";
import type { MatchSlot } from "@/lib/desk-types";

const SOURCES = new Set<string>([
  "hud",
  "scorebug",
  "versus",
  "slate",
  "casters",
  "lower-third",
  "winner",
  "game-win",
  "timer",
  "resource",
  "upcoming",
  "bracket",
  "floor-clock",
  "stream-clock",
  "roster",
  "card",
  "sponsors",
  "event-logo",
]);

export function PinnedGameOverlay({
  gameId,
  source,
  slot = 1,
}: {
  gameId: GameId | null;
  source: string;
  slot?: MatchSlot;
}) {
  if (!gameId || !SOURCES.has(source)) throw notFound();

  if (source === "floor-clock") {
    return <PinnedFloorClock gameId={gameId} />;
  }
  if (source === "stream-clock") {
    return <PinnedStreamClock gameId={gameId} slot={slot} />;
  }
  if (source === "bracket") {
    return <PinnedBracket gameId={gameId} />;
  }

  return (
    <OverlayPage
      gameId={gameId}
      slot={slot}
      source={source as OverlaySourceId}
      render={(desk, now) => {
        switch (source as OverlaySourceId) {
          case "hud":
            return <HudView desk={desk} now={now} />;
          case "scorebug":
            return <ScorebugView desk={desk} now={now} />;
          case "versus":
            return <VersusView desk={desk} />;
          case "slate":
            return <SlateView desk={desk} />;
          case "casters":
            return <CastersView desk={desk} />;
          case "lower-third":
            return <LowerThirdView desk={desk} />;
          case "winner":
            return <WinnerView desk={desk} />;
          case "game-win":
            return <GameWinView desk={desk} />;
          case "timer":
            return <TimerView desk={desk} now={now} />;
          case "resource":
            return <ResourceView desk={desk} />;
          case "upcoming":
            return <UpcomingView desk={desk} />;
          case "roster":
            return <RosterView desk={desk} force={desk.rosterSide === "hidden" ? "both" : desk.rosterSide} />;
          case "card":
            return <CardSpotlightView desk={desk} />;
          case "sponsors":
            return <SponsorsView desk={desk} now={now} />;
          case "event-logo":
            return <EventLogoView desk={desk} />;
          default:
            return null;
        }
      }}
    />
  );
}

function PinnedFloorClock({ gameId }: { gameId: GameId }) {
  const tournament = useLiveTournament();
  const desk = useLiveDesk(gameId);
  if (!tournament) return null;
  return (
    <div className="h-dvh w-dvw overflow-hidden bg-ov-bg">
      <OverlayLookRoot book={desk?.overlayLook} source="floor-clock">
        <FloorClockOverlay tournament={viewTournament(tournament, gameId)} desk={desk} />
      </OverlayLookRoot>
    </div>
  );
}

function PinnedStreamClock({ gameId, slot = 1 }: { gameId: GameId; slot?: MatchSlot }) {
  const tournament = useLiveTournament();
  const desk = useLiveDesk(gameId, 400, slot);
  if (!tournament) return null;
  return (
    <div className="h-dvh w-dvw overflow-hidden bg-ov-bg">
      <OverlayLookRoot book={desk?.overlayLook} source="stream-clock">
        <FloorClockOverlay tournament={viewTournament(tournament, gameId)} desk={desk} variant="stream" />
      </OverlayLookRoot>
    </div>
  );
}

function PinnedBracket({ gameId }: { gameId: GameId }) {
  const tournament = useLiveTournament();
  const desk = useLiveDesk(gameId);
  if (!tournament) return null;
  return (
    <div className="h-screen w-screen bg-transparent">
      <ScaleFrame>
        <OverlayLookRoot book={desk?.overlayLook} source="bracket">
          <BracketOverlay tournament={viewTournament(tournament, gameId)} />
        </OverlayLookRoot>
      </ScaleFrame>
    </div>
  );
}
