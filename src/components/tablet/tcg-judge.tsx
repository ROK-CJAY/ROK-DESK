import { useEffect } from "react";
import { type SideId, resourceLimit } from "@/lib/desk-types";
import { useDeskStore } from "@/lib/desk-store";
import { reportMatchToBracket } from "@/lib/report-stream";
import { CardLookup } from "@/components/tablet/card-lookup";
import { PtcgJudgeBoard } from "@/components/desk/ptcg-board-panel";
import { PokeballIcon } from "@/components/overlays/pips";
import { GuideButton, TabletGuide, useTabletGuide } from "@/components/tablet/tablet-guide";
import { RoundClock } from "@/components/desk/round-clock";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function TcgJudgeTablet() {
  const ready = useDeskStore((s) => s.ready);
  const hydrate = useDeskStore((s) => s.hydrate);
  const desk = useDeskStore((s) => s.desk);
  const gameWin = useDeskStore((s) => s.gameWin);
  const matchWin = useDeskStore((s) => s.matchWin);
  const clearWinners = useDeskStore((s) => s.clearWinners);
  const bumpScore = useDeskStore((s) => s.bumpScore);
  const setResource = useDeskStore((s) => s.setResource);
  const guide = useTabletGuide("tcg");

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

  const max = resourceLimit(desk);

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
            <p className="font-mono text-[0.62rem] tracking-[0.2em] text-muted uppercase">ROK · PTCG judge</p>
            <p className="truncate font-display text-lg leading-tight font-semibold uppercase">
              {desk.eventName}
              <span className="text-muted"> · {desk.roundName}</span>
            </p>
          </div>
          <GuideButton onClick={guide.openGuide} />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto_1fr]">
          <TcgSide
            side="p1"
            name={desk.p1.name}
            deck={desk.p1.archetype}
            score={desk.p1.score}
            prizes={desk.p1.resource}
            max={max}
            gameLive={desk.gameWinnerSide === "p1"}
            matchLive={desk.winnerSide === "p1"}
            onScore={(d) => bumpScore("p1", d)}
            onPrize={(v) => setResource("p1", v)}
            onGame={() => (desk.gameWinnerSide === "p1" ? clearWinners() : gameWin("p1"))}
            onMatch={() => punchMatch("p1")}
          />

          <div className="flex flex-col items-center justify-center rounded-lg bg-surface px-4 py-3">
            <p className="font-display text-4xl leading-none font-semibold tabular-nums">
              {desk.p1.score}–{desk.p2.score}
            </p>
            <div className="mt-3 w-full">
              <RoundClock compact />
            </div>
          </div>

          <TcgSide
            side="p2"
            name={desk.p2.name}
            deck={desk.p2.archetype}
            score={desk.p2.score}
            prizes={desk.p2.resource}
            max={max}
            gameLive={desk.gameWinnerSide === "p2"}
            matchLive={desk.winnerSide === "p2"}
            align="right"
            onScore={(d) => bumpScore("p2", d)}
            onPrize={(v) => setResource("p2", v)}
            onGame={() => (desk.gameWinnerSide === "p2" ? clearWinners() : gameWin("p2"))}
            onMatch={() => punchMatch("p2")}
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        <CardLookup />
      </div>
      <TabletGuide kind="tcg" open={guide.open} onClose={guide.close} />
    </div>
  );
}

function TcgSide({
  side,
  name,
  deck,
  score,
  prizes,
  max,
  gameLive,
  matchLive,
  align = "left",
  onScore,
  onPrize,
  onGame,
  onMatch,
}: {
  side: SideId;
  name: string;
  deck: string;
  score: number;
  prizes: number;
  max: number;
  gameLive: boolean;
  matchLive: boolean;
  align?: "left" | "right";
  onScore: (delta: number) => void;
  onPrize: (value: number) => void;
  onGame: () => void;
  onMatch: () => void;
}) {
  return (
    <div className={cn("rounded-lg bg-surface p-3", align === "right" && "lg:text-right")}>
      <p className="font-mono text-[0.58rem] tracking-[0.16em] text-muted uppercase">
        {side === "p1" ? "Player 1" : "Player 2"}
      </p>
      <p className="font-display truncate text-lg font-semibold uppercase">{name || "Open"}</p>
      <p className="truncate text-sm text-muted">{deck || "—"}</p>
      <div className={cn("mt-2 flex items-center gap-2", align === "right" && "lg:justify-end")}>
        <Button variant="outline" size="score" onClick={() => onScore(-1)} aria-label={`${side} score down`}>
          −
        </Button>
        <span className="font-display min-w-8 text-center text-2xl font-semibold tabular-nums">{score}</span>
        <Button variant="outline" size="score" onClick={() => onScore(1)} aria-label={`${side} score up`}>
          +
        </Button>
      </div>
      <div className={cn("mt-2 flex flex-wrap gap-1.5", align === "right" && "lg:justify-end")}>
        {Array.from({ length: max }, (_, i) => {
          const value = i + 1;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onPrize(prizes === value ? value - 1 : value)}
              className="grid size-9 place-items-center"
              aria-label={`Set prizes to ${value}`}
            >
              <PokeballIcon filled={prizes >= value} className="size-8" />
            </button>
          );
        })}
      </div>
      <div className={cn("mt-2 flex gap-2", align === "right" && "lg:justify-end")}>
        <Button variant={gameLive ? "live" : "secondary"} onClick={onGame}>
          Game
        </Button>
        <Button variant={matchLive ? "live" : "outline"} onClick={onMatch}>
          Match
        </Button>
      </div>
      <PtcgTurnFlags side={side === "p2" ? "p2" : "p1"} align={align} />
      <PtcgJudgeBoard side={side === "p2" ? "p2" : "p1"} />
    </div>
  );
}

function PtcgTurnFlags({ side, align }: { side: "p1" | "p2"; align: "left" | "right" }) {
  const board = useDeskStore((s) => s.desk.ptcgBoard[side]);
  const patch = useDeskStore((s) => s.patch);
  const toggle = (flag: "energy" | "supporter" | "retreat") => {
    const live = useDeskStore.getState().desk.ptcgBoard;
    patch({ ptcgBoard: { ...live, [side]: { ...live[side], [flag]: !live[side][flag] } } });
  };
  return (
    <div className={cn("mt-2 grid grid-cols-3 gap-1", align === "right" && "lg:justify-end")}>
      {(["energy", "supporter", "retreat"] as const).map((flag) => (
        <button
          key={flag}
          type="button"
          onClick={() => toggle(flag)}
          className={cn(
            "rounded-md px-1 py-1.5 text-[0.62rem] font-semibold tracking-[0.12em] uppercase",
            board[flag] ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted line-through",
          )}
        >
          {flag} {board[flag] ? "on" : "off"}
        </button>
      ))}
    </div>
  );
}
