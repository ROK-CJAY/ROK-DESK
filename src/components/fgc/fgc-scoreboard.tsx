import { useEffect, useState } from "react";
import { ArrowLeftRight, Plus, RotateCcw } from "lucide-react";
import { Field } from "@/components/desk/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cachedThumb, loadThumb, previewUrl, stageIconUrl } from "@/lib/fgc-assets";
import { blankPlayer, libraryFor, type FgcPlayer, type FgcSet } from "@/lib/fgc-types";
import { useFgcStore } from "@/lib/fgc-store";

function Preview({ url, className }: { url: string; className: string }) {
  const [src, setSrc] = useState(() => cachedThumb(url) ?? "");
  useEffect(() => {
    const cached = cachedThumb(url);
    if (cached) {
      setSrc(cached);
      return;
    }
    let live = true;
    void loadThumb(url).then((thumb) => {
      if (live) setSrc(thumb);
    }).catch(() => {
      if (live) setSrc(url);
    });
    return () => {
      live = false;
    };
  }, [url]);
  if (!src) return <span className={`${className} bg-black/40`} />;
  return <img src={src} alt="" className={className} />;
}

function Picker({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string; url?: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <div className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-full items-center gap-2 rounded-md border border-border bg-surface-2 px-2 text-left text-sm"
      >
        {selected?.url ? <Preview url={selected.url} className="h-7 w-7 shrink-0 rounded bg-black object-contain" /> : null}
        <span className="min-w-0 flex-1 truncate">{selected?.label || "Select"}</span>
      </button>
      {open ? (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-surface shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-surface-2"
            >
              {option.url ? <Preview url={option.url} className="h-7 w-7 shrink-0 rounded bg-black object-contain" /> : null}
              <span className="truncate">{option.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CharacterField({ value, onChange }: { value: string; onChange: (character: string) => void }) {
  const library = useFgcStore((s) => libraryFor(s.fgc));
  const assetBase = useFgcStore((s) => s.fgc.assetBase);
  const characters = library?.characters ?? [];
  if (!characters.length) return <Input className="min-w-0 flex-1" value={value} onChange={(e) => onChange(e.target.value)} />;
  return (
    <Picker
      value={value}
      onChange={onChange}
      options={characters.map((character) => ({
        value: character.name,
        label: character.name,
        url: previewUrl(assetBase, library?.code ?? "", character.code, 0),
      }))}
    />
  );
}

function StageField({ value, onChange }: { value: string; onChange: (stage: string) => void }) {
  const library = useFgcStore((s) => libraryFor(s.fgc));
  const assetBase = useFgcStore((s) => s.fgc.assetBase);
  const stages = library?.stages ?? [];
  if (!stages.length) return <Input value={value} onChange={(e) => onChange(e.target.value)} />;
  return (
    <Picker
      value={value}
      onChange={onChange}
      options={stages.map((stage) => ({
        value: stage.name,
        label: stage.name,
        url: stageIconUrl(assetBase, library?.code ?? "", stage.code),
      }))}
    />
  );
}

function SkinField({ character, value, onChange }: { character: string; value: number; onChange: (value: number) => void }) {
  const library = useFgcStore((s) => libraryFor(s.fgc));
  const assetBase = useFgcStore((s) => s.fgc.assetBase);
  const found = library?.characters.find((item) => item.name === character);
  if (!found?.skins) return <Input className="min-w-0 flex-1" type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />;
  return (
    <Picker
      value={String(value)}
      onChange={(next) => onChange(Number(next))}
      options={Array.from({ length: found.skins }, (_, skin) => ({
        value: String(skin),
        label: String(skin),
        url: previewUrl(assetBase, library?.code ?? "", found.code, skin),
      }))}
    />
  );
}

function PlayerCard({
  setId,
  side,
  player,
  losers,
  label,
  characters,
}: {
  setId: string;
  side: "p1" | "p2" | "p1b" | "p2b";
  player: FgcPlayer;
  losers: boolean;
  label: string;
  characters: number;
}) {
  const patchPlayer = useFgcStore((s) => s.patchPlayer);
  const patchSet = useFgcStore((s) => s.patchSet);
  const savePlayer = useFgcStore((s) => s.savePlayer);
  const saved = useFgcStore((s) => s.players);
  const [savedNote, setSavedNote] = useState("");
  const set = (partial: Partial<FgcPlayer>) => patchPlayer(setId, side, partial);

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-mono text-[0.65rem] tracking-[0.18em] text-muted uppercase">{label}</p>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input
            type="checkbox"
            checked={losers}
            onChange={(e) => patchSet(setId, side === "p1" ? { losers1: e.target.checked } : { losers2: e.target.checked })}
          />
          Losers
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Team / sponsor">
          <Input value={player.prefix} onChange={(e) => set({ prefix: e.target.value })} />
        </Field>
        <Field label="Tag">
          <Input
            value={player.tag}
            onChange={(e) => set({ tag: e.target.value })}
            onBlur={() => {
              const match =
                (player.profileId && saved.find((item) => item.profileId === player.profileId)) ||
                saved.find((item) => item.tag.toLowerCase() === player.tag.trim().toLowerCase());
              if (match) set(match);
            }}
          />
        </Field>
        <Field label="Real name">
          <Input value={player.realName} onChange={(e) => set({ realName: e.target.value })} />
        </Field>
        <Field label="Twitter">
          <Input value={player.twitter} onChange={(e) => set({ twitter: e.target.value.replace(/^@/, "") })} />
        </Field>
        <Field label="Pronouns">
          <Input value={player.pronouns} onChange={(e) => set({ pronouns: e.target.value })} />
        </Field>
        <Field label="Country">
          <Input value={player.country} onChange={(e) => set({ country: e.target.value })} />
        </Field>
        <Field label="State / region">
          <Input value={player.region} onChange={(e) => set({ region: e.target.value })} />
        </Field>
        <Field label="Character">
          <CharacterField value={player.character} onChange={(character) => set({ character })} />
        </Field>
        <Field label="Skin">
          <SkinField character={player.character} value={player.skin} onChange={(skin) => set({ skin })} />
        </Field>
        {characters > 1 ? (
          <>
            <Field label="Character 2">
              <CharacterField value={player.character2} onChange={(character2) => set({ character2 })} />
            </Field>
            <Field label="Skin 2">
              <SkinField character={player.character2} value={player.skin2} onChange={(skin2) => set({ skin2 })} />
            </Field>
          </>
        ) : null}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => {
            savePlayer(player);
            setSavedNote("Saved");
          }}
          disabled={!player.tag.trim()}
        >
          Save player
        </Button>
        <Button size="sm" variant="outline" onClick={() => patchSet(setId, { [side]: blankPlayer() })}>
          Clear player
        </Button>
        {savedNote ? <span className="text-xs text-muted">{savedNote}</span> : null}
      </div>
    </div>
  );
}

export function FgcScoreboard({ set }: { set: FgcSet }) {
  const patchSet = useFgcStore((s) => s.patchSet);
  const swapTeams = useFgcStore((s) => s.swapTeams);
  const resetScore = useFgcStore((s) => s.resetScore);
  const p1 = set.p1 ?? blankPlayer();
  const p2 = set.p2 ?? blankPlayer();

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Scoreboard</p>
          <p className="font-display mt-1 text-2xl font-semibold uppercase">On stream</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => swapTeams(set.id)}>
            <ArrowLeftRight className="size-4" />
            Swap teams
          </Button>
          <Button size="sm" variant="outline" onClick={() => resetScore(set.id)}>
            <RotateCcw className="size-4" />
            Reset score
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Field label="Characters per player">
          <select
            value={set.charactersPerPlayer || 1}
            onChange={(e) => patchSet(set.id, { charactersPerPlayer: Number(e.target.value) })}
            className="h-10 rounded-md border border-border bg-surface-2 px-3 text-sm"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
        </Field>
        <Field label="Players per team">
          <select
            value={set.playersPerTeam || 1}
            onChange={(e) => patchSet(set.id, { playersPerTeam: Number(e.target.value) })}
            className="h-10 rounded-md border border-border bg-surface-2 px-3 text-sm"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
        </Field>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_14rem_1fr]">
        <PlayerCard setId={set.id} side="p1" player={p1} losers={set.losers1} label="Team 1" characters={set.charactersPerPlayer || 1} />
        <div className="grid content-start gap-2 rounded-lg border border-border bg-surface-2 p-3">
          <Field label="Phase">
            <Input value={set.phase} onChange={(e) => patchSet(set.id, { phase: e.target.value })} />
          </Field>
          <Field label="Match">
            <Input value={set.round} onChange={(e) => patchSet(set.id, { round: e.target.value })} />
          </Field>
          <Field label="Best of">
            <Input
              type="number"
              min={1}
              value={set.bestOf}
              onChange={(e) => patchSet(set.id, { bestOf: Number(e.target.value) || 1 })}
            />
          </Field>
          <Field label="Stage">
            <StageField value={set.stage} onChange={(stage) => patchSet(set.id, { stage })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Score 1">
              <Input
                type="number"
                min={0}
                value={set.score1}
                onChange={(e) => patchSet(set.id, { score1: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Score 2">
              <Input
                type="number"
                min={0}
                value={set.score2}
                onChange={(e) => patchSet(set.id, { score2: Number(e.target.value) || 0 })}
              />
            </Field>
          </div>
        </div>
        <PlayerCard setId={set.id} side="p2" player={p2} losers={set.losers2} label="Team 2" characters={set.charactersPerPlayer || 1} />
        {(set.playersPerTeam || 1) > 1 ? (
          <>
            <PlayerCard setId={set.id} side="p1b" player={set.p1b ?? blankPlayer()} losers={false} label="Team 1 partner" characters={set.charactersPerPlayer || 1} />
            <div />
            <PlayerCard setId={set.id} side="p2b" player={set.p2b ?? blankPlayer()} losers={false} label="Team 2 partner" characters={set.charactersPerPlayer || 1} />
          </>
        ) : null}
      </div>
    </section>
  );
}

export function NewSetButton() {
  const newSet = useFgcStore((s) => s.newSet);
  return (
    <Button onClick={newSet}>
      <Plus className="size-4" />
      New manual set
    </Button>
  );
}
