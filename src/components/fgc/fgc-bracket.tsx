import type { ToSet } from "@/lib/startgg-to";
import { cn } from "@/lib/cn";

const CARD_W = 220;
const CARD_H = 64;
const COL_GAP = 64;
const ROW_GAP = 16;

function letterRank(value: string) {
  let rank = 0;
  for (const char of value.toUpperCase()) {
    if (char < "A" || char > "Z") continue;
    rank = rank * 26 + (char.charCodeAt(0) - 64);
  }
  return rank || Number.MAX_SAFE_INTEGER;
}

type Placed = { set: ToSet; y: number };

function placeSide(sets: ToSet[]): { title: string; rows: Placed[] }[] {
  const rounds = [...new Set(sets.map((set) => set.roundNum))].sort((a, b) => Math.abs(a) - Math.abs(b) || a - b);
  const columns = rounds.map((round) =>
    sets
      .filter((set) => set.roundNum === round)
      .sort((a, b) => letterRank(a.identifier) - letterRank(b.identifier) || a.identifier.localeCompare(b.identifier)),
  );
  const center = new Map<string, number>();
  return columns.map((column, index) => {
    const rows: Placed[] = column.map((set, row) => {
      const feeders = set.prereqs.map((id) => center.get(id)).filter((value): value is number => value != null);
      const y = feeders.length
        ? feeders.reduce((sum, value) => sum + value, 0) / feeders.length - CARD_H / 2
        : row * (CARD_H + ROW_GAP);
      return { set, y };
    });
    if (index === 0) rows.forEach((item, row) => { item.y = row * (CARD_H + ROW_GAP); });
    rows.sort((a, b) => a.y - b.y);
    let cursor = 0;
    for (const item of rows) {
      if (item.y < cursor) item.y = cursor;
      cursor = item.y + CARD_H + ROW_GAP;
      center.set(item.set.id, item.y + CARD_H / 2);
    }
    return { title: column[0]?.round || "Round", rows };
  });
}

function Side({
  title,
  columns,
  selected,
  onSelect,
}: {
  title: string;
  columns: { title: string; rows: Placed[] }[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  if (!columns.length) return null;
  const height = Math.max(...columns.flatMap((column) => column.rows.map((row) => row.y + CARD_H)), CARD_H);
  const width = columns.length * (CARD_W + COL_GAP);
  return (
    <div>
      <p className="mb-2 font-mono text-[0.65rem] tracking-[0.18em] text-muted uppercase">{title}</p>
      <div className="overflow-x-auto pb-2">
        <div className="relative" style={{ width, height: height + 32 }}>
          {columns.map((column, index) => (
            <p key={`${column.title}-${index}`} className="absolute truncate text-xs font-medium" style={{ left: index * (CARD_W + COL_GAP), top: 0, width: CARD_W }}>
              {column.title}
            </p>
          ))}
          <svg className="absolute text-border" style={{ top: 28 }} width={width} height={height}>
            {columns.slice(1).flatMap((column, index) => column.rows.flatMap((row) => row.set.prereqs.map((id) => {
              const from = columns[index]?.rows.find((item) => item.set.id === id);
              if (!from) return null;
              const x1 = index * (CARD_W + COL_GAP) + CARD_W;
              const y1 = from.y + CARD_H / 2;
              const x2 = (index + 1) * (CARD_W + COL_GAP);
              const y2 = row.y + CARD_H / 2;
              const mid = x1 + COL_GAP / 2;
              return <path key={`${row.set.id}-${id}`} d={`M ${x1} ${y1} H ${mid} V ${y2} H ${x2}`} fill="none" stroke="currentColor" strokeWidth="1.5" />;
            })))}
          </svg>
          {columns.map((column, index) => column.rows.map((row) => {
            const winner1 = row.set.winnerId && row.set.winnerId === row.set.p1.id;
            const winner2 = row.set.winnerId && row.set.winnerId === row.set.p2.id;
            const called = row.set.state === 2 || row.set.state === 6;
            const place = called ? [row.set.station, row.set.stream].filter(Boolean).join(" · ") : "";
            return (
              <button
                key={row.set.id}
                type="button"
                onClick={() => onSelect(row.set.id)}
                className={cn("absolute overflow-hidden rounded-md border bg-surface text-left", row.set.id === selected ? "border-accent" : "border-border")}
                style={{ left: index * (CARD_W + COL_GAP), top: row.y + 28, width: CARD_W, height: CARD_H }}
              >
                <span className="absolute inset-y-0 left-0 flex w-6 items-center justify-center bg-surface-2 text-[0.65rem] text-muted">{row.set.identifier}</span>
                <span className={cn("absolute top-1 right-2 left-8 truncate text-xs", winner1 ? "font-semibold text-fg" : "text-muted")}>{row.set.p1.name}</span>
                <span className={cn("absolute top-1 right-1 font-mono text-xs", winner1 ? "text-emerald-400" : "text-muted")}>{row.set.state === 3 || row.set.score1 || row.set.score2 ? row.set.score1 : ""}</span>
                <span className={cn("absolute bottom-4 right-2 left-8 truncate text-xs", winner2 ? "font-semibold text-fg" : "text-muted")}>{row.set.p2.name}</span>
                <span className={cn("absolute right-1 bottom-4 font-mono text-xs", winner2 ? "text-emerald-400" : "text-muted")}>{row.set.state === 3 || row.set.score1 || row.set.score2 ? row.set.score2 : ""}</span>
                {place ? <span className="absolute bottom-0 left-8 truncate text-[0.6rem] text-accent">{place}</span> : null}
              </button>
            );
          }))}
        </div>
      </div>
    </div>
  );
}

export function BracketBoard({ sets, selected, onSelect }: { sets: ToSet[]; selected: string; onSelect: (id: string) => void }) {
  const phases = [...new Set(sets.map((set) => set.phase || "Bracket"))];
  if (!sets.length) return <p className="text-sm text-muted">No sets on this event yet.</p>;
  return (
    <div className="grid gap-6">
      {phases.map((phase) => {
        const mine = sets.filter((set) => (set.phase || "Bracket") === phase);
        const winners = placeSide(mine.filter((set) => set.roundNum >= 0));
        const losers = placeSide(mine.filter((set) => set.roundNum < 0));
        const label = mine[0]?.group ? `${phase} ${mine[0].group}` : phase;
        return (
          <div key={label} className="grid gap-5">
            <Side title={losers.length ? `${label} · Winners` : label} columns={winners} selected={selected} onSelect={onSelect} />
            <Side title={`${label} · Losers`} columns={losers} selected={selected} onSelect={onSelect} />
          </div>
        );
      })}
    </div>
  );
}
