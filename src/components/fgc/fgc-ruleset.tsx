import { useMemo, useState } from "react";
import { Field } from "@/components/desk/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { blankRuleset, type FgcRuleset } from "@/lib/fgc-types";
import { useFgcStore } from "@/lib/fgc-store";

function list(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function FgcRulesetEditor() {
  const fgc = useFgcStore((s) => s.fgc);
  const saveRuleset = useFgcStore((s) => s.saveRuleset);
  const deleteRuleset = useFgcStore((s) => s.deleteRuleset);
  const selectRuleset = useFgcStore((s) => s.selectRuleset);
  const active = fgc.rulesets.find((item) => item.id === fgc.activeRulesetId) ?? blankRuleset();
  const [draft, setDraft] = useState<FgcRuleset>(active);
  const shown = draft.id === active.id ? draft : active;

  const strike = useMemo(() => shown.strikeOrder.join(","), [shown.strikeOrder]);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Ruleset</p>
          <p className="font-display mt-1 text-2xl font-semibold uppercase">Stage striking</p>
        </div>
        <a href="/fgc/strike" target="_blank" rel="noreferrer" className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm">
          Open stage strike
        </a>
      </div>
      <p className="mt-2 text-xs text-muted">Saved on this desk. Not pulled from start.gg. The stage strike page uses the selected ruleset.</p>

      <div className="mt-4 grid gap-3 lg:grid-cols-[14rem_1fr]">
        <div className="grid content-start gap-2">
          {fgc.rulesets.map((item) => (
            <button
              key={item.id}
              type="button"
              className="rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-surface-2"
              onClick={() => {
                selectRuleset(item.id);
                setDraft(item);
              }}
            >
              {item.name}
            </button>
          ))}
          <Button
            variant="outline"
            onClick={() => {
              const created = blankRuleset();
              setDraft(created);
              selectRuleset(null);
            }}
          >
            New ruleset
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <Input value={shown.name} onChange={(e) => setDraft({ ...shown, name: e.target.value })} />
          </Field>
          <Field label="Game">
            <Input value={shown.game} onChange={(e) => setDraft({ ...shown, game: e.target.value })} placeholder="Super Smash Bros. Ultimate" />
          </Field>
          <Field label="Neutral stages" className="sm:col-span-2">
            <Input
              value={shown.neutralStages.join(", ")}
              onChange={(e) => setDraft({ ...shown, neutralStages: list(e.target.value) })}
              placeholder="Battlefield, Small Battlefield, Pokémon Stadium 2"
            />
          </Field>
          <Field label="Counterpick stages" className="sm:col-span-2">
            <Input
              value={shown.counterpickStages.join(", ")}
              onChange={(e) => setDraft({ ...shown, counterpickStages: list(e.target.value) })}
              placeholder="Town and City, Kalos Pokémon League"
            />
          </Field>
          <Field label="Game 1 strike order">
            <Input
              value={strike}
              onChange={(e) =>
                setDraft({
                  ...shown,
                  strikeOrder: e.target.value.split(",").map((item) => Number(item.trim())).filter((item) => item > 0),
                })
              }
              placeholder="1, 2, 1"
            />
          </Field>
          <Field label="Later-game ban count">
            <Input
              type="number"
              min={0}
              value={shown.banCount}
              onChange={(e) => setDraft({ ...shown, banCount: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Stage ban rule">
            <select
              value={shown.dsr}
              onChange={(e) => setDraft({ ...shown, dsr: e.target.value as FgcRuleset["dsr"] })}
              className="h-10 rounded-md border border-border bg-surface-2 px-3 text-sm"
            >
              <option value="none">No DSR</option>
              <option value="dsr">DSR</option>
              <option value="mdsr">Modified DSR</option>
            </select>
          </Field>
          <div className="flex items-end gap-2">
            <Button onClick={() => saveRuleset(shown)}>Save</Button>
            <Button variant="outline" onClick={() => deleteRuleset(shown.id)} disabled={!fgc.rulesets.some((item) => item.id === shown.id)}>
              Delete
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
