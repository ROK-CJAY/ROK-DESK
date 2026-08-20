import { gameOf } from "@/lib/games";
import { computeStandings, groupByRound, matchesForView } from "@/lib/tournament-bracket";
import {
  DRAW_ID,
  championOf,
  entrantById,
  matchSlots,
  type BracketMatch,
  type TournamentState,
} from "@/lib/tournament-types";
import { cn } from "@/lib/cn";

export function BracketOverlay({ tournament }: { tournament: TournamentState }) {
  if (tournament.bracketType === "swiss") {
    return <SwissOverlay tournament={tournament} />;
  }
  return <ElimOverlay tournament={tournament} />;
}

function viewTitle(tournament: TournamentState) {
  const view = tournament.overlayView;
  if (tournament.bracketType === "swiss") {
    if (view === "standings") return "Standings";
    if (view === "top8") return "Top 8";
    if (view === "top4") return "Top 4";
    if (view === "top16") return "Top 16";
    return `Swiss · ${tournament.swissRounds} rounds`;
  }
  if (view === "full") return tournament.bracketType === "double" ? "Full · Double elim" : "Full · Single elim";
  if (view === "winners") return "Winners side";
  if (view === "losers") return "Losers side";
  if (view === "finals") return "Finals";
  if (view === "top16") return "Top 16";
  if (view === "top8") return "Top 8";
  return "Top 4";
}

function SwissOverlay({ tournament }: { tournament: TournamentState }) {
  const game = gameOf(tournament.gameId);
  const standings = computeStandings(tournament);
  const cut =
    tournament.overlayView === "top4" ? 4 : tournament.overlayView === "top8" ? 8 : tournament.overlayView === "top16" ? 16 : standings.length;
  const table = standings.slice(0, cut);
  const showRounds = tournament.overlayView === "full";
  const matches = matchesForView(tournament, tournament.overlayView);
  const groups = groupByRound(matches);
  const leader = standings[0] ? entrantById(tournament, standings[0].entrantId) : null;

  return (
    <div data-game={tournament.gameId} className="absolute inset-0 overflow-hidden bg-ov-bg/92 px-10 py-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="font-mono text-ov-kicker tracking-[0.28em] text-game uppercase">
            {game.short} · {tournament.formatName}
          </p>
          <h1 className="font-display text-5xl font-semibold tracking-tight text-ov-fg uppercase">{tournament.name}</h1>
        </div>
        <div className="text-right">
          <p className="font-mono text-ov-kicker tracking-[0.2em] text-ov-muted uppercase">{viewTitle(tournament)}</p>
          <p className="font-display text-2xl font-semibold text-ov-fg uppercase">
            {leader
              ? `${tournament.phase === "complete" ? "Champion" : "Leader"} · ${leader.name}`
              : `Bo${tournament.bestOf}`}
          </p>
        </div>
      </header>

      <div className={`mt-6 grid h-[860px] gap-6 ${showRounds ? "grid-cols-[1.1fr_0.9fr]" : ""}`}>
        <div className="min-h-0 overflow-hidden">
          <p className="font-mono mb-2 text-[0.65rem] tracking-[0.2em] text-ov-muted uppercase">Standings</p>
          <div className="overflow-hidden rounded-lg border border-ov-fg/10">
            <div className="grid grid-cols-[2.5rem_1fr_7rem_3.5rem] bg-ov-panel px-3 py-2 font-mono text-[0.6rem] tracking-[0.16em] text-ov-muted uppercase">
              <span>#</span>
              <span>Player</span>
              <span>Record</span>
              <span className="text-right">Pts</span>
            </div>
            {table.map((row, i) => {
              const player = entrantById(tournament, row.entrantId);
              return (
                <div
                  key={row.entrantId}
                  className={cn(
                    "grid grid-cols-[2.5rem_1fr_7rem_3.5rem] items-center border-t border-ov-fg/10 px-3 py-2",
                    i === 0 && "bg-game/15",
                  )}
                >
                  <span className="font-mono text-ov-muted">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="font-display truncate text-xl font-semibold uppercase text-ov-fg">{player?.name ?? "—"}</p>
                    <p className="truncate text-xs text-ov-muted">{player?.deck || player?.tag}</p>
                  </div>
                  <span className="font-mono tabular-nums text-ov-fg">
                    {row.wins}–{row.losses}–{row.draws}
                  </span>
                  <span className="text-right font-mono text-lg tabular-nums text-ov-fg">{row.matchPoints}</span>
                </div>
              );
            })}
          </div>
        </div>
        {showRounds ? (
          <div className="min-h-0 overflow-hidden">
            {groups.map((group) => (
              <div key={group.side} className="flex h-full flex-col">
                <p className="font-mono mb-2 text-[0.65rem] tracking-[0.2em] text-ov-muted uppercase">Pairings</p>
                <div className="flex min-h-0 flex-1 gap-3">
                  {group.rounds.map((col) => (
                    <div key={col.round} className="flex min-w-0 flex-1 flex-col">
                      <p className="mb-1.5 font-mono text-[0.6rem] tracking-[0.14em] text-ov-muted uppercase">{col.label}</p>
                      <div className="flex flex-1 flex-col justify-evenly gap-1.5">
                        {col.matches.map((match) => (
                          <OverlayMatch key={match.id} tournament={tournament} match={match} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ElimOverlay({ tournament }: { tournament: TournamentState }) {
  const view = tournament.overlayView;
  const matches = matchesForView(tournament, view);
  const groups = groupByRound(matches);
  const game = gameOf(tournament.gameId);
  const champ = championOf(tournament);

  return (
    <div data-game={tournament.gameId} className="absolute inset-0 overflow-hidden bg-ov-bg/92 px-10 py-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="font-mono text-ov-kicker tracking-[0.28em] text-game uppercase">{game.short} · {tournament.formatName}</p>
          <h1 className="font-display text-5xl font-semibold tracking-tight text-ov-fg uppercase">
            {tournament.name}
          </h1>
        </div>
        <div className="text-right">
          <p className="font-mono text-ov-kicker tracking-[0.2em] text-ov-muted uppercase">{viewTitle(tournament)}</p>
          {champ ? (
            <p className="font-display text-2xl font-semibold text-ov-fg uppercase">Champion · {champ.name}</p>
          ) : (
            <p className="font-display text-2xl font-semibold text-ov-fg uppercase">Bo{tournament.bestOf}</p>
          )}
        </div>
      </header>

      <div className="mt-5 flex h-[860px] flex-col gap-4 overflow-hidden">
        {groups.map((group) => {
          const grow = group.side === "grand" ? "shrink-0" : "min-h-0 flex-1";
          return (
            <div key={group.side} className={grow}>
              <p className="font-mono mb-1.5 text-[0.65rem] tracking-[0.2em] text-ov-muted uppercase">
                {group.side === "winners" ? "Winners" : group.side === "losers" ? "Losers" : "Grand finals"}
              </p>
              <div className={`flex gap-3 ${group.side === "grand" ? "" : "h-[calc(100%-1.25rem)]"}`}>
                {group.rounds.map((col) => (
                  <div key={`${group.side}-${col.round}`} className="flex min-w-0 flex-1 flex-col">
                    <p className="mb-1.5 truncate font-mono text-[0.6rem] tracking-[0.14em] text-ov-muted uppercase">
                      {col.label}
                    </p>
                    <div className="flex flex-1 flex-col justify-evenly gap-1.5">
                      {col.matches.map((match) => (
                        <OverlayMatch key={match.id} tournament={tournament} match={match} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OverlayMatch({
  tournament,
  match,
}: {
  tournament: TournamentState;
  match: BracketMatch;
}) {
  if (match.id === "gf-2" && !match.p1.entrantId && !match.p2.entrantId) return null;
  const live = tournament.streamMatchId === match.id || tournament.streamMatchId2 === match.id;
  const seats = matchSlots(match).filter((row) => row.slot.entrantId);
  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border bg-ov-panel/95",
        live ? "border-game" : "border-ov-fg/10",
      )}
    >
      {(seats.length ? seats : matchSlots(match).slice(0, 2)).map((row, i) => (
        <div key={row.id}>
          {i > 0 ? <div className="h-px bg-ov-fg/10" /> : null}
          <OverlaySeat tournament={tournament} match={match} slot={row.id} />
        </div>
      ))}
    </div>
  );
}

function OverlaySeat({
  tournament,
  match,
  slot,
}: {
  tournament: TournamentState;
  match: BracketMatch;
  slot: "p1" | "p2" | "p3" | "p4";
}) {
  const side = match[slot] ?? { entrantId: null, score: 0 };
  const player = entrantById(tournament, side.entrantId);
  const won = match.winnerId === side.entrantId;
  return (
    <div className={cn("flex items-center gap-2 px-2.5 py-1.5", won && "bg-game/20")}>
      <span className="w-4 font-mono text-[0.6rem] text-ov-muted">{player?.seed ?? ""}</span>
      <span className={cn("min-w-0 flex-1 truncate font-display text-base leading-tight font-semibold uppercase", won ? "text-ov-fg" : "text-ov-fg/85")}>
        {player?.name ?? (side.entrantId ? "—" : "TBD")}
      </span>
      {player?.deck ? (
        <span className="hidden max-w-28 truncate text-[0.7rem] text-ov-muted xl:inline">{player.deck}</span>
      ) : null}
      <span className="w-5 text-right font-mono text-sm tabular-nums text-ov-fg">
        {match.winnerId === DRAW_ID ? "D" : side.score}
      </span>
    </div>
  );
}
