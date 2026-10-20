import { ArrowLeftRight, Plus, RotateCcw } from "lucide-react";
import { Field } from "@/components/desk/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { blankPlayer, type FgcPlayer, type FgcSet } from "@/lib/fgc-types";
import { useFgcStore } from "@/lib/fgc-store";

function PlayerCard({
  setId,
  side,
  player,
  losers,
  label,
}: {
  setId: string;
  side: "p1" | "p2";
  player: FgcPlayer;
  losers: boolean;
  label: string;
}) {
  const patchPlayer = useFgcStore((s) => s.patchPlayer);
  const patchSet = useFgcStore((s) => s.patchSet);
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
          <Input value={player.tag} onChange={(e) => set({ tag: e.target.value })} />
        </Field>
        <Field label="Real name">
          <Input value={player.realName} onChange={(e) => set({ realName: e.target.value })} />
        </Field>
        <Field label="Twitter">
          <Input value={player.twitter} onChange={(e) => set({ twitter: e.target.value.replace(/^@/, "") })} />
        </Field>
        <Field label="Country">
          <Input value={player.country} onChange={(e) => set({ country: e.target.value })} />
        </Field>
        <Field label="State / region">
          <Input value={player.region} onChange={(e) => set({ region: e.target.value })} />
        </Field>
        <Field label="Character">
          <Input value={player.character} onChange={(e) => set({ character: e.target.value })} />
        </Field>
        <Field label="Skin">
          <Input
            type="number"
            min={0}
            value={player.skin}
            onChange={(e) => set({ skin: Number(e.target.value) || 0 })}
          />
        </Field>
      </div>
      <Button className="mt-3" size="sm" variant="outline" onClick={() => patchSet(setId, { [side]: blankPlayer() })}>
        Clear player
      </Button>
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

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_14rem_1fr]">
        <PlayerCard setId={set.id} side="p1" player={p1} losers={set.losers1} label="Team 1" />
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
        <PlayerCard setId={set.id} side="p2" player={p2} losers={set.losers2} label="Team 2" />
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
