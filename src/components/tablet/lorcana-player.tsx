import { useDeskStore } from "@/lib/desk-store";
import { formatClock, remainingSeconds, type SideId } from "@/lib/desk-types";
import { gameDiamonds } from "@/lib/lorcana";
import { GuideButton, TabletGuide, useTabletGuide } from "@/components/tablet/tablet-guide";
import { HeadToHeadButton, RailSideButton, SeatFlipButton, StackButton, useHeadToHead, useP1First, useRailRight, useStackedSeats } from "@/components/tablet/head-to-head";
import { LoreLogButton } from "@/components/tablet/lore-log";
import { cn } from "@/lib/cn";
import { useClockNow } from "@/lib/use-clock-now";
import type { ReactNode } from "react";

function seatColor(side: SideId) {
  return side === "p1" ? "#dc2626" : "#2563eb";
}

function SharedLoreBar({
  compact = false,
  leftSide = "p2",
  rightSide = "p1",
  mirror = false,
}: {
  compact?: boolean;
  leftSide?: SideId;
  rightSide?: SideId;
  mirror?: boolean;
}) {
  const leftLore = Math.max(0, Math.min(20, useDeskStore((s) => s.desk[leftSide].resource)));
  const rightLore = Math.max(0, Math.min(20, useDeskStore((s) => s.desk[rightSide].resource)));
  const leftColor = seatColor(leftSide);
  const rightColor = seatColor(rightSide);
  const leftCells = Array.from({ length: 19 }, (_, i) => {
    const n = i + 1;
    return { key: `${leftSide}-${n}`, n, on: leftLore >= n, color: leftColor };
  });
  const rightCells = Array.from({ length: 19 }, (_, i) => {
    const n = 19 - i;
    return { key: `${rightSide}-${n}`, n, on: rightLore >= n, color: rightColor };
  });
  const mid = {
    key: "mid-20",
    n: 20,
    on: leftLore >= 20 || rightLore >= 20,
    color: leftLore >= 20 ? leftColor : rightColor,
  };
  const forward = [...leftCells, mid, ...rightCells];
  const cells = mirror ? [...forward].reverse() : forward;
  return (
    <div className={cn("shrink-0 border-b border-border bg-surface", compact ? "px-2 py-0.5" : "px-2 py-1.5")}>
      <div className={cn("flex items-stretch gap-px", compact ? "h-5" : "h-7")}>
        {cells.map((cell) => (
          <div
            key={cell.key}
            className={cn(
              "flex min-w-0 flex-1 items-center justify-center rounded-[1px] font-mono leading-none tabular-nums",
              cell.on ? "text-white" : "bg-surface-2 text-muted",
            )}
            style={{
              fontSize: "clamp(0.4rem, 1.15vw, 0.62rem)",
              background: cell.on ? cell.color : undefined,
            }}
          >
            {cell.n}
          </div>
        ))}
      </div>
    </div>
  );
}

function TabletChrome({
  clock,
  stack,
  face,
  seats,
  railSide,
  onGuide,
  onSwap,
  compact = false,
  leftSide = "p2",
  rightSide = "p1",
  mirror = false,
}: {
  clock: string;
  stack: { on: boolean; toggle: () => void };
  face: { on: boolean; toggle: () => void };
  seats: { on: boolean; toggle: () => void };
  railSide: { on: boolean; toggle: () => void } | null;
  onGuide: () => void;
  onSwap: () => void;
  compact?: boolean;
  leftSide?: SideId;
  rightSide?: SideId;
  mirror?: boolean;
}) {
  return (
    <>
      <header className={cn("flex shrink-0 items-center justify-between gap-3 border-b border-border", compact ? "px-3 py-1" : "px-3 py-2")}>
        <div className="flex flex-wrap items-center gap-1.5">
          <StackButton on={stack.on} onClick={stack.toggle} />
          <HeadToHeadButton on={face.on} onClick={face.toggle} />
          <SeatFlipButton on={seats.on} onClick={seats.toggle} stacked={stack.on} />
          {railSide ? <RailSideButton on={railSide.on} onClick={railSide.toggle} /> : null}
          <button
            type="button"
            onClick={onSwap}
            className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-muted"
          >
            Swap
          </button>
          <LoreLogButton />
          <GuideButton onClick={onGuide} />
        </div>
        <div className="shrink-0 text-center">
          <p className="font-mono text-[0.58rem] tracking-[0.2em] text-muted uppercase">Match clock</p>
          <p className={cn("font-display leading-none font-semibold tabular-nums tracking-tight", compact ? "text-[clamp(1.25rem,4vw,1.65rem)]" : "text-[clamp(1.7rem,7vw,2.4rem)]")}>
            {clock}
          </p>
        </div>
      </header>
      <SharedLoreBar compact={compact} leftSide={leftSide} rightSide={rightSide} mirror={mirror} />
    </>
  );
}

export function LorcanaPlayerTablet() {
  const desk = useDeskStore((s) => s.desk);
  const guide = useTabletGuide("lorcana-player");
  const face = useHeadToHead();
  const stack = useStackedSeats();
  const seats = useP1First();
  const railSide = useRailRight();
  const now = useClockNow({ live: desk.timerRunning, pauseWhenHidden: true });

  const swapSides = useDeskStore((s) => s.swapSides);
  const clock = formatClock(remainingSeconds(desk, now));
  const rail = stack.on && face.on;
  const bands = !stack.on && face.on;
  const first = seats.on ? "p1" : "p2";
  const second = seats.on ? "p2" : "p1";
  const chrome = (reader: SideId, opponent: SideId) => (
    <TabletChrome
      clock={clock}
      stack={stack}
      face={face}
      seats={seats}
      railSide={rail ? railSide : null}
      onGuide={guide.openGuide}
      onSwap={swapSides}
      compact={bands}
      leftSide={reader}
      rightSide={opponent}
    />
  );

  return (
    <div className={cn("flex h-dvh bg-bg text-fg", rail ? "flex-row" : "flex-col")} data-game="lorcana">
      {rail && !railSide.on ? <SideColumn>{chrome(second, first)}</SideColumn> : null}
      {bands ? <div className="shrink-0 rotate-180">{chrome(first, second)}</div> : null}
      {!rail && !bands ? chrome(first, second) : null}

      <div className={cn("grid min-h-0 min-w-0 flex-1", stack.on ? "grid-cols-1 grid-rows-2" : "grid-cols-2")}>
        <PlayerHalf side={first} flip={face.on} stacked={stack.on} />
        <PlayerHalf side={second} stacked={stack.on} divide />
      </div>
      {bands ? <div className="shrink-0">{chrome(second, first)}</div> : null}
      {rail && railSide.on ? <SideColumn edge="right">{chrome(second, first)}</SideColumn> : null}
      <TabletGuide kind="lorcana-player" open={guide.open} onClose={guide.close} />
    </div>
  );
}

function SideColumn({ edge = "left", children }: { edge?: "left" | "right"; children: ReactNode }) {
  return (
    <aside
      className={cn(
        "relative h-full w-[8.25rem] shrink-0 overflow-hidden bg-surface",
        edge === "right" ? "border-l border-border" : "border-r border-border",
      )}
    >
      <div
        className="absolute left-0 flex origin-top-left -rotate-90 flex-col bg-surface"
        style={{ top: "100%", width: "100dvh", height: "8.25rem" }}
      >
        {children}
      </div>
    </aside>
  );
}

function PlayerHalf({ side, flip = false, stacked = false, divide = false }: { side: SideId; flip?: boolean; stacked?: boolean; divide?: boolean }) {
  const player = useDeskStore((s) => s.desk[side]);
  const bestOf = useDeskStore((s) => s.desk.bestOf);
  const bumpResource = useDeskStore((s) => s.bumpResource);
  const bumpScore = useDeskStore((s) => s.bumpScore);
  const needed = gameDiamonds(bestOf);
  const lore = player.resource;
  const tint = seatColor(side);

  return (
    <section
      className={cn(
        "@container/seat relative flex min-h-0 flex-col overflow-hidden bg-surface",
        divide && (stacked ? "border-t border-border" : "border-l border-border"),
        flip && "rotate-180",
      )}
      style={{ containerType: "size" }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-[0.58rem] tracking-[0.18em] text-muted uppercase">
            {side === "p1" ? "Player 1" : "Player 2"}
          </p>
          <p className="font-display truncate text-xl font-semibold uppercase" style={{ color: tint }}>
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
            <span className="font-display text-2xl leading-none font-semibold tabular-nums" style={{ color: tint }}>{player.score}</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: needed }, (_, i) => (
                <span
                  key={i}
                  className={cn("size-3 rotate-45 border-2", i < player.score ? "" : "border-muted bg-transparent")}
                  style={i < player.score ? { borderColor: tint, background: tint } : undefined}
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
          className="grid h-[clamp(4.25rem,34cqh,7.5rem)] w-[clamp(3.75rem,18cqw,6rem)] place-items-center rounded-lg border border-border bg-surface-2 text-[clamp(2rem,8cqh,3.25rem)] leading-none text-fg active:bg-surface"
          aria-label={`${player.name || side} minus one lore`}
        >
          −
        </button>
        <p
          className="font-display pointer-events-none min-w-0 text-center leading-none font-semibold tabular-nums"
          style={{ fontSize: "clamp(3.5rem, 16cqw, 8rem)", color: tint }}
        >
          {lore}
        </p>
        <button
          type="button"
          onClick={() => bumpResource(side, 1)}
          className="grid h-[clamp(4.25rem,34cqh,7.5rem)] w-[clamp(3.75rem,18cqw,6rem)] place-items-center rounded-lg border border-border bg-surface-2 text-[clamp(2rem,8cqh,3.25rem)] leading-none text-fg active:bg-surface"
          aria-label={`${player.name || side} plus one lore`}
        >
          +
        </button>
      </div>
    </section>
  );
}
