import { Button } from "@/components/ui/button";
import { useDeskStore } from "@/lib/desk-store";
import { RIFT_OT_LAST_TURN, seatsFor, type SeatId } from "@/lib/desk-types";
import { cn } from "@/lib/cn";

const SEAT_LABEL: Record<SeatId, string> = {
  p1: "P1",
  p2: "P2",
  p3: "P3",
  p4: "P4",
};

export function RiftOvertime({ compact = false }: { compact?: boolean }) {
  const desk = useDeskStore((s) => s.desk);
  const startOpOt = useDeskStore((s) => s.startOpOt);
  const nextOpTurn = useDeskStore((s) => s.nextOpTurn);
  const clearOpOt = useDeskStore((s) => s.clearOpOt);
  if (desk.gameId !== "riftbound") return null;

  const seats = seatsFor(desk.tableSize);
  const started = desk.otTurn != null;
  const done = started && desk.otTurn != null && desk.otTurn > RIFT_OT_LAST_TURN;
  const sideName = desk.otSide ? desk[desk.otSide].name.trim() || SEAT_LABEL[desk.otSide] : "";
  const onLast = desk.otTurn === RIFT_OT_LAST_TURN;

  return (
    <div className={cn("rounded-lg bg-surface-2 px-3 py-2", compact && "w-full")}>
      <div className="flex items-end justify-between gap-2">
        <p className="text-xs text-muted">Time procedure</p>
        <p className="text-right text-[0.65rem] text-subtle">
          {done
            ? "3 turns played"
            : started
              ? `Turn ${desk.otTurn} · ${sideName}`
              : "Turn 0 is whoever was playing when time was called"}
        </p>
      </div>
      {started ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" onClick={nextOpTurn} disabled={done}>
            {onLast ? "End turns" : "Next turn"}
          </Button>
          <Button variant="ghost" size="sm" onClick={clearOpOt}>
            Clear
          </Button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {seats.map((side) => (
            <Button key={side} variant="secondary" size="sm" onClick={() => startOpOt(side)}>
              {desk[side].name.trim() || SEAT_LABEL[side]} is on turn
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
