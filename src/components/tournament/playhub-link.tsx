import { useState } from "react";
import { Hourglass, RefreshCw, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mergePlayHubSnapshot, playHubEventId, type PlayHubImport } from "@/lib/playhub";
import { refreshStreamedMatches } from "@/lib/stream-from-tournament";
import { useTournamentStore } from "@/lib/tournament-store";
import { gameOf } from "@/lib/games";

export function PlayHubLink() {
  const t = useTournamentStore((s) => s.tournament);
  const patch = useTournamentStore((s) => s.patch);
  const completeTournament = useTournamentStore((s) => s.completeTournament);
  const [open, setOpen] = useState(false);
  const [event, setEvent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  if (t.gameId !== "lorcana") return null;

  const pull = async (value: string, mode: "link" | "update") => {
    const id = playHubEventId(value);
    if (!id) {
      setError("Paste the event page address, or just its number.");
      return;
    }
    const replacing = mode === "link" && t.playHubEvent !== id && (t.entrants.length > 0 || t.matches.length > 0);
    if (replacing && !window.confirm(`Replace this ${gameOf(t.gameId).short} roster and pairings with the Play Hub event?`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/lorcana/playhub?event=${encodeURIComponent(id)}`);
      const data = (await res.json()) as PlayHubImport & { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not load that event.");
      const live = useTournamentStore.getState().tournament;
      patch({
        name: data.name,
        formatName: data.formatName,
        bestOf: data.bestOf,
        bracketType: "swiss",
        size: data.size,
        swissRounds: data.swissRounds,
        cutSize: data.cutSize,
        cutType: "single",
        phase: data.phase,
        ...(mode === "link" ? { overlayView: "standings" as const } : {}),
        ...mergePlayHubSnapshot(live, data),
        playHubEvent: id,
      });
      refreshStreamedMatches();
      setNote(data.summary);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load that event.");
    } finally {
      setBusy(false);
    }
  };

  const stop = () => {
    if (!window.confirm("Stop this Play Hub event? Linking ends and the tournament is marked complete. Players and results stay.")) return;
    const live = useTournamentStore.getState();
    if (live.tournament.phase !== "complete") completeTournament();
    patch({ playHubEvent: "" });
    setNote("");
    setError("");
  };

  return (
    <>
      {t.playHubEvent ? (
        <div className="grid gap-1.5">
          <Button className="w-full" disabled={busy} onClick={() => void pull(t.playHubEvent, "update")}>
            <RefreshCw className={busy ? "size-3.5 animate-spin" : "size-3.5"} />
            {busy ? "Updating…" : "Update Play Hub"}
          </Button>
          <p className="text-[0.65rem] leading-relaxed text-subtle">
            Event {t.playHubEvent}. The bracket stays live. Update pulls new results and the next round. A table already on stream keeps its place.
            {note ? ` ${note}.` : ""}
          </p>
          <Button variant="outline" className="w-full" disabled={busy} onClick={stop}>
            <Square className="size-3.5" />
            Stop event
          </Button>
          <button type="button" className="justify-self-start text-[0.65rem] text-muted underline" onClick={() => { setError(""); setEvent(t.playHubEvent); setOpen(true); }}>
            Change event
          </button>
          {error && !open ? <p className="text-[0.65rem] text-live">{error}</p> : null}
        </div>
      ) : (
        <Button variant="outline" className="w-full" onClick={() => { setError(""); setOpen(true); }}>
          <Hourglass className="size-3.5" />
          Play Hub
        </Button>
      )}
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => { if (!busy) setOpen(false); }}>
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-display text-xl font-semibold">
                  <Hourglass className="size-4 text-accent" />
                  RPH tournament
                </p>
                <p className="mt-1 text-sm text-muted">Link a Ravensburger Play Hub event to load its pairings, players and standings.</p>
              </div>
              <button type="button" className="text-muted hover:text-fg" onClick={() => setOpen(false)} aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-4 flex gap-2">
              <Input
                value={event}
                placeholder="Event URL or id"
                onChange={(e) => setEvent(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void pull(event, "link"); }}
              />
              <Button className="shrink-0" disabled={busy} onClick={() => void pull(event, "link")}>
                {busy ? "Linking…" : "Link event"}
              </Button>
            </div>
            <div className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-[0.75rem] leading-relaxed text-muted">
              Paste the event page address from the Play Hub, or just its number. Public events work without signing in.
              <p className="mt-1 text-subtle">Example https://tcg.ravensburgerplay.com/events/427780</p>
            </div>
            {error ? <p className="mt-2 text-sm text-live">{error}</p> : null}
            {busy ? <p className="mt-2 text-xs text-subtle">Loading players, rounds, and standings. A large event can take a minute.</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
