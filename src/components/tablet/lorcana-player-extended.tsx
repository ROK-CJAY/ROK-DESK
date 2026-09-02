import { RotateCcw, Trash2 } from "lucide-react";
import { useDeskStore } from "@/lib/desk-store";
import { blankPlayer, type SideId } from "@/lib/desk-types";
import { gameDiamonds } from "@/lib/lorcana";
import { reportMatchToBracket } from "@/lib/report-stream";
import { InkPicker } from "@/components/desk/ink-picker";
import { RoundClock } from "@/components/desk/round-clock";
import { CardLookup } from "@/components/tablet/card-lookup";
import { GuideButton, TabletGuide, useTabletGuide } from "@/components/tablet/tablet-guide";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export function LorcanaPlayerExtendedTablet() {
  const desk = useDeskStore((s) => s.desk);
  const resetGame = useDeskStore((s) => s.resetGame);
  const resetMatch = useDeskStore((s) => s.resetMatch);
  const resetInfo = useDeskStore((s) => s.resetInfo);
  const guide = useTabletGuide("lorcana-player-extended");

  const clearTable = () => {
    if (!window.confirm("Clear both seats — names, inks, lore, games, and cards on stream?")) return;
    resetInfo();
  };

  return (
    <div
      className="grid h-dvh grid-rows-[auto_minmax(11rem,1fr)_minmax(8rem,28vh)] bg-bg text-fg"
      data-game="lorcana"
    >
      <header className="min-h-0 shrink-0 border-b border-border px-2 py-1.5 sm:px-3">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="min-w-0">
            <p className="font-mono text-[0.58rem] tracking-[0.2em] text-muted uppercase">
              ROK · Player tablet extended
            </p>
            <p className="truncate font-display text-base leading-tight font-semibold uppercase sm:text-lg">
              {desk.eventName || "Self-run table"}
              {desk.roundName ? <span className="text-muted"> · {desk.roundName}</span> : null}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={resetGame}>
              <RotateCcw className="size-3.5" />
              Reset game
            </Button>
            <Button variant="outline" size="sm" onClick={resetMatch}>
              Reset match
            </Button>
            <Button variant="outline" size="sm" onClick={clearTable}>
              <Trash2 className="size-3.5" />
              Clear table
            </Button>
            <GuideButton onClick={guide.openGuide} />
          </div>
        </div>
        <div className="mt-1.5">
          <RoundClock compact />
        </div>
      </header>

      <div className="grid min-h-0 grid-cols-2 overflow-hidden">
        <PlayerDesk side="p2" />
        <PlayerDesk side="p1" />
      </div>

      <div className="min-h-0 overflow-auto border-t border-border p-2 sm:p-3">
        <CardLookup catalog="lorcana" formatName={desk.formatName} compact />
      </div>
      <TabletGuide kind="lorcana-player-extended" open={guide.open} onClose={guide.close} />
    </div>
  );
}

function PlayerDesk({ side }: { side: SideId }) {
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
    <section className={cn("flex min-h-0 flex-col overflow-auto bg-surface p-2 sm:p-3", side === "p1" ? "border-l border-border" : "")}>
      <p className="font-mono text-[0.58rem] tracking-[0.18em] text-muted uppercase">{label}</p>
      <Input
        value={player.name}
        onChange={(e) => setPlayer(side, { name: e.target.value })}
        placeholder="Name on stream"
        className="mt-1.5 h-9 font-display text-base font-semibold uppercase sm:h-11 sm:text-lg"
        autoComplete="name"
        aria-label={`${label} name`}
      />
      <Input
        value={player.archetype}
        onChange={(e) => setPlayer(side, { archetype: e.target.value })}
        placeholder="Deck"
        className="mt-1.5"
        aria-label={`${label} deck`}
      />

      <div className="mt-3">
        <p className="font-mono mb-1 text-[0.58rem] tracking-[0.16em] text-muted uppercase">Inks</p>
        <InkPicker
          ink1={player.ink1}
          ink2={player.ink2}
          onChange={(next) => setPlayer(side, next)}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="font-mono text-[0.58rem] tracking-[0.16em] text-muted uppercase">Games</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => bumpScore(side, -1)}
            disabled={player.score <= 0}
            aria-label={`${label} minus one game`}
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
            aria-label={`${label} plus one game`}
            className="grid size-11 place-items-center rounded-md border border-border bg-surface-2 text-2xl leading-none text-fg active:bg-surface disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-2 flex min-h-0 flex-1 items-center justify-center gap-2 px-1">
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={() => bumpResource(side, -8)}
            className="min-w-12 rounded-md border border-border bg-surface-2 px-2 py-1.5 font-mono text-sm font-semibold tabular-nums text-fg active:bg-surface"
          >
            −8
          </button>
          <button
            type="button"
            onClick={() => bumpResource(side, -1)}
            className="grid size-14 place-items-center rounded-md border border-border bg-surface-2 text-3xl leading-none text-fg active:bg-surface"
            aria-label={`${label} minus one lore`}
          >
            −
          </button>
        </div>
        <p
          className="font-display min-w-0 flex-1 text-center leading-none font-semibold tabular-nums text-fg"
          style={{ fontSize: "clamp(2.6rem, 9vw, 7rem)" }}
        >
          {lore}
        </p>
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={() => bumpResource(side, 8)}
            className="min-w-12 rounded-md border border-border bg-surface-2 px-2 py-1.5 font-mono text-sm font-semibold tabular-nums text-fg active:bg-surface"
          >
            +8
          </button>
          <button
            type="button"
            onClick={() => bumpResource(side, 1)}
            className="grid size-14 place-items-center rounded-md border border-border bg-surface-2 text-3xl leading-none text-fg active:bg-surface"
            aria-label={`${label} plus one lore`}
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant={gameLive ? "live" : "secondary"}
          size="sm"
          className="flex-1"
          onClick={() => (gameLive ? clearWinners() : gameWin(side))}
        >
          Game
        </Button>
        <Button variant={matchLive ? "live" : "secondary"} size="sm" className="flex-1" onClick={punchMatch}>
          Match
        </Button>
        <Button variant="outline" size="sm" onClick={clearSeat}>
          <Trash2 className="size-3.5" />
          Clear seat
        </Button>
      </div>
    </section>
  );
}
