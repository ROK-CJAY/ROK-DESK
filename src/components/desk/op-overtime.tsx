import { Button } from "@/components/ui/button";
import { useDeskStore } from "@/lib/desk-store";
import { formatClock, OP_OT_LAST_TURN, opOtDone, opOtRemaining } from "@/lib/desk-types";
import { useClockNow } from "@/lib/use-clock-now";
import { cn } from "@/lib/cn";

export function OpOvertime({ compact = false }: { compact?: boolean }) {
  const desk = useDeskStore((s) => s.desk);
  const startOpOt = useDeskStore((s) => s.startOpOt);
  const toggleOpOt = useDeskStore((s) => s.toggleOpOt);
  const nextOpTurn = useDeskStore((s) => s.nextOpTurn);
  const clearOpOt = useDeskStore((s) => s.clearOpOt);
  const live = desk.gameId === "one-piece" && desk.otTurn != null && desk.otRunning;
  const now = useClockNow({ live, pauseWhenHidden: true });
  if (desk.gameId !== "one-piece") return null;

  const started = desk.otTurn != null;
  const left = opOtRemaining(desk, now);
  const done = opOtDone(desk, left);
  const sideName =
    desk.otSide === "p1" ? desk.p1.name || "Player 1" : desk.otSide === "p2" ? desk.p2.name || "Player 2" : "";
  const onLast = desk.otTurn === OP_OT_LAST_TURN;

  return (
    <div className={cn("rounded-lg bg-surface-2 px-3 py-2", compact && "w-full")}>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-xs text-muted">Overtime</p>
          <p
            className={cn(
              "font-display text-2xl leading-none font-semibold tabular-nums",
              done === "time" && "text-live",
            )}
          >
            {formatClock(left)}
          </p>
        </div>
        <p className="text-right text-[0.65rem] text-subtle">
          {done === "time"
            ? "5:00 is up"
            : done === "turns"
              ? "After turn 3"
              : started
                ? `Turn ${desk.otTurn} · ${sideName}`
                : "5:00 · turn 0 is the active player"}
        </p>
      </div>
      {started ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Button variant={desk.otRunning ? "live" : "secondary"} size="sm" onClick={toggleOpOt} disabled={done != null}>
            {desk.otRunning ? "Pause" : "Resume"}
          </Button>
          <Button variant="outline" size="sm" onClick={nextOpTurn} disabled={done != null}>
            {onLast ? "End turns" : "Next turn"}
          </Button>
          <Button variant="ghost" size="sm" onClick={clearOpOt}>
            Clear
          </Button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Button variant="secondary" size="sm" onClick={() => startOpOt("p1")}>
            {desk.p1.name.trim() || "P1"} is active
          </Button>
          <Button variant="secondary" size="sm" onClick={() => startOpOt("p2")}>
            {desk.p2.name.trim() || "P2"} is active
          </Button>
        </div>
      )}
    </div>
  );
}
