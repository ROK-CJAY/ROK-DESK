import { Field } from "@/components/desk/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { flagOf, playerLabel, type FgcSet } from "@/lib/fgc-types";
import { useFgcStore } from "@/lib/fgc-store";
import { startggAuthBody } from "@/lib/startgg-link";
import { useEffect, useState } from "react";

export function FgcCommentary() {
  const casters = useFgcStore((s) => s.fgc.casters);
  const setCasterCount = useFgcStore((s) => s.setCasterCount);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Commentary</p>
        <label className="flex items-center gap-2 text-sm">
          Commentators
          <select
            value={casters.length}
            onChange={(e) => setCasterCount(Number(e.target.value))}
            className="h-9 rounded-md border border-border bg-surface-2 px-2"
          >
            {[1, 2, 3, 4].map((count) => <option key={count} value={count}>{count}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {casters.map((caster, index) => (
          <CasterCard key={caster.id} index={index} />
        ))}
      </div>
    </section>
  );
}

function CasterCard({ index }: { index: number }) {
  const caster = useFgcStore((s) => s.fgc.casters[index]);
  const total = useFgcStore((s) => s.fgc.casters.length);
  const patchCaster = useFgcStore((s) => s.patchCaster);
  const saveCaster = useFgcStore((s) => s.saveCaster);
  const moveCaster = useFgcStore((s) => s.moveCaster);
  const clearCaster = useFgcStore((s) => s.clearCaster);
  const saved = useFgcStore((s) => s.casters);
  const [open, setOpen] = useState(false);
  const [matches, setMatches] = useState<{ profileId: string; name: string; realName?: string; photo?: string; twitter: string; pronouns: string; country?: string; region?: string; flag?: string; prefix?: string }[]>([]);
  const query = caster?.name.trim() ?? "";
  useEffect(() => {
    if (query.length < 2) {
      setMatches([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetch("/api/startgg", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "search", query, ...startggAuthBody() }),
      })
        .then((res) => res.json())
        .then((body: { players?: typeof matches }) => setMatches(body.players ?? []))
        .catch(() => setMatches([]));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);
  if (!caster) return null;
  const suggestions = [
    ...saved.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())).map((item) => ({ ...item, photo: "", source: "Saved" })),
    ...matches.map((item) => ({ ...item, source: "start.gg" })),
  ].slice(0, 8);
  const set = (partial: Partial<typeof caster>) => patchCaster(caster.id, partial);

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3">
      <div className="mb-3 flex items-center justify-between">
        <span />
        <p className="font-medium">Commentator {index + 1}</p>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" disabled={index === 0} onClick={() => moveCaster(index, -1)} aria-label="Move up">↑</Button>
          <Button size="icon" variant="ghost" disabled={index === total - 1} onClick={() => moveCaster(index, 1)} aria-label="Move down">↓</Button>
        </div>
      </div>
      <div className="grid gap-3">
        <Field label="Sponsor / tag">
          <div className="grid grid-cols-[8rem_1fr] gap-2">
            <Input value={caster.prefix} onChange={(e) => set({ prefix: e.target.value })} placeholder="Sponsor" />
            <div className="relative">
              <Input value={caster.name} onChange={(e) => set({ name: e.target.value })} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 150)} />
              {open && query ? (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-surface shadow-lg">
                  {suggestions.map((item) => (
                    <button
                      key={`${item.source}-${item.profileId || item.name}`}
                      type="button"
                      className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-surface-2"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        set({
                          name: item.name,
                          prefix: item.prefix || "",
                          realName: item.realName,
                          twitter: item.twitter,
                          pronouns: item.pronouns,
                          profileId: item.profileId,
                          country: item.country || "",
                          region: item.region || "",
                          flag: item.flag || "",
                        });
                        setOpen(false);
                      }}
                    >
                      {item.photo ? <img src={item.photo} alt="" className="h-7 w-7 rounded-full object-cover" /> : <span className="h-7 w-7 rounded-full bg-surface-2" />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{item.name}</span>
                        {item.realName ? <span className="block truncate text-xs text-muted">{item.realName}</span> : null}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </Field>
        <Field label="Real name">
          <Input value={caster.realName} onChange={(e) => set({ realName: e.target.value })} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Twitter">
            <Input value={caster.twitter} onChange={(e) => set({ twitter: e.target.value.replace(/^@/, "") })} />
          </Field>
          <Field label="Pronouns">
            <Input value={caster.pronouns} onChange={(e) => set({ pronouns: e.target.value })} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Country">
            <Input value={[caster.flag, caster.country].filter(Boolean).join(" ")} onChange={(e) => set({ country: e.target.value.replace(/^[\u{1F1E6}-\u{1F1FF}]+\s*/u, ""), flag: flagOf(e.target.value) })} />
          </Field>
          <Field label="State / region">
            <Input value={caster.region} onChange={(e) => set({ region: e.target.value })} />
          </Field>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button variant="secondary" disabled={!caster.name.trim()} onClick={() => saveCaster(caster)}>Update commentator</Button>
          <Button variant="outline" onClick={() => clearCaster(caster.id)}>Delete entry</Button>
          <Button variant="ghost" onClick={() => clearCaster(caster.id)}>Clear</Button>
        </div>
      </div>
    </div>
  );
}

export function FgcTournamentInfo() {
  const event = useFgcStore((s) => s.fgc.event);
  const url = useFgcStore((s) => s.fgc.url);
  const importEvent = useFgcStore((s) => s.importEvent);
  const patch = useFgcStore((s) => s.patch);
  const current = event ?? {
    id: "manual",
    name: "",
    slug: "",
    tournamentName: "",
    game: "",
    url: "",
    venue: "",
    shortLink: "",
    icon: "",
    ruleset: "",
    entrants: 0,
    startAt: "",
    endAt: "",
  };
  const set = (partial: Partial<typeof current>) => patch({ event: { ...current, ...partial } });

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <p className="font-medium">Tournament Info</p>
      <div className="mt-4 grid gap-3">
        <Field label="Tournament Name"><Input value={current.tournamentName} onChange={(e) => set({ tournamentName: e.target.value })} /></Field>
        <Field label="Event Name"><Input value={current.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Entrant Number"><Input type="number" value={String(current.entrants || "")} onChange={(e) => set({ entrants: Number(e.target.value) || 0 })} /></Field>
        <Field label="Address"><Input value={current.venue} onChange={(e) => set({ venue: e.target.value })} /></Field>
        <Field label="Short Link"><Input value={current.shortLink} onChange={(e) => set({ shortLink: e.target.value })} /></Field>
        <Field label="Date"><Input type="date" value={current.startAt.slice(0, 10)} onChange={(e) => set({ startAt: e.target.value })} /></Field>
        <Button variant="secondary" disabled={!url} onClick={() => void importEvent()}>Load from tournament</Button>
        <Button variant="outline" onClick={() => patch({ event: null })}>Clear</Button>
      </div>
      <div className="mt-6 border-t border-border pt-4">
        <p className="font-medium">Tournament Icon</p>
        <div className="mt-3 flex items-center gap-4">
          {current.icon ? <img src={current.icon} alt="" className="h-16 w-16 rounded bg-black object-contain" /> : <div className="h-16 w-16 rounded bg-surface-2" />}
          <div className="grid flex-1 gap-2">
            <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-border text-sm">
              Load local file
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => set({ icon: String(reader.result || "") });
                reader.readAsDataURL(file);
              }} />
            </label>
            <Button variant="outline" disabled={!url} onClick={() => void fetch("/api/startgg", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "icon", url, ...startggAuthBody() }) }).then((res) => res.json()).then((body: { icon?: string }) => body.icon && set({ icon: body.icon }))}>Download tournament icon</Button>
            <Button variant="ghost" onClick={() => set({ icon: "" })}>Default</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function setRank(identifier: string) {
  const text = identifier.trim();
  const numeric = Number(text);
  if (text && Number.isFinite(numeric)) return numeric;
  let rank = 0;
  for (const char of text.toUpperCase()) {
    if (char < "A" || char > "Z") continue;
    rank = rank * 26 + (char.charCodeAt(0) - 64);
  }
  return rank || 9999;
}

function roundKeyOf(set: FgcSet) {
  if (set.roundNum) return set.roundNum;
  return /loser/i.test(set.round) ? -1 : 1;
}

function bracketRounds(sets: FgcSet[], side: "winners" | "losers") {
  const grouped = new Map<number, FgcSet[]>();
  for (const set of sets) {
    const key = roundKeyOf(set);
    if (side === "winners" ? key <= 0 : key >= 0) continue;
    grouped.set(key, [...(grouped.get(key) ?? []), set]);
  }
  const keys = [...grouped.keys()].sort((a, b) => (side === "winners" ? a - b : b - a));
  return keys.map((key) => ({
    key,
    name: grouped.get(key)?.[0]?.round || `Round ${key}`,
    sets: [...(grouped.get(key) ?? [])].sort((a, b) => setRank(a.identifier) - setRank(b.identifier) || a.identifier.localeCompare(b.identifier)),
  }));
}

const COL_W = 210;
const GUTTER = 40;
const ROW = 78;

function nextSlot(index: number, fromCount: number, toCount: number) {
  if (!toCount) return -1;
  if (toCount * 2 === fromCount) return Math.floor(index / 2);
  if (toCount === fromCount) return index;
  return Math.min(toCount - 1, Math.floor((index * toCount) / fromCount));
}

function treeLayout(rounds: ReturnType<typeof bracketRounds>) {
  const columns: { set: FgcSet; x: number; y: number }[][] = [];
  rounds.forEach((round, col) => {
    const previous = columns[col - 1];
    columns.push(
      round.sets.map((set, index) => {
        let y = index * ROW;
        if (previous?.length) {
          if (previous.length === round.sets.length * 2) {
            const top = previous[index * 2];
            const bottom = previous[index * 2 + 1];
            y = bottom ? (top.y + bottom.y) / 2 : top.y;
          } else if (previous.length === round.sets.length) {
            y = previous[index]?.y ?? y;
          } else if (round.sets.length === 1) {
            y = (previous[0].y + previous[previous.length - 1].y) / 2;
          }
        }
        return { set, x: col * (COL_W + GUTTER), y };
      }),
    );
  });
  return columns;
}

function BracketTree({ title, rounds, streamId, onSelect }: { title: string; rounds: ReturnType<typeof bracketRounds>; streamId: string | null; onSelect: (id: string) => void }) {
  if (!rounds.length) return null;
  const columns = treeLayout(rounds);
  const height = Math.max(...columns.flat().map((slot) => slot.y), 0) + 64;
  const width = rounds.length * (COL_W + GUTTER);
  const lines: string[] = [];
  columns.forEach((column, col) => {
    const next = columns[col + 1];
    if (!next) return;
    column.forEach((slot, index) => {
      const target = next[nextSlot(index, column.length, next.length)];
      if (!target) return;
      const x1 = slot.x + COL_W;
      const y1 = slot.y + 24;
      const x2 = target.x;
      const y2 = target.y + 24;
      const mid = x1 + GUTTER / 2;
      lines.push(`M ${x1} ${y1} H ${mid} V ${y2} H ${x2}`);
    });
  });

  return (
    <div className="mt-4">
      <p className="mb-2 font-mono text-[0.65rem] tracking-[0.18em] text-muted uppercase">{title}</p>
      <div className="overflow-x-auto pb-3">
        <div className="relative" style={{ width, height: height + 28 }}>
          {rounds.map((round, index) => (
            <div key={round.key} className="absolute truncate rounded-sm bg-surface-2 px-2 py-1 text-center text-[0.65rem] tracking-wide text-muted uppercase" style={{ left: index * (COL_W + GUTTER), top: 0, width: COL_W }}>
              {round.name}
            </div>
          ))}
          <svg className="absolute text-muted" style={{ left: 0, top: 28 }} width={width} height={height} fill="none" stroke="currentColor" strokeWidth="1.5">
            {lines.map((line) => <path key={line} d={line} />)}
          </svg>
          {columns.flat().map((slot) => {
            const oneWins = slot.set.score1 > slot.set.score2;
            const twoWins = slot.set.score2 > slot.set.score1;
            const live = slot.set.id === streamId;
            return (
              <button key={slot.set.id} type="button" className={`absolute text-left ${live ? "rounded-sm ring-1 ring-accent" : ""}`} style={{ left: slot.x, top: slot.y + 28, width: COL_W }} onClick={() => onSelect(slot.set.id)}>
                <span className="flex h-6 items-center gap-1">
                  <span className="min-w-0 flex-1 truncate rounded-sm bg-surface-2 px-1.5 text-xs font-semibold uppercase">{playerLabel(slot.set.p1) || "TBD"}</span>
                  <span className={`grid h-6 w-7 place-items-center rounded-sm font-mono text-xs ${oneWins ? "bg-emerald-700 text-white" : "bg-black/50"}`}>{slot.set.score1}</span>
                </span>
                <span className="mt-0.5 flex h-6 items-center gap-1">
                  <span className="min-w-0 flex-1 truncate rounded-sm bg-surface-2 px-1.5 text-xs font-semibold uppercase">{playerLabel(slot.set.p2) || "TBD"}</span>
                  <span className={`grid h-6 w-7 place-items-center rounded-sm font-mono text-xs ${twoWins ? "bg-emerald-700 text-white" : "bg-black/50"}`}>{slot.set.score2}</span>
                </span>
                {live ? <span className="mt-0.5 block text-[0.6rem] text-accent">On stream</span> : slot.set.state === "done" ? <span className="mt-0.5 block text-[0.6rem] text-emerald-500">Finished</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function FgcBracket() {
  const sets = useFgcStore((s) => s.fgc.sets);
  const view = useFgcStore((s) => s.fgc.bracketView);
  const streamId = useFgcStore((s) => s.fgc.streamSetId);
  const setBracketView = useFgcStore((s) => s.setBracketView);
  const selectSet = useFgcStore((s) => s.selectSet);
  const [picked, setPicked] = useState("");
  const phases = [...new Set(sets.map((set) => set.phase).filter(Boolean))];
  const groups = [...new Set(sets.filter((set) => !view?.phase || set.phase === view.phase).map((set) => set.group).filter(Boolean))];
  const shown = sets.filter((set) => {
    if (view?.phase && set.phase !== view.phase) return false;
    if (view?.group && set.group !== view.group) return false;
    const losers = set.roundNum < 0 || /loser/i.test(set.round);
    if (view?.winnersOnly && losers) return false;
    if (view?.losersOnly && !losers) return false;
    return true;
  });
  const top = view?.top ?? 8;
  const visible = top > 0 ? shown.filter((set) => {
    const key = roundKeyOf(set);
    const winners = shown.filter((item) => roundKeyOf(item) > 0);
    const counts = new Map<number, number>();
    for (const item of winners) counts.set(roundKeyOf(item), (counts.get(roundKeyOf(item)) ?? 0) + 1);
    const keepFrom = [...counts.keys()].sort((a, b) => a - b).find((round) => (counts.get(round) ?? 0) <= top / 2);
    if (!keepFrom) return true;
    return key < 0 ? Math.abs(key) >= Math.max(1, keepFrom - 1) : key >= keepFrom;
  }) : shown;
  const card = sets.find((set) => set.id === picked) ?? null;
  const onStream = sets.find((set) => set.id === streamId) ?? null;

  useEffect(() => {
    if (!card) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPicked("");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card]);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Phase">
          <select className="h-10 rounded-md border border-border bg-surface-2 px-3 text-sm" value={view?.phase || ""} onChange={(e) => setBracketView({ phase: e.target.value })}>
            <option value="">All phases</option>
            {phases.map((phase) => <option key={phase} value={phase}>{phase}</option>)}
          </select>
        </Field>
        <Field label="Phase group">
          <select className="h-10 rounded-md border border-border bg-surface-2 px-3 text-sm" value={view?.group || ""} onChange={(e) => setBracketView({ group: e.target.value })}>
            <option value="">All groups</option>
            {groups.map((group) => <option key={group} value={group}>{group}</option>)}
          </select>
        </Field>
        <Field label="Progressions in">
          <Input className="w-24" type="number" min={0} value={view?.progressionsIn || 0} onChange={(e) => setBracketView({ progressionsIn: Number(e.target.value) || 0 })} />
        </Field>
        <Field label="Progressions out">
          <Input className="w-24" type="number" min={0} value={view?.progressionsOut || 0} onChange={(e) => setBracketView({ progressionsOut: Number(e.target.value) || 0 })} />
        </Field>
        <Field label="Top players">
          <select className="h-10 rounded-md border border-border bg-surface-2 px-3 text-sm" value={view?.top ?? 8} onChange={(e) => setBracketView({ top: Number(e.target.value) })}>
            <option value={0}>All</option>
            <option value={8}>Top 8</option>
            <option value={4}>Top 4</option>
          </select>
        </Field>
        <label className="mb-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!view?.winnersOnly} onChange={(e) => setBracketView({ winnersOnly: e.target.checked, losersOnly: e.target.checked ? false : view?.losersOnly })} />
          Winners only
        </label>
        <label className="mb-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!view?.losersOnly} onChange={(e) => setBracketView({ losersOnly: e.target.checked, winnersOnly: e.target.checked ? false : view?.winnersOnly })} />
          Losers only
        </label>
      </div>
      <p className="mt-2 text-xs text-muted">Winners on top, losers underneath. Each match sits between the two that feed it. Click a match to open it. Nothing goes to stream until you send it.</p>
      <BracketTree title="Winners" rounds={bracketRounds(visible, "winners")} streamId={streamId} onSelect={setPicked} />
      <BracketTree title="Losers" rounds={bracketRounds(visible, "losers")} streamId={streamId} onSelect={setPicked} />
      {visible.length === 0 ? <p className="mt-4 text-sm text-muted">Import an event to fill the bracket.</p> : null}
      {card ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setPicked("")}>
          <section className="grid w-full max-w-md gap-3 rounded-xl border border-border bg-surface p-4" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[0.65rem] tracking-[0.18em] text-muted uppercase">{[card.identifier, card.phase, card.round].filter(Boolean).join(" · ") || "Match"}</p>
                <p className="text-lg">{playerLabel(card.p1)} vs {playerLabel(card.p2)}</p>
                <p className="text-xs text-muted">{card.score1} – {card.score2}{card.station ? ` · ${card.station}` : ""}{card.state === "done" ? " · Finished" : ""}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setPicked("")}>Close</Button>
            </div>
            {onStream && onStream.id !== card.id ? (
              <p className="text-sm text-muted">On stream now: {playerLabel(onStream.p1)} vs {playerLabel(onStream.p2)}. Sending this match replaces it.</p>
            ) : null}
            {card.id === streamId ? <p className="text-sm text-accent">This match is already on the scoreboard.</p> : null}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPicked("")}>Cancel</Button>
              <Button disabled={card.id === streamId} onClick={() => { selectSet(card.id); setPicked(""); }}>Send to scoreboard</Button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
