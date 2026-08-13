import { useEffect } from "react";
import { AppChrome } from "@/components/app/app-chrome";
import { MatchControl } from "@/components/desk/match-control";
import { OverlayPreview } from "@/components/desk/overlay-preview";
import {
  BracketPanel,
  CasterPanel,
  EventPanel,
  GameStrip,
  PodPanel,
  QueuePanel,
  ShowPanel,
} from "@/components/desk/side-panels";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useDeskStore } from "@/lib/desk-store";
import { gameOf } from "@/lib/games";

export function DeskApp() {
  const ready = useDeskStore((s) => s.ready);
  const hydrate = useDeskStore((s) => s.hydrate);
  const desk = useDeskStore((s) => s.desk);
  const applyGame = useDeskStore((s) => s.applyGame);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!ready) {
    return (
      <div className="min-h-dvh bg-bg text-fg">
        <div className="mx-auto max-w-[1600px] px-4 py-6">
          <div className="h-12 w-48 animate-pulse rounded-lg bg-surface" />
          <div className="mt-6 grid gap-4 lg:grid-cols-[280px_1fr_380px]">
            <div className="h-96 animate-pulse rounded-xl bg-surface" />
            <div className="h-96 animate-pulse rounded-xl bg-surface" />
            <div className="h-96 animate-pulse rounded-xl bg-surface" />
          </div>
        </div>
      </div>
    );
  }

  const game = gameOf(desk.gameId);

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

        <main className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_400px]">
          <div className="order-2 flex flex-col gap-4 lg:order-1">
            <EventPanel />
            <ShowPanel />
            <BracketPanel />
            <PodPanel />
            <CasterPanel />
            <QueuePanel />
          </div>

          <div className="order-1 flex flex-col gap-4 lg:order-2">
            <MatchControl />
            <div className="xl:hidden">
              <OverlayPreview />
            </div>
          </div>

          <div className="order-3 hidden xl:block">
            <div className="sticky top-4">
              <OverlayPreview />
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
