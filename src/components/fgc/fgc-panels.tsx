import { Field } from "@/components/desk/field";
import { Input } from "@/components/ui/input";
import { useFgcStore } from "@/lib/fgc-store";

export function FgcCommentary() {
  const casters = useFgcStore((s) => s.fgc.casters);
  const patchCaster = useFgcStore((s) => s.patchCaster);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Commentary</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {casters.map((caster, index) => (
          <div key={caster.id} className="grid gap-2 rounded-lg border border-border bg-surface-2 p-3">
            <p className="font-mono text-[0.65rem] tracking-[0.18em] text-muted uppercase">Caster {index + 1}</p>
            <Field label="Name">
              <Input value={caster.name} onChange={(e) => patchCaster(caster.id, { name: e.target.value })} />
            </Field>
            <Field label="Twitter">
              <Input value={caster.twitter} onChange={(e) => patchCaster(caster.id, { twitter: e.target.value.replace(/^@/, "") })} />
            </Field>
            <Field label="Pronouns">
              <Input value={caster.pronouns} onChange={(e) => patchCaster(caster.id, { pronouns: e.target.value })} />
            </Field>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FgcTournamentInfo() {
  const event = useFgcStore((s) => s.fgc.event);
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
    </section>
  );
}
