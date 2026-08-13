import { useEffect, useState } from "react";
import { GripVertical, Plus, Radio, RotateCcw, Shuffle, Trash2, Trophy } from "lucide-react";
import { AppChrome } from "@/components/app/app-chrome";
import { Field, NativeSelect } from "@/components/desk/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COUNTRIES } from "@/lib/countries";
import { GAME_LIST, gameOf, isCommanderPodFormat } from "@/lib/games";
import { useDeskStore } from "@/lib/desk-store";
import { groupByRound, readyMatches, computeStandings, currentSwissRound, swissRoundComplete, defaultSwissRounds } from "@/lib/tournament-bracket";
import { useTournamentStore } from "@/lib/tournament-store";
import {
  DRAW_ID,
  championOf,
  entrantById,
  isPodMatch,
  matchEntrantIds,
  matchSlots,
  viewsFor,
  type BracketSize,
  type BracketType,
  type BracketViewId,
  type Entrant,
  type SlotId,
} from "@/lib/tournament-types";
import { cn } from "@/lib/cn";

export function TournamentApp() {
  const ready = useTournamentStore((s) => s.ready);
  const hydrate = useTournamentStore((s) => s.hydrate);
  const t = useTournamentStore((s) => s.tournament);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!ready) {
    return (
      <div className="min-h-dvh bg-bg text-fg">
        <div className="mx-auto max-w-[1600px] px-4 py-6">
          <div className="h-12 w-48 animate-pulse rounded-lg bg-surface" />
          <div className="mt-6 h-96 animate-pulse rounded-xl bg-surface" />
        </div>
      </div>
    );
  }

  const game = gameOf(t.gameId);
  const champ = championOf(t);

  return (
    <div className="min-h-dvh bg-bg text-fg" data-game={t.gameId}>
      <AppChrome
        view="tournament"
        trailing={
          <p className="hidden text-sm text-muted sm:block">
            {t.name}
            <span className="text-subtle">
              {" "}
              · {game.short} ·{" "}
              {t.bracketType === "double" ? "Double elim" : t.bracketType === "swiss" ? "Swiss" : "Single elim"} · {t.size}
            </span>
          </p>
        }
      />
      <main className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <SetupPanel />
          <StreamPanel />
          {champ ? (
            <section className="rounded-xl border border-border bg-surface p-4">
              <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Champion</p>
              <p className="font-display mt-2 text-3xl font-semibold tracking-tight uppercase">{champ.name}</p>
              <p className="text-sm text-muted">{champ.deck || champ.tag}</p>
            </section>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <RosterPanel />
          <BracketBoard />
        </div>
      </main>
    </div>
  );
}

function SetupPanel() {
  const t = useTournamentStore((s) => s.tournament);
  const patch = useTournamentStore((s) => s.patch);
  const generate = useTournamentStore((s) => s.generate);
  const resetBracket = useTournamentStore((s) => s.resetBracket);
  const game = gameOf(t.gameId);
  const locked = t.phase !== "setup" && t.matches.length > 0;

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Event</p>
      <div className="mt-3 grid gap-3">
        <Field label="Tournament name">
          <Input value={t.name} onChange={(e) => patch({ name: e.target.value })} />
        </Field>
        <Field label="Game">
          <NativeSelect
            value={t.gameId}
            disabled={locked}
            onChange={(e) => {
              const id = e.target.value as typeof t.gameId;
              const next = gameOf(id);
              patch({ gameId: id, formatName: next.formats[0]?.label ?? next.name });
            }}
          >
            {GAME_LIST.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Format">
          <NativeSelect value={t.formatName} onChange={(e) => patch({ formatName: e.target.value })}>
            {game.formats.map((f) => (
              <option key={f.id} value={f.label}>
                {f.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bracket">
            <NativeSelect
              value={t.bracketType}
              disabled={locked}
              onChange={(e) => {
                const bracketType = e.target.value as BracketType;
                patch({
                  bracketType,
                  swissRounds: defaultSwissRounds(t.size),
                  overlayView: bracketType === "swiss" ? "standings" : t.overlayView === "standings" ? "full" : t.overlayView,
                });
              }}
            >
              <option value="single">Single elim</option>
              <option value="double">Double elim</option>
              <option value="swiss">Swiss</option>
            </NativeSelect>
          </Field>
          <Field label="Size">
            <NativeSelect
              value={String(t.size)}
              disabled={locked}
              onChange={(e) => patch({ size: Number(e.target.value) as BracketSize })}
            >
              {[4, 8, 16, 32].map((n) => (
                <option key={n} value={n}>
                  {n} players
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        {t.bracketType === "swiss" ? (
          <Field label="Swiss rounds">
            <NativeSelect
              value={String(t.swissRounds || defaultSwissRounds(t.size))}
              onChange={(e) => patch({ swissRounds: Number(e.target.value) })}
            >
              {[3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n} rounds
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
        {t.bracketType === "swiss" && isCommanderPodFormat(t.gameId, t.formatName) ? (
          <p className="text-xs text-muted">Commander Swiss pairs tables of 4.</p>
        ) : null}
        <Field label="Best of">
          <NativeSelect
            value={String(t.bestOf)}
            onChange={(e) => patch({ bestOf: Number(e.target.value) as 1 | 3 | 5 | 7 })}
          >
            {[1, 3, 5, 7].map((n) => (
              <option key={n} value={n}>
                Bo{n}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Bracket overlay">
          <NativeSelect
            value={t.overlayView}
            onChange={(e) => patch({ overlayView: e.target.value as BracketViewId })}
          >
            {viewsFor(t.bracketType).map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button onClick={generate} className="flex-1">
            <Trophy className="size-3.5" />
            {t.matches.length ? "Rebuild bracket" : "Start bracket"}
          </Button>
          {t.matches.length > 0 ? (
            <Button variant="outline" onClick={resetBracket}>
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function sendMatchToStream(matchId: string) {
  const t = useTournamentStore.getState().tournament;
  const match = t.matches.find((m) => m.id === matchId);
  if (!match) return;
  const seat = (id: string | null | undefined) => {
    const e = entrantById(t, id ?? null);
    return {
      name: e?.name ?? "TBD",
      tag: e?.tag ?? "",
      country: e?.country ?? "US",
      pronouns: e?.pronouns ?? "",
      archetype: e?.deck ?? "",
      extra: e?.extra ?? "",
    };
  };
  const pod = isPodMatch(match);
  useTournamentStore.getState().setStreamMatch(matchId);
  useDeskStore.getState().loadStreamMatch({
    eventName: t.name,
    roundName: match.label,
    eventPhase:
      t.bracketType === "double"
        ? "Double elimination"
        : t.bracketType === "swiss"
          ? pod
            ? "Swiss pods"
            : "Swiss"
          : "Single elimination",
    bestOf: t.bestOf,
    gameId: t.gameId,
    formatName: t.formatName,
    tableSize: pod ? 4 : 2,
    p1: seat(match.p1.entrantId),
    p2: seat(match.p2.entrantId),
    p3: pod ? seat(match.p3?.entrantId) : undefined,
    p4: pod ? seat(match.p4?.entrantId) : undefined,
  });
}

function namesForMatch(t: import("@/lib/tournament-types").TournamentState, match: import("@/lib/tournament-types").BracketMatch) {
  const names = matchEntrantIds(match).map((id) => entrantById(t, id)?.name ?? "TBD");
  if (names.length > 2) return names.join(" · ");
  if (names.length === 2) return `${names[0]} vs ${names[1]}`;
  return names[0] ?? "TBD";
}

function StreamPanel() {
  const t = useTournamentStore((s) => s.tournament);
  const ready = readyMatches(t);
  const live = t.matches.find((m) => m.id === t.streamMatchId);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Stream match</p>
      {live ? (
        <div className="mt-3 rounded-lg border border-live/40 bg-live/10 px-3 py-2">
          <p className="font-mono text-[0.65rem] tracking-[0.16em] text-live uppercase">On air</p>
          <p className="text-sm text-fg">{namesForMatch(t, live)}</p>
          <p className="text-xs text-muted">{live.label}</p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">No match assigned. Pick a ready match to push names onto Production.</p>
      )}
      <ul className="mt-3 space-y-2">
        {ready.length === 0 ? (
          <li className="text-xs text-subtle">No ready matches.</li>
        ) : (
          ready.map((match) => (
            <li key={match.id}>
              <button
                type="button"
                onClick={() => sendMatchToStream(match.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm",
                  t.streamMatchId === match.id
                    ? "border-live bg-live/10"
                    : "border-border bg-surface-2 hover:border-muted",
                )}
              >
                <span>
                  <span className="block text-xs text-muted">{match.label}</span>
                  {namesForMatch(t, match)}
                </span>
                <Radio className="size-3.5 shrink-0" />
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

function RosterPanel() {
  const t = useTournamentStore((s) => s.tournament);
  const addEntrant = useTournamentStore((s) => s.addEntrant);
  const updateEntrant = useTournamentStore((s) => s.updateEntrant);
  const removeEntrant = useTournamentStore((s) => s.removeEntrant);
  const reseed = useTournamentStore((s) => s.reseed);
  const reorderEntrants = useTournamentStore((s) => s.reorderEntrants);
  const game = gameOf(t.gameId);
  const [draft, setDraft] = useState({ name: "", tag: "", deck: "", country: "US" });
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const add = () => {
    if (!draft.name.trim()) return;
    addEntrant({
      name: draft.name.trim(),
      tag: draft.tag.trim(),
      deck: draft.deck.trim(),
      country: draft.country,
    });
    setDraft({ name: "", tag: "", deck: "", country: draft.country });
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Roster</p>
          <p className="text-sm text-muted">{t.entrants.length} players · drag a row to change seed</p>
        </div>
        <Button variant="outline" size="sm" onClick={reseed}>
          <Shuffle className="size-3.5" />
          Reseed 1–n
        </Button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_8rem_1fr_6rem_auto]">
        <Input
          placeholder="Name"
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
        />
        <Input
          placeholder="Handle"
          value={draft.tag}
          onChange={(e) => setDraft((d) => ({ ...d, tag: e.target.value }))}
        />
        <Input
          placeholder={game.extraPlaceholder}
          value={draft.deck}
          onChange={(e) => setDraft((d) => ({ ...d, deck: e.target.value }))}
        />
        <NativeSelect value={draft.country} onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value }))}>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </NativeSelect>
        <Button onClick={add}>
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="font-mono text-[0.65rem] tracking-[0.16em] text-muted uppercase">
            <tr>
              <th className="w-8 pb-2 font-medium" />
              <th className="pb-2 font-medium">Seed</th>
              <th className="pb-2 font-medium">Player</th>
              <th className="pb-2 font-medium">Handle</th>
              <th className="pb-2 font-medium">{game.extraLabel}</th>
              <th className="pb-2 font-medium">CC</th>
              <th className="pb-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {t.entrants
              .slice()
              .sort((a, b) => a.seed - b.seed)
              .map((e) => (
                <EntrantRow
                  key={e.id}
                  entrant={e}
                  dragging={dragId === e.id}
                  over={overId === e.id && dragId !== e.id}
                  onChange={updateEntrant}
                  onRemove={removeEntrant}
                  onDragStart={() => setDragId(e.id)}
                  onDragOver={() => setOverId(e.id)}
                  onDrop={() => {
                    if (dragId) reorderEntrants(dragId, e.id);
                    setDragId(null);
                    setOverId(null);
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverId(null);
                  }}
                />
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EntrantRow({
  entrant,
  dragging,
  over,
  onChange,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  entrant: Entrant;
  dragging: boolean;
  over: boolean;
  onChange: (id: string, partial: Partial<Entrant>) => void;
  onRemove: (id: string) => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  return (
    <tr
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        onDragOver();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "border-t border-border",
        dragging && "opacity-40",
        over && "border-t-2 border-t-accent",
      )}
    >
      <td className="py-2 pr-1">
        <span
          draggable
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", entrant.id);
            onDragStart();
          }}
          className="grid size-8 cursor-grab place-items-center text-subtle hover:text-fg active:cursor-grabbing"
          aria-label={`Drag to change seed ${entrant.seed}`}
        >
          <GripVertical className="size-4" />
        </span>
      </td>
      <td className="py-2 pr-2">
        <Input
          value={String(entrant.seed)}
          onChange={(e) => onChange(entrant.id, { seed: Number(e.target.value) || 0 })}
          className="h-8 w-14"
        />
      </td>
      <td className="py-2 pr-2">
        <Input
          value={entrant.name}
          onChange={(e) => onChange(entrant.id, { name: e.target.value })}
          className="h-8"
        />
      </td>
      <td className="py-2 pr-2">
        <Input
          value={entrant.tag}
          onChange={(e) => onChange(entrant.id, { tag: e.target.value })}
          className="h-8"
        />
      </td>
      <td className="py-2 pr-2">
        <Input
          value={entrant.deck}
          onChange={(e) => onChange(entrant.id, { deck: e.target.value })}
          className="h-8"
        />
      </td>
      <td className="py-2 pr-2">
        <NativeSelect
          value={entrant.country}
          onChange={(e) => onChange(entrant.id, { country: e.target.value })}
          className="h-8"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </NativeSelect>
      </td>
      <td className="py-2">
        <Button variant="ghost" size="icon" className="size-8" onClick={() => onRemove(entrant.id)} aria-label="Remove">
          <Trash2 className="size-3.5" />
        </Button>
      </td>
    </tr>
  );
}

function BracketBoard() {
  const t = useTournamentStore((s) => s.tournament);
  const report = useTournamentStore((s) => s.report);
  const setScore = useTournamentStore((s) => s.setScore);
  const pairNext = useTournamentStore((s) => s.pairNext);
  const groups = groupByRound(t.matches);
  const standings = t.bracketType === "swiss" ? computeStandings(t) : [];
  const round = currentSwissRound(t);
  const canPair =
    t.bracketType === "swiss" &&
    round > 0 &&
    round < t.swissRounds &&
    swissRoundComplete(t, round) &&
    !t.matches.some((m) => m.side === "swiss" && m.round === round + 1);

  if (t.matches.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
        <p className="font-display text-2xl font-semibold uppercase">No bracket yet</p>
        <p className="mt-2 text-sm text-muted">
          Add players, drag to seed, then start the bracket. Ready matches can be sent straight to Production.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">
          {t.bracketType === "swiss" ? "Swiss" : "Bracket"}
        </p>
        {canPair ? (
          <Button size="sm" onClick={pairNext}>
            Pair round {round + 1}
          </Button>
        ) : null}
      </div>
      {t.bracketType === "swiss" ? <StandingsTable t={t} standings={standings} /> : null}
      <div className="mt-3 flex flex-col gap-6">
        {groups.map((group) => (
          <div key={group.side}>
            <p className="font-mono mb-2 text-[0.65rem] tracking-[0.18em] text-muted uppercase">
              {group.side === "winners"
                ? "Winners"
                : group.side === "losers"
                  ? "Losers"
                  : group.side === "swiss"
                    ? "Rounds"
                    : "Grand finals"}
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {group.rounds.map((col) => (
                <div key={`${group.side}-${col.round}`} className="w-[260px] shrink-0">
                  <p className="mb-2 truncate text-xs text-subtle">{col.label}</p>
                  <div className="flex flex-col gap-2">
                    {col.matches.map((match) => {
                      const live = t.streamMatchId === match.id;
                      const skip = match.id === "gf-2" && !match.p1.entrantId && !match.p2.entrantId;
                      if (skip) return null;
                      const seats = matchSlots(match).filter(
                        (row) => row.slot.entrantId || !isPodMatch(match) && (row.id === "p1" || row.id === "p2"),
                      );
                      const canReport = matchEntrantIds(match).length >= 2;
                      return (
                        <div
                          key={match.id}
                          className={cn(
                            "rounded-lg border bg-surface-2 p-2",
                            live ? "border-live" : "border-border",
                          )}
                        >
                          {seats.map((row) => {
                            const player = entrantById(t, row.slot.entrantId);
                            return (
                              <MatchSeat
                                key={row.id}
                                name={player?.name ?? (row.slot.entrantId ? "—" : "TBD")}
                                seed={player?.seed}
                                score={row.slot.score}
                                won={match.winnerId === row.slot.entrantId}
                                onScore={(n) => setScore(match.id, row.id, n)}
                                onWin={
                                  canReport && row.slot.entrantId
                                    ? () => report(match.id, row.slot.entrantId!)
                                    : undefined
                                }
                              />
                            );
                          })}
                          {canReport ? (
                            <div className="mt-1.5 flex gap-1">
                              {t.bracketType === "swiss" ? (
                                <button
                                  type="button"
                                  onClick={() => report(match.id, DRAW_ID)}
                                  className={cn(
                                    "flex-1 text-[0.65rem] tracking-wide uppercase",
                                    match.winnerId === DRAW_ID ? "text-fg" : "text-muted hover:text-fg",
                                  )}
                                >
                                  Draw
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => sendMatchToStream(match.id)}
                                className="flex flex-1 items-center justify-center gap-1 text-[0.65rem] tracking-wide text-muted uppercase hover:text-fg"
                              >
                                <Radio className="size-3" />
                                {live ? "On stream" : "Send"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StandingsTable({
  t,
  standings,
}: {
  t: import("@/lib/tournament-types").TournamentState;
  standings: ReturnType<typeof computeStandings>;
}) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead className="font-mono text-[0.65rem] tracking-[0.16em] text-muted uppercase">
          <tr>
            <th className="pb-2 font-medium">#</th>
            <th className="pb-2 font-medium">Player</th>
            <th className="pb-2 font-medium">Deck</th>
            <th className="pb-2 font-medium">W–L–D</th>
            <th className="pb-2 font-medium">Pts</th>
            <th className="pb-2 font-medium">OMW</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, i) => {
            const e = entrantById(t, row.entrantId);
            return (
              <tr key={row.entrantId} className="border-t border-border">
                <td className="py-1.5 pr-3 font-mono text-muted">{i + 1}</td>
                <td className="py-1.5 pr-3">{e?.name ?? "—"}</td>
                <td className="py-1.5 pr-3 text-muted">{e?.deck || "—"}</td>
                <td className="py-1.5 pr-3 font-mono tabular-nums">
                  {row.wins}–{row.losses}–{row.draws}
                </td>
                <td className="py-1.5 pr-3 font-mono tabular-nums">{row.matchPoints}</td>
                <td className="py-1.5 font-mono tabular-nums text-muted">
                  {(row.oppMatchWin * 100).toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MatchSeat({
  name,
  seed,
  score,
  won,
  onScore,
  onWin,
}: {
  name: string;
  seed?: number;
  score: number;
  won: boolean;
  onScore: (n: number) => void;
  onWin?: () => void;
}) {
  return (
    <div className={cn("flex items-center gap-1.5 rounded-md px-1 py-0.5", won && "bg-game/15")}>
      <span className="w-4 font-mono text-[0.65rem] text-subtle">{seed ?? ""}</span>
      <button
        type="button"
        disabled={!onWin}
        onClick={onWin}
        className="min-w-0 flex-1 truncate text-left text-sm disabled:cursor-default"
      >
        {name}
      </button>
      <input
        type="number"
        min={0}
        max={9}
        value={score}
        onChange={(e) => onScore(Number(e.target.value) || 0)}
        className="h-7 w-10 rounded border border-border bg-surface text-center text-xs tabular-nums"
      />
    </div>
  );
}
