import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Field } from "@/components/desk/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { stageIconUrl } from "@/lib/fgc-assets";
import { blankRuleset, libraryFor, type FgcRuleset, type FgcStage } from "@/lib/fgc-types";
import { useFgcStore } from "@/lib/fgc-store";

export function FgcRulesetEditor() {
  const fgc = useFgcStore((s) => s.fgc);
  const saveRuleset = useFgcStore((s) => s.saveRuleset);
  const deleteRuleset = useFgcStore((s) => s.deleteRuleset);
  const selectRuleset = useFgcStore((s) => s.selectRuleset);
  const library = libraryFor(fgc);
  const active = fgc.rulesets.find((item) => item.id === fgc.activeRulesetId) ?? blankRuleset();
  const [draft, setDraft] = useState<FgcRuleset>(active);
  const shown = { banMode: "fixed" as const, bansByGames: "3:3,5:2", ...(draft.id === active.id ? draft : active) };
  const [selected, setSelected] = useState("");
  const [filter, setFilter] = useState("All stages");
  const stages = library?.stages ?? [];
  const filtered = useMemo(() => {
    if (filter === "All stages") return stages;
    return stages.filter((stage) => stage.name.toLowerCase().includes(filter.toLowerCase()));
  }, [stages, filter]);
  const strike = useMemo(() => shown.strikeOrder.join(","), [shown.strikeOrder]);

  const move = (from: "all" | "neutral" | "counter", to: "neutral" | "counter" | "all") => {
    const name = selected;
    if (!name) return;
    const without = (list: string[]) => list.filter((item) => item !== name);
    const add = (list: string[]) => (list.includes(name) ? list : [...list, name]);
    const next = {
      ...shown,
      neutralStages: without(shown.neutralStages),
      counterpickStages: without(shown.counterpickStages),
    };
    if (to === "neutral") next.neutralStages = add(next.neutralStages);
    if (to === "counter") next.counterpickStages = add(next.counterpickStages);
    setDraft(next);
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Ruleset</p>
          <p className="font-display mt-1 text-2xl font-semibold uppercase">Stage striking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { const created = blankRuleset(); setDraft(created); selectRuleset(null); }}>New ruleset</Button>
          <a href="/fgc/strike" target="_blank" rel="noreferrer" className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm">Open stage strike</a>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_16rem_auto]">
        <Field label="Ruleset name">
          <Input value={shown.name} onChange={(e) => setDraft({ ...shown, name: e.target.value })} />
        </Field>
        <Field label="Saved rulesets">
          <select
            value={fgc.activeRulesetId ?? ""}
            onChange={(e) => {
              const found = fgc.rulesets.find((item) => item.id === e.target.value);
              if (found) {
                selectRuleset(found.id);
                setDraft(found);
              }
            }}
            className="h-10 rounded-md border border-border bg-surface-2 px-3 text-sm"
          >
            <option value="">Select a saved ruleset</option>
            {fgc.rulesets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
        <div className="flex items-end gap-2">
          <Button onClick={() => saveRuleset(shown)}>Save</Button>
          {fgc.activeRulesetId ? <Button variant="outline" onClick={() => deleteRuleset(fgc.activeRulesetId!)}>Delete</Button> : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_3rem_minmax(16rem,1fr)]">
        <div className="rounded-md border border-border">
          <div className="border-b border-border px-3 py-2">
            <p className="text-sm">Stagelist</p>
            <Input className="mt-1 h-8" value={filter === "All stages" ? "" : filter} placeholder="All stages" onChange={(e) => setFilter(e.target.value || "All stages")} />
          </div>
          <div className="max-h-[32rem] overflow-y-auto">
            {filtered.map((stage) => (
              <StageRow key={stage.code} stage={stage} game={library?.code ?? ""} base={fgc.assetBase} selected={selected === stage.name} onClick={() => setSelected(stage.name)} />
            ))}
            {!stages.length ? <p className="p-3 text-sm text-muted">Download the game library to see stages.</p> : null}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-8">
          <div className="grid gap-1">
            <button type="button" className="rounded border border-border p-1" onClick={() => move("all", "neutral")} aria-label="Add to neutral"><ChevronRight className="size-4" /></button>
            <button type="button" className="rounded border border-border p-1" onClick={() => move("neutral", "all")} aria-label="Remove from neutral"><ChevronLeft className="size-4" /></button>
          </div>
          <div className="grid gap-1">
            <button type="button" className="rounded border border-border p-1" onClick={() => move("all", "counter")} aria-label="Add to counterpick"><ChevronRight className="size-4" /></button>
            <button type="button" className="rounded border border-border p-1" onClick={() => move("counter", "all")} aria-label="Remove from counterpick"><ChevronLeft className="size-4" /></button>
          </div>
        </div>
        <div className="grid content-start gap-3">
          <StageBox title="Neutral stages" names={shown.neutralStages} stages={stages} game={library?.code ?? ""} base={fgc.assetBase} selected={selected} onSelect={setSelected} />
          <StageBox title="Counterpick stages" names={shown.counterpickStages} stages={stages} game={library?.code ?? ""} base={fgc.assetBase} selected={selected} onSelect={setSelected} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Field label="Stage ban rule">
          <div className="flex h-10 items-center gap-4 text-sm">
            {(["none", "dsr", "mdsr"] as const).map((mode) => (
              <label key={mode} className="flex items-center gap-1.5">
                <input type="radio" checked={shown.dsr === mode} onChange={() => setDraft({ ...shown, dsr: mode })} />
                {mode === "none" ? "No DSR" : mode.toUpperCase()}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Strike order (game 1)">
          <Input value={strike} onChange={(e) => setDraft({ ...shown, strikeOrder: e.target.value.split(",").map((item) => Number(item.trim())).filter((item) => item > 0) })} placeholder="1, 2, 1" />
        </Field>
        <Field label="Ban count">
          <div className="grid gap-1">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={shown.banMode === "fixed"} onChange={() => setDraft({ ...shown, banMode: "fixed" })} />
              Fixed
              <Input className="h-8 w-16" type="number" min={0} value={shown.banCount} onChange={(e) => setDraft({ ...shown, banCount: Number(e.target.value) || 0, banMode: "fixed" })} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={shown.banMode === "byGames"} onChange={() => setDraft({ ...shown, banMode: "byGames" })} />
              By games
              <Input className="h-8" value={shown.bansByGames} onChange={(e) => setDraft({ ...shown, bansByGames: e.target.value, banMode: "byGames" })} placeholder="3:3,5:2" />
            </label>
          </div>
        </Field>
      </div>
      <div className="mt-3 flex gap-2">
        <Button onClick={() => saveRuleset(shown)}>Save</Button>
        {fgc.activeRulesetId ? <Button variant="outline" onClick={() => deleteRuleset(fgc.activeRulesetId!)}>Delete</Button> : null}
        <Button variant="outline" onClick={() => setDraft(blankRuleset())}>Clear</Button>
      </div>
    </section>
  );
}

function StageRow({ stage, game, base, selected, onClick }: { stage: FgcStage; game: string; base: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-2 px-2 py-1 text-left text-sm hover:bg-surface-2 ${selected ? "bg-surface-2" : ""}`}>
      <img src={stageIconUrl(base, game, stage.code)} alt="" className="h-6 w-10 rounded bg-black object-cover" />
      <span className="truncate">{stage.name}</span>
    </button>
  );
}

function StageBox({ title, names, stages, game, base, selected, onSelect }: { title: string; names: string[]; stages: FgcStage[]; game: string; base: string; selected: string; onSelect: (name: string) => void }) {
  return (
    <div className="min-h-48 rounded-md border border-border">
      <p className="border-b border-border px-3 py-2 text-sm">{title}</p>
      <div className="max-h-56 overflow-y-auto">
        {names.map((name) => {
          const stage = stages.find((item) => item.name === name) ?? { name, code: name };
          return <StageRow key={name} stage={stage} game={game} base={base} selected={selected === name} onClick={() => onSelect(name)} />;
        })}
      </div>
    </div>
  );
}
