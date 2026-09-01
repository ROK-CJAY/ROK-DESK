import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDeskStore } from "@/lib/desk-store";
import { isPtcgTitle } from "@/lib/games";
import { emptyPtcgSide, promoteBenchToActive, swapActiveWithBench, type PtcgMon, type PtcgSideBoard } from "@/lib/ptcg-board";
import { cn } from "@/lib/cn";

function writeSide(side: "p1" | "p2", next: PtcgSideBoard) {
  const live = useDeskStore.getState().desk.ptcgBoard;
  useDeskStore.getState().patch({ ptcgBoard: { ...live, [side]: next } });
}

function HpEditor({ mon, onChange }: { mon: PtcgMon; onChange: (hpNow: number) => void }) {
  const printed = mon.hp || mon.hpNow;
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-8 shrink-0 text-[0.65rem] text-muted">HP</span>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange(Math.max(0, mon.hpNow - 10))}>
        −10
      </Button>
      <Input
        type="number"
        min={0}
        className="h-8 w-16 px-2 text-center font-mono text-sm tabular-nums"
        value={Number.isFinite(mon.hpNow) ? mon.hpNow : 0}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
      />
      <span className="font-mono text-xs text-muted">/{printed}</span>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange(mon.hpNow + 10)}>
        +10
      </Button>
    </div>
  );
}

function SlotChip({
  label,
  mon,
  onClear,
  onHp,
  extra,
}: {
  label: string;
  mon: PtcgMon | null;
  onClear: () => void;
  onHp?: (hpNow: number) => void;
  extra?: ReactNode;
}) {
  return (
    <div className="space-y-1.5 rounded-md bg-surface-2 px-2 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[0.58rem] tracking-[0.14em] text-muted uppercase">{label}</p>
          <p className="truncate text-sm">{mon?.name ?? "Empty"}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {extra}
          {mon ? (
            <Button type="button" variant="ghost" size="sm" onClick={onClear}>
              Clear
            </Button>
          ) : null}
        </div>
      </div>
      {mon && onHp ? <HpEditor mon={mon} onChange={onHp} /> : null}
    </div>
  );
}

function BenchMoveButtons({ side, index, compact = false }: { side: "p1" | "p2"; index: number; compact?: boolean }) {
  const board = useDeskStore((s) => s.desk.ptcgBoard[side]);
  const mon = board.bench[index];
  if (!mon) return null;
  const size = compact ? "sm" : "sm";
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size}
        title="Retreat / switch — swap with Active"
        onClick={() => writeSide(side, swapActiveWithBench(board, index))}
      >
        Swap
      </Button>
      <Button
        type="button"
        variant="outline"
        size={size}
        title="Knock-out — this Pokémon becomes Active, current Active is removed"
        onClick={() => writeSide(side, promoteBenchToActive(board, index))}
      >
        KO in
      </Button>
    </>
  );
}

function SideBoard({ side }: { side: "p1" | "p2" }) {
  const desk = useDeskStore((s) => s.desk);
  const board = desk.ptcgBoard[side];
  const player = desk[side];

  const write = (next: Partial<typeof board>) => {
    writeSide(side, { ...board, ...next });
  };

  return (
    <div className="space-y-2">
      <p className="font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase">
        {side === "p1" ? "Player 1" : "Player 2"} · {player.name || "—"}
      </p>
      <div className="grid grid-cols-3 gap-1">
        {(["energy", "supporter", "retreat"] as const).map((flag) => (
          <button
            key={flag}
            type="button"
            onClick={() => write({ [flag]: !board[flag] })}
            className={cn(
              "rounded-md px-1 py-1.5 text-[0.65rem] font-semibold tracking-[0.12em] uppercase",
              board[flag] ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted line-through",
            )}
          >
            {flag} {board[flag] ? "on" : "off"}
          </button>
        ))}
      </div>
      <SlotChip
        label="Active"
        mon={board.active}
        onClear={() => write({ active: null })}
        onHp={(hpNow) => board.active && write({ active: { ...board.active, hpNow } })}
      />
      {board.bench.map((mon, i) => (
        <SlotChip
          key={i}
          label={`Bench ${i + 1}`}
          mon={mon}
          extra={<BenchMoveButtons side={side} index={i} />}
          onClear={() => {
            const bench = [...board.bench];
            bench[i] = null;
            write({ bench });
          }}
          onHp={(hpNow) => {
            if (!mon) return;
            const bench = [...board.bench];
            bench[i] = { ...mon, hpNow };
            write({ bench });
          }}
        />
      ))}
      {board.spotlight ? (
        <SlotChip label="On stream" mon={board.spotlight} onClear={() => write({ spotlight: null })} />
      ) : null}
    </div>
  );
}

export function PtcgJudgeBoard({ side }: { side: "p1" | "p2" }) {
  const board = useDeskStore((s) => s.desk.ptcgBoard[side]);
  if (!board) return null;
  return (
    <div className="mt-2 space-y-1">
      <p className="truncate text-[0.68rem] text-muted">
        Active <span className="text-fg">{board.active?.name ?? "—"}</span>
      </p>
      {board.bench.map((mon, i) =>
        mon ? (
          <div key={i} className="flex items-center gap-1">
            <span className="min-w-0 flex-1 truncate text-[0.72rem]">{mon.name}</span>
            <BenchMoveButtons side={side} index={i} compact />
          </div>
        ) : null,
      )}
    </div>
  );
}

export function PtcgBoardPanel() {
  const patch = useDeskStore((s) => s.patch);
  const desk = useDeskStore((s) => s.desk);
  if (!isPtcgTitle(desk.gameId)) return null;
  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[0.65rem] tracking-[0.2em] text-muted uppercase">PTCG board</p>
          <p className="text-sm text-muted">
            Swap = retreat/switch. KO in = knock out Active and promote that bench Pokémon.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => patch({ ptcgBoard: { p1: emptyPtcgSide(), p2: emptyPtcgSide() } })}>
          Clear board
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SideBoard side="p1" />
        <SideBoard side="p2" />
      </div>
    </section>
  );
}