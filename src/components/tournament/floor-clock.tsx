import { ClockPad } from "@/components/desk/clock-pad";
import { remainingSeconds } from "@/lib/desk-types";
import { useTournamentStore } from "@/lib/tournament-store";
import { useClockNow } from "@/lib/use-clock-now";

export function FloorClock({ compact = false }: { compact?: boolean }) {
  const t = useTournamentStore((s) => s.tournament);
  const toggleFloorTimer = useTournamentStore((s) => s.toggleFloorTimer);
  const setFloorClock = useTournamentStore((s) => s.setFloorClock);
  const addFloorSeconds = useTournamentStore((s) => s.addFloorSeconds);
  const resetFloorTimer = useTournamentStore((s) => s.resetFloorTimer);
  const now = useClockNow({ live: t.timerRunning, pauseWhenHidden: true });

  return (
    <ClockPad
      label="Floor clock"
      note="all other tables"
      remaining={remainingSeconds(t, now)}
      preset={t.timerPresetSeconds}
      running={t.timerRunning}
      compact={compact}
      onSet={setFloorClock}
      onToggle={toggleFloorTimer}
      onAdd={addFloorSeconds}
      onReset={resetFloorTimer}
    />
  );
}
