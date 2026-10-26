import { useState } from "react";
import { Field } from "@/components/desk/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { blankPlayer, type FgcPlayer } from "@/lib/fgc-types";
import { useFgcStore } from "@/lib/fgc-store";

function PlayerFields({ index, playerIndex, player }: { index: number; playerIndex: number; player: FgcPlayer }) {
  const setRosterPlayer = useFgcStore((s) => s.setRosterPlayer);
  const set = (partial: Partial<FgcPlayer>) => setRosterPlayer(index, playerIndex, partial);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Field label="Sponsor">
        <Input value={player.prefix} onChange={(e) => set({ prefix: e.target.value })} />
      </Field>
      <Field label="Tag">
        <Input value={player.tag} onChange={(e) => set({ tag: e.target.value })} />
      </Field>
      <Field label="Seed">
        <Input type="number" value={player.seed ?? ""} onChange={(e) => set({ seed: e.target.value === "" ? null : Number(e.target.value) })} />
      </Field>
      <Field label="Real name">
        <Input value={player.realName} onChange={(e) => set({ realName: e.target.value })} />
      </Field>
      <Field label="Pronouns">
        <Input value={player.pronouns} onChange={(e) => set({ pronouns: e.target.value })} />
      </Field>
      <Field label="Twitter">
        <Input value={player.twitter} onChange={(e) => set({ twitter: e.target.value.replace(/^@/, "") })} />
      </Field>
      <Field label="State / region">
        <Input value={player.region} onChange={(e) => set({ region: e.target.value })} />
      </Field>
      <Field label="Character">
        <Input value={player.character} onChange={(e) => set({ character: e.target.value })} />
      </Field>
    </div>
  );
}

export function FgcRoster() {
  const roster = useFgcStore((s) => s.fgc.roster);
  const setRoster = useFgcStore((s) => s.setRoster);
  const setRosterSlot = useFgcStore((s) => s.setRosterSlot);
  const loadStandings = useFgcStore((s) => s.loadStandings);
  const importing = useFgcStore((s) => s.importing);
  const [copied, setCopied] = useState(false);
  const slots = roster?.slots ?? [];

  const copyResults = async () => {
    const lines = slots
      .map((slot, index) => {
        const name = [slot.teamName, slot.players.map((player) => player.tag).filter(Boolean).join(" / ")].filter(Boolean).join(" ");
        return name ? `${index + 1}. ${name}${slot.players[0]?.character ? ` (${slot.players[0].character})` : ""}` : "";
      })
      .filter(Boolean);
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Number of slots">
          <Input className="w-24" type="number" min={1} max={64} value={roster?.count || 8} onChange={(e) => setRoster({ count: Number(e.target.value) || 1 })} />
        </Field>
        <Field label="Players per slot">
          <select className="h-10 rounded-md border border-border bg-surface-2 px-3 text-sm" value={roster?.playersPerSlot || 1} onChange={(e) => setRoster({ playersPerSlot: Number(e.target.value) })}>
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
        </Field>
        <label className="mb-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!roster?.showScores} onChange={(e) => setRoster({ showScores: e.target.checked })} />
          Show scores
        </label>
        <Button variant="secondary" disabled={importing} onClick={() => void loadStandings()}>
          {importing ? "Loading" : "Load tournament standings"}
        </Button>
        <Button variant="outline" onClick={() => void copyResults()}>{copied ? "Copied" : "Generate results text"}</Button>
      </div>
      <p className="mt-2 text-xs text-muted">Standings load when you press the button. They are not polled. Top 8 overlays read this list in order.</p>
      <div className="mt-4 grid gap-3">
        {slots.map((slot, index) => (
          <div key={index} className="rounded-lg border border-border bg-surface-2 p-3">
            <div className="mb-2 flex items-center gap-3">
              <p className="font-mono text-xs text-muted">{index + 1}</p>
              <Field label="Team name" className="min-w-0 flex-1">
                <Input value={slot.teamName} onChange={(e) => setRosterSlot(index, { teamName: e.target.value })} />
              </Field>
              {roster?.showScores ? (
                <Field label="Score" className="w-24">
                  <Input type="number" value={slot.score} onChange={(e) => setRosterSlot(index, { score: Number(e.target.value) || 0 })} />
                </Field>
              ) : null}
            </div>
            <PlayerFields index={index} playerIndex={0} player={slot.players[0] ?? blankPlayer()} />
            {(roster?.playersPerSlot || 1) > 1 ? (
              <div className="mt-3">
                <PlayerFields index={index} playerIndex={1} player={slot.players[1] ?? blankPlayer()} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
