import { useEffect, useState } from "react";
import { formatClock, remainingSeconds } from "@/lib/desk-types";
import { gameOf } from "@/lib/games";
import type { TournamentState } from "@/lib/tournament-types";

export function FloorClockOverlay({ tournament }: { tournament: TournamentState }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, []);

  const left = remainingSeconds(tournament, now);
  const game = gameOf(tournament.gameId);
  const status = left === 0 ? "Time" : tournament.timerRunning ? "Running" : "Paused";

  return (
    <div data-game={tournament.gameId} className="relative h-full w-full overflow-hidden bg-ov-bg">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgb(255_255_255/0.06),transparent_42%)]" />
      <div className="relative flex h-full flex-col justify-between px-[4vw] py-[4vh]">
        <header className="flex items-end justify-between gap-8">
          <div>
            <p className="font-mono text-[clamp(0.7rem,1.1vw,0.95rem)] tracking-[0.28em] text-game uppercase">
              {game.short} · {tournament.formatName}
            </p>
            <h1 className="font-display text-[clamp(2rem,5vw,4.5rem)] font-semibold tracking-tight text-ov-fg uppercase">
              {tournament.name}
            </h1>
          </div>
          <div className="text-right">
            <p className="font-mono text-[clamp(0.65rem,1vw,0.85rem)] tracking-[0.22em] text-ov-muted uppercase">Floor clock</p>
            <p className="font-display text-[clamp(1.2rem,2.4vw,2rem)] font-semibold text-ov-fg uppercase">
              {tournament.bracketType === "swiss" ? "Swiss" : tournament.bracketType === "double" ? "Double elim" : "Single elim"}
              {" · "}
              Bo{tournament.bestOf}
            </p>
          </div>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center">
          <p
            className={`font-display leading-none font-semibold tabular-nums tracking-tight ${
              left === 0 ? "text-live" : "text-ov-fg"
            }`}
            style={{ fontSize: "clamp(6rem, 28vmin, 22rem)" }}
          >
            {formatClock(left)}
          </p>
          <p
            className={`font-mono mt-[2vh] text-[clamp(1rem,2vw,1.6rem)] tracking-[0.32em] uppercase ${
              left === 0 ? "text-live" : tournament.timerRunning ? "text-ok" : "text-ov-muted"
            }`}
          >
            {status}
          </p>
        </div>

        <footer className="flex items-end justify-between gap-6">
          <p className="font-mono text-[clamp(0.6rem,1vw,0.8rem)] tracking-[0.2em] text-ov-muted uppercase">
            All tables except the featured match
          </p>
          <p className="font-mono text-[clamp(0.6rem,1vw,0.8rem)] tracking-[0.2em] text-ov-muted uppercase">
            Set {formatClock(tournament.timerPresetSeconds)}
          </p>
        </footer>
      </div>
    </div>
  );
}
