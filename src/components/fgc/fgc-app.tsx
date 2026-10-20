import { useEffect, useMemo, useState } from "react";
import { ExternalLink, ListFilter, Radio, RefreshCw, Search, X } from "lucide-react";
import { AppChrome } from "@/components/app/app-chrome";
import { Field } from "@/components/desk/field";
import { FgcScoreboard } from "@/components/fgc/fgc-scoreboard";
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
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState("all");

  const phases = useMemo(
    () => ["all", ...Array.from(new Set(fgc.sets.map((set) => set.phase).filter(Boolean)))],
    [fgc.sets],
  );
  const sets = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return fgc.sets.filter((set) => {
      if (phase !== "all" && set.phase !== phase) return false;
      if (!needle) return true;
      return [set.round, set.phase, set.group, set.identifier, playerLabel(set.p1), playerLabel(set.p2), set.p1?.realName, set.p2?.realName]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [fgc.sets, phase, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85dvh] w-full max-w-3xl flex-col rounded-xl border border-border bg-surface shadow-xl"
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
        <div className="grid gap-2 border-b border-border px-4 py-3 sm:grid-cols-[1fr_12rem]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search player, phase, round"
              className="pl-9"
              autoFocus
            />
          </div>
          <select
            value={phase}
            onChange={(e) => setPhase(e.target.value)}
            className="h-10 rounded-md border border-border bg-surface-2 px-3 text-sm"
          >
            {phases.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? "All phases" : item}
              </option>
            ))}
          </select>
        </div>
        <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
          {sets.length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-muted">No sets match that search.</li>
          ) : (
            sets.map((set) => {
              const on = set.id === fgc.streamSetId;
              return (
                <li key={set.id}>
                  <button
                    type="button"
                    className={cn("flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2", on && "bg-surface-2")}
                    onClick={() => {
                      selectSet(set.id);
                      onClose();
                    }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-lg font-semibold uppercase">
                        {playerLabel(set.p1)} <span className="text-muted">vs</span> {playerLabel(set.p2)}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {[set.phase, set.round, set.identifier].filter(Boolean).join(" · ") || "Manual set"}
                      </span>
                    </span>
                    <span className="font-mono text-sm tabular-nums">
                      {set.score1}–{set.score2}
                    </span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[0.65rem] tracking-wide uppercase", set.state === "live" ? "bg-live/15 text-live" : "bg-bg text-muted")}>
                      {on ? "On stream" : stateLabel(set.state)}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
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
  const [picker, setPicker] = useState(false);

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

        <FgcScoreboard set={live} />
      </main>
      <SetPicker open={picker} onClose={() => setPicker(false)} />
    </div>
  );
}
