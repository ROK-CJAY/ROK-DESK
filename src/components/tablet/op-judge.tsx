import { useEffect } from "react";
import { type SideId, resourceLimit } from "@/lib/desk-types";
import { useDeskStore } from "@/lib/desk-store";
import { reportMatchToBracket } from "@/lib/report-stream";
import { extraFieldFor, gameOf } from "@/lib/games";
import { CardLookup } from "@/components/tablet/card-lookup";
import { GuideButton, TabletGuide, useTabletGuide } from "@/components/tablet/tablet-guide";
import { DeltaPad } from "@/components/desk/delta-pad";
import { RoundClock } from "@/components/desk/round-clock";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function OpJudgeTablet() {
  const ready = useDeskStore((s) => s.ready);
  const hydrate = useDeskStore((s) => s.hydrate);
  const desk = useDeskStore((s) => s.desk);
  const gameWin = useDeskStore((s) => s.gameWin);
  const matchWin = useDeskStore((s) => s.matchWin);
  const clearWinners = useDeskStore((s) => s.clearWinners);
  const bumpScore = useDeskStore((s) => s.bumpScore);
  const setResource = useDeskStore((s) => s.setResource);
  const bumpSecondary = useDeskStore((s) => s.bumpSecondary);
  const resetGame = useDeskStore((s) => s.resetGame);
  const guide = useTabletGuide("op");

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        lock = await navigator.wakeLock?.request("screen");
      } catch {
        /* unsupported */
      }
    };
    void request();
    const onVis = () => {
      if (document.visibilityState === "visible") void request();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      void lock?.release();
    };
  }, []);

  if (!ready) {
    return <div className="grid h-dvh place-items-center bg-bg text-muted">Loading tablet…</div>;
  }

  const game = gameOf(desk.gameId);
  const extra = extraFieldFor(desk.gameId, desk.formatName);
  const maxLife = resourceLimit(desk);

  const punchMatch = (side: SideId) => {
    if (desk.winnerSide === side) {
      clearWinners();
      return;
    }
    matchWin(side);
    reportMatchToBracket(side);
  };

  return (
    <div className="flex h-dvh flex-col bg-bg text-fg" data-game={desk.gameId}>
      <header className="shrink-0 border-b border-border px-3 py-2.5 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-[0.62rem] tracking-[0.2em] text-muted uppercase">ROK · OP judge</p>
            <p className="truncate font-display text-lg leading-tight font-semibold uppercase">
              {desk.eventName}
              <span className="text-muted">
                {" "}
                · {desk.formatName} · {desk.roundName}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={resetGame}>
              Reset life
            </Button>
            <GuideButton onClick={guide.openGuide} />
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr]">
          <OpSeat
            side="p1"
            extraLabel={extra.label}
            maxLife={maxLife}
            onLife={(v) => setResource("p1", v)}
            onDon={(d) => bumpSecondary("p1", d)}
            onScore={(d) => bumpScore("p1", d)}
            onGame={() => (desk.gameWinnerSide === "p1" ? clearWinners() : gameWin("p1"))}
            onMatch={() => punchMatch("p1")}
          />
          <div className="flex flex-col items-center justify-center rounded-lg bg-surface px-4 py-3">
            <p className="font-mono text-[0.58rem] tracking-[0.16em] text-muted uppercase">{game.scoreLabel}</p>
            <p className="font-display text-4xl leading-none font-semibold tabular-nums">
              {desk.p1.score}–{desk.p2.score}
            </p>
            <div className="mt-3 w-full">
              <RoundClock compact />
            </div>
          </div>
          <OpSeat
            side="p2"
            extraLabel={extra.label}
            maxLife={maxLife}
            align="right"
            onLife={(v) => setResource("p2", v)}
            onDon={(d) => bumpSecondary("p2", d)}
            onScore={(d) => bumpScore("p2", d)}
            onGame={() => (desk.gameWinnerSide === "p2" ? clearWinners() : gameWin("p2"))}
            onMatch={() => punchMatch("p2")}
          />
        </div>
        <div className="mt-3">
          <CardLookup catalog="op" />
        </div>
      </div>
      <TabletGuide kind="op" open={guide.open} onClose={guide.close} />
    </div>
  );
}

function OpSeat({
  side,
  extraLabel,
  maxLife,
  align = "left",
  onLife,
  onDon,
  onScore,
  onGame,
  onMatch,
}: {
  side: SideId;
  extraLabel: string;
  maxLife: number;
  align?: "left" | "right";
  onLife: (value: number) => void;
  onDon: (delta: number) => void;
  onScore: (delta: number) => void;
  onGame: () => void;
  onMatch: () => void;
}) {
  const player = useDeskStore((s) => s.desk[side]);
  const desk = useDeskStore((s) => s.desk);
  const out = player.resource <= 0;
  const rtl = align === "right";

  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-surface p-3",
        rtl && "lg:text-right",
        out && "border-live/50",
      )}
    >
      <p className="font-mono text-[0.58rem] tracking-[0.16em] text-muted uppercase">
        {side === "p1" ? "Player 1" : "Player 2"}
        {out ? " · 0 life" : ""}
      </p>
      <p className="font-display truncate text-lg font-semibold uppercase">{player.name || "Open"}</p>
      <p className="truncate text-sm text-muted">{player.extra || player.archetype || extraLabel}</p>

      <div className="mt-3">
        <p className={cn("mb-1.5 text-xs text-muted")}>Life {player.resource}/{maxLife}</p>
        <div className={cn("flex flex-wrap gap-1.5", rtl && "lg:justify-end")}>
          {Array.from({ length: maxLife }, (_, i) => {
            const value = i + 1;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onLife(player.resource === value ? value - 1 : value)}
                className={cn(
                  "size-9 rounded-full border",
                  player.resource >= value ? "border-accent bg-accent" : "border-border bg-transparent",
                )}
                aria-label={`Set life to ${value}`}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        <div className={cn("mb-1.5 flex items-center justify-between", rtl && "lg:flex-row-reverse")}>
          <span className="text-xs text-muted">DON!!</span>
          <span className="font-display text-2xl font-semibold tabular-nums">{player.secondary}</span>
        </div>
        <DeltaPad onDelta={onDon} max={10} size="tablet" className={cn(rtl && "lg:justify-end")} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className={cn("flex items-center gap-2", rtl && "lg:flex-row-reverse")}>
          <Button variant="outline" size="score" onClick={() => onScore(-1)}>
            −
          </Button>
          <span className="font-display min-w-8 text-center text-2xl font-semibold tabular-nums">{player.score}</span>
          <Button variant="outline" size="score" onClick={() => onScore(1)}>
            +
          </Button>
        </div>
        <div className={cn("flex gap-1.5", rtl && "lg:flex-row-reverse")}>
          <Button variant={desk.gameWinnerSide === side ? "live" : "secondary"} size="sm" onClick={onGame}>
            Game
          </Button>
          <Button variant={desk.winnerSide === side ? "live" : "outline"} size="sm" onClick={onMatch}>
            Match
          </Button>
        </div>
      </div>
    </section>
  );
}
