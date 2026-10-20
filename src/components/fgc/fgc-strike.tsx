import { useEffect, useState } from "react";
import { useFgcStore } from "@/lib/fgc-store";

export function FgcStrike() {
  const hydrate = useFgcStore((s) => s.hydrate);
  const reload = useFgcStore((s) => s.reload);
  const fgc = useFgcStore((s) => s.fgc);
  const patchSet = useFgcStore((s) => s.patchSet);
  useEffect(() => {
    hydrate();
    const timer = window.setInterval(reload, 1000);
    return () => window.clearInterval(timer);
  }, [hydrate, reload]);

  const ruleset = fgc.rulesets.find((item) => item.id === fgc.activeRulesetId) ?? null;
  const set = fgc.sets.find((item) => item.id === fgc.streamSetId) ?? fgc.sets[0] ?? null;
  const stages = ruleset ? [...ruleset.neutralStages, ...ruleset.counterpickStages] : [];
  const [banned, setBanned] = useState<string[]>([]);
  const remaining = stages.filter((stage) => !banned.includes(stage));

  return (
    <div className="min-h-dvh bg-bg p-6 text-fg">
      <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Stage strike</p>
      <h1 className="font-display mt-1 text-3xl font-semibold uppercase">{ruleset?.name || "No ruleset selected"}</h1>
      <p className="mt-1 text-sm text-muted">
        {ruleset ? `${ruleset.dsr.toUpperCase()} · game 1 strikes ${ruleset.strikeOrder.join("-")} · later games ban ${ruleset.banCount}` : "Pick a ruleset in FGC Control first."}
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stages.map((stage) => {
          const out = banned.includes(stage);
          return (
            <button
              key={stage}
              type="button"
              className="rounded-lg border border-border bg-surface px-4 py-6 text-left disabled:opacity-40"
              disabled={out}
              onClick={() => setBanned((current) => [...current, stage])}
            >
              <span className="block font-display text-xl font-semibold uppercase">{stage}</span>
              <span className="mt-1 block text-xs text-muted">{ruleset?.neutralStages.includes(stage) ? "Neutral" : "Counterpick"}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => setBanned([])}>
          Reset bans
        </button>
        {remaining.length === 1 && set ? (
          <button
            type="button"
            className="rounded-md bg-white px-3 py-2 text-sm text-black"
            onClick={() => patchSet(set.id, { stage: remaining[0] ?? "" })}
          >
            Send {remaining[0]} to scoreboard
          </button>
        ) : null}
      </div>
    </div>
  );
}
