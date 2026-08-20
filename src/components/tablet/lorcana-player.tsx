import { useDeskStore } from "@/lib/desk-store";
import { formatClock, remainingSeconds, type SideId } from "@/lib/desk-types";
import { gameDiamonds } from "@/lib/lorcana";
import { GuideButton, TabletGuide, useTabletGuide } from "@/components/tablet/tablet-guide";
import { cn } from "@/lib/cn";
import { useEffect, useState } from "react";

const LORE_STEPS = [8, -8, 1, -1];

export function LorcanaPlayerTablet() {
  const desk = useDeskStore((s) => s.desk);
  const guide = useTabletGuide("lorcana-player");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const clock = formatClock(remainingSeconds(desk, now));

  return (
    <div className="flex h-dvh flex-col bg-bg text-fg" data-game="lorcana">
      <header className="relative flex shrink-0 items-center justify-center border-b border-border px-4 py-2.5">
        <div className="text-center">
          <p className="font-mono text-[0.58rem] tracking-[0.2em] text-muted uppercase">Match clock</p>
          <p className="font-display text-[2.4rem] leading-none font-semibold tabular-nums tracking-tight">
            {clock}
          </p>
        </div>
        <div className="absolute top-2 right-3">
          <GuideButton onClick={guide.openGuide} />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-2">
        <PlayerHalf side="p2" />
        <PlayerHalf side="p1" />
      </div>
      <TabletGuide kind="lorcana-player" open={guide.open} onClose={guide.close} />
    </div>
  );
}

function PlayerHalf({ side }: { side: SideId }) {
  const player = useDeskStore((s) => s.desk[side]);
  const bestOf = useDeskStore((s) => s.desk.bestOf);
  const bumpResource = useDeskStore((s) => s.bumpResource);
  const bumpScore = useDeskStore((s) => s.bumpScore);
  const needed = gameDiamonds(bestOf);
  const lore = player.resource;
  const right = side === "p1";

  return (
    <section className={cn("relative flex min-h-0 flex-col bg-surface", right ? "border-l border-border" : "")}>
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
            className="grid size-11 place-items-center rounded-md border border-border bg-surface-2 text-2xl leading-none text-fg active:bg-surface disabled:opacity-30"
          >
            −
          </button>
          <div className="flex min-w-10 flex-col items-center gap-1">
            <span className="font-display text-lg leading-none font-semibold tabular-nums">{player.score}</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: needed }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "size-2.5 rotate-45 border-2",
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
            className="grid size-11 place-items-center rounded-md border border-border bg-surface-2 text-2xl leading-none text-fg active:bg-surface disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <button
          type="button"
          onClick={() => bumpResource(side, 1)}
          className="flex flex-1 items-end justify-center pb-2 text-4xl font-light text-subtle active:bg-fg/5"
          aria-label={`${player.name || side} plus one lore`}
        >
          +
        </button>
        <p
          className="font-display pointer-events-none text-center leading-none font-semibold tabular-nums text-fg"
          style={{ fontSize: "clamp(5.5rem, 18vw, 10rem)" }}
        >
          {lore}
        </p>
        <button
          type="button"
          onClick={() => bumpResource(side, -1)}
          className="flex flex-1 items-start justify-center pt-2 text-4xl font-light text-subtle active:bg-fg/5"
          aria-label={`${player.name || side} minus one lore`}
        >
          −
        </button>
      </div>

      <div className={cn("absolute top-1/2 flex -translate-y-1/2 flex-col gap-2", right ? "right-2" : "left-2")}>
        {LORE_STEPS.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => bumpResource(side, step)}
            className="min-w-11 rounded-md border border-border bg-surface-2 px-2 py-1.5 font-mono text-sm font-semibold tabular-nums text-fg active:bg-surface"
          >
            {step > 0 ? `+${step}` : step}
          </button>
        ))}
      </div>
    </section>
  );
}
