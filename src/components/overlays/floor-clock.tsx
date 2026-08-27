import { MATCH_SLOT_CLOCK, formatClock, remainingSeconds, type DeskState, type MatchSlot } from "@/lib/desk-types";
import { gameOf } from "@/lib/games";
import { currentSponsor, liveSponsors } from "@/lib/sponsors";
import type { TournamentState } from "@/lib/tournament-types";
import { useClockNow } from "@/lib/use-clock-now";

const IDLE_CLOCK = { timerRunning: false, timerEndsAt: null, timerSeconds: 0 };

export function FloorClockOverlay({
  tournament,
  desk,
  variant = "floor",
}: {
  tournament: TournamentState;
  desk?: DeskState | null;
  variant?: "floor" | "stream";
}) {
  const clock = variant === "stream" ? (desk ?? IDLE_CLOCK) : tournament;
  const now = useClockNow({
    live: Boolean(clock.timerRunning),
    pauseWhenHidden: false,
    liveMs: 200,
  });
  const left = remainingSeconds(clock, now);
  const running = Boolean(clock.timerRunning);
  const preset = variant === "stream" ? (desk?.timerPresetSeconds ?? 0) : tournament.timerPresetSeconds;
  const game = gameOf(tournament.gameId);
  const status = left === 0 ? "Time" : running ? "Running" : "Paused";
  const sponsor = desk ? currentSponsor(desk.sponsors, now, desk.sponsorSeconds) : null;
  const sponsorCount = desk ? liveSponsors(desk.sponsors).length : 0;
  const stream = variant === "stream";

  return (
    <div data-game={tournament.gameId} className="relative h-full w-full overflow-hidden bg-ov-bg">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgb(255_255_255/0.06),transparent_42%)]" />
      <div className="relative flex h-full flex-col justify-between px-[4vw] py-[4vh]">
        <header className="flex items-end justify-between gap-8">
          <div className="flex min-w-0 items-end gap-[1.6vw]">
            {desk?.eventLogo ? (
              <img
                src={desk.eventLogo}
                alt=""
                className="max-h-[12vh] max-w-[18vw] object-contain"
              />
            ) : null}
            <div className="min-w-0">
              <p className="font-mono text-[clamp(0.7rem,1.1vw,0.95rem)] tracking-[0.28em] text-game uppercase">
                {game.short} · {tournament.formatName}
              </p>
              <h1 className="font-display text-[clamp(2rem,5vw,4.5rem)] font-semibold tracking-tight text-ov-fg uppercase">
                {desk?.eventName.trim() || tournament.name.trim() || game.name}
              </h1>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-[clamp(0.65rem,1vw,0.85rem)] tracking-[0.22em] text-ov-muted uppercase">
              {stream
                ? MATCH_SLOT_CLOCK[(desk?.matchSlot ?? 1) as MatchSlot]
                : "Floor clock"}
            </p>
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
            style={{ fontSize: "calc(clamp(6rem, 28vmin, 22rem) * var(--ov-scale, 1))" }}
          >
            {formatClock(left)}
          </p>
          <p
            className={`font-mono mt-[2vh] text-[clamp(1rem,2vw,1.6rem)] tracking-[0.32em] uppercase ${
              left === 0 ? "text-live" : running ? "text-ok" : "text-ov-muted"
            }`}
          >
            {status}
          </p>
        </div>

        <footer className="flex items-end justify-between gap-6">
          <p className="font-mono text-[clamp(0.6rem,1vw,0.8rem)] tracking-[0.2em] text-ov-muted uppercase">
            {stream ? "Featured / streamed match" : "All tables except the featured match"}
          </p>
          {sponsor ? (
            <div className="flex min-w-0 flex-col items-end">
              <p className="font-mono text-[clamp(0.55rem,0.9vw,0.72rem)] tracking-[0.22em] text-game uppercase">
                Presented by
              </p>
              <div className="mt-1 flex h-[7vh] max-w-[22vw] items-center justify-end">
                {sponsor.logo ? (
                  <img src={sponsor.logo} alt={sponsor.name} className="max-h-full max-w-full object-contain" />
                ) : (
                  <p className="font-display text-[clamp(1rem,2vw,1.6rem)] font-semibold text-ov-fg uppercase">
                    {sponsor.name}
                  </p>
                )}
              </div>
              {sponsorCount > 1 ? (
                <div className="mt-1.5 flex gap-1.5">
                  {liveSponsors(desk?.sponsors).map((row) => (
                    <span
                      key={row.id}
                      className={`size-1.5 rounded-full ${row.id === sponsor.id ? "bg-game" : "bg-ov-fg/25"}`}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="font-mono text-[clamp(0.6rem,1vw,0.8rem)] tracking-[0.2em] text-ov-muted uppercase">
              Set {formatClock(preset)}
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}
