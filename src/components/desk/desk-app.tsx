import { useEffect } from "react";
import { Keyboard } from "lucide-react";
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
import { useDeskHotkeys } from "@/components/desk/hotkeys";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useDeskStore } from "@/lib/desk-store";
import { GAME_LIST, gameOf, isCommanderLane } from "@/lib/games";

export function DeskApp() {
  const ready = useDeskStore((s) => s.ready);
  const hydrate = useDeskStore((s) => s.hydrate);
  const desk = useDeskStore((s) => s.desk);
  const applyGame = useDeskStore((s) => s.applyGame);

  useDeskHotkeys();

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
            <HotkeyCard />
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

function HotkeyCard() {
  const tableSize = useDeskStore((s) => s.desk.tableSize);
  const commander = useDeskStore((s) => isCommanderLane(s.desk));
  return (
    <section className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Keyboard className="size-4" />
        <span>
          {tableSize > 2
            ? "1–4 focus seat · W/S life · Shift+W/S ±5 · E/D cmd dmg · I/K poison · F rotate · R reset · Space timer"
            : commander
              ? "Q/A P1 games · O/L P2 games · W/S P1 life · I/K P2 life · F swap · R reset · Space timer"
              : "Q/A P1 games · O/L P2 games · W/S P1 resource · I/K P2 resource · F swap · R reset game · Space timer"}
        </span>
      </div>
      <p className="mt-1 hidden text-xs text-subtle sm:block">
        {GAME_LIST.map((g) => g.short).join(" · ")} — switch the strip to retarget every
        overlay. MTG has Constructed and Commander tabs.
      </p>
    </section>
  );
}
