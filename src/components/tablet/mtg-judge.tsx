import { useEffect } from "react";
import { Trophy } from "lucide-react";
import { DeltaPad } from "@/components/desk/delta-pad";
import { RoundClock } from "@/components/desk/round-clock";
import { Button } from "@/components/ui/button";
import { CardLookup } from "@/components/tablet/card-lookup";
import { GuideButton, TabletGuide, useTabletGuide } from "@/components/tablet/tablet-guide";
import { JudgeNotes } from "@/components/tablet/judge-notes";
import { extraFieldFor, formatCommanderLine, gameOf, isCommanderLane, playerTabletPath } from "@/lib/games";
import {
  SEAT_LABELS,
  isCommanderTable,
  seatsFor,
  type SeatId,
  type SideId,
} from "@/lib/desk-types";
import { useDeskStore } from "@/lib/desk-store";
import { reportMatchToBracket } from "@/lib/report-stream";
import { cn } from "@/lib/cn";

export function MtgJudgeTablet() {
  const ready = useDeskStore((s) => s.ready);
  const hydrate = useDeskStore((s) => s.hydrate);
  const desk = useDeskStore((s) => s.desk);
  const bumpScore = useDeskStore((s) => s.bumpScore);
  const bumpResource = useDeskStore((s) => s.bumpResource);
  const bumpSecondary = useDeskStore((s) => s.bumpSecondary);
  const bumpCmdDamage = useDeskStore((s) => s.bumpCmdDamage);
  const gameWin = useDeskStore((s) => s.gameWin);
  const matchWin = useDeskStore((s) => s.matchWin);
  const clearWinners = useDeskStore((s) => s.clearWinners);
  const resetGame = useDeskStore((s) => s.resetGame);
  const guide = useTabletGuide("mtg");

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
  const commander = isCommanderLane(desk);
  const pod = isCommanderTable(desk);
  const seats = pod
    ? desk.tableSize === 4
      ? (["p1", "p2", "p4", "p3"] as SeatId[])
      : seatsFor(desk.tableSize)
    : (["p1", "p2"] as SeatId[]);

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
            <p className="font-mono text-[0.62rem] tracking-[0.2em] text-muted uppercase">ROK · MTG judge</p>
            <p className="truncate font-display text-lg leading-tight font-semibold uppercase">
              {desk.eventName}
              <span className="text-muted">
                {" "}
                · {desk.formatName} · {desk.roundName}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {commander ? (
              <Button variant="outline" size="sm" asChild>
                <a href={playerTabletPath(desk.gameId, desk.matchSlot ?? 1)} target="_blank" rel="noreferrer">
                  Player tablet
                </a>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={resetGame}>
              Reset life
            </Button>
            <GuideButton onClick={guide.openGuide} />
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {pod ? (
          <div className="grid gap-3">
            <div className="rounded-lg bg-surface px-4 py-3">
              <RoundClock compact />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {seats.map((seat) => (
                <MtgSeat
                  key={seat}
                  seat={seat}
                  extraLabel={extra.label}
                  commander={commander}
                  pod
                  onLife={(d) => bumpResource(seat, d)}
                  onPoison={(d) => bumpSecondary(seat, d)}
                  onCmd={(d) => bumpCmdDamage(seat, d)}
                  onWin={() => (desk.winnerSide === seat ? clearWinners() : gameWin(seat))}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr]">
            <MtgSeat
              seat="p1"
              extraLabel={extra.label}
              commander={commander}
              onLife={(d) => bumpResource("p1", d)}
              onPoison={(d) => bumpSecondary("p1", d)}
              onCmd={(d) => bumpCmdDamage("p1", d)}
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
            <MtgSeat
              seat="p2"
              extraLabel={extra.label}
              commander={commander}
              align="right"
              onLife={(d) => bumpResource("p2", d)}
              onPoison={(d) => bumpSecondary("p2", d)}
              onCmd={(d) => bumpCmdDamage("p2", d)}
              onScore={(d) => bumpScore("p2", d)}
              onGame={() => (desk.gameWinnerSide === "p2" ? clearWinners() : gameWin("p2"))}
              onMatch={() => punchMatch("p2")}
            />
          </div>
        )}
        <div className="mt-3">
          <CardLookup catalog="mtg" formatName={desk.formatName} />
        </div>
      </div>
      <TabletGuide kind="mtg" open={guide.open} onClose={guide.close} />
    </div>
  );
}

function MtgSeat({
  seat,
  extraLabel,
  commander,
  pod = false,
  align = "left",
  onLife,
  onPoison,
  onCmd,
  onScore,
  onGame,
  onMatch,
  onWin,
}: {
  seat: SeatId;
  extraLabel: string;
  commander: boolean;
  pod?: boolean;
  align?: "left" | "right";
  onLife: (delta: number) => void;
  onPoison: (delta: number) => void;
  onCmd: (delta: number) => void;
  onScore?: (delta: number) => void;
  onGame?: () => void;
  onMatch?: () => void;
  onWin?: () => void;
}) {
  const player = useDeskStore((s) => s.desk[seat]);
  const desk = useDeskStore((s) => s.desk);
  const out = player.resource <= 0;
  const lethal = commander && (player.cmdDamage >= 21 || player.secondary >= 10);
  const rtl = align === "right";

  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-surface p-3",
        rtl && "lg:text-right",
        (out || lethal) && "border-live/50",
      )}
    >
      <div className={cn("flex items-start justify-between gap-2", rtl && "lg:flex-row-reverse")}>
        <div className="min-w-0">
          <p className="font-mono text-[0.58rem] tracking-[0.16em] text-muted uppercase">
            {pod ? SEAT_LABELS[seat] : seat === "p1" ? "Player 1" : "Player 2"}
            {out ? " · Out" : lethal ? " · Lethal" : ""}
          </p>
          <p className="font-display truncate text-lg font-semibold uppercase">{player.name || "Open"}</p>
          <p className="truncate text-sm text-muted">
            {commander ? formatCommanderLine(player.archetype, player.extra) || extraLabel : player.archetype || extraLabel}
          </p>
        </div>
        {pod && onWin ? (
          <Button variant={desk.winnerSide === seat ? "live" : "outline"} size="sm" onClick={onWin}>
            <Trophy className="size-3.5" />
            Wins
          </Button>
        ) : null}
      </div>

      <div className="mt-3">
        <div className={cn("mb-1.5 flex items-center justify-between", rtl && "lg:flex-row-reverse")}>
          <span className="text-xs text-muted">Life</span>
          <span
            className={cn(
              "font-display text-3xl font-semibold tabular-nums",
              out ? "text-live" : "text-fg",
            )}
          >
            {player.resource}
          </span>
        </div>
        <DeltaPad onDelta={onLife} size="tablet" className={cn(rtl && "lg:justify-end")} />
      </div>

      <div className={cn("mt-3 grid gap-3", commander ? "grid-cols-2" : "grid-cols-1")}>
        <div>
          <div className={cn("mb-1.5 flex items-center justify-between", rtl && "lg:flex-row-reverse")}>
            <span className="text-xs text-muted">Poison</span>
            <span className={cn("font-semibold tabular-nums", player.secondary >= 10 && "text-live")}>
              {player.secondary}
            </span>
          </div>
          <DeltaPad onDelta={onPoison} max={10} size="tablet" className={cn(rtl && "lg:justify-end")} />
        </div>
        {commander ? (
          <div>
            <div className={cn("mb-1.5 flex items-center justify-between", rtl && "lg:flex-row-reverse")}>
              <span className="text-xs text-muted">Cmd dmg</span>
              <span className={cn("font-semibold tabular-nums", player.cmdDamage >= 21 && "text-live")}>
                {player.cmdDamage}
              </span>
            </div>
            <DeltaPad onDelta={onCmd} max={21} size="tablet" className={cn(rtl && "lg:justify-end")} />
          </div>
        ) : null}
      </div>

      {!pod && onScore && onGame && onMatch ? (
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
            <Button variant={desk.gameWinnerSide === seat ? "live" : "secondary"} size="sm" onClick={onGame}>
              Game
            </Button>
            <Button variant={desk.winnerSide === seat ? "live" : "outline"} size="sm" onClick={onMatch}>
              Match
            </Button>
          </div>
        </div>
      ) : null}
      <JudgeNotes seat={seat} />
    </section>
  );
}
