import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Field } from "@/components/desk/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolveStage } from "@/lib/fgc-assets";
import { blankRuleset, libraryFor, type FgcRuleset, type FgcStage } from "@/lib/fgc-types";
import { useFgcStore } from "@/lib/fgc-store";
import type { StartggRuleset } from "@/lib/startgg";

const stageIds = new Map<string, Map<string, string>>();

async function stageNames(code: string, ids: number[] | undefined): Promise<string[]> {
  if (!code || !ids?.length) return [];
  let map = stageIds.get(code);
  if (!map) {
    const res = await fetch(`https://raw.githubusercontent.com/joaorb64/StreamHelperAssets/main/games/${code}/base_files/config.json`);
    const body = (await res.json()) as { smashgg_game_id?: string | number; stage_to_codename?: Record<string, { smashgg_id?: string | number }> };
    map = new Map();
    for (const [name, value] of Object.entries(body.stage_to_codename ?? {})) {
      if (value?.smashgg_id != null) map.set(String(value.smashgg_id), name);
    }
    stageIds.set(code, map);
    if (body.smashgg_game_id != null) stageIds.set(`${code}:game`, new Map([["id", String(body.smashgg_game_id)]]));
  }
  return ids.map((id) => map?.get(String(id)) || "").filter(Boolean);
}

export function FgcRulesetEditor() {
  const fgc = useFgcStore((s) => s.fgc);
  const saveRuleset = useFgcStore((s) => s.saveRuleset);
  const deleteRuleset = useFgcStore((s) => s.deleteRuleset);
  const selectRuleset = useFgcStore((s) => s.selectRuleset);
  const library = libraryFor(fgc);
  const active = fgc.rulesets.find((item) => item.id === fgc.activeRulesetId) ?? blankRuleset();
  const [draft, setDraft] = useState<FgcRuleset>(active);
  const shown = { ...(draft.id === active.id ? draft : active), banMode: (draft.id === active.id ? draft : active).banMode || "fixed", bansByGames: (draft.id === active.id ? draft : active).bansByGames || "3:3,5:2" };
  const [selected, setSelected] = useState("");
  const [presetId, setPresetId] = useState("");
  const [filter, setFilter] = useState("All stages");
  const [presets, setPresets] = useState<StartggRuleset[]>([]);
  const [gameId, setGameId] = useState(library?.startggGameId || "");
  const stages = library?.stages ?? [];
  const filtered = useMemo(() => {
    if (filter === "All stages") return stages;
    return stages.filter((stage) => stage.name.toLowerCase().includes(filter.toLowerCase()));
  }, [stages, filter]);
  const strike = useMemo(() => shown.strikeOrder.join(","), [shown.strikeOrder]);
  const forThisGame = presets
    .filter((preset) => gameId && String(preset.videogameId) === gameId)
    .sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    void fetch("/api/startgg", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "rulesets" }),
    })
      .then((res) => res.json())
      .then((body: { rulesets?: StartggRuleset[] }) => setPresets(body.rulesets ?? []))
      .catch(() => setPresets([]));
  }, []);

  useEffect(() => {
    if (library?.startggGameId) {
      setGameId(library.startggGameId);
      return;
    }
    if (!library?.code) {
      setGameId("");
      return;
    }
    void fetch(`https://raw.githubusercontent.com/joaorb64/StreamHelperAssets/main/games/${library.code}/base_files/config.json`)
      .then((res) => res.json())
      .then((body: { smashgg_game_id?: string | number }) => setGameId(body.smashgg_game_id ? String(body.smashgg_game_id) : ""))
      .catch(() => setGameId(""));
  }, [library?.code, library?.startggGameId]);

  const applyPreset = (id: string) => {
    const preset = forThisGame.find((item) => String(item.id) === id);
    if (!preset || !library) return;
    const flags = preset.settings?.additionalFlags ?? {};
    const byGames = flags.banCountByMaxGames && typeof flags.banCountByMaxGames === "object" ? flags.banCountByMaxGames : null;
    void stageNames(library.code, preset.settings?.stages?.neutral).then(async (neutral) => {
      const counter = await stageNames(library.code, preset.settings?.stages?.counterpick);
      setDraft({
        ...blankRuleset(),
        name: preset.name,
        game: library.game,
        neutralStages: neutral,
        counterpickStages: counter,
        strikeOrder: preset.settings?.strikeOrder?.length ? preset.settings.strikeOrder : [1, 2, 1],
        dsr: flags.useMDSR ? "mdsr" : flags.useDSR || flags.useGenesisDSR ? "dsr" : "none",
        banMode: byGames ? "byGames" : "fixed",
        banCount: Number(flags.banCount) || 0,
        bansByGames: byGames ? Object.entries(byGames).map(([games, bans]) => `${games}:${bans}`).join(",") : shown.bansByGames,
      });
      selectRuleset(null);
    });
  };

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
      <div className="mt-3 grid gap-3 lg:grid-cols-[1.1fr_1fr_14rem_auto]">
        <Field label={library ? `Presets · ${library.game}` : "Presets"}>
          <select
            value={presetId}
            disabled={!forThisGame.length}
            onChange={(e) => {
              setPresetId("");
              applyPreset(e.target.value);
            }}
            className="h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-sm"
          >
            <option value="">{forThisGame.length ? "start.gg presets for this game" : library ? "No presets for this game" : "Download the game library first"}</option>
            {forThisGame.map((preset) => (
              <option key={preset.id} value={preset.id}>{preset.name}</option>
            ))}
          </select>
        </Field>
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
      <img src={resolveStage(base, game, stage.code)} alt="" className="h-6 w-10 rounded bg-black object-cover" />
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
