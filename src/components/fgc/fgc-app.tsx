import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Gamepad2, Radio, RefreshCw, Trash2 } from "lucide-react";
import { AppChrome } from "@/components/app/app-chrome";
import { Field } from "@/components/desk/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { playerLabel, streamSetOf, type FgcSet } from "@/lib/fgc-types";
import { useFgcStore } from "@/lib/fgc-store";
import { cn } from "@/lib/cn";

function stateLabel(state: FgcSet["state"]) {
  if (state === "live") return "Live";
  if (state === "done") return "Done";
  return "Queued";
}

export function FgcApp() {
  const hydrate = useFgcStore((s) => s.hydrate);
  const fgc = useFgcStore((s) => s.fgc);
  const importing = useFgcStore((s) => s.importing);
  const error = useFgcStore((s) => s.error);
  const patch = useFgcStore((s) => s.patch);
  const importEvent = useFgcStore((s) => s.importEvent);
  const selectSet = useFgcStore((s) => s.selectSet);
  const clear = useFgcStore((s) => s.clear);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const live = streamSetOf(fgc);
  const sets = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return fgc.sets;
    return fgc.sets.filter((set) =>
      [set.round, set.phase, set.group, set.identifier, playerLabel(set.p1), playerLabel(set.p2)]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [fgc.sets, filter]);

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <AppChrome view="fgc" />
      <main className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <section className="rounded-xl border border-border bg-surface p-4">
          <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">start.gg</p>
          <div className="mt-3 grid gap-3">
            <Field label="Event link">
              <Input
                value={fgc.url}
                onChange={(e) => patch({ url: e.target.value })}
                placeholder="https://www.start.gg/tournament/…/event/…"
              />
            </Field>
            <div className="flex gap-2">
              <Button onClick={() => void importEvent()} disabled={importing || !fgc.url}>
                <RefreshCw className={cn("size-4", importing && "animate-spin")} />
                {importing ? "Importing" : "Import event"}
              </Button>
              <Button variant="outline" onClick={clear}>
                <Trash2 className="size-4" />
                Clear
              </Button>
            </div>
            {error ? <p className="text-sm text-live">{error}</p> : null}
            <p className="text-xs text-muted">
              Paste the event link. No token. Import pulls phases, sets, tags, seeds, country, and Twitter, the same way Tournament Stream Helper does.
            </p>
          </div>

          {fgc.event ? (
            <div className="mt-5 border-t border-border pt-4">
              <p className="font-display text-xl font-semibold uppercase">{fgc.event.name}</p>
              <p className="mt-1 text-sm text-muted">
                {fgc.event.game} · {fgc.event.tournamentName}
              </p>
              <a href={fgc.event.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
                Open on start.gg <ExternalLink className="size-3" />
              </a>
              <p className="mt-3 font-mono text-[0.65rem] tracking-wide text-muted uppercase">
                {fgc.sets.length} sets
                {fgc.importedAt ? ` · ${new Date(fgc.importedAt).toLocaleTimeString()}` : ""}
              </p>
            </div>
          ) : null}

          <div className="mt-5 border-t border-border pt-4">
            <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Overlay</p>
            <a
              href="/fgc/overlay/hud"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm hover:text-fg"
            >
              <Radio className="size-4" />
              Open FGC HUD
            </a>
            <p className="mt-2 text-xs text-muted">Browser source, 1920×1080. It follows the set marked On stream.</p>
          </div>
        </section>

        <section className="min-w-0 rounded-xl border border-border bg-surface p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Sets</p>
              <p className="font-display mt-1 text-2xl font-semibold uppercase">
                {live ? `${playerLabel(live.p1)} vs ${playerLabel(live.p2)}` : "No set on stream"}
              </p>
            </div>
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search tag, round, phase"
              className="w-64"
            />
          </div>

          {sets.length === 0 ? (
            <div className="mt-8 grid place-items-center rounded-lg border border-dashed border-border px-6 py-16 text-center text-muted">
              <Gamepad2 className="mb-3 size-6" />
              <p>Import a start.gg event to load sets.</p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {sets.map((set) => {
                const on = set.id === fgc.streamSetId;
                return (
                  <li key={set.id} className="flex flex-wrap items-center gap-3 py-3">
                    <Button
                      size="sm"
                      variant={on ? "live" : "secondary"}
                      onClick={() => selectSet(on ? null : set.id)}
                    >
                      {on ? "On stream" : "To stream"}
                    </Button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-lg font-semibold uppercase">
                        {playerLabel(set.p1)} <span className="text-muted">vs</span> {playerLabel(set.p2)}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {set.phase} · {set.round}
                        {set.identifier ? ` · ${set.identifier}` : ""}
                        {set.p1?.seed ? ` · seed ${set.p1.seed}` : ""}
                        {set.p2?.seed ? ` / ${set.p2.seed}` : ""}
                      </p>
                    </div>
                    <p className="font-mono text-sm tabular-nums">
                      {set.score1}–{set.score2}
                    </p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[0.65rem] tracking-wide uppercase",
                        set.state === "live" ? "bg-live/15 text-live" : "bg-surface-2 text-muted",
                      )}
                    >
                      {stateLabel(set.state)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
