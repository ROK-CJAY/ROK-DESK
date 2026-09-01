import { useEffect, useMemo, useState } from "react";
import { ClipboardCopy, Eraser, Printer, Radio } from "lucide-react";
import { Field, NativeSelect } from "@/components/desk/field";
import { CatalogSelect } from "@/components/desk/catalog-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OfficialPdfButton } from "@/components/tournament/official-pdf-button";
import { useDeskStore } from "@/lib/desk-store";
import { useTournamentStore } from "@/lib/tournament-store";
import { teamSheetLabel, type AgeDivision, type Entrant } from "@/lib/tournament-types";
import {
  ITEM_OPTIONS,
  MOVE_OPTIONS,
  POKE_TYPES,
  SPECIES_OPTIONS,
  TYPE_LABEL,
  VGC_ABILITIES,
  applyMoveChoice,
  applySpeciesChoice,
  countFilledMons,
  emptyTeam,
  findSpecies,
  spriteFallbackUrl,
  spriteUrl,
  teamHasMons,
  typesFromSpecies,
  NATURES,
  type MonTypes,
  type PokeType,
  type TeamMon,
} from "@/lib/pokemon-vgc";
import { isVgcTitle, playAgeDivisionOf } from "@/lib/games";
import { cn } from "@/lib/cn";

export function TeamSheetPanel({
  playerId,
  onSelectPlayer,
}: {
  playerId: string | null;
  onSelectPlayer: (id: string) => void;
}) {
  const t = useTournamentStore((s) => s.tournament);
  const updateEntrant = useTournamentStore((s) => s.updateEntrant);
  const applyGame = useDeskStore((s) => s.applyGame);
  const setPlayer = useDeskStore((s) => s.setPlayer);
  const deskGame = useDeskStore((s) => s.desk.gameId);
  const [sent, setSent] = useState<"" | "p1" | "p2">("");

  const players = useMemo(
    () => t.entrants.slice().sort((a, b) => a.seed - b.seed),
    [t.entrants],
  );
  const selected = players.find((p) => p.id === playerId) ?? players[0] ?? null;

  useEffect(() => {
    if (selected && selected.id !== playerId) onSelectPlayer(selected.id);
  }, [selected, playerId, onSelectPlayer]);

  useEffect(() => {
    if (!sent) return;
    const timer = window.setTimeout(() => setSent(""), 2200);
    return () => window.clearTimeout(timer);
  }, [sent]);

  if (!isVgcTitle(t.gameId)) return null;

  const saveTeam = (team: TeamMon[]) => {
    if (!selected) return;
    const label = teamSheetLabel(team);
    updateEntrant(selected.id, { team, deck: label || selected.deck });
  };

  const sendSeat = (seat: "p1" | "p2") => {
    if (!selected) return;
    if (!isVgcTitle(deskGame)) applyGame(t.gameId);
    setPlayer(seat, {
      name: selected.name,
      tag: selected.tag,
      country: selected.country,
      pronouns: selected.pronouns,
      archetype: selected.deck,
      extra: selected.extra,
      team: teamHasMons(selected.team) ? selected.team : emptyTeam(),
    });
    setSent(seat);
  };

  return (
    <section
      id="team-sheet"
      data-qa="team-sheet"
      className="scroll-mt-4 rounded-xl border border-border bg-surface p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">
            VGC team sheet
          </p>
          <p className="mt-1 text-sm text-muted">
            Official six for a roster player. Saved here, then sent to Production with the match.
          </p>
        </div>
        {selected ? (
          <p className="font-mono text-xs text-muted tabular-nums">
            {countFilledMons(selected.team)} / 6 filled
          </p>
        ) : null}
      </div>

      {players.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border bg-surface-2 px-4 py-8 text-center text-sm text-muted">
          Add a player on the roster, then fill their team sheet here.
        </p>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <PlayerPicker players={players} selectedId={selected?.id ?? null} onSelect={onSelectPlayer} />
          {selected ? (
            <div className="min-w-0">
              <SheetHeader
                player={selected}
                sent={sent}
                onClear={() => saveTeam(emptyTeam())}
                onSendP1={() => sendSeat("p1")}
                onSendP2={() => sendSeat("p2")}
              />
              <IdentityFields
                player={selected}
                lockedDivision={playAgeDivisionOf(t.gameId)}
                onChange={(partial) => updateEntrant(selected.id, partial)}
              />
              <TeamSheetFields
                key={selected.id}
                listId={`sheet-${selected.id}`}
                team={selected.team}
                onChange={saveTeam}
              />
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function PlayerPicker({
  players,
  selectedId,
  onSelect,
}: {
  players: Entrant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="min-w-0">
      <div className="lg:hidden">
        <Field label="Assign to player">
          <NativeSelect
            value={selectedId ?? ""}
            onChange={(e) => onSelect(e.target.value)}
            data-qa="team-sheet-player"
          >
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                #{player.seed} {player.name || "Untitled"} · {countFilledMons(player.team)}/6
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <ul className="hidden max-h-[36rem] space-y-1 overflow-y-auto lg:block">
        {players.map((player) => {
          const filled = countFilledMons(player.team);
          const active = player.id === selectedId;
          return (
            <li key={player.id}>
              <button
                type="button"
                onClick={() => onSelect(player.id)}
                data-qa={`sheet-player-${player.id}`}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left",
                  active ? "border-accent/50 bg-surface-2 text-fg" : "border-transparent text-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{player.name || "Untitled"}</span>
                  <span className="block font-mono text-[0.65rem] tracking-wide text-subtle uppercase">
                    Seed {player.seed}
                    {player.tag ? ` · ${player.tag}` : ""}
                  </span>
                </span>
                <span
                  className={cn(
                    "font-mono shrink-0 text-[0.65rem] tabular-nums",
                    filled === 6 ? "text-ok" : filled > 0 ? "text-fg" : "text-subtle",
                  )}
                >
                  {filled}/6
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SheetHeader({
  player,
  sent,
  onClear,
  onSendP1,
  onSendP2,
}: {
  player: Entrant;
  sent: "" | "p1" | "p2";
  onClear: () => void;
  onSendP1: () => void;
  onSendP2: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-3">
      <div className="min-w-0">
        <p className="font-display truncate text-2xl font-semibold tracking-tight uppercase">
          {player.name || "Untitled player"}
        </p>
        <p className="text-xs text-muted">
          #{player.seed}
          {player.tag ? ` · ${player.tag}` : ""}
          {player.country ? ` · ${player.country}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onClear}>
          <Eraser className="size-3.5" />
          Clear
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onSendP1} data-qa="sheet-send-p1">
          <Radio className="size-3.5" />
          {sent === "p1" ? "Sent P1" : "Send as P1"}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onSendP2} data-qa="sheet-send-p2">
          <ClipboardCopy className="size-3.5" />
          {sent === "p2" ? "Sent P2" : "Send as P2"}
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <a href={`/print/team-list?id=${player.id}`} target="_blank" rel="noreferrer">
            <Printer className="size-3.5" />
            Print list
          </a>
        </Button>
        <OfficialPdfButton kind="team" id={player.id} />
      </div>
    </div>
  );
}

function IdentityFields({
  player,
  lockedDivision,
  onChange,
}: {
  player: Entrant;
  lockedDivision: ReturnType<typeof playAgeDivisionOf>;
  onChange: (partial: Partial<Entrant>) => void;
}) {
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Field label="Play! Pokémon ID">
        <Input value={player.playerId} onChange={(e) => onChange({ playerId: e.target.value })} />
      </Field>
      <Field label="Trainer name in game">
        <Input
          value={player.trainerName}
          placeholder={player.tag || player.name}
          onChange={(e) => onChange({ trainerName: e.target.value })}
        />
      </Field>
      <Field label="Switch profile">
        <Input value={player.switchProfile} onChange={(e) => onChange({ switchProfile: e.target.value })} />
      </Field>
      <Field label="Date of birth">
        <Input value={player.birthDate} placeholder="YYYY-MM-DD" onChange={(e) => onChange({ birthDate: e.target.value })} />
      </Field>
      <Field label="Age division">
        {lockedDivision ? (
          <Input value={lockedDivision[0]!.toUpperCase() + lockedDivision.slice(1)} readOnly />
        ) : (
          <NativeSelect
            value={player.ageDivision}
            onChange={(e) => onChange({ ageDivision: e.target.value as AgeDivision })}
          >
            <option value="">Not set</option>
            <option value="juniors">Juniors</option>
            <option value="seniors">Seniors</option>
            <option value="masters">Masters</option>
          </NativeSelect>
        )}
      </Field>
      <Field label="Battle team">
        <Input value={player.deck} onChange={(e) => onChange({ deck: e.target.value })} />
      </Field>
    </div>
  );
}

function TeamSheetFields({
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
      <ol className="grid gap-3">
        {slots.map((mon, i) => (
          <li key={i}>
            <MonSheetRow
              index={i}
              mon={mon}
              listId={listId}
              onChange={(next) => update(i, next)}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

function MonSheetRow({
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
    <article className="rounded-lg border border-border bg-surface-2 p-3 sm:p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="font-mono text-[0.65rem] tracking-[0.2em] text-muted uppercase">
          Pokémon {index + 1}
        </span>
        {mon.species ? (
          <span className="truncate text-sm text-fg">{mon.species}</span>
        ) : (
          <span className="text-sm text-subtle">Empty slot</span>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-md bg-surface">
          {art ? (
            <img
              src={art}
              alt=""
              className="size-16 object-contain"
              onError={(event) => {
                const fallback = spriteFallbackUrl(mon);
                if (fallback && event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
              }}
            />
          ) : (
            <span className="font-mono text-lg text-subtle">{index + 1}</span>
          )}
        </div>
        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Pokémon" className="sm:col-span-2 xl:col-span-2">
            <CatalogSelect
              value={mon.species}
              placeholder="Select Pokémon"
              searchPlaceholder="Search 1,045 Pokémon…"
              options={SPECIES_OPTIONS}
              onChange={(name) => onChange(applySpeciesChoice(mon, name))}
            />
          </Field>
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
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
              autoComplete="off"
              onChange={(e) => onChange({ ...mon, ability: e.target.value })}
            />
          )}
        </Field>
        <Field label="Held item">
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

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2">
            <Field label={`Move ${i + 1}`}>
              <CatalogSelect
                value={move.name}
                placeholder={`Move ${i + 1}`}
                searchPlaceholder="Search moves…"
                options={MOVE_OPTIONS}
                limit={300}
                onChange={(name) => onChange(applyMoveChoice(mon, i, name))}
              />
            </Field>
            <Field label="Type">
              <NativeSelect
                value={move.type}
                aria-label={`Move ${i + 1} type`}
                onChange={(e) => {
                  const moves = [...mon.moves] as TeamMon["moves"];
                  moves[i] = { ...move, type: e.target.value as PokeType | "" };
                  onChange({ ...mon, moves });
                }}
              >
                <option value="">—</option>
                {POKE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {TYPE_LABEL[type]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
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
