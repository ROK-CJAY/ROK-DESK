import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import QRCode from "qrcode";
import { FgcGuideButton } from "@/components/fgc/fgc-guide";
import { AppChrome } from "@/components/app/app-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readToRefresh, readToToken, writeToSession, clearToSession } from "@/lib/startgg-link";
import { rokDesktop } from "@/lib/rok-desktop";
import { PUBLIC_SIGNUP_ORIGIN } from "@/lib/remote-signup-code";
import type { ToBoard, ToOption, ToSet, ToTournament, ToUser } from "@/lib/startgg-to";
import { BracketBoard } from "@/components/fgc/fgc-bracket";
import { blankPlayer, blankSet } from "@/lib/fgc-types";
import { useFgcStore } from "@/lib/fgc-store";
import { cn } from "@/lib/cn";

type SetDraft = { score1: number; score2: number; character1: string; character2: string; stageId: string };

type SetClock = { called: number | null; started: number | null };

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

function characterOptions(characters: ToOption[], id: string, name: string) {
  if (!id || characters.some((character) => character.id === id)) return characters;
  return [{ id, name: name || "Selected", icon: "" }, ...characters];
}

function CharacterMark({ characters, id, fallback }: { characters: ToOption[]; id: string; fallback: string }) {
  const icon = characters.find((character) => character.id === id)?.icon || fallback;
  return icon ? <img src={icon} alt="" className="h-8 w-8 shrink-0 object-contain" /> : <span className="h-8 w-8 shrink-0" />;
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

  const loadBoard = async (slug: string, auth = token, quiet = false) => {
    if (!slug || !auth) return;
    if (!quiet) {
      setBusy("board");
      setError("");
    }
    setEventSlug(slug);
    try {
      const next = (await toApi({ action: "board", token: auth, slug })) as ToBoard;
      setBoard(next);
      const session = readToRefresh();
      void fetch("/api/startgg", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "bind-live", slug, token: auth, refreshToken: session.refreshToken, expiresAt: session.expiresAt }),
      }).catch(() => undefined);
      if (!quiet) setPicked((current) => next.sets.some((set) => set.id === current) ? current : "");
      setScores((current) => {
        const incoming = Object.fromEntries(next.sets.map((set) => [set.id, {
          score1: set.score1,
          score2: set.score2,
          character1: set.p1.characterId,
          character2: set.p2.characterId,
          stageId: set.stageId,
        }]));
        if (!quiet) return incoming;
        const openId = pickedRef.current;
        if (!openId || !current[openId]) return incoming;
        const local = current[openId];
        const fresh = incoming[openId];
        return {
          ...incoming,
          [openId]: {
            ...fresh,
            ...local,
            character1: local.character1 || fresh?.character1 || "",
            character2: local.character2 || fresh?.character2 || "",
            stageId: local.stageId || fresh?.stageId || "",
          },
        };
      });
    } catch (err) {
      if (!quiet) setError(err instanceof Error ? err.message : "Could not load the event");
    } finally {
      if (!quiet) setBusy("");
    }
  };

  const pickedRef = useRef("");
  pickedRef.current = picked;
  const refreshRef = useRef<() => void>(() => {});
  refreshRef.current = () => {
    if (!eventSlug || !token || busy) return;
    void loadBoard(eventSlug, token, true);
  };

  useEffect(() => {
    const timer = window.setInterval(() => refreshRef.current(), 8000);
    return () => window.clearInterval(timer);
  }, []);

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

  const clocks = useRef<Record<string, SetClock>>({});
  if (board) {
    for (const item of board.sets) {
      if (item.winnerId || item.state === 3) {
        delete clocks.current[item.id];
        continue;
      }
      if (item.state !== 2 && item.state !== 6) continue;
      const slot = clocks.current[item.id] ?? { called: null, started: null };
      if (item.state === 2) slot.called = slot.called ?? item.updatedAt;
      if (item.state === 6) {
        slot.started = item.startedAt ?? slot.started ?? item.updatedAt;
        if (!slot.called && item.updatedAt && slot.started && item.updatedAt < (slot.started < 10_000_000_000 ? slot.started * 1000 : slot.started)) slot.called = item.updatedAt;
      }
      clocks.current[item.id] = slot;
    }
  }

  const act = async (set: ToSet, action: string, extra: Record<string, unknown> = {}) => {
    const slot = clocks.current[set.id] ?? { called: null, started: null };
    if (action === "call" || action === "call-station" || action === "call-stream") slot.called = Date.now();
    if (action === "begin") slot.started = Date.now();
    clocks.current[set.id] = slot;
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
    void fetch("/api/startgg", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "unbind-live" }) }).catch(() => undefined);
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
        <FgcGuideButton kind="tournament" />
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
                clocks={clocks.current}
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
  const open = (set: ToSet) => !set.winnerId && set.state !== 3;
  return sets.find((set) => set.state === 6 && open(set)) ?? sets.find((set) => set.state === 2 && open(set)) ?? null;
}

function useTabletOrigin() {
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    const here = window.location.origin;
    setOrigin(here);
    void fetch("/api/host-info")
      .then((res) => res.json())
      .then((info: { local?: string; lan?: string[] }) => {
        const local = here.includes("127.0.0.1") || here.includes("localhost");
        const lan = (info.lan ?? []).find((url) => url && url !== info.local);
        if (local && lan) setOrigin(lan);
      })
      .catch(() => undefined);
  }, []);
  return origin;
}

function strikeHref(origin: string, id: string) {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/fgc/strike?station=${encodeURIComponent(id)}`;
}

function StationFloor({
  board,
  now,
  clocks,
  busy,
  picked,
  scores,
  onPick,
  onDraft,
  onAct,
}: {
  board: ToBoard;
  now: number;
  clocks: Record<string, SetClock>;
  busy: string;
  picked: string;
  scores: Record<string, SetDraft>;
  onPick: (id: string) => void;
  onDraft: (id: string, patch: Partial<SetDraft>) => void;
  onAct: (set: ToSet, action: string, extra?: Record<string, unknown>) => Promise<void>;
}) {
  const [stationId, setStationId] = useState("");
  const [stationQuery, setStationQuery] = useState("");
  const [queuedSet, setQueuedSet] = useState("");
  const [sendStation, setSendStation] = useState("");
  const [sendStream, setSendStream] = useState("");
  const [stationBest, setStationBest] = useState<1 | 3 | 5 | 7>(3);
  const [cardBest, setCardBest] = useState<1 | 3 | 5 | 7>(3);
  const [qr, setQr] = useState("");
  const origin = useTabletOrigin();
  const set = board.sets.find((item) => item.id === picked) ?? null;
  const draft = set
    ? scores[set.id] ?? { score1: set.score1, score2: set.score2, character1: set.p1.characterId, character2: set.p2.characterId, stageId: set.stageId }
    : null;
  useEffect(() => {
    setSendStation(set?.stationId ?? "");
    setSendStream(set?.streamId ?? "");
    const value = set?.bestOf;
    setCardBest(value === 1 || value === 5 || value === 7 ? value : 3);
  }, [set?.id, set?.stationId, set?.streamId, set?.bestOf]);
  const called = !!set && !set.winnerId && (set.state === 2 || set.state === 6);
  const place = called ? [set.station, set.stream].filter((item) => item && item !== "Station").join(" · ") : "";

  const station = board.stations.find((item) => item.id === stationId) ?? null;
  const streamSpot = board.streams.find((item) => item.id === stationId || item.stationId === stationId) ?? null;
  const spot = station
    ? { id: station.id, name: station.name, stationId: station.id, streamId: station.streamId }
    : streamSpot
      ? { id: streamSpot.stationId || streamSpot.id, name: streamSpot.name, stationId: streamSpot.stationId, streamId: streamSpot.id }
      : null;
  useEffect(() => {
    const row = board.sets.find((item) => item.id === queuedSet);
    const value = row?.bestOf;
    setStationBest(value === 1 || value === 5 || value === 7 ? value : 3);
    // Only the chosen set should reset the best-of. A board refresh must not wipe the choice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queuedSet]);
  const stationSets = board.sets.filter((item) => {
    if (item.state === 3 || item.p1.name === "TBD" || item.p2.name === "TBD") return false;
    const needle = stationQuery.trim().toLowerCase();
    if (!needle) return true;
    return `${item.p1.name} ${item.p2.name} ${item.round} ${item.identifier}`.toLowerCase().includes(needle);
  });

  useEffect(() => {
    if (!set && !spot) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onPick("");
      setStationId("");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [set, spot, onPick]);

  const strikeUrl = spot ? strikeHref(origin, spot.stationId || spot.id) : "";
  useEffect(() => {
    if (!strikeUrl) {
      setQr("");
      return;
    }
    let cancel = false;
    void QRCode.toDataURL(strikeUrl, { margin: 1, width: 280, color: { dark: "#111111", light: "#ffffff" } }).then((url) => {
      if (!cancel) setQr(url);
    });
    return () => {
      cancel = true;
    };
  }, [strikeUrl]);

  return (
    <>
      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-3">
          <p className="font-medium">{board.event.name}</p>
          <p className="text-xs text-muted">{[board.tournament, board.event.game, `${board.stations.length} stations`, `${board.event.entrants} entrants`].filter(Boolean).join(" · ")}</p>
        </div>
        <BracketBoard sets={board.sets} now={now} clocks={clocks} selected={picked} onSelect={onPick} />
      </section>
      <section className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-1 font-mono text-[0.65rem] tracking-[0.18em] text-muted uppercase">Stations</p>
        <p className="mb-3 text-xs text-muted">Numbered stations are the floor. Stream stations are the ones start.gg tied to a stream. Each one opens the same way and has its own stage-strike tablet.</p>
        {board.stations.some((item) => !item.streamId) ? (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {board.stations.filter((item) => !item.streamId).map((item) => {
              const here = liveSet(board.sets.filter((row) => row.stationId === item.id && row.state !== 3));
              const clock = here ? clocks[here.id] : null;
              const open = !here;
              return (
                <div key={item.id} className={cn("rounded-lg border p-3", open ? "border-border" : "border-accent")}>
                  <button type="button" onClick={() => { setStationQuery(""); setQueuedSet(""); setSendStream(""); setStationId(item.id); }} className="w-full text-left">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{item.name}</p>
                      <span className={cn("font-mono text-[0.65rem] uppercase", open ? "text-muted" : "text-live")}>{here ? setLabel(here.state) : "Open"}</span>
                    </div>
                    <p className="mt-1 truncate text-sm">{here ? `${here.p1.name} vs ${here.p2.name}` : "Open"}</p>
                    <p className="font-mono text-xs text-muted">{clock?.called ? `Called ${clockText(now, clock.called)}` : "—"}{clock?.started ? ` · Started ${clockText(now, clock.started)}` : ""}</p>
                  </button>
                  <a href={strikeHref(origin, item.id)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs underline">Strike tablet</a>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted">This event has no numbered stations on start.gg yet.</p>
        )}
        {board.streams.length || board.stations.some((item) => item.streamId) ? (
          <div className="mt-4">
            <p className="mb-2 font-mono text-[0.65rem] tracking-[0.18em] text-muted uppercase">Stream stations</p>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ...board.stations.filter((item) => item.streamId).map((item) => ({ key: item.id, openId: item.id, name: item.name, stationId: item.id, streamId: item.streamId })),
                ...board.streams
                  .filter((stream) => !board.stations.some((item) => item.streamId === stream.id || item.id === stream.stationId))
                  .map((stream) => ({ key: stream.id, openId: stream.stationId || stream.id, name: stream.name, stationId: stream.stationId, streamId: stream.id })),
              ].map((item) => {
                const here = liveSet(board.sets.filter((row) => row.state !== 3 && (row.stationId === item.stationId || row.streamId === item.streamId)));
                const clock = here ? clocks[here.id] : null;
                const open = !here;
                return (
                  <div key={item.key} className={cn("rounded-lg border p-3", open ? "border-border" : "border-accent")}>
                    <button type="button" onClick={() => { setStationQuery(""); setQueuedSet(""); setSendStream(item.streamId); setStationId(item.openId); }} className="w-full text-left">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{item.name}</p>
                        <span className={cn("font-mono text-[0.65rem] uppercase", open ? "text-muted" : "text-live")}>{here ? setLabel(here.state) : "Open"}</span>
                      </div>
                      <p className="mt-1 truncate text-sm">{here ? `${here.p1.name} vs ${here.p2.name}` : "Open"}</p>
                      <p className="font-mono text-xs text-muted">{clock?.called ? `Called ${clockText(now, clock.called)}` : "—"}{clock?.started ? ` · Started ${clockText(now, clock.started)}` : ""}</p>
                    </button>
                    <a href={strikeHref(origin, item.stationId || item.openId)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs underline">Strike tablet</a>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>
      {set && draft ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => onPick("")}>
          <section className="grid max-h-[90vh] w-full max-w-xl gap-3 overflow-auto rounded-xl border border-border bg-surface p-4" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[0.65rem] tracking-[0.18em] text-muted uppercase">{[set.identifier, set.round].filter(Boolean).join(" · ")}</p>
                <p className="text-lg">{set.p1.name} vs {set.p2.name}</p>
                <p className="text-xs text-muted">{setLabel(set.state)}{place ? ` · ${place}` : ""}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => onPick("")}>Close</Button>
            </div>
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="secondary" disabled={busy.startsWith(set.id)} onClick={() => void onAct(set, "call")}>Call</Button>
              <Button size="sm" variant="secondary" disabled={busy.startsWith(set.id)} onClick={() => void onAct(set, "begin")}>Start</Button>
            </div>
            <div className="grid gap-2">
              <label className="grid gap-1 text-xs text-muted">
                Station
                <span className="flex gap-2">
                  <select className="h-9 min-w-0 flex-1 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg" value={sendStation} onChange={(event) => setSendStation(event.target.value)}>
                    <option value="">Choose a station</option>
                    {board.stations.map((item) => {
                      const taken = board.sets.some((row) => row.stationId === item.id && row.state !== 3 && row.id !== set.id);
                      return <option key={item.id} value={item.id}>{item.name}{taken ? " · in use" : " · open"}</option>;
                    })}
                  </select>
                  <select className="h-9 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg" value={cardBest} onChange={(event) => setCardBest(Number(event.target.value) as 1 | 3 | 5 | 7)} aria-label="Best of">
                    <option value={1}>Bo1</option>
                    <option value={3}>Bo3</option>
                    <option value={5}>Bo5</option>
                    <option value={7}>Bo7</option>
                  </select>
                  <Button size="sm" variant="secondary" disabled={!sendStation || busy.startsWith(set.id)} onClick={() => void onAct(set, "call-station", { stationId: sendStation, bestOf: cardBest })}>Send</Button>
                </span>
              </label>
              <label className="grid gap-1 text-xs text-muted">
                Stream
                <span className="flex gap-2">
                  <select className="h-9 min-w-0 flex-1 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg" value={sendStream} onChange={(event) => setSendStream(event.target.value)}>
                    <option value="">Choose a stream</option>
                    {board.streams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  <Button size="sm" variant="secondary" disabled={!sendStream || busy.startsWith(set.id)} onClick={() => {
                    const stream = board.streams.find((item) => item.id === sendStream);
                    if (stream) void onAct(set, "call-stream", { streamId: stream.id, stationId: stream.stationId });
                  }}>Send</Button>
                </span>
              </label>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <label className="grid gap-1 text-xs text-muted">
                {set.p1.name} character
                <span className="flex items-center gap-2">
                  <CharacterMark characters={board.characters} id={draft.character1} fallback={set.p1.characterIcon} />
                  <select className="h-9 min-w-0 flex-1 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg" value={draft.character1} onChange={(e) => onDraft(set.id, { character1: e.target.value })}>
                    <option value="">Character</option>
                    {characterOptions(board.characters, draft.character1, set.p1.character).map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
                  </select>
                </span>
              </label>
              <label className="grid gap-1 text-xs text-muted">
                {set.p2.name} character
                <span className="flex items-center gap-2">
                  <CharacterMark characters={board.characters} id={draft.character2} fallback={set.p2.characterIcon} />
                  <select className="h-9 min-w-0 flex-1 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg" value={draft.character2} onChange={(e) => onDraft(set.id, { character2: e.target.value })}>
                    <option value="">Character</option>
                    {characterOptions(board.characters, draft.character2, set.p2.character).map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
                  </select>
                </span>
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
              <Button size="sm" variant="outline" disabled={!set.p2.id || busy.startsWith(set.id)} onClick={() => void onAct(set, "report", { winnerId: set.p2.id, dq: true })}>DQ {set.p1.name}</Button>
              <Button size="sm" variant="outline" disabled={!set.p1.id || busy.startsWith(set.id)} onClick={() => void onAct(set, "report", { winnerId: set.p1.id, dq: true })}>DQ {set.p2.name}</Button>
            </div>
          </section>
        </div>
      ) : null}
      {spot ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setStationId("")}>
          <section className="grid max-h-[90vh] w-full max-w-xl gap-3 overflow-auto rounded-xl border border-border bg-surface p-4" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[0.65rem] tracking-[0.18em] text-muted uppercase">{spot.streamId ? "Stream station" : "Station"}</p>
                <p className="text-lg">{spot.name}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setStationId("")}>Close</Button>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              {qr ? <img src={qr} alt="" className="h-28 w-28 shrink-0 rounded bg-white" /> : <div className="h-28 w-28 shrink-0 rounded bg-surface-2" />}
              <div className="min-w-0">
                <p className="text-sm font-medium">Stage strike tablet</p>
                <p className="mt-1 text-xs text-muted">Scan this onto the tablet at {spot.name}. It stays on that station.</p>
                <a href={strikeUrl} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs underline">{strikeUrl}</a>
              </div>
            </div>
            <Input value={stationQuery} placeholder="Search a set" onChange={(event) => setStationQuery(event.target.value)} />
            <div className="grid max-h-80 gap-1 overflow-auto">
              {stationSets.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn("flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm", item.id === queuedSet ? "border-accent bg-surface-2" : "border-border")}
                  onClick={() => setQueuedSet(item.id)}
                >
                  <span>{item.p1.name} vs {item.p2.name}</span>
                  <span className="text-xs text-muted">{[item.identifier, item.round, item.station].filter(Boolean).join(" · ")}</span>
                </button>
              ))}
              {stationSets.length === 0 ? <p className="text-sm text-muted">No open sets match.</p> : null}
            </div>
            {spot.streamId ? null : (
              <label className="grid gap-1 text-xs text-muted">
                Best of
                <select className="h-9 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg" value={stationBest} onChange={(event) => setStationBest(Number(event.target.value) as 1 | 3 | 5 | 7)}>
                  <option value={1}>Best of 1</option>
                  <option value={3}>Best of 3</option>
                  <option value={5}>Best of 5</option>
                  <option value={7}>Best of 7</option>
                </select>
              </label>
            )}
            <label className="grid gap-1 text-xs text-muted">
              Stream
              <select className="h-9 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg" value={sendStream} onChange={(event) => setSendStream(event.target.value)}>
                <option value="">Choose a stream</option>
                {board.streams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={!queuedSet || busy.length > 0}
                onClick={() => {
                  const next = board.sets.find((item) => item.id === queuedSet);
                  if (!next) return;
                  setStationId("");
                  if (spot.streamId) void onAct(next, "call-stream", { streamId: spot.streamId, stationId: spot.stationId });
                  else void onAct(next, "call-station", { stationId: spot.stationId, bestOf: stationBest });
                }}
              >
                Send to {spot.name}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!queuedSet || !sendStream || busy.length > 0}
                onClick={() => {
                  const next = board.sets.find((item) => item.id === queuedSet);
                  const stream = board.streams.find((item) => item.id === sendStream);
                  if (!next || !stream) return;
                  useFgcStore.getState().assignStream({
                    eventId: board.event.id,
                    eventName: board.event.name,
                    game: board.event.game,
                    slug: board.event.slug,
                    streamName: stream.name,
                    set: {
                      ...blankSet(),
                      id: next.id,
                      phase: next.phase,
                      round: next.round,
                      group: next.group,
                      identifier: next.identifier,
                      bestOf: next.bestOf || 3,
                      score1: next.score1,
                      score2: next.score2,
                      stage: next.stage,
                      streamName: stream.name,
                      p1: { ...blankPlayer(), id: next.p1.id, tag: next.p1.name, character: next.p1.character },
                      p2: { ...blankPlayer(), id: next.p2.id, tag: next.p2.name, character: next.p2.character },
                    },
                  });
                  setStationId("");
                  void onAct(next, "call-stream", { streamId: stream.id, stationId: stream.stationId });
                }}
              >
                Send to stream
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
