import { gameOf } from "@/lib/games";
import { computeStandings, groupByRound, matchesForView, topCutStarted, hasTopCut, previewTournament } from "@/lib/tournament-bracket";
import {
  DRAW_ID,
  championOf,
  cutLabel,
  entrantById,
  matchSlots,
  type BracketMatch,
  type TournamentState,
} from "@/lib/tournament-types";
import { cn } from "@/lib/cn";

export function BracketOverlay({ tournament }: { tournament: TournamentState }) {
  const preview = tournament.matches.length === 0;
  const live = preview ? previewTournament(tournament) : tournament;
  if (live.matches.length === 0) {
    return <WaitingField tournament={tournament} />;
  }
  if (topCutStarted(live) && live.overlayView !== "standings") {
    return <ElimOverlay tournament={live} />;
  }
  if (live.bracketType === "swiss") {
    return <SwissOverlay tournament={live} preview={preview} />;
  }
  return <ElimOverlay tournament={live} preview={preview} />;
}

function viewTitle(tournament: TournamentState, preview = false) {
  if (preview) {
    return tournament.bracketType === "swiss" ? "Round 1 pairings" : "Bracket preview";
  }
  const view = tournament.overlayView;
  if (topCutStarted(tournament) && view !== "standings") {
    if (view === "winners") return "Winners side";
    if (view === "losers") return "Losers side";
    if (view === "finals") return "Finals";
    if (view === "top16") return "Top 16";
    if (view === "top8") return "Top 8";
    if (view === "top4") return "Top 4";
    return `${cutLabel(tournament.cutSize)} · ${tournament.cutType === "double" ? "Double elim" : "Single elim"}`;
  }
  if (tournament.bracketType === "swiss") {
    if (view === "standings") return "Standings";
    if (view === "top8") return "Top 8";
    if (view === "top4") return "Top 4";
    if (view === "top16") return "Top 16";
    return hasTopCut(tournament)
      ? `Swiss · ${tournament.swissRounds} rounds · then ${cutLabel(tournament.cutSize)}`
      : `Swiss · ${tournament.swissRounds} rounds`;
  }
  if (view === "full") return tournament.bracketType === "double" ? "Full · Double elim" : "Full · Single elim";
  if (view === "winners") return "Winners side";
  if (view === "losers") return "Losers side";
  if (view === "finals") return "Finals";
  if (view === "top16") return "Top 16";
  if (view === "top8") return "Top 8";
  return "Top 4";
}

function WaitingField({ tournament }: { tournament: TournamentState }) {
  const game = gameOf(tournament.gameId);
  return (
    <div data-game={tournament.gameId} className="absolute inset-0 overflow-hidden bg-ov-bg/92 px-10 py-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="font-mono text-ov-kicker tracking-[0.28em] text-game uppercase">
            {game.short} · {tournament.formatName}
          </p>
          <h1 className="font-display text-5xl font-semibold tracking-tight text-ov-fg uppercase">
            {tournament.name.trim() || game.name}
          </h1>
        </div>
        <div className="text-right">
          <p className="font-mono text-ov-kicker tracking-[0.2em] text-ov-muted uppercase">Pairings</p>
          <p className="font-display text-2xl font-semibold text-ov-fg uppercase">Waiting for field</p>
        </div>
      </header>
      <p className="font-display mt-24 text-3xl font-semibold text-ov-muted uppercase">
        Add players, then the bracket fills from seeds.
      </p>
    </div>
  );
}

function SwissOverlay({ tournament, preview = false }: { tournament: TournamentState; preview?: boolean }) {
  const game = gameOf(tournament.gameId);
  const standings = computeStandings(tournament);
  const cut =
    tournament.overlayView === "top4" ? 4 : tournament.overlayView === "top8" ? 8 : tournament.overlayView === "top16" ? 16 : standings.length;
  const table = standings.slice(0, cut);
  const showRounds = preview || tournament.overlayView === "full";
  const matches = matchesForView(tournament, preview ? "full" : tournament.overlayView);
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
          <p className="font-mono text-ov-kicker tracking-[0.2em] text-ov-muted uppercase">{viewTitle(tournament, preview)}</p>
          <p className="font-display text-2xl font-semibold text-ov-fg uppercase">
            {preview
              ? "Not started"
              : leader
                ? `${tournament.phase === "complete" ? "Champion" : "Leader"} · ${leader.name}`
                : `Bo${tournament.bestOf}`}
          </p>
        </div>
      </header>

      <div className={`mt-6 grid h-[860px] gap-6 ${showRounds && !preview ? "grid-cols-[1.1fr_0.9fr]" : ""}`}>
        {preview ? null : (
        <div className="min-h-0 overflow-hidden">
          <p className="font-mono mb-2 text-[0.65rem] tracking-[0.2em] text-ov-muted uppercase">Standings</p>
          <div className="overflow-hidden rounded-lg border border-ov-fg/10">
            <div className="grid grid-cols-[2.5rem_1fr_7rem_4.5rem_3.5rem] bg-ov-panel px-3 py-2 font-mono text-[0.6rem] tracking-[0.16em] text-ov-muted uppercase">
              <span>#</span>
              <span>Player</span>
              <span>Record</span>
              <span>OMW</span>
              <span className="text-right">Pts</span>
            </div>
            {table.map((row, i) => {
              const player = entrantById(tournament, row.entrantId);
              return (
                <div
                  key={row.entrantId}
                  className={cn(
                    "grid grid-cols-[2.5rem_1fr_7rem_4.5rem_3.5rem] items-center border-t border-ov-fg/10 px-3 py-2",
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
                  <span className="font-mono tabular-nums text-ov-muted">{(row.oppMatchWin * 100).toFixed(1)}%</span>
                  <span className="text-right font-mono text-lg tabular-nums text-ov-fg">{row.matchPoints}</span>
                </div>
              );
            })}
          </div>
        </div>
        )}
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

function ElimOverlay({ tournament, preview = false }: { tournament: TournamentState; preview?: boolean }) {
  const view = tournament.overlayView;
  const matches = matchesForView(tournament, view);
  const game = gameOf(tournament.gameId);
  const champ = preview ? null : championOf(tournament);
  const winners = matches.filter((m) => m.side === "winners" || m.side === "grand");
  const losers = matches.filter((m) => m.side === "losers");
  const winnerRounds = roundsOf(winners);
  const loserRounds = roundsOf(losers);

  return (
    <div data-game={tournament.gameId} className="absolute inset-0 overflow-hidden bg-ov-bg/92 px-8 py-7">
      <header className="flex items-end justify-between">
        <div>
          <p className="font-mono text-ov-kicker tracking-[0.28em] text-game uppercase">
            {game.short} · {tournament.formatName}
          </p>
          <h1 className="font-display text-5xl font-semibold tracking-tight text-ov-fg uppercase">
            {tournament.name}
          </h1>
        </div>
        <div className="text-right">
          <p className="font-mono text-ov-kicker tracking-[0.2em] text-ov-muted uppercase">{viewTitle(tournament, preview)}</p>
          {preview ? (
            <p className="font-display text-2xl font-semibold text-ov-fg uppercase">Not started</p>
          ) : champ ? (
            <p className="font-display text-2xl font-semibold text-ov-fg uppercase">Champion · {champ.name}</p>
          ) : (
            <p className="font-display text-2xl font-semibold text-ov-fg uppercase">Bo{tournament.bestOf}</p>
          )}
        </div>
      </header>

      <div className="mt-5 flex h-[860px] min-h-0 flex-col gap-5">
        {winnerRounds.length ? (
          <div className={cn("flex min-h-0 flex-col", loserRounds.length ? "flex-[1.15]" : "flex-1")}>
            {loserRounds.length ? (
              <p className="font-mono mb-1.5 text-[0.62rem] tracking-[0.2em] text-ov-muted uppercase">Winners</p>
            ) : null}
            <BracketTree tournament={tournament} rounds={winnerRounds} champ={champ} />
          </div>
        ) : null}
        {loserRounds.length ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <p className="font-mono mb-1.5 text-[0.62rem] tracking-[0.2em] text-ov-muted uppercase">Losers</p>
            <BracketTree tournament={tournament} rounds={loserRounds} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function roundsOf(matches: BracketMatch[]) {
  const visible = matches.filter((m) => !(m.id === "gf-2" && !m.p1.entrantId && !m.p2.entrantId));
  const rounds = [...new Set(visible.map((m) => m.round))].sort((a, b) => a - b);
  return rounds.map((round) => ({
    round,
    label: visible.find((m) => m.round === round)?.label ?? `Round ${round}`,
    matches: visible.filter((m) => m.round === round).sort((a, b) => a.position - b.position),
  }));
}

function BracketTree({
  tournament,
  rounds,
  champ,
}: {
  tournament: TournamentState;
  rounds: { round: number; label: string; matches: BracketMatch[] }[];
  champ?: ReturnType<typeof championOf>;
}) {
  if (!rounds.length) return null;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0">
        {rounds.map((col, i) => (
          <div key={`h-${col.round}-${col.label}`} className="flex min-w-0 flex-1">
            <p className="min-w-0 flex-1 truncate px-1 text-center font-mono text-[0.62rem] tracking-[0.16em] text-ov-muted uppercase">
              {col.label}
            </p>
            {i < rounds.length - 1 ? <span className="w-9 shrink-0" /> : champ ? <span className="w-[11rem] shrink-0" /> : null}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex min-h-0 flex-1">
        {rounds.map((col, i) => (
          <div key={`${col.round}-${col.label}`} className="flex min-h-0 min-w-0 flex-1">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {col.matches.map((match) => (
                <div key={match.id} className="flex min-h-0 flex-1 items-center px-1">
                  <OverlayMatch tournament={tournament} match={match} />
                </div>
              ))}
            </div>
            {i < rounds.length - 1 ? (
              <ConnectorColumn from={col.matches.length} to={rounds[i + 1]!.matches.length} />
            ) : champ ? (
              <ChampionPlaque name={champ.name} />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ConnectorColumn({ from, to }: { from: number; to: number }) {
  const dest = Math.max(1, to);
  const src = Math.max(1, from);
  const h = src * 100;
  const pair = src / dest;
  return (
    <svg
      className="h-full w-9 shrink-0 self-stretch text-ov-fg/30"
      viewBox={`0 0 36 ${h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      {Array.from({ length: dest }, (_, i) => {
        const yA = ((i * pair + 0.5) / src) * h;
        const yB = pair >= 1.5 ? ((i * pair + pair - 0.5) / src) * h : yA;
        const yM = ((i + 0.5) / dest) * h;
        return (
          <g key={i} fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d={`M 0 ${yA} H 18`} />
            {Math.abs(yA - yB) > 1 ? <path d={`M 18 ${yA} V ${yB}`} /> : null}
            <path d={`M 0 ${yB} H 18`} />
            <path d={`M 18 ${yM} H 36`} />
          </g>
        );
      })}
    </svg>
  );
}

function ChampionPlaque({ name }: { name: string }) {
  return (
    <div className="flex w-[11rem] shrink-0 flex-col items-stretch justify-center pl-2">
      <div className="rounded-md border border-game/70 bg-game/12 px-3 py-3 text-center">
        <p className="font-mono text-[0.58rem] tracking-[0.2em] text-game uppercase">Champion</p>
        <p className="font-display mt-1 text-xl leading-tight font-semibold text-ov-fg uppercase">{name}</p>
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
  const live =
    tournament.streamMatchId === match.id ||
    tournament.streamMatchId2 === match.id ||
    tournament.streamMatchId3 === match.id;
  const seats = matchSlots(match).filter((row) => row.slot.entrantId);
  const rows = seats.length >= 3 ? seats : matchSlots(match).slice(0, 2);
  return (
    <div
      className={cn(
        "w-full max-w-[22rem] overflow-hidden rounded-md border shadow-[0_8px_24px_rgb(0_0_0_/_0.28)]",
        live ? "border-game bg-ov-panel" : "border-ov-fg/14 bg-ov-panel/95",
      )}
    >
      {rows.map((row, i) => (
        <div key={row.id}>
          {i > 0 ? <div className="h-px bg-ov-fg/12" /> : null}
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
    <div className={cn("flex items-center gap-2 px-2.5 py-2", won && "bg-game/20")}>
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
