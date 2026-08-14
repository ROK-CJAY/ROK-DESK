import { Field, NativeSelect } from "@/components/desk/field";
import { CatalogSelect } from "@/components/desk/catalog-select";
import { Input } from "@/components/ui/input";
import {
  ITEM_OPTIONS,
  MOVE_OPTIONS,
  POKE_TYPES,
  SPECIES_OPTIONS,
  TYPE_LABEL,
  VGC_ABILITIES,
  applyMoveChoice,
  applySpeciesChoice,
  emptyTeam,
  findSpecies,
  spriteFallbackUrl,
  spriteUrl,
  typesFromSpecies,
  type MonTypes,
  type PokeType,
  type TeamMon,
} from "@/lib/pokemon-vgc";

export function TeamSixEditor({
  team,
  onChange,
  listId,
}: {
  team: TeamMon[] | undefined;
  onChange: (team: TeamMon[]) => void;
  listId: string;
}) {
  const slots = team?.length ? team : emptyTeam();
  const update = (index: number, next: TeamMon) => {
    const copy = emptyTeam().map((slot, i) => slots[i] ?? slot);
    copy[index] = next;
    onChange(copy);
  };

  return (
    <div>
      <datalist id={`${listId}-abilities`}>
        {VGC_ABILITIES.map((ability) => (
          <option key={ability} value={ability} />
        ))}
      </datalist>
      <div className="grid gap-3 @min-[42rem]:grid-cols-2">
        {slots.map((mon, i) => (
          <MonEditor
            key={i}
            index={i}
            mon={mon}
            listId={listId}
            onChange={(next) => update(i, next)}
          />
        ))}
      </div>
    </div>
  );
}

function MonEditor({
  mon,
  index,
  listId,
  onChange,
}: {
  mon: TeamMon;
  index: number;
  listId: string;
  onChange: (next: TeamMon) => void;
}) {
  const species = findSpecies(mon.species);
  const abilities = species?.abilities ?? [];
  const art = spriteUrl(mon);
  const types: MonTypes = mon.types ?? typesFromSpecies(mon.species);

  return (
    <article className="@container min-w-0 rounded-lg border border-border bg-surface-2 p-3">
      <div className="flex gap-3">
        <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-md bg-surface">
          {art ? (
            <img
              src={art}
              alt=""
              className="size-14 object-contain"
              onError={(event) => {
                const fallback = spriteFallbackUrl(mon);
                if (fallback && event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
              }}
            />
          ) : (
            <span className="font-mono text-sm text-subtle">{index + 1}</span>
          )}
        </div>
        <Field label="Pokémon" className="min-w-0 flex-1">
          <CatalogSelect
            value={mon.species}
            placeholder="Select Pokémon"
            searchPlaceholder="Search 1,045 Pokémon…"
            options={SPECIES_OPTIONS}
            onChange={(name) => onChange(applySpeciesChoice(mon, name))}
          />
        </Field>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <TypeField
          label="Type 1"
          value={types[0]}
          onChange={(type) => onChange({ ...mon, types: [type, types[1]] })}
        />
        <TypeField
          label="Type 2"
          value={types[1]}
          allowEmpty
          onChange={(type) => onChange({ ...mon, types: [types[0], type] })}
        />
      </div>

      <div className="mt-3 grid gap-2 @min-[24rem]:grid-cols-2">
        <Field label="Ability">
          {abilities.length ? (
            <NativeSelect value={mon.ability} onChange={(e) => onChange({ ...mon, ability: e.target.value })}>
              {abilities.map((ability) => (
                <option key={ability} value={ability}>
                  {ability}
                </option>
              ))}
              {mon.ability && !abilities.includes(mon.ability) ? (
                <option value={mon.ability}>{mon.ability}</option>
              ) : null}
            </NativeSelect>
          ) : (
            <Input
              list={`${listId}-abilities`}
              value={mon.ability}
              placeholder="Ability"
              onChange={(e) => onChange({ ...mon, ability: e.target.value })}
            />
          )}
        </Field>
        <Field label="Item">
          <CatalogSelect
            value={mon.item}
            placeholder="Select item"
            searchPlaceholder="Search items…"
            options={ITEM_OPTIONS}
            limit={200}
            onChange={(item) => onChange({ ...mon, item })}
          />
        </Field>
      </div>

      <div className="mt-3 grid gap-2">
        {mon.moves.map((move, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_8.5rem] gap-2">
            <CatalogSelect
              value={move.name}
              placeholder={`Move ${i + 1}`}
              searchPlaceholder="Search moves…"
              options={MOVE_OPTIONS}
              limit={300}
              onChange={(name) => onChange(applyMoveChoice(mon, i, name))}
            />
            <NativeSelect
              value={move.type}
              aria-label={`Move ${i + 1} type`}
              onChange={(e) => {
                const moves = [...mon.moves] as TeamMon["moves"];
                moves[i] = { ...move, type: e.target.value as PokeType | "" };
                onChange({ ...mon, moves });
              }}
            >
              <option value="">Type</option>
              {POKE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {TYPE_LABEL[type]}
                </option>
              ))}
            </NativeSelect>
          </div>
        ))}
      </div>
    </article>
  );
}

function TypeField({
  label,
  value,
  onChange,
  allowEmpty = false,
}: {
  label: string;
  value: PokeType | "";
  onChange: (type: PokeType | "") => void;
  allowEmpty?: boolean;
}) {
  return (
    <Field label={label}>
      <NativeSelect value={value} onChange={(e) => onChange(e.target.value as PokeType | "")}>
        <option value="">{allowEmpty ? "—" : "Type"}</option>
        {POKE_TYPES.map((type) => (
          <option key={type} value={type}>
            {TYPE_LABEL[type]}
          </option>
        ))}
      </NativeSelect>
    </Field>
  );
}
