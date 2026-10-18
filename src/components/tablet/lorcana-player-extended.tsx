import { RotateCcw, Trash2 } from "lucide-react";
import { useDeskStore } from "@/lib/desk-store";
import { blankPlayer, type SideId } from "@/lib/desk-types";
import { gameDiamonds } from "@/lib/lorcana";
import { reportMatchToBracket } from "@/lib/report-stream";
import { InkPicker } from "@/components/desk/ink-picker";
import { RoundClock } from "@/components/desk/round-clock";
import { GuideButton, TabletGuide, useTabletGuide } from "@/components/tablet/tablet-guide";
import { HeadToHeadButton, StackButton, useHeadToHead, useStackedSeats } from "@/components/tablet/head-to-head";
import { LoreLogButton } from "@/components/tablet/lore-log";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export function LorcanaPlayerExtendedTablet() {
  const desk = useDeskStore((s) => s.desk);
  const resetGame = useDeskStore((s) => s.resetGame);
  const resetMatch = useDeskStore((s) => s.resetMatch);
  const resetInfo = useDeskStore((s) => s.resetInfo);
  const guide = useTabletGuide("lorcana-player-extended");
  const face = useHeadToHead();
  const stack = useStackedSeats();

  const clearTable = () => {
    if (!window.confirm("Clear both seats — names, inks, lore, and games?")) return;
    resetInfo();
  };

  return (
    <div className="flex h-dvh flex-col bg-bg text-fg" data-game="lorcana">
      <header className="shrink-0 border-b border-border px-3 py-1.5">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
          <div className="min-w-0">
            <p className="font-mono text-[0.58rem] tracking-[0.2em] text-muted uppercase">ROK · Player tablet extended</p>
            <p className="truncate font-display text-base leading-none font-semibold uppercase">
              {desk.eventName || "Self-run table"}
              {desk.roundName ? <span className="text-muted"> · {desk.roundName}</span> : null}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1">
            <Button variant="outline" size="sm" className="h-8 px-2" onClick={resetGame}>
              <RotateCcw className="size-3.5" />
              Reset game
            </Button>
            <Button variant="outline" size="sm" className="h-8 px-2" onClick={resetMatch}>
              Reset match
            </Button>
            <Button variant="outline" size="sm" className="h-8 px-2" onClick={clearTable}>
              <Trash2 className="size-3.5" />
              Clear table
            </Button>
            <StackButton on={stack.on} onClick={stack.toggle} />
            <HeadToHeadButton on={face.on} onClick={face.toggle} />
            <LoreLogButton />
            <GuideButton onClick={guide.openGuide} />
          </div>
        </div>
        <div className="mt-1.5">
          <RoundClock compact />
        </div>
      </header>

      <div className={cn("grid min-h-0 flex-1", stack.on ? "grid-cols-1 grid-rows-2" : "grid-cols-2")}>
        <PlayerDesk side="p2" flip={face.on} stacked={stack.on} />
        <PlayerDesk side="p1" stacked={stack.on} />
      </div>
      <TabletGuide kind="lorcana-player-extended" open={guide.open} onClose={guide.close} />
    </div>
  );
}

function PlayerDesk({ side, flip = false, stacked = false }: { side: SideId; flip?: boolean; stacked?: boolean }) {
  const player = useDeskStore((s) => s.desk[side]);
  const desk = useDeskStore((s) => s.desk);
  const setPlayer = useDeskStore((s) => s.setPlayer);
  const bumpResource = useDeskStore((s) => s.bumpResource);
  const bumpScore = useDeskStore((s) => s.bumpScore);
  const gameWin = useDeskStore((s) => s.gameWin);
  const matchWin = useDeskStore((s) => s.matchWin);
  const clearWinners = useDeskStore((s) => s.clearWinners);
  const needed = gameDiamonds(desk.bestOf);
  const lore = player.resource;
  const label = side === "p1" ? "Player 1" : "Player 2";
  const gameLive = desk.gameWinnerSide === side;
  const matchLive = desk.winnerSide === side;

  const clearSeat = () => {
    if (!window.confirm(`Clear ${player.name || label} from stream?`)) return;
    setPlayer(side, blankPlayer({ resource: 0, score: 0 }));
    if (gameLive || matchLive) clearWinners();
  };

  const punchMatch = () => {
    if (matchLive) {
      clearWinners();
      return;
    }
    matchWin(side);
    reportMatchToBracket(side);
  };

  return (
    <section
      className={cn(
        "@container/desk grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-surface",
        side === "p1" && (stacked ? "border-t border-border" : "border-l border-border"),
        flip && "rotate-180",
      )}
      style={{ containerType: "inline-size" }}
    >
      <div className="min-w-0 px-[clamp(0.4rem,2cqw,0.75rem)] pt-2">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[0.58rem] tracking-[0.18em] text-muted uppercase">{label}</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => bumpScore(side, -1)}
              disabled={player.score <= 0}
              aria-label={`${label} minus one game`}
              className="grid size-[clamp(1.6rem,9cqw,2.25rem)] place-items-center rounded-md border border-border bg-surface-2 text-[clamp(0.95rem,4cqw,1.25rem)] leading-none text-fg active:bg-surface disabled:opacity-30"
            >
              −
            </button>
            <div className="flex min-w-6 flex-col items-center gap-0.5">
              <span className="font-display text-[clamp(0.85rem,4cqw,1rem)] leading-none font-semibold tabular-nums">{player.score}</span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: needed }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "size-[clamp(0.35rem,1.6cqw,0.5rem)] rotate-45 border",
                      i < player.score ? "border-accent bg-accent" : "border-muted bg-transparent",
                    )}
                  />
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => bumpScore(side, 1)}
              disabled={player.score >= needed}
              aria-label={`${label} plus one game`}
              className="grid size-[clamp(1.6rem,9cqw,2.25rem)] place-items-center rounded-md border border-border bg-surface-2 text-[clamp(0.95rem,4cqw,1.25rem)] leading-none text-fg active:bg-surface disabled:opacity-30"
            >
              +
            </button>
          </div>
        </div>
        <Input
          value={player.name}
          onChange={(e) => setPlayer(side, { name: e.target.value })}
          placeholder="Name on stream"
          className="mt-1.5 h-[clamp(1.8rem,8cqw,2.25rem)] font-display text-[clamp(0.8rem,3.6cqw,1rem)] font-semibold uppercase"
          autoComplete="name"
          aria-label={`${label} name`}
        />
        <Input
          value={player.archetype}
          onChange={(e) => setPlayer(side, { archetype: e.target.value })}
          placeholder="Deck"
          className="mt-1 h-[clamp(1.7rem,7cqw,2rem)] text-[clamp(0.75rem,3.2cqw,0.9rem)]"
          aria-label={`${label} deck`}
        />
        <div className="mt-1.5 min-w-0 overflow-hidden pb-1">
          <InkPicker ink1={player.ink1} ink2={player.ink2} size="sm" quiet onChange={(next) => setPlayer(side, next)} />
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 items-center justify-center gap-[clamp(0.25rem,2cqw,0.75rem)] px-2">
        <button
          type="button"
          onClick={() => bumpResource(side, -1)}
          className="grid size-[clamp(2rem,13cqw,3.25rem)] place-items-center rounded-md border border-border bg-surface-2 text-[clamp(1.15rem,5cqw,1.85rem)] leading-none text-fg active:bg-surface"
          aria-label={`${label} minus one lore`}
        >
          −
        </button>
        <p
          className="font-display w-[3.2ch] min-w-0 text-center leading-none font-semibold tabular-nums text-fg"
          style={{ fontSize: "clamp(1.6rem, 16cqw, 5rem)" }}
        >
          {lore}
        </p>
        <button
          type="button"
          onClick={() => bumpResource(side, 1)}
          className="grid size-[clamp(2rem,13cqw,3.25rem)] place-items-center rounded-md border border-border bg-surface-2 text-[clamp(1.15rem,5cqw,1.85rem)] leading-none text-fg active:bg-surface"
          aria-label={`${label} plus one lore`}
        >
          +
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1.5 px-3 pt-1 pb-2">
        <Button variant={gameLive ? "live" : "secondary"} size="sm" onClick={() => (gameLive ? clearWinners() : gameWin(side))}>
          Game
        </Button>
        <Button variant={matchLive ? "live" : "secondary"} size="sm" onClick={punchMatch}>
          Match
        </Button>
        <Button variant="outline" size="sm" onClick={clearSeat}>
          Clear
        </Button>
      </div>
    </section>
  );
}
