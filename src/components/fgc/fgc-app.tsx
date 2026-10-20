import { useEffect, useMemo, useState } from "react";
import { ExternalLink, ListFilter, Radio, RefreshCw, X } from "lucide-react";
import { AppChrome } from "@/components/app/app-chrome";
import { Field } from "@/components/desk/field";
import { FgcScoreboard } from "@/components/fgc/fgc-scoreboard";
import { FgcCommentary, FgcTournamentInfo } from "@/components/fgc/fgc-panels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { blankSet, playerLabel, streamSetOf, type FgcSet } from "@/lib/fgc-types";
import { useFgcStore } from "@/lib/fgc-store";
import { cn } from "@/lib/cn";

function stateLabel(state: FgcSet["state"]) {
  if (state === "live") return "Live";
  if (state === "done") return "Done";
  return "Queued";
}

function SetPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fgc = useFgcStore((s) => s.fgc);
  const selectSet = useFgcStore((s) => s.selectSet);
  const [players, setPlayers] = useState("");
  const [phase, setPhase] = useState("");
  const [pool, setPool] = useState("");
  const [round, setRound] = useState("");
  const [status, setStatus] = useState("all");

  const sets = useMemo(() => {
    const has = (value: string, needle: string) => value.toLowerCase().includes(needle.trim().toLowerCase());
    return fgc.sets.filter((set) => {
      if (players && !has(`${playerLabel(set.p1)} ${playerLabel(set.p2)} ${set.p1?.realName ?? ""} ${set.p2?.realName ?? ""}`, players)) return false;
      if (phase && !has(set.phase, phase)) return false;
      if (pool && !has(`${set.group} ${set.identifier}`, pool)) return false;
      if (round && !has(set.round, round)) return false;
      if (status !== "all" && set.state !== status) return false;
      return true;
    });
  }, [fgc.sets, phase, players, pool, round, status]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[88dvh] w-full max-w-6xl flex-col rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Select set</p>
            <p className="font-display text-xl font-semibold uppercase">{fgc.event?.name || "Sets"}</p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-surface">
              <tr className="border-b border-border text-[0.65rem] tracking-[0.16em] text-muted uppercase">
                <th className="px-3 py-2 font-medium">Players</th>
                <th className="px-3 py-2 font-medium">Phase</th>
                <th className="px-3 py-2 font-medium">Pool</th>
                <th className="px-3 py-2 font-medium">Round</th>
                <th className="px-3 py-2 font-medium">Score</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
              <tr className="border-b border-border">
                <th className="px-3 py-2">
                  <Input value={players} onChange={(e) => setPlayers(e.target.value)} placeholder="Name or tag" autoFocus />
                </th>
                <th className="px-3 py-2">
                  <Input value={phase} onChange={(e) => setPhase(e.target.value)} placeholder="Bracket" />
                </th>
                <th className="px-3 py-2">
                  <Input value={pool} onChange={(e) => setPool(e.target.value)} placeholder="Pool / set" />
                </th>
                <th className="px-3 py-2">
                  <Input value={round} onChange={(e) => setRound(e.target.value)} placeholder="Round 1" />
                </th>
                <th className="px-3 py-2" />
                <th className="px-3 py-2">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-surface-2 px-2 text-sm text-fg"
                  >
                    <option value="all">All</option>
                    <option value="live">Live</option>
                    <option value="pending">Queued</option>
                    <option value="done">Done</option>
                  </select>
                </th>
              </tr>
            </thead>
            <tbody>
              {sets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-muted">
                    No sets match those filters.
                  </td>
                </tr>
              ) : (
                sets.map((set) => {
                  const on = set.id === fgc.streamSetId;
                  return (
                    <tr
                      key={set.id}
                      className={cn("cursor-pointer border-b border-border hover:bg-surface-2", on && "bg-surface-2")}
                      onClick={() => {
                        selectSet(set.id);
                        onClose();
                      }}
                    >
                      <td className="px-3 py-3 font-display font-semibold uppercase">
                        {playerLabel(set.p1)} <span className="text-muted">vs</span> {playerLabel(set.p2)}
                      </td>
                      <td className="px-3 py-3 text-muted">{set.phase || "—"}</td>
                      <td className="px-3 py-3 text-muted">{set.group || set.identifier || "—"}</td>
                      <td className="px-3 py-3 text-muted">{set.round || "—"}</td>
                      <td className="px-3 py-3 font-mono tabular-nums">
                        {set.score1}–{set.score2}
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn("rounded-full px-2 py-0.5 text-[0.65rem] tracking-wide uppercase", set.state === "live" ? "bg-live/15 text-live" : "bg-bg text-muted")}>
                          {on ? "On stream" : stateLabel(set.state)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function FgcApp() {
  const hydrate = useFgcStore((s) => s.hydrate);
  const fgc = useFgcStore((s) => s.fgc);
  const importing = useFgcStore((s) => s.importing);
  const error = useFgcStore((s) => s.error);
  const patch = useFgcStore((s) => s.patch);
  const importEvent = useFgcStore((s) => s.importEvent);
  const loadStreamSet = useFgcStore((s) => s.loadStreamSet);
  const [picker, setPicker] = useState(false);
  const [tab, setTab] = useState<"scoreboard" | "commentary" | "info">("scoreboard");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const live = streamSetOf(fgc) ?? fgc.sets[0] ?? blankSet();

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <AppChrome view="fgc" />
      <main className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4">
        <section className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4">
          <Field label="Set tournament" className="min-w-[18rem] flex-1">
            <Input
              value={fgc.url}
              onChange={(e) => patch({ url: e.target.value })}
              placeholder="https://www.start.gg/tournament/…/event/…"
            />
          </Field>
          <Button onClick={() => void importEvent()} disabled={importing || !fgc.url}>
            <RefreshCw className={cn("size-4", importing && "animate-spin")} />
            {importing ? "Importing" : "Import"}
          </Button>
          <Button variant="secondary" onClick={() => setPicker(true)}>
            <ListFilter className="size-4" />
            Select set
          </Button>
          <Button variant="outline" onClick={() => void loadStreamSet()} disabled={!fgc.url}>
            Stream set
          </Button>
          <a
            href="/fgc/overlay/hud"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface-2 px-3 text-sm"
          >
            <Radio className="size-4" />
            HUD
          </a>
          {fgc.event ? (
            <a href={fgc.event.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
              {fgc.event.game} · {fgc.sets.length} sets <ExternalLink className="size-3" />
            </a>
          ) : null}
          {error ? <p className="w-full text-sm text-live">{error}</p> : null}
        </section>

        <nav className="flex w-fit rounded-lg border border-border bg-surface p-0.5">
          {(
            [
              ["scoreboard", "Scoreboard"],
              ["commentary", "Commentary"],
              ["info", "Tournament info"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={cn("rounded-md px-3 py-1.5 text-xs font-medium", tab === id ? "bg-surface-2 text-fg" : "text-muted")}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === "scoreboard" ? <FgcScoreboard set={live} /> : null}
        {tab === "commentary" ? <FgcCommentary /> : null}
        {tab === "info" ? <FgcTournamentInfo /> : null}
      </main>
      <SetPicker open={picker} onClose={() => setPicker(false)} />
    </div>
  );
}
