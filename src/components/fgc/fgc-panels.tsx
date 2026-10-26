import { Field } from "@/components/desk/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { flagOf, playerLabel } from "@/lib/fgc-types";
import { useFgcStore } from "@/lib/fgc-store";
import { startggAuthBody } from "@/lib/startgg-link";
import { useEffect, useState } from "react";

export function FgcCommentary() {
  const casters = useFgcStore((s) => s.fgc.casters);
  const setCasterCount = useFgcStore((s) => s.setCasterCount);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Commentary</p>
        <label className="flex items-center gap-2 text-sm">
          Commentators
          <select
            value={casters.length}
            onChange={(e) => setCasterCount(Number(e.target.value))}
            className="h-9 rounded-md border border-border bg-surface-2 px-2"
          >
            {[1, 2, 3, 4].map((count) => <option key={count} value={count}>{count}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {casters.map((caster, index) => (
          <CasterCard key={caster.id} index={index} />
        ))}
      </div>
    </section>
  );
}

function CasterCard({ index }: { index: number }) {
  const caster = useFgcStore((s) => s.fgc.casters[index]);
  const total = useFgcStore((s) => s.fgc.casters.length);
  const patchCaster = useFgcStore((s) => s.patchCaster);
  const saveCaster = useFgcStore((s) => s.saveCaster);
  const moveCaster = useFgcStore((s) => s.moveCaster);
  const clearCaster = useFgcStore((s) => s.clearCaster);
  const saved = useFgcStore((s) => s.casters);
  const [open, setOpen] = useState(false);
  const [matches, setMatches] = useState<{ profileId: string; name: string; realName?: string; photo?: string; twitter: string; pronouns: string; country?: string; region?: string; flag?: string; prefix?: string }[]>([]);
  const query = caster?.name.trim() ?? "";
  useEffect(() => {
    if (query.length < 2) {
      setMatches([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetch("/api/startgg", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "search", query, ...startggAuthBody() }),
      })
        .then((res) => res.json())
        .then((body: { players?: typeof matches }) => setMatches(body.players ?? []))
        .catch(() => setMatches([]));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);
  if (!caster) return null;
  const suggestions = [
    ...saved.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())).map((item) => ({ ...item, photo: "", source: "Saved" })),
    ...matches.map((item) => ({ ...item, source: "start.gg" })),
  ].slice(0, 8);
  const set = (partial: Partial<typeof caster>) => patchCaster(caster.id, partial);

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3">
      <div className="mb-3 flex items-center justify-between">
        <span />
        <p className="font-medium">Commentator {index + 1}</p>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" disabled={index === 0} onClick={() => moveCaster(index, -1)} aria-label="Move up">↑</Button>
          <Button size="icon" variant="ghost" disabled={index === total - 1} onClick={() => moveCaster(index, 1)} aria-label="Move down">↓</Button>
        </div>
      </div>
      <div className="grid gap-3">
        <Field label="Sponsor / tag">
          <div className="grid grid-cols-[8rem_1fr] gap-2">
            <Input value={caster.prefix} onChange={(e) => set({ prefix: e.target.value })} placeholder="Sponsor" />
            <div className="relative">
              <Input value={caster.name} onChange={(e) => set({ name: e.target.value })} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 150)} />
              {open && query ? (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-surface shadow-lg">
                  {suggestions.map((item) => (
                    <button
                      key={`${item.source}-${item.profileId || item.name}`}
                      type="button"
                      className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-surface-2"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        set({
                          name: item.name,
                          prefix: item.prefix || "",
                          realName: item.realName,
                          twitter: item.twitter,
                          pronouns: item.pronouns,
                          profileId: item.profileId,
                          country: item.country || "",
                          region: item.region || "",
                          flag: item.flag || "",
                        });
                        setOpen(false);
                      }}
                    >
                      {item.photo ? <img src={item.photo} alt="" className="h-7 w-7 rounded-full object-cover" /> : <span className="h-7 w-7 rounded-full bg-surface-2" />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{item.name}</span>
                        {item.realName ? <span className="block truncate text-xs text-muted">{item.realName}</span> : null}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </Field>
        <Field label="Real name">
          <Input value={caster.realName} onChange={(e) => set({ realName: e.target.value })} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Twitter">
            <Input value={caster.twitter} onChange={(e) => set({ twitter: e.target.value.replace(/^@/, "") })} />
          </Field>
          <Field label="Pronouns">
            <Input value={caster.pronouns} onChange={(e) => set({ pronouns: e.target.value })} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Country">
            <Input value={[caster.flag, caster.country].filter(Boolean).join(" ")} onChange={(e) => set({ country: e.target.value.replace(/^[\u{1F1E6}-\u{1F1FF}]+\s*/u, ""), flag: flagOf(e.target.value) })} />
          </Field>
          <Field label="State / region">
            <Input value={caster.region} onChange={(e) => set({ region: e.target.value })} />
          </Field>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button variant="secondary" disabled={!caster.name.trim()} onClick={() => saveCaster(caster)}>Update commentator</Button>
          <Button variant="outline" onClick={() => clearCaster(caster.id)}>Delete entry</Button>
          <Button variant="ghost" onClick={() => clearCaster(caster.id)}>Clear</Button>
        </div>
      </div>
    </div>
  );
}

export function FgcTournamentInfo() {
  const event = useFgcStore((s) => s.fgc.event);
  const url = useFgcStore((s) => s.fgc.url);
  const importEvent = useFgcStore((s) => s.importEvent);
  const patch = useFgcStore((s) => s.patch);
  const current = event ?? {
    id: "manual",
    name: "",
    slug: "",
    tournamentName: "",
    game: "",
    url: "",
    venue: "",
    shortLink: "",
    icon: "",
    ruleset: "",
    entrants: 0,
    startAt: "",
    endAt: "",
  };
  const set = (partial: Partial<typeof current>) => patch({ event: { ...current, ...partial } });

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <p className="font-medium">Tournament Info</p>
      <div className="mt-4 grid gap-3">
        <Field label="Tournament Name"><Input value={current.tournamentName} onChange={(e) => set({ tournamentName: e.target.value })} /></Field>
        <Field label="Event Name"><Input value={current.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Entrant Number"><Input type="number" value={String(current.entrants || "")} onChange={(e) => set({ entrants: Number(e.target.value) || 0 })} /></Field>
        <Field label="Address"><Input value={current.venue} onChange={(e) => set({ venue: e.target.value })} /></Field>
        <Field label="Short Link"><Input value={current.shortLink} onChange={(e) => set({ shortLink: e.target.value })} /></Field>
        <Field label="Date"><Input type="date" value={current.startAt.slice(0, 10)} onChange={(e) => set({ startAt: e.target.value })} /></Field>
        <Button variant="secondary" disabled={!url} onClick={() => void importEvent()}>Load from tournament</Button>
        <Button variant="outline" onClick={() => patch({ event: null })}>Clear</Button>
      </div>
      <div className="mt-6 border-t border-border pt-4">
        <p className="font-medium">Tournament Icon</p>
        <div className="mt-3 flex items-center gap-4">
          {current.icon ? <img src={current.icon} alt="" className="h-16 w-16 rounded bg-black object-contain" /> : <div className="h-16 w-16 rounded bg-surface-2" />}
          <div className="grid flex-1 gap-2">
            <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-border text-sm">
              Load local file
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => set({ icon: String(reader.result || "") });
                reader.readAsDataURL(file);
              }} />
            </label>
            <Button variant="outline" disabled={!url} onClick={() => void fetch("/api/startgg", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "icon", url, ...startggAuthBody() }) }).then((res) => res.json()).then((body: { icon?: string }) => body.icon && set({ icon: body.icon }))}>Download tournament icon</Button>
            <Button variant="ghost" onClick={() => set({ icon: "" })}>Default</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FgcBracket() {
  const sets = useFgcStore((s) => s.fgc.sets);
  const view = useFgcStore((s) => s.fgc.bracketView);
  const setBracketView = useFgcStore((s) => s.setBracketView);
  const selectSet = useFgcStore((s) => s.selectSet);
  const phases = [...new Set(sets.map((set) => set.phase).filter(Boolean))];
  const groups = [...new Set(sets.filter((set) => !view?.phase || set.phase === view.phase).map((set) => set.group).filter(Boolean))];
  const shown = sets.filter((set) => {
    if (view?.phase && set.phase !== view.phase) return false;
    if (view?.group && set.group !== view.group) return false;
    const losers = set.roundNum < 0 || /loser/i.test(set.round);
    if (view?.winnersOnly && losers) return false;
    if (view?.losersOnly && !losers) return false;
    return true;
  });
  const columns = new Map<string, typeof shown>();
  for (const set of shown) {
    const key = set.round || "Set";
    columns.set(key, [...(columns.get(key) ?? []), set]);
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Phase">
          <select className="h-10 rounded-md border border-border bg-surface-2 px-3 text-sm" value={view?.phase || ""} onChange={(e) => setBracketView({ phase: e.target.value })}>
            <option value="">All phases</option>
            {phases.map((phase) => <option key={phase} value={phase}>{phase}</option>)}
          </select>
        </Field>
        <Field label="Phase group">
          <select className="h-10 rounded-md border border-border bg-surface-2 px-3 text-sm" value={view?.group || ""} onChange={(e) => setBracketView({ group: e.target.value })}>
            <option value="">All groups</option>
            {groups.map((group) => <option key={group} value={group}>{group}</option>)}
          </select>
        </Field>
        <Field label="Progressions in">
          <Input className="w-24" type="number" min={0} value={view?.progressionsIn || 0} onChange={(e) => setBracketView({ progressionsIn: Number(e.target.value) || 0 })} />
        </Field>
        <Field label="Progressions out">
          <Input className="w-24" type="number" min={0} value={view?.progressionsOut || 0} onChange={(e) => setBracketView({ progressionsOut: Number(e.target.value) || 0 })} />
        </Field>
        <Field label="Top players">
          <select className="h-10 rounded-md border border-border bg-surface-2 px-3 text-sm" value={view?.top ?? 8} onChange={(e) => setBracketView({ top: Number(e.target.value) })}>
            <option value={0}>All</option>
            <option value={8}>Top 8</option>
            <option value={4}>Top 4</option>
          </select>
        </Field>
        <label className="mb-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!view?.winnersOnly} onChange={(e) => setBracketView({ winnersOnly: e.target.checked, losersOnly: e.target.checked ? false : view?.losersOnly })} />
          Winners only
        </label>
        <label className="mb-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!view?.losersOnly} onChange={(e) => setBracketView({ losersOnly: e.target.checked, winnersOnly: e.target.checked ? false : view?.winnersOnly })} />
          Losers only
        </label>
      </div>
      <p className="mt-2 text-xs text-muted">This is the bracket the overlay draws. Re-import the event if rounds are missing a side.</p>
      {columns.size === 0 ? (
        <p className="mt-4 text-sm text-muted">Import an event to fill the bracket.</p>
      ) : (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {[...columns.entries()].map(([name, rows]) => (
            <div key={name} className="w-64 shrink-0">
              <p className="mb-2 font-mono text-[0.65rem] tracking-wide text-muted uppercase">{name}</p>
              <div className="grid gap-2">
                {rows.map((set) => (
                  <button key={set.id} type="button" className="rounded-md border border-border bg-surface-2 px-3 py-2 text-left hover:text-fg" onClick={() => selectSet(set.id)}>
                    <span className="block truncate font-display font-semibold uppercase">{[set.losers1 ? "(L)" : "", playerLabel(set.p1)].filter(Boolean).join(" ")}</span>
                    <span className="mt-0.5 block truncate font-display font-semibold uppercase">{[set.losers2 ? "(L)" : "", playerLabel(set.p2)].filter(Boolean).join(" ")}</span>
                    <span className="mt-1 block font-mono text-xs tabular-nums">{set.score1}–{set.score2}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
