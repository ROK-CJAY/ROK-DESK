import { useDeskStore } from "@/lib/desk-store";
import { formatClock, remainingSeconds, type SideId } from "@/lib/desk-types";
import { gameDiamonds } from "@/lib/lorcana";
import { GuideButton, TabletGuide, useTabletGuide } from "@/components/tablet/tablet-guide";
import { HeadToHeadButton, StackButton, useHeadToHead, useStackedSeats } from "@/components/tablet/head-to-head";
import { LoreLogButton } from "@/components/tablet/lore-log";
import { cn } from "@/lib/cn";
import { useClockNow } from "@/lib/use-clock-now";

export function LorcanaPlayerTablet() {
  const desk = useDeskStore((s) => s.desk);
  const guide = useTabletGuide("lorcana-player");
  const face = useHeadToHead();
  const stack = useStackedSeats();
  const now = useClockNow({ live: desk.timerRunning, pauseWhenHidden: true });

  const clock = formatClock(remainingSeconds(desk, now));

  return (
    <div className="flex h-dvh flex-col bg-bg text-fg" data-game="lorcana">
      <header className="flex shrink-0 flex-col items-center gap-1 border-b border-border px-3 py-2">
        <div className="flex w-full flex-wrap items-center justify-center gap-1.5">
          <StackButton on={stack.on} onClick={stack.toggle} />
          <HeadToHeadButton on={face.on} onClick={face.toggle} />
          <LoreLogButton />
          <GuideButton onClick={guide.openGuide} />
        </div>
        <div className="text-center">
          <p className="font-mono text-[0.58rem] tracking-[0.2em] text-muted uppercase">Match clock</p>
          <p className="font-display text-[clamp(1.7rem,7vw,2.4rem)] leading-none font-semibold tabular-nums tracking-tight">
            {clock}
          </p>
        </div>
      </header>

      <div className={cn("grid min-h-0 flex-1", stack.on ? "grid-cols-1 grid-rows-2" : "grid-cols-2")}>
        <PlayerHalf side="p2" flip={face.on} stacked={stack.on} />
        <PlayerHalf side="p1" stacked={stack.on} />
      </div>
      <TabletGuide kind="lorcana-player" open={guide.open} onClose={guide.close} />
    </div>
  );
}

function PlayerHalf({ side, flip = false, stacked = false }: { side: SideId; flip?: boolean; stacked?: boolean }) {
  const player = useDeskStore((s) => s.desk[side]);
  const bestOf = useDeskStore((s) => s.desk.bestOf);
  const bumpResource = useDeskStore((s) => s.bumpResource);
  const bumpScore = useDeskStore((s) => s.bumpScore);
  const needed = gameDiamonds(bestOf);
  const lore = player.resource;
  const right = side === "p1";

  return (
    <section
      className={cn(
        "@container/seat relative flex min-h-0 flex-col bg-surface",
        right && (stacked ? "border-t border-border" : "border-l border-border"),
        flip && "rotate-180",
      )}
      style={{ containerType: "inline-size" }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-[0.58rem] tracking-[0.18em] text-muted uppercase">
            {side === "p1" ? "Player 1" : "Player 2"}
          </p>
          <p className="font-display truncate text-xl font-semibold uppercase">
            {player.name || "Open"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => bumpScore(side, -1)}
            disabled={player.score <= 0}
            aria-label={`${player.name || side} minus one game`}
            className="grid size-12 place-items-center rounded-md border border-border bg-surface-2 text-2xl leading-none text-fg active:bg-surface disabled:opacity-30"
          >
            −
          </button>
          <div className="flex min-w-12 flex-col items-center gap-1.5">
            <span className="font-display text-2xl leading-none font-semibold tabular-nums">{player.score}</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: needed }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "size-3 rotate-45 border-2",
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
            aria-label={`${player.name || side} plus one game`}
            className="grid size-12 place-items-center rounded-md border border-border bg-surface-2 text-2xl leading-none text-fg active:bg-surface disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-between px-[clamp(0.5rem,2cqw,1rem)]">
        <button
          type="button"
          onClick={() => bumpResource(side, -1)}
          className="grid size-[clamp(3rem,14cqw,4.5rem)] place-items-center rounded-lg border border-border bg-surface-2 text-[clamp(1.75rem,6cqw,2.5rem)] leading-none text-fg active:bg-surface"
          aria-label={`${player.name || side} minus one lore`}
        >
          −
        </button>
        <p
          className="font-display pointer-events-none min-w-0 text-center leading-none font-semibold tabular-nums text-fg"
          style={{ fontSize: "clamp(3.5rem, 16cqw, 8rem)" }}
        >
          {lore}
        </p>
        <button
          type="button"
          onClick={() => bumpResource(side, 1)}
          className="grid size-[clamp(3rem,14cqw,4.5rem)] place-items-center rounded-lg border border-border bg-surface-2 text-[clamp(1.75rem,6cqw,2.5rem)] leading-none text-fg active:bg-surface"
          aria-label={`${player.name || side} plus one lore`}
        >
          +
        </button>
      </div>
    </section>
  );
}
