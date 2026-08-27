import { useEffect, useState } from "react";
import { ClipboardList, Flag, GripVertical, Plus, Printer, Radio, RotateCcw, Shuffle, Trash2, Trophy } from "lucide-react";
import { AppChrome } from "@/components/app/app-chrome";
import { Field, NativeSelect } from "@/components/desk/field";
import { CommanderSearchField } from "@/components/desk/commander-search";
import { FloorClock } from "@/components/tournament/floor-clock";
import { overlayPath, overlayWindowName } from "@/components/desk/sources";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { COUNTRIES } from "@/lib/countries";
import { extraFieldFor, formatCommanderLine, GAME_LIST, gameOf, isCommanderLane, isCommanderPodFormat, playerIdField, playerTabletPath, signupPath, tabletPath } from "@/lib/games";
import { catalogForGame } from "@/lib/card-lookup";
import { DecklistEditor } from "@/components/signup/decklist-editor";
import { decklistCount } from "@/lib/decklist";
import { tournamentLooksLikeTest } from "@/lib/test-fixtures";
import { countFilledMons, emptyTeam, teamHasMons } from "@/lib/pokemon-vgc";
import { useDeskStore } from "@/lib/desk-store";
import { groupByRound, readyMatches, computeStandings, currentSwissRound, eventChampion, swissRoundComplete, defaultSwissRounds, canStartTopCut, topCutStarted, hasTopCut } from "@/lib/tournament-bracket";
import { useTournamentStore } from "@/lib/tournament-store";
import { TeamSheetPanel } from "@/components/tournament/team-sheet-panel";
import { PlayerIdStaffNote } from "@/components/signup/player-id-privacy";
import { InkPicker } from "@/components/desk/ink-picker";
import { ExportTournamentButton } from "@/components/tournament/export-button";
import { ImportTournamentButton } from "@/components/tournament/import-button";
import { exportTournamentFiles } from "@/lib/tournament-export";
import { StaffPanel } from "@/components/tournament/staff-panel";
import {
  DRAW_ID,
  PRESET_SIZES,
  CUT_PRESETS,
  bracketSlots,
  clampBracketSize,
  clampCutSize,
  cutLabel,
  entrantById,
  isPodMatch,
  isPresetSize,
  matchEntrantIds,
  matchSlots,
  teamSheetLabel,
  viewsFor,
  type BracketSize,
  type BracketType,
  type BracketViewId,
  type Entrant,
  type SlotId,
} from "@/lib/tournament-types";
import { cn } from "@/lib/cn";
import { MATCH_SLOT_LABEL, MATCH_SLOTS, MATCH_SLOT_SHORT, type MatchSlot } from "@/lib/desk-types";

export function TournamentApp() {
  const hydrate = useTournamentStore((s) => s.hydrate);
  const hydrateDesk = useDeskStore((s) => s.hydrate);
  const t = useTournamentStore((s) => s.tournament);
  const [sheetPlayerId, setSheetPlayerId] = useState<string | null>(null);

  useEffect(() => {
    void hydrate();
    void hydrateDesk();
  }, [hydrate, hydrateDesk]);

  const game = gameOf(t.gameId);
  const champ = eventChampion(t);
  const standings = t.bracketType === "swiss" ? computeStandings(t) : [];
  const leader = standings[0] ? entrantById(t, standings[0].entrantId) : null;

  return (
    <div className="min-h-dvh bg-bg text-fg" data-game={t.gameId}>
      <AppChrome
        view="tournament"
        trailing={
          <div className="flex items-center gap-3">
            <p className="hidden text-sm text-muted sm:block">
              {t.name}
              <span className="text-subtle">
                {" "}
                · {game.short} ·{" "}
                {t.bracketType === "double"
                  ? "Double elim"
                  : t.bracketType === "swiss"
                    ? `Swiss${t.cutSize > 0 ? ` · ${cutLabel(t.cutSize)}` : ""}`
                    : "Single elim"} · {t.size}
              </span>
            </p>
            <ExportTournamentButton />
            <ImportTournamentButton />
          </div>
        }
      />
      <main className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <SetupPanel />
          <StaffPanel />
          <StreamPanel />
          <EventResultCard champ={champ} leader={leader} standings={standings} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <RosterPanel
            sheetPlayerId={sheetPlayerId}
            onOpenSheet={(id) => {
              setSheetPlayerId(id);
              document.getElementById("team-sheet")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
          <TeamSheetPanel playerId={sheetPlayerId} onSelectPlayer={setSheetPlayerId} />
          <BracketBoard />
        </div>
      </main>
    </div>
  );
}

function EventResultCard({
  champ,
  leader,
  standings,
}: {
  champ: Entrant | null;
  leader: Entrant | null;
  standings: ReturnType<typeof computeStandings>;
}) {
  const t = useTournamentStore((s) => s.tournament);
  const swiss = t.bracketType === "swiss";
  const waitingCut = canStartTopCut(t);
  if (waitingCut) {
    return (
      <section className="rounded-xl border border-border bg-surface p-4">
        <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Swiss complete</p>
        <p className="font-display mt-1 text-xl font-semibold uppercase">
          Start {cutLabel(t.cutSize)} {t.cutType === "double" ? "double elim" : "single elim"}
        </p>
        <p className="mt-1 text-xs text-muted">Standings seed the cut. Top {t.cutSize} by match points, then OMW%.</p>
      </section>
    );
  }
  if (t.phase === "complete") {
    const podium = swiss ? standings.slice(0, 3) : [];
    return (
      <section className="rounded-xl border border-border bg-surface p-4">
        <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">
          {swiss ? "Final standings" : "Champion"}
        </p>
        <p className="font-display mt-2 text-3xl font-semibold tracking-tight uppercase">{champ?.name ?? "—"}</p>
        <p className="text-sm text-muted">{champ?.deck || champ?.tag || (swiss ? "1st on points / OMW%" : "")}</p>
        {podium.length > 1 ? (
          <ol className="mt-3 grid gap-1 text-sm">
            {podium.map((row, i) => {
              const player = entrantById(t, row.entrantId);
              return (
                <li key={row.entrantId} className="flex justify-between gap-2">
                  <span>
                    {i + 1}. {player?.name ?? "—"}
                  </span>
                  <span className="font-mono text-muted tabular-nums">
                    {row.wins}–{row.losses}–{row.draws} · {row.matchPoints} pts
                  </span>
                </li>
              );
            })}
          </ol>
        ) : null}
        <div className="mt-3">
          <ExportTournamentButton variant="secondary" full />
        </div>
      </section>
    );
  }
  if (swiss && t.matches.length > 0) {
    return (
      <section className="rounded-xl border border-border bg-surface p-4">
        <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Swiss leader</p>
        <p className="font-display mt-2 text-2xl font-semibold tracking-tight uppercase">{leader?.name ?? "—"}</p>
        <p className="text-sm text-muted">No grand final. Complete the event to lock 1st from the table.</p>
        <Button className="mt-3 w-full" variant="secondary" onClick={finishTournament}>
          <Flag className="size-3.5" />
          Complete tournament
        </Button>
      </section>
    );
  }
  return null;
}

function SetupPanel() {
  const t = useTournamentStore((s) => s.tournament);
  const patch = useTournamentStore((s) => s.patch);
  const setGame = useTournamentStore((s) => s.setGame);
  const generate = useTournamentStore((s) => s.generate);
  const resetBracket = useTournamentStore((s) => s.resetBracket);
  const reopenTournament = useTournamentStore((s) => s.reopenTournament);
  const loadTestMode = useTournamentStore((s) => s.loadTestMode);
  const game = gameOf(t.gameId);
  const formatOptions = game.formats;
  const formatValue = formatOptions.some((f) => f.label === t.formatName)
    ? t.formatName
    : (formatOptions[0]?.label ?? t.formatName);
  const [sizeDraft, setSizeDraft] = useState(String(t.size));
  const setShape = (partial: Partial<typeof t>) => {
    patch({
      ...partial,
      ...(t.matches.length ? { matches: [], phase: "setup" as const } : {}),
    });
  };

  useEffect(() => {
    setSizeDraft(String(t.size));
  }, [t.size]);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Event</p>
      <div className="mt-3 grid gap-3">
        <Field label="Tournament name">
          <Input
            value={t.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder={`${game.short} event`}
          />
          <p className="mt-1 text-[0.65rem] text-subtle">This title only. Each game keeps its own name.</p>
        </Field>
        <Field label="Stream">
          <Input
            value={t.streamChannel}
            onChange={(e) => patch({ streamChannel: e.target.value })}
            placeholder="twitch.tv/rok or @rok"
          />
          <p className="mt-1 text-[0.65rem] text-subtle">Channel or handle. Shows on the Live badge and starting-soon slate.</p>
        </Field>
        <Field label="Game">
          <NativeSelect
            value={t.gameId}
            onChange={(e) => setGame(e.target.value as typeof t.gameId)}
          >
            {GAME_LIST.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Format">
          <NativeSelect
            key={t.gameId}
            value={formatValue}
            onChange={(e) => {
              const formatName = e.target.value;
              const preset = formatOptions.find((f) => f.label === formatName);
              patch({ formatName, ...(preset?.bestOf ? { bestOf: preset.bestOf } : {}) });
            }}
          >
            {formatOptions.map((f) => (
              <option key={`${t.gameId}-${f.id}`} value={f.label}>
                {f.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bracket">
            <NativeSelect
              value={t.bracketType}
              onChange={(e) => {
                const bracketType = e.target.value as BracketType;
                setShape({
                  bracketType,
                  swissRounds: defaultSwissRounds(t.size),
                  overlayView: bracketType === "swiss" ? "standings" : t.overlayView === "standings" ? "full" : t.overlayView,
                  ...(bracketType === "swiss" ? {} : { cutSize: 0 }),
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
              value={isPresetSize(t.size) ? String(t.size) : "custom"}
              onChange={(e) => {
                if (e.target.value === "custom") {
                  setShape({ size: isPresetSize(t.size) ? 12 : clampBracketSize(t.size) });
                  return;
                }
                setShape({ size: Number(e.target.value) as BracketSize });
              }}
            >
              {PRESET_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n} players
                </option>
              ))}
              <option value="custom">Custom</option>
            </NativeSelect>
          </Field>
        </div>
        {!isPresetSize(t.size) ? (
          <Field label="Players">
            <Input
              inputMode="numeric"
              min={2}
              max={128}
              value={sizeDraft}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, "");
                setSizeDraft(raw);
                const n = Number(raw);
                if (Number.isFinite(n) && n >= 2 && n <= 128) setShape({ size: n });
              }}
              onBlur={() => {
                const next = clampBracketSize(Number(sizeDraft) || t.size);
                setSizeDraft(String(next));
                if (next !== t.size) setShape({ size: next });
              }}
            />
          </Field>
        ) : null}
        <p className="text-xs text-subtle">
          Changing bracket or size clears the current pairings so you can generate again.
          {t.bracketType !== "swiss" && !isPresetSize(t.size)
            ? ` Single/double elim builds a ${bracketSlots(t.size)}-slot bracket and fills empty seats as byes.`
            : ""}
        </p>
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
        {t.bracketType === "swiss" ? (
          <Field label="Top cut">
            <NativeSelect
              value={
                t.cutSize <= 0
                  ? "0"
                  : (CUT_PRESETS as readonly number[]).includes(t.cutSize)
                    ? String(t.cutSize)
                    : "custom"
              }
              onChange={(e) => {
                if (e.target.value === "custom") {
                  patch({ cutSize: Math.min(8, t.size) });
                  return;
                }
                patch({ cutSize: Number(e.target.value) });
              }}
            >
              <option value="0">None — Swiss ends the event</option>
              {CUT_PRESETS.map((n) => (
                <option key={n} value={n}>
                  Top {n}
                </option>
              ))}
              <option value="custom">Custom</option>
            </NativeSelect>
          </Field>
        ) : null}
        {t.bracketType === "swiss" && t.cutSize > 0 && !(CUT_PRESETS as readonly number[]).includes(t.cutSize) ? (
          <Field label="Cut size">
            <Input
              inputMode="numeric"
              min={2}
              max={128}
              value={String(t.cutSize)}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/[^\d]/g, ""));
                if (Number.isFinite(n)) patch({ cutSize: clampCutSize(n, t.size) });
              }}
            />
          </Field>
        ) : null}
        {t.bracketType === "swiss" && t.cutSize > 0 ? (
          <Field label="Cut bracket">
            <NativeSelect
              value={t.cutType === "double" ? "double" : "single"}
              onChange={(e) => patch({ cutType: e.target.value === "double" ? "double" : "single" })}
            >
              <option value="single">Single elim</option>
              <option value="double">Double elim</option>
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
            {viewsFor(t.bracketType, t).map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {catalogForGame(t.gameId) ? (
          <label className="flex items-start justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2.5">
            <span>
              <span className="block text-sm font-medium">Request decklist</span>
              <span className="block text-xs text-muted">
                Walk-up sign-up must search and add cards with quantities. Saved lists feed judge lookup and the export.
              </span>
            </span>
            <Switch checked={Boolean(t.requireDecklist)} onCheckedChange={(on) => patch({ requireDecklist: on === true })} />
          </label>
        ) : null}
        <FloorClock />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" className="flex-1" asChild>
            <a
              href={overlayPath(t.gameId, "floor-clock")}
              target={overlayWindowName(t.gameId, "floor-clock")}
              rel="noreferrer"
            >
              Open floor clock
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              void navigator.clipboard.writeText(`${window.location.origin}${overlayPath(t.gameId, "floor-clock")}`);
            }}
          >
            Copy floor clock URL
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" className="flex-1" asChild>
            <a
              href={overlayPath(t.gameId, "bracket")}
              target={overlayWindowName(t.gameId, "bracket")}
              rel="noreferrer"
            >
              Open bracket
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              void navigator.clipboard.writeText(`${window.location.origin}${overlayPath(t.gameId, "bracket")}`);
            }}
          >
            Copy bracket URL
          </Button>
        </div>
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
        {t.matches.length > 0 && t.phase !== "complete" ? (
          <Button variant="secondary" onClick={finishTournament}>
            <Flag className="size-3.5" />
            Complete tournament
          </Button>
        ) : null}
        {t.phase === "complete" ? (
          <Button variant="outline" onClick={reopenTournament}>
            Reopen tournament
          </Button>
        ) : null}
        <ExportTournamentButton variant={t.phase === "complete" ? "default" : "outline"} full />
        <ImportTournamentButton variant="outline" full />
        <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2">
          <div>
            <p className="text-sm font-medium">Test mode</p>
            <p className="text-[0.65rem] leading-relaxed text-subtle">
              {tournamentLooksLikeTest(t)
                ? "Demo roster is live. Turn off to restore the last real field and pairings."
                : "Load 8 demo players for this game. Your current roster is saved until you turn this off."}
            </p>
          </div>
          <Switch checked={tournamentLooksLikeTest(t)} onCheckedChange={() => loadTestMode()} aria-label="Toggle test mode" />
        </div>
      </div>
    </section>
  );
}

function finishTournament() {
  useTournamentStore.getState().completeTournament();
  const t = useTournamentStore.getState().tournament;
  void exportTournamentFiles(t, useDeskStore.getState().desk).catch(() => {
    window.location.assign("/api/tournament/export");
  });
}

function sendMatchToStream(matchId: string, slot: MatchSlot = 1) {
  const t = useTournamentStore.getState().tournament;
  const match = t.matches.find((m) => m.id === matchId);
  if (!match) return;
  const seat = (entrantId: string | null | undefined) => {
    const e = entrantId ? t.entrants.find((row) => row.id === entrantId) : null;
    const vgc = t.gameId === "pokemon-vgc";
    return {
      name: e?.name ?? "",
      tag: e?.tag ?? "",
      country: e?.country ?? "US",
      pronouns: e?.pronouns ?? "",
      archetype: e?.deck ?? "",
      extra: e?.extra ?? "",
      photoUrl: e?.photoUrl ?? "",
      note: e?.note ?? "",
      judgeNote: e?.judgeNote ?? "",
      decklist: e?.decklist ?? [],
      team: vgc ? (teamHasMons(e?.team) ? e!.team : emptyTeam()) : undefined,
      ink1: e?.ink1 ?? "",
      ink2: e?.ink2 ?? "",
    };
  };
  const pod = isPodMatch(match);
  const deskSlot = slot;
  useTournamentStore.getState().setStreamMatch(matchId, deskSlot);
  useDeskStore.getState().loadStreamMatch({
    eventName: t.name,
    streamChannel: t.streamChannel,
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
    matchId: match.id,
    matchSlot: deskSlot,
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

function removeMatchFromStream(slot: MatchSlot) {
  const t = useTournamentStore.getState().tournament;
  useTournamentStore.getState().setStreamMatch(null, slot);
  useDeskStore.getState().clearStreamSlot(t.gameId, slot);
}

function liveForSlot(t: import("@/lib/tournament-types").TournamentState, slot: MatchSlot) {
  const id = slot === 2 ? t.streamMatchId2 : slot === 3 ? t.streamMatchId3 : t.streamMatchId;
  return t.matches.find((m) => m.id === id) ?? null;
}

function StreamPanel() {
  const t = useTournamentStore((s) => s.tournament);
  const ready = readyMatches(t);
  const lives = MATCH_SLOTS.map((slot) => ({ slot, match: liveForSlot(t, slot) }));
  const anyLive = lives.some((row) => row.match);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Assigned tables</p>
      {anyLive ? (
        <div className="mt-3 grid gap-2">
          {lives.map(({ slot, match }) =>
            match ? (
              <div key={slot} className="rounded-lg border border-live/40 bg-live/10 px-3 py-2">
                <p className="font-mono text-[0.65rem] tracking-[0.16em] text-live uppercase">{MATCH_SLOT_LABEL[slot]}</p>
                <p className="text-sm text-fg">{namesForMatch(t, match)}</p>
                <p className="text-xs text-muted">{match.label}</p>
                <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => removeMatchFromStream(slot)}>
                  Remove
                </Button>
              </div>
            ) : null,
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">
          No match assigned. Send a ready pairing to Stream Match, Floor Match 1, or Floor Match 2.
        </p>
      )}
      <ul className="mt-3 space-y-2">
        {ready.length === 0 ? (
          <li className="text-xs text-subtle">No ready matches.</li>
        ) : (
          ready.map((match) => {
            const on: Record<MatchSlot, boolean> = {
              1: t.streamMatchId === match.id,
              2: t.streamMatchId2 === match.id,
              3: t.streamMatchId3 === match.id,
            };
            return (
              <li key={match.id} className="rounded-lg border border-border bg-surface-2 px-3 py-2">
                <p className="text-xs text-muted">{match.label}</p>
                <p className="text-sm">{namesForMatch(t, match)}</p>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {MATCH_SLOTS.map((slot) => (
                    <Button
                      key={slot}
                      size="sm"
                      variant={on[slot] ? "live" : "secondary"}
                      onClick={() => sendMatchToStream(match.id, slot)}
                    >
                      {MATCH_SLOT_SHORT[slot]}
                    </Button>
                  ))}
                </div>
              </li>
            );
          })
        )}
      </ul>
      <div className="mt-3 flex flex-col gap-2">
        {MATCH_SLOTS.map((slot) => (
          <Button key={`judge-${slot}`} variant="outline" size="sm" className="w-full" asChild>
            <a href={tabletPath(t.gameId, slot)} target="_blank" rel="noreferrer">
              Judge tablet · {MATCH_SLOT_SHORT[slot]}
            </a>
          </Button>
        ))}
        {t.gameId === "mtg" || t.gameId === "lorcana" || t.gameId === "yugioh"
          ? MATCH_SLOTS.map((slot) => (
              <Button key={`player-${slot}`} variant="secondary" size="sm" className="w-full" asChild>
                <a href={playerTabletPath(t.gameId, slot)} target="_blank" rel="noreferrer">
                  Player tablet · {MATCH_SLOT_SHORT[slot]}
                </a>
              </Button>
            ))
          : null}
      </div>
    </section>
  );
}

function RosterPanel({
  sheetPlayerId,
  onOpenSheet,
}: {
  sheetPlayerId: string | null;
  onOpenSheet: (id: string) => void;
}) {
  const t = useTournamentStore((s) => s.tournament);
  const addEntrant = useTournamentStore((s) => s.addEntrant);
  const updateEntrant = useTournamentStore((s) => s.updateEntrant);
  const removeEntrant = useTournamentStore((s) => s.removeEntrant);
  const reseed = useTournamentStore((s) => s.reseed);
  const reorderEntrants = useTournamentStore((s) => s.reorderEntrants);
  const game = gameOf(t.gameId);
  const extra = extraFieldFor(t.gameId, t.formatName);
  const commander = isCommanderLane(t);
  const idField = playerIdField(t.gameId);
  const [draft, setDraft] = useState({ name: "", tag: "", playerId: "", deck: "", extra: "", note: "", photoUrl: "", country: "US", ink1: "", ink2: "" });
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const add = () => {
    if (!draft.name.trim()) return;
    addEntrant({
      name: draft.name.trim(),
      tag: draft.tag.trim(),
      playerId: draft.playerId.trim(),
      deck: draft.deck.trim(),
      extra: commander ? draft.extra.trim() : "",
      note: draft.note.trim(),
      photoUrl: draft.photoUrl.trim(),
      country: draft.country,
      ink1: draft.ink1,
      ink2: draft.ink2,
    });
    setDraft({ name: "", tag: "", playerId: "", deck: "", extra: "", note: "", photoUrl: "", country: draft.country, ink1: "", ink2: "" });
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">
            {game.short} roster
          </p>
          <p className="text-sm text-muted">
            {t.entrants.length} players · drag a row to change seed
            {t.gameId === "pokemon-vgc" ? " · open a team sheet below" : ""}
          </p>
          <div className="mt-1 max-w-xl">
            <PlayerIdStaffNote gameId={t.gameId} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={signupPath(t.gameId)} target="_blank" rel="noreferrer">
              Open sign-up
            </a>
          </Button>
          {t.gameId === "pokemon-vgc" ? (
            <Button variant="outline" size="sm" asChild>
              <a href="/print/team-list?all=1" target="_blank" rel="noreferrer">
                Print all lists
              </a>
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={reseed}>
            <Shuffle className="size-3.5" />
            Reseed 1–n
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_8rem_10rem_1fr_6rem_auto]">
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
          placeholder={idField.label}
          value={draft.playerId}
          onChange={(e) => setDraft((d) => ({ ...d, playerId: e.target.value }))}
        />
        {commander ? (
          <div className="grid gap-2">
            <CommanderSearchField
              value={draft.deck}
              onChange={(deck) => setDraft((d) => ({ ...d, deck }))}
              placeholder="Commander"
            />
            <CommanderSearchField
              value={draft.extra}
              onChange={(extra) => setDraft((d) => ({ ...d, extra }))}
              placeholder="Partner (optional)"
            />
          </div>
        ) : (
          <Input
            placeholder={extra.placeholder}
            value={draft.deck}
            onChange={(e) => setDraft((d) => ({ ...d, deck: e.target.value }))}
          />
        )}
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
      {t.gameId === "lorcana" ? (
        <div className="mt-2">
          <InkPicker
            size="sm"
            ink1={draft.ink1}
            ink2={draft.ink2}
            onChange={(next) => setDraft((d) => ({ ...d, ...next }))}
          />
        </div>
      ) : null}
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <Input
          placeholder="Limitless / notes"
          value={draft.note}
          onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
        />
        <Input
          placeholder="Photo URL"
          value={draft.photoUrl}
          onChange={(e) => setDraft((d) => ({ ...d, photoUrl: e.target.value }))}
        />
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="font-mono text-[0.65rem] tracking-[0.16em] text-muted uppercase">
            <tr>
              <th className="w-8 pb-2 font-medium" />
              <th className="pb-2 font-medium">Seed</th>
              <th className="pb-2 font-medium">Player</th>
              <th className="pb-2 font-medium">Handle</th>
              <th className="pb-2 font-medium">{idField.label}</th>
              <th className="pb-2 font-medium">{extra.label}</th>
              {commander ? <th className="pb-2 font-medium">Partner</th> : null}
              {t.gameId === "lorcana" ? <th className="pb-2 font-medium">Inks</th> : null}
              <th className="pb-2 font-medium">Notes</th>
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
                  showTeam={t.gameId === "pokemon-vgc"}
                  showInks={t.gameId === "lorcana"}
                  catalog={catalogForGame(t.gameId)}
                  formatName={t.formatName}
                  commander={commander}
                  idLabel={idField.label}
                  sheetActive={sheetPlayerId === e.id}
                  onOpenSheet={onOpenSheet}
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
  showTeam,
  showInks,
  catalog,
  formatName,
  commander,
  idLabel,
  sheetActive,
  onOpenSheet,
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
  showTeam: boolean;
  showInks?: boolean;
  catalog?: ReturnType<typeof catalogForGame>;
  formatName?: string;
  commander?: boolean;
  idLabel: string;
  sheetActive: boolean;
  onOpenSheet: (id: string) => void;
}) {
  const filled = countFilledMons(entrant.team);
  const [deckOpen, setDeckOpen] = useState(false);
  const cards = decklistCount(entrant.decklist);
  return (
    <>
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
          value={entrant.playerId}
          onChange={(e) => onChange(entrant.id, { playerId: e.target.value })}
          className="h-8"
          placeholder={idLabel}
        />
      </td>
      <td className="py-2 pr-2">
        {commander ? (
          <CommanderSearchField
            value={entrant.deck}
            onChange={(deck) => onChange(entrant.id, { deck })}
            placeholder="Commander"
            className="h-8"
          />
        ) : (
          <Input
            value={entrant.deck}
            onChange={(e) => onChange(entrant.id, { deck: e.target.value })}
            className="h-8"
          />
        )}
      </td>
      {commander ? (
        <td className="py-2 pr-2">
          <CommanderSearchField
            value={entrant.extra}
            onChange={(extra) => onChange(entrant.id, { extra })}
            placeholder="Partner"
            className="h-8"
          />
        </td>
      ) : null}
      {showInks ? (
        <td className="py-2 pr-2">
          <InkPicker
            size="sm"
            ink1={entrant.ink1}
            ink2={entrant.ink2}
            onChange={(next) => onChange(entrant.id, next)}
          />
        </td>
      ) : null}
      <td className="py-2 pr-2">
        <div className="grid gap-1">
          <Input
            value={entrant.note}
            onChange={(e) => onChange(entrant.id, { note: e.target.value })}
            className="h-8"
            placeholder="Limitless / notes"
          />
          <Input
            value={entrant.photoUrl}
            onChange={(e) => onChange(entrant.id, { photoUrl: e.target.value })}
            className="h-8"
            placeholder="Photo URL"
          />
        </div>
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
        <div className="flex justify-end gap-1">
          {showTeam ? (
            <Button
              variant={sheetActive ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2"
              onClick={() => onOpenSheet(entrant.id)}
              aria-label="Open team sheet"
              title={filled ? teamSheetLabel(entrant.team) : "Open team sheet"}
              data-qa={`open-sheet-${entrant.id}`}
            >
              <ClipboardList className={cn("size-3.5", filled === 6 && "text-ok")} />
              <span className="font-mono text-[0.65rem] tabular-nums">{filled}/6</span>
            </Button>
          ) : null}
          {showTeam ? (
            <Button variant="ghost" size="icon" className="size-8" asChild>
              <a href={`/print/team-list?id=${entrant.id}`} target="_blank" rel="noreferrer" aria-label="Print team list">
                <Printer className="size-3.5" />
              </a>
            </Button>
          ) : null}
          {catalog ? (
            <Button
              variant={deckOpen ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2"
              onClick={() => setDeckOpen((open) => !open)}
              aria-label="Edit decklist"
            >
              <ClipboardList className={cn("size-3.5", cards > 0 && "text-ok")} />
              <span className="font-mono text-[0.65rem] tabular-nums">{cards}</span>
            </Button>
          ) : null}
          <Button variant="ghost" size="icon" className="size-8" onClick={() => onRemove(entrant.id)} aria-label="Remove">
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </td>
    </tr>
    {catalog && deckOpen ? (
      <tr>
        <td colSpan={12} className="bg-surface-2/60 px-3 py-3">
          <DecklistEditor
            catalog={catalog}
            formatName={formatName}
            value={entrant.decklist ?? []}
            onChange={(decklist) => onChange(entrant.id, { decklist })}
          />
        </td>
      </tr>
    ) : null}
    </>
  );
}

function BracketBoard() {
  const t = useTournamentStore((s) => s.tournament);
  const report = useTournamentStore((s) => s.report);
  const setScore = useTournamentStore((s) => s.setScore);
  const pairNext = useTournamentStore((s) => s.pairNext);
  const startCut = useTournamentStore((s) => s.startCut);
  const groups = groupByRound(t.matches);
  const standings = t.bracketType === "swiss" ? computeStandings(t) : [];
  const round = currentSwissRound(t);
  const cutReady = canStartTopCut(t);
  const inCut = topCutStarted(t);
  const canPair =
    t.bracketType === "swiss" &&
    !inCut &&
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
          {t.bracketType === "swiss"
            ? inCut
              ? `Top cut · ${cutLabel(t.cutSize)}`
              : hasTopCut(t)
                ? `Swiss · then ${cutLabel(t.cutSize)}`
                : "Swiss"
            : "Bracket"}
        </p>
        <div className="flex flex-wrap gap-2">
        {canPair ? (
          <Button size="sm" onClick={pairNext}>
            Pair round {round + 1}
          </Button>
        ) : null}
        {cutReady ? (
          <Button size="sm" onClick={startCut}>
            <Trophy className="size-3.5" />
            Start {cutLabel(t.cutSize)} {t.cutType === "double" ? "double elim" : "single elim"}
          </Button>
        ) : null}
        {t.bracketType === "swiss" && t.phase !== "complete" && round > 0 && !cutReady ? (
          <Button size="sm" variant="secondary" onClick={finishTournament}>
            <Flag className="size-3.5" />
            Complete tournament
          </Button>
        ) : null}
        </div>
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
                      const live = t.streamMatchId === match.id || t.streamMatchId2 === match.id || t.streamMatchId3 === match.id;
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
            <th className="pb-2 font-medium">{extraFieldFor(t.gameId, t.formatName).label}</th>
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
                <td className="py-1.5 pr-3">
                  <p>{e?.name ?? "—"}</p>
                  {e?.playerId ? (
                    <p className="font-mono text-[0.68rem] text-muted">{e.playerId}</p>
                  ) : null}
                </td>
                <td className="py-1.5 pr-3 text-muted">
                  {formatCommanderLine(e?.deck ?? "", e?.extra ?? "") || e?.deck || "—"}
                </td>
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
