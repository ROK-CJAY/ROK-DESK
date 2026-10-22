import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AppChrome } from "@/components/app/app-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readToRefresh, readToToken, writeToSession, clearToSession } from "@/lib/startgg-link";
import { rokDesktop } from "@/lib/rok-desktop";
import { PUBLIC_SIGNUP_ORIGIN } from "@/lib/remote-signup-code";
import type { ToBoard, ToSet, ToTournament, ToUser } from "@/lib/startgg-to";
import { BracketBoard } from "@/components/fgc/fgc-bracket";

type SetDraft = { score1: number; score2: number; character1: string; character2: string; stageId: string };

function clockText(now: number, at: number | null) {
  if (!at) return "";
  const start = at < 10_000_000_000 ? at * 1000 : at;
  const total = Math.max(0, Math.floor((now - start) / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours ? `${hours}:${mm}:${ss}` : `${minutes}:${ss}`;
}

function setLabel(state: number) {
  if (state === 2) return "Called";
  if (state === 3) return "Done";
  if (state === 6) return "Started";
  return "Waiting";
}

async function toApi(body: Record<string, unknown>) {
  const res = await fetch("/api/startgg", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(payload.error || "start.gg request failed");
  return payload;
}

export function FgcTournamentDesk() {
  const [token, setToken] = useState("");
  const [ready, setReady] = useState<boolean | null>(null);
  const [user, setUser] = useState<ToUser | null>(null);
  const [tournaments, setTournaments] = useState<ToTournament[]>([]);
  const [eventSlug, setEventSlug] = useState("");
  const [board, setBoard] = useState<ToBoard | null>(null);
  const [scores, setScores] = useState<Record<string, SetDraft>>({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [picked, setPicked] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const loadAccount = async (next: string) => {
    setBusy("account");
    setError("");
    try {
      const body = (await toApi({ action: "account", token: next })) as { user: ToUser; tournaments: ToTournament[] };
      setUser(body.user);
      setTournaments(body.tournaments);
      setToken(next);
      writeToSession(next, readToRefresh().refreshToken, readToRefresh().expiresAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect");
    } finally {
      setBusy("");
    }
  };

  const loadBoard = async (slug: string, auth = token) => {
    if (!slug || !auth) return;
    setBusy("board");
    setError("");
    setEventSlug(slug);
    try {
      const next = (await toApi({ action: "board", token: auth, slug })) as ToBoard;
      setBoard(next);
      setPicked((current) => next.sets.some((set) => set.id === current) ? current : "");
      setScores(Object.fromEntries(next.sets.map((set) => [set.id, {
        score1: set.score1,
        score2: set.score2,
        character1: set.p1.characterId,
        character2: set.p2.characterId,
        stageId: set.stageId,
      }])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the event");
    } finally {
      setBusy("");
    }
  };

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const fromHash = hash.get("access_token") || "";
    if (fromHash) {
      const expiresIn = Number(hash.get("expires_in") || "3600");
      writeToSession(fromHash, hash.get("refresh_token") || "", Date.now() + expiresIn * 1000);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    const saved = readToToken();
    if (saved) void loadAccount(saved);
    const host = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? PUBLIC_SIGNUP_ORIGIN : window.location.origin;
    void fetch(`${host}/api/startgg-oauth?op=ready`).then((res) => res.json()).then((body: { ready?: boolean }) => setReady(Boolean(body.ready))).catch(() => setReady(false));
    if (!rokDesktop()) return;
    const timer = window.setInterval(() => {
      void fetch("/api/startgg-oauth?op=session").then((res) => res.json()).then((body: { accessToken?: string; refreshToken?: string; expiresAt?: number }) => {
        if (!body.accessToken || body.accessToken === readToToken()) return;
        writeToSession(body.accessToken, body.refreshToken || "", body.expiresAt || Date.now() + 3600_000);
        void loadAccount(body.accessToken);
      }).catch(() => undefined);
    }, 1500);
    return () => window.clearInterval(timer);
    // login is restored once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const login = () => {
    const desktop = Boolean(rokDesktop());
    const back = desktop ? `${window.location.origin}/api/startgg-oauth?op=land` : `${window.location.origin}/fgc/tournament`;
    const host = desktop || window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? PUBLIC_SIGNUP_ORIGIN : window.location.origin;
    window.location.assign(`${host}/api/startgg-oauth?op=start&return=${encodeURIComponent(back)}`);
  };

  const act = async (set: ToSet, action: string, extra: Record<string, unknown> = {}) => {
    setBusy(set.id + action);
    setError("");
    try {
      const score = scores[set.id] ?? { score1: set.score1, score2: set.score2, character1: set.p1.characterId, character2: set.p2.characterId, stageId: set.stageId };
      await toApi({
        action,
        token,
        setId: set.id,
        score1: score.score1,
        score2: score.score2,
        stageId: score.stageId,
        character1: score.character1,
        character2: score.character2,
        entrant1: set.p1.id,
        entrant2: set.p2.id,
        ...extra,
      });
      await loadBoard(eventSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "start.gg did not take that");
      setBusy("");
    }
  };

  const logout = () => {
    clearToSession();
    void fetch("/api/startgg-oauth?op=logout", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    setToken("");
    setUser(null);
    setTournaments([]);
    setBoard(null);
    setEventSlug("");
  };

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <AppChrome view="fgc" eyebrow="FGC tournament">
        <nav className="flex w-fit rounded-lg border border-border bg-surface-2 p-0.5">
          <Link to="/fgc/tournament" className="rounded-md bg-surface px-3 py-1.5 text-xs font-medium text-fg">Tournament</Link>
          <Link to="/fgc/production" className="rounded-md px-3 py-1.5 text-xs font-medium text-muted hover:text-fg">Production</Link>
        </nav>
      </AppChrome>
      <main className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4">
        {!user ? (
          <section className="mx-auto grid w-full max-w-xl gap-3 rounded-xl border border-border bg-surface p-5">
            <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">TO desk</p>
            <h1 className="font-display text-3xl font-semibold uppercase">Log in with start.gg</h1>
            <p className="text-sm text-muted">
              Use the start.gg account that runs the event. You only see upcoming tournaments that account is allowed to manage. Finished ones stay off the list.
            </p>
            <Button disabled={ready !== true || busy === "account"} onClick={login}>{busy === "account" ? "Connecting" : "Log in with start.gg"}</Button>
            {ready === false ? <p className="text-sm text-muted">Log in is not turned on yet. The ROK Desk host still needs the start.gg app id and secret.</p> : null}
            {error ? <p className="text-sm text-live">{error}</p> : null}
          </section>
        ) : (
          <>
            <section className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4">
              <div className="min-w-[12rem] flex-1">
                <p className="font-mono text-[0.65rem] tracking-[0.18em] text-muted uppercase">Signed in</p>
                <p className="text-lg">{user.tag}</p>
                <p className="text-xs text-muted">{user.name}. Past tournaments are hidden.</p>
              </div>
              <label className="grid gap-1 text-xs text-muted">
                Event
                <select
                  className="h-10 min-w-64 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg"
                  value={eventSlug}
                  onChange={(e) => void loadBoard(e.target.value)}
                >
                  <option value="">Choose an event</option>
                  {tournaments.map((tournament) => (
                    <optgroup key={tournament.id} label={[tournament.name, tournament.when].filter(Boolean).join(" · ")}>
                      {tournament.events.map((event) => (
                        <option key={event.id} value={event.slug}>{event.name}{event.game ? ` · ${event.game}` : ""}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <Button variant="outline" disabled={!eventSlug || busy === "board"} onClick={() => void loadBoard(eventSlug)}>Refresh</Button>
              <Button variant="ghost" onClick={logout}>Log out</Button>
              {error ? <p className="w-full text-sm text-live">{error}</p> : null}
            </section>
            {!board ? (
              <section className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
                {tournaments.length === 0 ? "No upcoming tournaments on this account." : "Pick an event. Stations from start.gg show up here so you can run the bracket from the desk."}
              </section>
            ) : (
              <StationFloor
                board={board}
                now={now}
                busy={busy}
                picked={picked}
                scores={scores}
                onPick={setPicked}
                onDraft={(id, patch) => setScores((current) => {
                  const prev = current[id] ?? { score1: 0, score2: 0, character1: "", character2: "", stageId: "" };
                  return { ...current, [id]: { ...prev, ...patch } };
                })}
                onAct={act}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function liveSet(sets: ToSet[]) {
  return sets.find((set) => set.state === 6) ?? sets.find((set) => set.state === 2) ?? sets[0] ?? null;
}

function StationFloor({
  board,
  now,
  busy,
  picked,
  scores,
  onPick,
  onDraft,
  onAct,
}: {
  board: ToBoard;
  now: number;
  busy: string;
  picked: string;
  scores: Record<string, SetDraft>;
  onPick: (id: string) => void;
  onDraft: (id: string, patch: Partial<SetDraft>) => void;
  onAct: (set: ToSet, action: string, extra?: Record<string, unknown>) => Promise<void>;
}) {
  const set = board.sets.find((item) => item.id === picked) ?? null;
  const draft = set
    ? scores[set.id] ?? { score1: set.score1, score2: set.score2, character1: set.p1.characterId, character2: set.p2.characterId, stageId: set.stageId }
    : null;
  const stamp = set && set.state !== 1 ? (set.state === 6 ? set.startedAt ?? set.updatedAt : set.updatedAt) : null;

  return (
    <>
      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-4">
          <p className="font-medium">{board.event.name}</p>
          <p className="text-xs text-muted">{[board.tournament, board.event.game, `${board.stations.length} stations`, `${board.event.entrants} entrants`].filter(Boolean).join(" · ")}. Click a set, then send it to a station.</p>
        </div>
        <BracketBoard sets={board.sets} selected={picked} onSelect={onPick} />
      </section>
      {board.stations.length ? (
        <section className="grid gap-2 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 xl:grid-cols-4">
          {board.stations.map((station) => {
            const here = liveSet(board.sets.filter((row) => row.stationId === station.id && row.state !== 3));
            const mark = here ? (here.state === 6 ? here.startedAt ?? here.updatedAt : here.state === 2 ? here.updatedAt : null) : null;
            return (
              <button key={station.id} type="button" onClick={() => here && onPick(here.id)} className="rounded-lg border border-border p-3 text-left">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{station.name}</p>
                  <span className="font-mono text-[0.65rem] uppercase text-muted">{here ? setLabel(here.state) : "Open"}</span>
                </div>
                <p className="mt-1 truncate text-sm">{here ? `${here.p1.name} vs ${here.p2.name}` : "No set"}</p>
                <p className="font-mono text-lg">{mark ? clockText(now, mark) : "—"}</p>
              </button>
            );
          })}
        </section>
      ) : null}
      {board.streams.length ? (
        <section className="rounded-xl border border-border bg-surface p-4">
          <p className="font-mono text-[0.65rem] tracking-[0.18em] text-muted uppercase">Streams</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {board.streams.map((stream) => {
              const here = liveSet(board.sets.filter((row) => row.streamId === stream.id && row.state !== 3));
              const mark = here ? (here.state === 6 ? here.startedAt ?? here.updatedAt : here.state === 2 ? here.updatedAt : null) : null;
              const station = board.stations.find((item) => item.id === stream.stationId);
              return (
                <div key={stream.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{stream.name}</p>
                    <span className="font-mono text-[0.65rem] uppercase text-muted">{here ? setLabel(here.state) : "Open"}</span>
                  </div>
                  <p className="mt-1 truncate text-sm">{here ? `${here.p1.name} vs ${here.p2.name}` : "No set"}</p>
                  <p className="text-xs text-muted">{station ? station.name : "No station linked on start.gg"}</p>
                  <p className="font-mono text-lg">{mark ? clockText(now, mark) : "—"}</p>
                  <Button
                    className="mt-2"
                    size="sm"
                    variant="secondary"
                    disabled={!set || busy.startsWith(set.id)}
                    onClick={() => set && void onAct(set, "call-stream", { streamId: stream.id, stationId: stream.stationId })}
                  >
                    Call selected set
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
      {set && draft ? (
        <section className="grid gap-3 rounded-xl border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-mono text-[0.65rem] tracking-[0.18em] text-muted uppercase">{[set.identifier, set.round].filter(Boolean).join(" · ")}</p>
              <p className="text-lg">{set.p1.name} vs {set.p2.name}</p>
              <p className="text-xs text-muted">{stamp ? `${set.state === 6 ? "Started" : "Called"} ${clockText(now, stamp)}` : setLabel(set.state)}{set.station ? ` · ${set.station}` : ""}</p>
            </div>
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="secondary" disabled={busy.startsWith(set.id)} onClick={() => void onAct(set, "call")}>Call</Button>
              <Button size="sm" variant="secondary" disabled={busy.startsWith(set.id)} onClick={() => void onAct(set, "begin")}>Start</Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="h-9 rounded-md border border-border bg-surface-2 px-2 text-sm"
              value={set.stationId}
              onChange={(e) => e.target.value && void onAct(set, "assign-station", { stationId: e.target.value })}
            >
              <option value="">{board.stations.length ? "Assign a station" : "No stations on this event"}</option>
              {board.stations.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}
            </select>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <label className="grid gap-1 text-xs text-muted">
              {set.p1.name} character
              <select className="h-9 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg" value={draft.character1} onChange={(e) => onDraft(set.id, { character1: e.target.value })}>
                <option value="">Character</option>
                {board.characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-xs text-muted">
              {set.p2.name} character
              <select className="h-9 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg" value={draft.character2} onChange={(e) => onDraft(set.id, { character2: e.target.value })}>
                <option value="">Character</option>
                {board.characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-xs text-muted">
              Stage
              <select className="h-9 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg" value={draft.stageId} onChange={(e) => onDraft(set.id, { stageId: e.target.value })}>
                <option value="">Stage</option>
                {board.stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
              </select>
            </label>
            <div className="flex items-end gap-2">
              <Input className="h-9 w-16" inputMode="numeric" value={draft.score1} onChange={(e) => onDraft(set.id, { score1: Number(e.target.value) || 0 })} />
              <span className="pb-2 text-muted">-</span>
              <Input className="h-9 w-16" inputMode="numeric" value={draft.score2} onChange={(e) => onDraft(set.id, { score2: Number(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={!set.p1.id || busy.startsWith(set.id)} onClick={() => void onAct(set, "report", { winnerId: set.p1.id })}>{set.p1.name} wins</Button>
            <Button size="sm" variant="outline" disabled={!set.p2.id || busy.startsWith(set.id)} onClick={() => void onAct(set, "report", { winnerId: set.p2.id })}>{set.p2.name} wins</Button>
          </div>
          <p className="text-xs text-muted">Reporting the winner sends the score, characters, and stage to start.gg and advances the bracket.</p>
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-border bg-surface p-4 text-sm text-muted">Select a set on the bracket to assign its station, call it, and report it.</section>
      )}
    </>
  );
}
