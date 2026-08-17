import { Field, NativeSelect } from "@/components/desk/field";
import { CatalogSelect } from "@/components/desk/catalog-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ITEM_OPTIONS,
  MOVE_OPTIONS,
  NATURES,
  SPECIES_OPTIONS,
  VGC_ABILITIES,
  applyMoveChoice,
  applySpeciesChoice,
  countFilledMons,
  findSpecies,
  type TeamMon,
} from "@/lib/pokemon-vgc";
import type { SignupDraft } from "@/components/signup/signup-types";
import { playerIdField } from "@/lib/games";
import { PlayerIdPrivacy } from "@/components/signup/player-id-privacy";

export function OfficialVgcForm({
  eventName,
  formatName,
  draft,
  error,
  busy,
  onChange,
  onCancel,
  onSubmit,
}: {
  eventName: string;
  formatName: string;
  draft: SignupDraft;
  error: string;
  busy: boolean;
  onChange: (next: SignupDraft) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const patch = (partial: Partial<SignupDraft>) => onChange({ ...draft, ...partial });
  const idField = playerIdField("pokemon-vgc");
  const setMon = (index: number, mon: TeamMon) => {
    const team = draft.team.slice();
    team[index] = mon;
    patch({ team });
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border pb-4">
        <div>
          <p className="font-mono text-[0.62rem] tracking-[0.18em] text-muted uppercase">
            Pokémon Video Game Team List · 1 of 2 staff fields
          </p>
          <h1 className="font-display text-3xl font-semibold uppercase">Official team list</h1>
          <p className="mt-1 text-sm text-muted">
            {eventName} · {formatName}. Same fields as the Play! Pokémon VG team list.
          </p>
        </div>
        <button type="button" className="text-sm text-muted underline-offset-2 hover:underline" onClick={onCancel}>
          Cancel
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Player Name" className="sm:col-span-2 lg:col-span-1">
          <Input value={draft.name} onChange={(e) => patch({ name: e.target.value })} autoComplete="name" />
        </Field>
        <Field label={idField.label}>
          <Input
            value={draft.playerId}
            onChange={(e) => patch({ playerId: e.target.value })}
            placeholder={idField.placeholder}
            autoComplete="off"
          />
        </Field>
        <Field label="Date of Birth">
          <Input value={draft.birthDate} placeholder="YYYY-MM-DD" onChange={(e) => patch({ birthDate: e.target.value })} />
        </Field>
        <Field label="Trainer Name in Game">
          <Input
            value={draft.trainerName}
            placeholder={draft.tag || draft.name}
            onChange={(e) => patch({ trainerName: e.target.value })}
          />
        </Field>
        <Field label="Switch Profile Name">
          <Input value={draft.switchProfile} onChange={(e) => patch({ switchProfile: e.target.value })} />
        </Field>
        <Field label="Battle Team Number / Name">
          <Input value={draft.deck} onChange={(e) => patch({ deck: e.target.value })} />
        </Field>
        <Field label="Age Division">
          <NativeSelect
            value={draft.ageDivision}
            onChange={(e) => patch({ ageDivision: e.target.value as SignupDraft["ageDivision"] })}
          >
            <option value="">Select</option>
            <option value="juniors">Juniors</option>
            <option value="seniors">Seniors</option>
            <option value="masters">Masters</option>
          </NativeSelect>
        </Field>
        <Field label="Handle (stream)">
          <Input value={draft.tag} onChange={(e) => patch({ tag: e.target.value })} />
        </Field>
        <Field label="Pronouns">
          <Input value={draft.pronouns} onChange={(e) => patch({ pronouns: e.target.value })} />
        </Field>
      </div>

      <p className="font-mono mt-6 text-[0.62rem] tracking-[0.18em] text-muted uppercase">
        Pokémon · {countFilledMons(draft.team)} / 6
      </p>
      <div className="mt-3 grid gap-4">
        {draft.team.map((mon, i) => (
          <OfficialMonBlock key={i} index={i} mon={mon} onChange={(next) => setMon(i, next)} />
        ))}
      </div>

      {error ? <p className="mt-4 text-sm text-live">{error}</p> : null}

      {draft.playerId.trim() ? (
        <div className="mt-4">
          <PlayerIdPrivacy
            gameId="pokemon-vgc"
            accepted={draft.idPrivacy}
            onAccept={(idPrivacy) => patch({ idPrivacy })}
          />
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button className="min-h-12 min-w-40" disabled={busy} onClick={onSubmit}>
          {busy ? "Saving…" : "Submit team list"}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={onCancel}>
          Back
        </Button>
      </div>
    </div>
  );
}

function OfficialMonBlock({
  index,
  mon,
  onChange,
}: {
  index: number;
  mon: TeamMon;
  onChange: (next: TeamMon) => void;
}) {
  const species = findSpecies(mon.species);
  const abilities = species?.abilities?.length ? species.abilities : VGC_ABILITIES;
  return (
    <article className="rounded-lg border border-border bg-surface-2 p-3 sm:p-4">
      <p className="font-mono mb-3 text-[0.62rem] tracking-[0.16em] text-muted uppercase">Pokémon {index + 1}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Pokémon" className="sm:col-span-2">
          <CatalogSelect
            value={mon.species}
            placeholder="Select Pokémon"
            searchPlaceholder="Search Pokémon…"
            options={SPECIES_OPTIONS}
            onChange={(name) => onChange(applySpeciesChoice(mon, name))}
          />
        </Field>
        <Field label="Ability">
          <NativeSelect value={mon.ability} onChange={(e) => onChange({ ...mon, ability: e.target.value })}>
            <option value="">—</option>
            {abilities.map((ability) => (
              <option key={ability} value={ability}>
                {ability}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Held Item" className="sm:col-span-2">
          <CatalogSelect
            value={mon.item}
            placeholder="Held item"
            searchPlaceholder="Search items…"
            options={ITEM_OPTIONS}
            onChange={(item) => onChange({ ...mon, item })}
          />
        </Field>
        <Field label="Level">
          <Input value={mon.level} onChange={(e) => onChange({ ...mon, level: e.target.value })} />
        </Field>
        <Field label="Stat Alignment">
          <NativeSelect value={mon.nature} onChange={(e) => onChange({ ...mon, nature: e.target.value })}>
            <option value="">—</option>
            {NATURES.map((nature) => (
              <option key={nature} value={nature}>
                {nature}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <p className="font-mono mt-3 text-[0.58rem] tracking-[0.16em] text-muted uppercase">Stats</p>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {(
          [
            ["hp", "HP"],
            ["atk", "Atk"],
            ["def", "Def"],
            ["spa", "SpA"],
            ["spd", "SpD"],
            ["spe", "Spe"],
          ] as const
        ).map(([key, label]) => (
          <Field key={key} label={label}>
            <Input value={mon[key]} onChange={(e) => onChange({ ...mon, [key]: e.target.value })} />
          </Field>
        ))}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {mon.moves.map((move, i) => (
          <Field key={i} label={`Move ${i + 1}`}>
            <CatalogSelect
              value={move.name}
              placeholder={`Move ${i + 1}`}
              searchPlaceholder="Search moves…"
              options={MOVE_OPTIONS}
              onChange={(name) => onChange(applyMoveChoice(mon, i, name))}
            />
          </Field>
        ))}
      </div>
    </article>
  );
}
