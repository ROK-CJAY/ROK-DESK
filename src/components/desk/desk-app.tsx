import { useEffect } from "react";
import { AppChrome } from "@/components/app/app-chrome";
import { MatchControl } from "@/components/desk/match-control";
import { OverlayPreview } from "@/components/desk/overlay-preview";
import {
  BracketPanel,
  CasterPanel,
  CastingPanel,
  EventPanel,
  GameStrip,
  PodPanel,
  QueuePanel,
  ShowPanel,
  SponsorPanel,
} from "@/components/desk/side-panels";
import { CardLookup } from "@/components/tablet/card-lookup";
import { PtcgBoardPanel } from "@/components/desk/ptcg-board-panel";
import { TeamPanel } from "@/components/desk/team-panel";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useDeskStore } from "@/lib/desk-store";
import { catalogForGame } from "@/lib/card-lookup";
import { gameOf, isMtgTitle, isPtcgTitle, isVgcTitle } from "@/lib/games";

export function DeskApp() {
  const hydrate = useDeskStore((s) => s.hydrate);
  const desk = useDeskStore((s) => s.desk);
  const applyGame = useDeskStore((s) => s.applyGame);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const game = gameOf(desk.gameId);
  const lookupCatalog = catalogForGame(desk.gameId);
  const showTablet =
    isVgcTitle(desk.gameId) ||
    isPtcgTitle(desk.gameId) ||
    isMtgTitle(desk.gameId) ||
    desk.gameId === "swu" ||
    desk.gameId === "yugioh" ||
    desk.gameId === "one-piece" ||
    desk.gameId === "riftbound" ||
    desk.gameId === "lorcana";

  return (
    <TooltipProvider delayDuration={250}>
      <div className="min-h-dvh bg-bg text-fg" data-game={desk.gameId}>
        <AppChrome
          view="production"
          trailing={
            <p className="hidden text-sm text-muted sm:block">
              {game.name}
              <span className="text-subtle"> · {desk.formatName}</span>
            </p>
          }
        >
          <GameStrip onPick={applyGame} />
        </AppChrome>

        <main className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4 lg:grid-cols-[280px_minmax(0,1fr)_280px]">
          <div className="order-2 flex flex-col gap-4 lg:order-1">
            <EventPanel />
            <ShowPanel />
            {showTablet ? (
              <div className="lg:hidden">
                <PodPanel />
                <div className="mt-4">
                  <CastingPanel />
                </div>
              </div>
            ) : (
              <div className="lg:hidden">
                <CastingPanel />
              </div>
            )}
          </div>

          <div className="order-1 flex flex-col gap-4 lg:order-2">
            <MatchControl />
            {lookupCatalog ? (
              <CardLookup key={lookupCatalog} compact catalog={lookupCatalog} formatName={desk.formatName} />
            ) : null}
            <PtcgBoardPanel />
            <TeamPanel />
          </div>

          <div className="order-3 flex flex-col gap-4">
            <BracketPanel />
            {showTablet ? (
              <div className="max-lg:hidden">
                <PodPanel />
              </div>
            ) : null}
            <div className="max-lg:hidden">
              <CastingPanel />
            </div>
            <CasterPanel />
            <SponsorPanel />
            <QueuePanel />
          </div>

          <div className="order-4 lg:col-span-3">
            <OverlayPreview />
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
