import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AppChrome } from "@/components/app/app-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readToRefresh, readToToken, writeToSession, clearToSession } from "@/lib/startgg-link";
import { rokDesktop } from "@/lib/rok-desktop";
import { PUBLIC_SIGNUP_ORIGIN } from "@/lib/remote-signup-code";
import type { ToBoard, ToSet, ToTournament, ToUser } from "@/lib/startgg-to";
import { cn } from "@/lib/cn";

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
  const [scores, setScores] = useState<Record<string, { score1: number; score2: number }>>({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [hideDone, setHideDone] = useState(true);

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
      setScores(Object.fromEntries(next.sets.map((set) => [set.id, { score1: set.score1, score2: set.score2 }])));
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
      const score = scores[set.id] ?? { score1: set.score1, score2: set.score2 };
      await toApi({ action, token, setId: set.id, score1: score.score1, score2: score.score2, ...extra });
      await loadBoard(eventSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "start.gg did not take that");
      setBusy("");
    }
  };

  const sets = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return (board?.sets ?? []).filter((set) => {
      if (hideDone && set.state === 3) return false;
      if (!needle) return true;
      return [set.phase, set.round, set.identifier, set.station, set.stream, set.p1.name, set.p2.name].join(" ").toLowerCase().includes(needle);
    });
  }, [board, filter, hideDone]);

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
                {tournaments.length === 0 ? "No upcoming tournaments on this account." : "Pick an event to call sets, assign stations and streams, start them, and report scores."}
              </section>
            ) : (
              <section className="overflow-hidden rounded-xl border border-border bg-surface">
                <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
                  <div className="min-w-[12rem] flex-1">
                    <p className="font-medium">{board.event.name}</p>
                    <p className="text-xs text-muted">{[board.tournament, board.event.game, `${board.event.entrants} entrants`].filter(Boolean).join(" · ")}</p>
                  </div>
                  <Input className="h-9 max-w-xs" value={filter} placeholder="Player, station, round" onChange={(e) => setFilter(e.target.value)} />
                  <label className="flex items-center gap-2 text-sm text-muted">
                    <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
                    Hide finished
                  </label>
                </div>
                <div className="overflow-auto">
                  <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                    <thead className="bg-surface-2 text-muted">
                      <tr>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Round</th>
                        <th className="px-3 py-2 font-medium">Players</th>
                        <th className="px-3 py-2 font-medium">Station</th>
                        <th className="px-3 py-2 font-medium">Stream</th>
                        <th className="px-3 py-2 font-medium">Run</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sets.map((set) => {
                        const score = scores[set.id] ?? { score1: set.score1, score2: set.score2 };
                        return (
                          <tr key={set.id} className="border-t border-border align-top">
                            <td className="px-3 py-2">
                              <span className={cn("font-mono text-[0.65rem] tracking-wide uppercase", set.state === 3 ? "text-muted" : set.state === 1 ? "text-muted" : "text-live")}>{setLabel(set.state)}</span>
                            </td>
                            <td className="px-3 py-2">{[set.phase, set.round].filter(Boolean).join(" · ")}</td>
                            <td className="px-3 py-2">{set.p1.name} vs {set.p2.name}</td>
                            <td className="px-3 py-2">
                              <select
                                className="h-8 rounded-md border border-border bg-surface-2 px-2 text-xs"
                                value={set.stationId}
                                disabled={!board.stations.length || busy.startsWith(set.id)}
                                onChange={(e) => e.target.value && void act(set, "assign-station", { stationId: e.target.value })}
                              >
                                <option value="">{board.stations.length ? "Station" : "No stations"}</option>
                                {board.stations.map((station) => <option key={station.id} value={station.id}>{station.number || station.id}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <select
                                className="h-8 max-w-36 rounded-md border border-border bg-surface-2 px-2 text-xs"
                                value={set.streamId}
                                disabled={!board.streams.length || busy.startsWith(set.id)}
                                onChange={(e) => e.target.value && void act(set, "assign-stream", { streamId: e.target.value })}
                              >
                                <option value="">{board.streams.length ? "Stream" : "No streams"}</option>
                                {board.streams.map((stream) => <option key={stream.id} value={stream.id}>{stream.name}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap items-center gap-1">
                                <Button size="sm" variant="secondary" disabled={busy.startsWith(set.id)} onClick={() => void act(set, "call")}>Call</Button>
                                <Button size="sm" variant="secondary" disabled={busy.startsWith(set.id)} onClick={() => void act(set, "begin")}>Begin</Button>
                                <Input className="h-8 w-12" inputMode="numeric" value={score.score1} onChange={(e) => setScores((current) => ({ ...current, [set.id]: { ...score, score1: Number(e.target.value) || 0 } }))} />
                                <span className="text-muted">-</span>
                                <Input className="h-8 w-12" inputMode="numeric" value={score.score2} onChange={(e) => setScores((current) => ({ ...current, [set.id]: { ...score, score2: Number(e.target.value) || 0 } }))} />
                                <Button size="sm" variant="outline" disabled={!set.p1.id || busy.startsWith(set.id)} onClick={() => void act(set, "report", { winnerId: set.p1.id })}>{set.p1.name}</Button>
                                <Button size="sm" variant="outline" disabled={!set.p2.id || busy.startsWith(set.id)} onClick={() => void act(set, "report", { winnerId: set.p2.id })}>{set.p2.name}</Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
