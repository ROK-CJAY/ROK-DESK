import { Field } from "@/components/desk/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { playerLabel, type FgcSet } from "@/lib/fgc-types";
import { useFgcStore } from "@/lib/fgc-store";
import { useEffect, useState } from "react";

export function FgcCommentary() {
  const casters = useFgcStore((s) => s.fgc.casters);
  const patchCaster = useFgcStore((s) => s.patchCaster);
  const saveCaster = useFgcStore((s) => s.saveCaster);
  const saved = useFgcStore((s) => s.casters);
  const [note, setNote] = useState("");

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Commentary</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {casters.map((caster, index) => (
          <CasterCard key={caster.id} index={index} />
        ))}
      </div>
      {note ? <p className="mt-2 text-xs text-muted">{note}</p> : null}
    </section>
  );
}

function CasterCard({ index }: { index: number }) {
  const caster = useFgcStore((s) => s.fgc.casters[index]);
  const patchCaster = useFgcStore((s) => s.patchCaster);
  const saveCaster = useFgcStore((s) => s.saveCaster);
  const saved = useFgcStore((s) => s.casters);
  const [open, setOpen] = useState(false);
  const [matches, setMatches] = useState<{ profileId: string; name: string; realName?: string; photo?: string; twitter: string; pronouns: string }[]>([]);
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
        body: JSON.stringify({ action: "search", query }),
      })
        .then((res) => res.json())
        .then((body: { players?: typeof matches }) => setMatches(body.players ?? []))
        .catch(() => setMatches([]));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);
  if (!caster) return null;
  const suggestions = [
    ...saved.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())).map((item) => ({ ...item, realName: "", photo: "", source: "Saved" })),
    ...matches.map((item) => ({ ...item, source: "start.gg" })),
  ].slice(0, 8);

  return (
    <div className="grid gap-2 rounded-lg border border-border bg-surface-2 p-3">
      <p className="font-mono text-[0.65rem] tracking-[0.18em] text-muted uppercase">Caster {index + 1}</p>
      <Field label="Name">
        <div className="relative">
          <Input value={caster.name} onChange={(e) => patchCaster(caster.id, { name: e.target.value })} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 150)} />
          {open && query ? (
            <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-surface shadow-lg">
              {suggestions.map((item) => (
                <button
                  key={`${item.source}-${item.profileId || item.name}`}
                  type="button"
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-surface-2"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    patchCaster(caster.id, { name: item.name, twitter: item.twitter, pronouns: item.pronouns, profileId: item.profileId });
                    setOpen(false);
                  }}
                >
                  {item.photo ? <img src={item.photo} alt="" className="h-7 w-7 rounded-full object-cover" /> : <span className="h-7 w-7 rounded-full bg-surface-2" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{item.name}</span>
                    {item.realName ? <span className="block truncate text-xs text-muted">{item.realName}</span> : null}
                  </span>
                  <span className="text-xs text-muted">{item.source}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </Field>
      <Field label="Twitter">
        <Input value={caster.twitter} onChange={(e) => patchCaster(caster.id, { twitter: e.target.value.replace(/^@/, "") })} />
      </Field>
      <Field label="Pronouns">
        <Input value={caster.pronouns} onChange={(e) => patchCaster(caster.id, { pronouns: e.target.value })} />
      </Field>
      <Button size="sm" disabled={!caster.name.trim()} onClick={() => saveCaster(caster)}>Save commentator</Button>
    </div>
  );
}

export function FgcTournamentInfo() {
  const event = useFgcStore((s) => s.fgc.event);
  const assetBase = useFgcStore((s) => s.fgc.assetBase);
  const patch = useFgcStore((s) => s.patch);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Tournament info</p>
      {event ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Tournament">
            <Input value={event.tournamentName} onChange={(e) => patch({ event: { ...event, tournamentName: e.target.value } })} />
          </Field>
          <Field label="Event">
            <Input value={event.name} onChange={(e) => patch({ event: { ...event, name: e.target.value } })} />
          </Field>
          <Field label="Game">
            <Input value={event.game} onChange={(e) => patch({ event: { ...event, game: e.target.value } })} />
          </Field>
          <Field label="Ruleset">
            <Input value={event.ruleset} onChange={(e) => patch({ event: { ...event, ruleset: e.target.value } })} />
          </Field>
          <Field label="Entrants">
            <Input value={String(event.entrants || "")} onChange={(e) => patch({ event: { ...event, entrants: Number(e.target.value) || 0 } })} />
          </Field>
          <Field label="Venue" className="sm:col-span-2">
            <Input value={event.venue} onChange={(e) => patch({ event: { ...event, venue: e.target.value } })} />
          </Field>
          <Field label="Starts">
            <Input value={event.startAt} onChange={(e) => patch({ event: { ...event, startAt: e.target.value } })} />
          </Field>
          <Field label="Ends">
            <Input value={event.endAt} onChange={(e) => patch({ event: { ...event, endAt: e.target.value } })} />
          </Field>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">Import a tournament to fill this in. You can still run a set by hand.</p>
      )}
      <Field label="Asset CDN" className="mt-3">
        <Input
          value={assetBase}
          onChange={(e) => patch({ assetBase: e.target.value })}
          placeholder="https://assets.rok.gg"
        />
      </Field>
      <p className="mt-2 text-xs text-muted">
        Later this points at the ROK asset CDN. Character and stage art will load from there by name.
      </p>
    </section>
  );
}

export function FgcBracket() {
  const sets = useFgcStore((s) => s.fgc.sets);
  const selectSet = useFgcStore((s) => s.selectSet);
  const groups = new Map<string, FgcSet[]>();
  for (const set of sets) {
    const key = [set.phase || "No phase", set.group].filter(Boolean).join(" · ");
    groups.set(key, [...(groups.get(key) ?? []), set]);
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Bracket</p>
      {groups.size === 0 ? (
        <p className="mt-4 text-sm text-muted">Import an event to see the bracket. Pools and phases show up as columns.</p>
      ) : (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {[...groups.entries()].map(([name, rows]) => (
            <div key={name} className="w-64 shrink-0">
              <p className="mb-2 font-mono text-[0.65rem] tracking-wide text-muted uppercase">{name}</p>
              <div className="grid gap-2">
                {rows.map((set) => (
                  <button
                    key={set.id}
                    type="button"
                    className="rounded-md border border-border bg-surface-2 px-3 py-2 text-left hover:text-fg"
                    onClick={() => selectSet(set.id)}
                  >
                    <span className="block text-[0.65rem] tracking-wide text-muted uppercase">{set.round || "Set"}</span>
                    <span className="mt-1 block truncate font-display font-semibold uppercase">{playerLabel(set.p1)}</span>
                    <span className="mt-0.5 block truncate font-display font-semibold uppercase">{playerLabel(set.p2)}</span>
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
