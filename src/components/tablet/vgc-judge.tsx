import { useEffect } from "react";
import { remainingFromDown, toggleMonDown, type PlayerSide, type SideId } from "@/lib/desk-types";
import { useDeskStore } from "@/lib/desk-store";
import { spriteFallbackUrl, spriteUrl, TERA_LABEL, type TeamMon } from "@/lib/pokemon-vgc";
import { TeraBadge, TypeIcon } from "@/components/overlays/type-icon";
import { reportMatchToBracket } from "@/lib/report-stream";
import { GuideButton, TabletGuide, useTabletGuide } from "@/components/tablet/tablet-guide";
import { JudgeNotes } from "@/components/tablet/judge-notes";
import { RoundClock } from "@/components/desk/round-clock";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function VgcJudgeTablet() {
  const ready = useDeskStore((s) => s.ready);
  const hydrate = useDeskStore((s) => s.hydrate);
  const desk = useDeskStore((s) => s.desk);
  const setPlayer = useDeskStore((s) => s.setPlayer);
  const gameWin = useDeskStore((s) => s.gameWin);
  const matchWin = useDeskStore((s) => s.matchWin);
  const clearWinners = useDeskStore((s) => s.clearWinners);
  const bumpScore = useDeskStore((s) => s.bumpScore);
  const guide = useTabletGuide("vgc");

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

  const toggle = (side: SideId, index: number) => {
    const player = desk[side];
    const down = toggleMonDown(player.down, index, 6);
    setPlayer(side, { down, resource: remainingFromDown(down, 6) });
  };

  const punchMatch = (side: SideId) => {
    if (desk.winnerSide === side) {
      clearWinners();
      return;
    }
    matchWin(side);
    reportMatchToBracket(side);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg" data-game={desk.gameId}>
      <header className="shrink-0 border-b border-border px-3 py-2.5 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-[0.62rem] tracking-[0.2em] text-muted uppercase">ROK · Judge tablet</p>
            <p className="truncate font-display text-lg leading-tight font-semibold uppercase">
              {desk.eventName}
              <span className="text-muted"> · {desk.roundName}</span>
            </p>
          </div>
          <GuideButton onClick={guide.openGuide} />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto_1fr]">
          <JudgeSideActions
            side="p1"
            name={desk.p1.name}
            score={desk.p1.score}
            gameLive={desk.gameWinnerSide === "p1"}
            matchLive={desk.winnerSide === "p1"}
            onScore={(d) => bumpScore("p1", d)}
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

          <JudgeSideActions
            side="p2"
            name={desk.p2.name}
            score={desk.p2.score}
            gameLive={desk.gameWinnerSide === "p2"}
            matchLive={desk.winnerSide === "p2"}
            align="right"
            onScore={(d) => bumpScore("p2", d)}
            onGame={() => (desk.gameWinnerSide === "p2" ? clearWinners() : gameWin("p2"))}
            onMatch={() => punchMatch("p2")}
          />
        </div>
      </header>

      <div className="flex-1 px-3 py-3">
        <div className="grid min-h-full gap-3 lg:grid-cols-2">
          <JudgeSide player={desk.p1} side="p1" onToggle={toggle} />
          <JudgeSide player={desk.p2} side="p2" onToggle={toggle} />
        </div>
      </div>
      <TabletGuide kind="vgc" open={guide.open} onClose={guide.close} />
    </div>
  );
}

function JudgeSideActions({
  side,
  name,
  score,
  gameLive,
  matchLive,
  align = "left",
  onScore,
  onGame,
  onMatch,
}: {
  side: SideId;
  name: string;
  score: number;
  gameLive: boolean;
  matchLive: boolean;
  align?: "left" | "right";
  onScore: (delta: number) => void;
  onGame: () => void;
  onMatch: () => void;
}) {
  return (
    <div className={cn("rounded-lg bg-surface p-3", align === "right" && "lg:text-right")}>
      <p className="font-mono text-[0.58rem] tracking-[0.16em] text-muted uppercase">
        {side === "p1" ? "Player 1" : "Player 2"}
      </p>
      <p className="font-display truncate text-lg font-semibold uppercase">{name || "Open"}</p>
      <div className={cn("mt-2 flex items-center gap-2", align === "right" && "lg:justify-end")}>
        <Button variant="outline" size="score" onClick={() => onScore(-1)} aria-label={`${side} score down`}>
          −
        </Button>
        <span className="font-display min-w-8 text-center text-2xl font-semibold tabular-nums">{score}</span>
        <Button variant="outline" size="score" onClick={() => onScore(1)} aria-label={`${side} score up`}>
          +
        </Button>
      </div>
      <div className={cn("mt-2 flex gap-2", align === "right" && "lg:justify-end")}>
        <Button variant={gameLive ? "live" : "secondary"} onClick={onGame}>
          Game
        </Button>
        <Button variant={matchLive ? "live" : "outline"} onClick={onMatch}>
          Match
        </Button>
      </div>
    </div>
  );
}

function JudgeSide({
  player,
  side,
  onToggle,
}: {
  player: PlayerSide;
  side: SideId;
  onToggle: (side: SideId, index: number) => void;
}) {
  const remaining = remainingFromDown(player.down, 6);
  return (
    <section className="flex flex-col rounded-xl border border-border bg-surface p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[0.6rem] tracking-[0.18em] text-muted uppercase">
            {side === "p1" ? "Player 1" : "Player 2"}
            {player.country ? ` · ${player.country}` : ""}
          </p>
          <h2 className="font-display truncate text-2xl leading-none font-semibold uppercase">
            {player.name || "Open"}
          </h2>
          <p className="truncate text-sm text-muted">{player.archetype || player.tag || "—"}</p>
        </div>
        <p className="font-mono shrink-0 text-sm tabular-nums text-muted">{remaining}/6</p>
      </div>
      <div className="grid gap-2">
        {player.team.map((mon, i) => (
          <JudgeMon key={`${mon.species}-${i}`} mon={mon} down={Boolean(player.down?.[i])} onToggle={() => onToggle(side, i)} />
        ))}
      </div>
      <JudgeNotes seat={side === "p2" ? "p2" : "p1"} />
    </section>
  );
}

function JudgeMon({ mon, down, onToggle }: { mon: TeamMon; down: boolean; onToggle: () => void }) {
  const art = spriteUrl(mon);
  const empty = !mon.species.trim();
  return (
    <article
      className={cn(
        "grid grid-cols-[3.25rem_minmax(0,1fr)] gap-3 rounded-lg bg-surface-2 p-2",
        down && "opacity-50",
      )}
    >
      <button type="button" onClick={onToggle} className="grid size-12 place-items-center self-start overflow-hidden rounded-full bg-surface" title={down ? "Revive" : "KO"}>
        {art ? (
          <img
            src={art}
            alt=""
            className={cn("size-full object-contain p-0.5", down && "grayscale")}
            onError={(event) => {
              const fallback = spriteFallbackUrl(mon);
              if (fallback && event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
            }}
          />
        ) : (
          <span className="size-2 rounded-full bg-muted" />
        )}
      </button>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="font-display min-w-0 truncate text-base font-semibold uppercase">
            {empty ? "Empty slot" : mon.species}
          </p>
          {!empty ? <TypeIcon type={mon.types[0]} /> : null}
          {mon.types[1] ? <TypeIcon type={mon.types[1]} /> : null}
          {mon.tera ? <TeraBadge type={mon.tera} /> : null}
        </div>
        {!empty ? (
          <>
            <p className="mt-0.5 truncate text-xs text-muted">
              {mon.ability || "—"}
              <span className="text-subtle"> · </span>
              {mon.item || "—"}
              {mon.tera ? (
                <>
                  <span className="text-subtle"> · </span>
                  Tera {TERA_LABEL[mon.tera] ?? mon.tera}
                </>
              ) : null}
            </p>
            <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
              {mon.moves.map((move, i) => (
                <li key={i} className="flex min-h-5 items-center gap-1.5 text-sm">
                  <TypeIcon type={move.type} />
                  <span className="truncate">{move.name || "—"}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-xs text-subtle">No Pokémon in this slot</p>
        )}
      </div>
    </article>
  );
}