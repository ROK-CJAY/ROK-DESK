import { useEffect } from "react";
import { GuideButton, TabletGuide, useTabletGuide } from "@/components/tablet/tablet-guide";
import { TypeIcon, TeraBadge } from "@/components/overlays/type-icon";
import { InitiativeGlyph } from "@/components/desk/initiative";
import { extraFieldFor, formatCommanderLine, gameOf, isCommanderLane, isPtcgTitle, isVgcTitle } from "@/lib/games";
import {
  MATCH_SLOT_SHORT,
  formatClock,
  isCommanderTable,
  remainingFromDown,
  remainingSeconds,
  resourceLimit,
  seatsFor,
  SEAT_LABELS,
  type DeskState,
  type SeatId,
} from "@/lib/desk-types";
import { COUNTRIES } from "@/lib/countries";
import { formatRecord, inkSrc, isLorcanaInk } from "@/lib/lorcana";
import { spriteFallbackUrl, spriteUrl, TERA_LABEL, type TeamMon } from "@/lib/pokemon-vgc";
import { emptyPtcgSide, type PtcgMon, type PtcgSideBoard } from "@/lib/ptcg-board";
import { useDeskStore } from "@/lib/desk-store";
import { useLiveTournament } from "@/components/overlays/use-live-tournament";
import { staffRoleLabel, STAFF_ROLES, viewTournament } from "@/lib/tournament-types";
import {
  casterPathFor,
  headToHeadFor,
  liveMatchForSlot,
  resolveCasterEntrant,
  type CasterPath,
} from "@/lib/caster-path";
import { cn } from "@/lib/cn";
import { useClockNow } from "@/lib/use-clock-now";

function countryName(code: string) {
  return COUNTRIES.find((c) => c.code === code)?.name || code || "—";
}

export function CasterTablet() {
  const ready = useDeskStore((s) => s.ready);
  const hydrate = useDeskStore((s) => s.hydrate);
  const desk = useDeskStore((s) => s.desk);
  const live = useLiveTournament();
  const guide = useTabletGuide("caster");
  const now = useClockNow({ live: desk.timerRunning, pauseWhenHidden: true });

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
    return () => {
      void lock?.release();
    };
  }, []);

  if (!ready) {
    return <div className="grid h-dvh place-items-center bg-bg text-muted">Loading caster tablet…</div>;
  }

  const game = gameOf(desk.gameId);
  const tournament = live ? viewTournament(live, desk.gameId) : null;
  const commander = isCommanderLane(desk) || isCommanderTable(desk);
  const seats = commander && desk.tableSize >= 3 ? seatsFor(desk.tableSize) : (["p1", "p2"] as SeatId[]);
  const left = remainingSeconds(desk, now);
  const clockStatus = left === 0 ? "Time" : desk.timerRunning ? "Live" : "Paused";
  const slot = desk.matchSlot ?? 1;
  const liveMatch = tournament ? liveMatchForSlot(tournament, slot) : null;
  const casters = desk.casters.filter((c) => c.name.trim());
  const staff = [...(tournament?.staff ?? [])]
    .filter((row) => row.name.trim())
    .sort(
      (a, b) =>
        STAFF_ROLES.findIndex((r) => r.id === a.role) - STAFF_ROLES.findIndex((r) => r.id === b.role) ||
        a.name.localeCompare(b.name),
    );
  const tableIds = seats
    .map((seat) => (tournament ? resolveCasterEntrant(tournament, desk[seat], seat, liveMatch)?.id : null))
    .filter((id): id is string => Boolean(id));
  const h2h = tournament ? headToHeadFor(tournament, tableIds, liveMatch?.id) : [];
  const queue = desk.queue.slice(0, 4);
  const bracketNote = tournament
    ? tournament.bracketType === "swiss"
      ? `Swiss · ${tournament.size}`
      : tournament.bracketType === "double"
        ? `Double elim · ${tournament.size}`
        : `Single elim · ${tournament.size}`
    : null;

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg" data-game={desk.gameId}>
      <header className="shrink-0 border-b border-border px-3 py-2.5 sm:px-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[0.62rem] tracking-[0.2em] text-muted uppercase">
              ROK · Commentary · {MATCH_SLOT_SHORT[slot]}
              {bracketNote ? ` · ${bracketNote}` : ""}
            </p>
            <h1 className="font-display truncate text-xl leading-tight font-semibold uppercase sm:text-2xl">
              {desk.eventName || game.name}
              <span className="text-muted">
                {" "}
                · {desk.formatName} · {liveMatch?.label || desk.roundName || "Match"}
              </span>
            </h1>
            {casters.length ? (
              <p className="mt-0.5 truncate text-xs text-muted">
                On comms{" "}
                {casters
                  .map((c) => (c.handle ? `${c.name} (@${c.handle})` : c.name))
                  .join(" · ")}
              </p>
            ) : null}
            {staff.length ? (
              <p className="truncate text-xs text-subtle">
                {staff
                  .map((row) => `${staffRoleLabel(row.role)} ${row.name}`)
                  .join(" · ")}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right">
              <p className="font-display text-3xl leading-none font-semibold tabular-nums">{formatClock(left)}</p>
              <p
                className={cn(
                  "font-mono text-[0.62rem] tracking-[0.16em] uppercase",
                  left === 0 ? "text-live" : desk.timerRunning ? "text-ok" : "text-muted",
                )}
              >
                {clockStatus}
              </p>
            </div>
            <GuideButton onClick={guide.openGuide} />
          </div>
        </div>
        <p className="mt-1 text-xs text-subtle">
          Read-only desk for casters. Scores, teams, bracket path, staff, and the queue update from Production / Tournament.
        </p>
      </header>

      {queue.length || h2h.length ? (
        <div className="shrink-0 border-b border-border px-3 py-2 sm:px-4">
          {queue.length ? (
            <p className="truncate text-sm">
              <span className="font-mono text-[0.62rem] tracking-[0.14em] text-muted uppercase">Up next</span>{" "}
              {queue
                .map((m) => `${m.p1 || "TBD"} vs ${m.p2 || "TBD"}${m.round ? ` (${m.round})` : ""}${m.note ? ` · ${m.note}` : ""}`)
                .join("  ·  ")}
            </p>
          ) : null}
          {h2h.length ? (
            <p className={cn("truncate text-sm", queue.length && "mt-1")}>
              <span className="font-mono text-[0.62rem] tracking-[0.14em] text-game uppercase">H2H</span>{" "}
              {h2h.map((row) => `${row.line} (${row.label})`).join("  ·  ")}
            </p>
          ) : null}
        </div>
      ) : null}

      <main
        className={cn(
          "flex-1 p-3 sm:p-4",
          seats.length > 2 ? "grid gap-3 sm:grid-cols-2" : "grid gap-3 lg:grid-cols-2",
        )}
      >
        {seats.map((seat) => {
          const player = desk[seat];
          const entrant = tournament ? resolveCasterEntrant(tournament, player, seat, liveMatch) : null;
          const path = tournament && entrant ? casterPathFor(tournament, entrant.id, liveMatch) : null;
          return (
            <PlayerSheet
              key={seat}
              desk={desk}
              seat={seat}
              commander={commander}
              path={path}
              photoUrl={player.photoUrl.trim() || entrant?.photoUrl?.trim() || ""}
              note={player.note.trim() || entrant?.note?.trim() || ""}
              judgeNote={player.judgeNote?.trim() || entrant?.judgeNote?.trim() || ""}
            />
          );
        })}
      </main>
      <TabletGuide kind="caster" open={guide.open} onClose={guide.close} />
    </div>
  );
}

function PlayerSheet({
  desk,
  seat,
  commander,
  path,
  photoUrl,
  note,
  judgeNote,
}: {
  desk: DeskState;
  seat: SeatId;
  commander: boolean;
  path: CasterPath | null;
  photoUrl: string;
  note: string;
  judgeNote: string;
}) {
  const player = desk[seat];
  const game = gameOf(desk.gameId);
  const extra = extraFieldFor(desk.gameId, desk.formatName);
  const vgc = isVgcTitle(desk.gameId);
  const ptcg = isPtcgTitle(desk.gameId);
  const board = ptcg ? (desk.ptcgBoard?.[seat === "p1" || seat === "p2" ? seat : "p1"] ?? emptyPtcgSide()) : null;
  const max = resourceLimit(desk);
  const remaining = vgc ? remainingFromDown(player.down, 6) : player.resource;
  const deck = commander
    ? formatCommanderLine(player.archetype, player.extra)
    : player.archetype || player.extra;
  const inks = [player.ink1, player.ink2].filter(isLorcanaInk);
  const hasInit = desk.gameId === "swu" && desk.initiativeSide === seat;
  const twoSeat = !commander || desk.tableSize <= 2;
  const seatLabel = twoSeat ? (seat === "p1" ? "Player 1" : "Player 2") : SEAT_LABELS[seat];

  return (
    <section className="flex min-h-0 flex-col rounded-xl border border-border bg-surface p-3 sm:p-4">
      <header className="flex items-start justify-between gap-3">
        {photoUrl ? (
          <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-surface-2 sm:size-20">
            <img src={photoUrl} alt="" className="size-full object-cover" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[0.6rem] tracking-[0.18em] text-muted uppercase">
            {seatLabel}
            {player.country ? ` · ${player.country}` : ""}
            {player.pronouns ? ` · ${player.pronouns}` : ""}
          </p>
          <h2 className="font-display truncate text-2xl leading-none font-semibold uppercase">
            {player.name || "Open"}
          </h2>
          <p className="mt-0.5 truncate text-sm text-muted">
            {player.tag ? `@${player.tag}` : ""}
            {player.tag && deck ? " · " : ""}
            {deck || extra.label}
          </p>
          <p className="truncate text-xs text-subtle">
            {countryName(player.country)}
            {path ? ` · Seed ${path.seed}` : ""}
            {path?.dropped ? " · Dropped" : ""}
          </p>
          {note ? <p className="mt-1 text-sm text-fg">{note}</p> : null}
          {judgeNote ? (
            <p className="mt-1 text-xs text-muted">
              <span className="font-mono tracking-[0.12em] uppercase">Judge · </span>
              {judgeNote}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-3xl leading-none font-semibold tabular-nums">{player.score}</p>
          <p className="font-mono text-[0.58rem] tracking-[0.14em] text-muted uppercase">
            {game.scoreLabel} · Bo{desk.bestOf}
          </p>
          <p className="mt-1 font-mono text-xs tabular-nums text-muted">
            {path?.record ?? formatRecord(player.recordW, player.recordL, player.recordD)}
            {path?.place ? ` · ${path.place}${placeSuffix(path.place)}` : ""}
          </p>
        </div>
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label={game.resource.label} value={vgc ? `${remaining}/${max}` : String(player.resource)} />
        {game.secondary ? <Stat label={game.secondary.label} value={String(player.secondary)} /> : null}
        {commander ? <Stat label="Cmd dmg" value={String(player.cmdDamage)} /> : null}
        {path?.matchPoints != null ? <Stat label="Match pts" value={String(path.matchPoints)} /> : null}
        {path?.omw != null ? <Stat label="OMW" value={`${(path.omw * 100).toFixed(1)}%`} /> : null}
        {hasInit ? (
          <div className="flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-1.5">
            <InitiativeGlyph className="size-3.5 text-game" />
            <p className="font-mono text-[0.62rem] tracking-[0.12em] text-game uppercase">Initiative</p>
          </div>
        ) : null}
      </dl>

      {inks.length ? (
        <div className="mt-2 flex items-center gap-2">
          <p className="font-mono text-[0.58rem] tracking-[0.14em] text-muted uppercase">Inks</p>
          {inks.map((ink) => (
            <img key={ink} src={inkSrc(ink)} alt={ink} title={ink} className="size-7" />
          ))}
        </div>
      ) : null}

      {path ? <PathBlock path={path} /> : null}

      {vgc ? <TeamSheet team={player.team} down={player.down} /> : null}
      {ptcg && board ? <PtcgSheet board={board} prizes={player.resource} max={max} /> : null}
    </section>
  );
}

function placeSuffix(n: number) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  if (n % 10 === 1) return "st";
  if (n % 10 === 2) return "nd";
  if (n % 10 === 3) return "rd";
  return "th";
}

function PathBlock({ path }: { path: CasterPath }) {
  return (
    <div className="mt-3 rounded-lg border border-border/70 bg-surface-2/60 p-2.5">
      <p className="font-mono text-[0.58rem] tracking-[0.16em] text-muted uppercase">Bracket path</p>
      {path.played.length ? (
        <ol className="mt-1.5 space-y-1">
          {path.played.map((row, i) => (
            <li key={`${row.label}-${i}`} className="flex items-baseline gap-2 text-sm">
              <span
                className={cn(
                  "font-mono w-7 shrink-0 text-[0.72rem] font-semibold",
                  row.result === "W" || row.result === "Bye" ? "text-ok" : row.result === "L" ? "text-live" : "text-muted",
                )}
              >
                {row.result}
              </span>
              <span className="min-w-0 truncate">
                <span className="text-muted">{row.label}</span>
                {row.vs ? <span> · {row.vs}</span> : null}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-1 text-xs text-subtle">No completed matches yet.</p>
      )}
      {path.now ? (
        <p className="mt-2 text-sm">
          <span className="font-mono text-[0.62rem] tracking-[0.12em] text-game uppercase">Now</span>{" "}
          {path.now.label}
          {path.now.vs ? ` · vs ${path.now.vs}` : ""}
        </p>
      ) : null}
      {path.winTo || path.loseTo ? (
        <div className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
          {path.winTo ? (
            <p>
              <span className="text-ok">Win →</span> {path.winTo}
            </p>
          ) : null}
          {path.loseTo ? (
            <p>
              <span className="text-live">Lose →</span> {path.loseTo}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface-2 px-2 py-1.5">
      <p className="font-mono text-[0.58rem] tracking-[0.14em] text-muted uppercase">{label}</p>
      <p className="font-display text-xl leading-none font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function TeamSheet({ team, down }: { team: TeamMon[]; down?: boolean[] }) {
  return (
    <div className="mt-3 grid gap-2">
      <p className="font-mono text-[0.58rem] tracking-[0.16em] text-muted uppercase">Team</p>
      {team.map((mon, i) => (
        <CasterMon key={`${mon.species}-${i}`} mon={mon} down={Boolean(down?.[i])} />
      ))}
    </div>
  );
}

function CasterMon({ mon, down }: { mon: TeamMon; down: boolean }) {
  const art = spriteUrl(mon);
  const empty = !mon.species.trim();
  return (
    <article className={cn("grid grid-cols-[2.75rem_minmax(0,1fr)] gap-2 rounded-lg bg-surface-2 p-2", down && "opacity-45")}>
      <div className="grid size-11 place-items-center self-start overflow-hidden rounded-full bg-surface">
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
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="font-display truncate text-sm font-semibold uppercase">{empty ? "Empty" : mon.species}</p>
          {!empty ? <TypeIcon type={mon.types[0]} /> : null}
          {mon.types[1] ? <TypeIcon type={mon.types[1]} /> : null}
          {mon.tera ? <TeraBadge type={mon.tera} /> : null}
          {down ? <span className="text-[0.62rem] tracking-wide text-live uppercase">KO</span> : null}
        </div>
        {!empty ? (
          <>
            <p className="truncate text-[0.72rem] text-muted">
              {mon.ability || "—"} · {mon.item || "—"}
              {mon.tera ? ` · Tera ${TERA_LABEL[mon.tera] ?? mon.tera}` : ""}
            </p>
            <ul className="mt-0.5 grid grid-cols-2 gap-x-2">
              {mon.moves.map((move, i) => (
                <li key={i} className="flex min-h-5 items-center gap-1 text-[0.78rem]">
                  <TypeIcon type={move.type} />
                  <span className="truncate">{move.name || "—"}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </article>
  );
}

function PtcgSheet({ board, prizes, max }: { board: PtcgSideBoard; prizes: number; max: number }) {
  return (
    <div className="mt-3 grid gap-2">
      <div className="flex flex-wrap gap-1.5 text-[0.68rem] font-semibold tracking-wide uppercase">
        <Chip on={board.energy} label="Energy" />
        <Chip on={board.supporter} label="Supporter" />
        <Chip on={board.retreat} label="Retreat" />
        <span className="rounded-md bg-surface-2 px-2 py-1 text-muted">
          Prizes {prizes}/{max}
        </span>
      </div>
      <PtcgRow label="Active" mon={board.active} />
      {(board.bench ?? []).map((mon, i) => (
        <PtcgRow key={i} label={`Bench ${i + 1}`} mon={mon} />
      ))}
    </div>
  );
}

function Chip({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={cn("rounded-md px-2 py-1", on ? "bg-ok/20 text-ok" : "bg-surface-2 text-muted line-through")}>
      {label}
    </span>
  );
}

function PtcgRow({ label, mon }: { label: string; mon: PtcgMon | null }) {
  if (!mon) {
    return (
      <div className="rounded-lg bg-surface-2 px-2 py-1.5 text-xs text-subtle">
        {label} · empty
      </div>
    );
  }
  return (
    <div className="rounded-lg bg-surface-2 px-2 py-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-display truncate text-sm font-semibold uppercase">
          {label} · {mon.name}
        </p>
        <p className="font-mono text-xs tabular-nums text-muted">
          {mon.hpNow}/{mon.hp}
        </p>
      </div>
      {mon.abilities[0] ? (
        <p className="truncate text-[0.72rem] text-muted">Ability {mon.abilities[0].name}</p>
      ) : null}
      {mon.attacks[0] ? (
        <p className="truncate text-[0.72rem] text-muted">
          {mon.attacks.map((atk) => `${atk.name}${atk.damage ? ` ${atk.damage}` : ""}`).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
