import { ClockPad } from "@/components/desk/clock-pad";
import { useDeskStore } from "@/lib/desk-store";
import { MATCH_SLOT_CLOCK, MATCH_SLOT_SHORT, remainingSeconds, type MatchSlot } from "@/lib/desk-types";
import { useClockNow } from "@/lib/use-clock-now";

export function RoundClock({ compact = false }: { compact?: boolean }) {
  const desk = useDeskStore((s) => s.desk);
  const toggleTimer = useDeskStore((s) => s.toggleTimer);
  const setTimerClock = useDeskStore((s) => s.setTimerClock);
  const addTimerSeconds = useDeskStore((s) => s.addTimerSeconds);
  const resetTimer = useDeskStore((s) => s.resetTimer);
  const now = useClockNow({ live: desk.timerRunning, pauseWhenHidden: true });
  const slot = (desk.matchSlot ?? 1) as MatchSlot;

  return (
    <ClockPad
      key={slot}
      label={MATCH_SLOT_CLOCK[slot]}
      note={slot === 1 ? "featured match" : `${MATCH_SLOT_SHORT[slot]} table`}
      remaining={remainingSeconds(desk, now)}
      preset={desk.timerPresetSeconds}
      running={desk.timerRunning}
      compact={compact}
      onSet={setTimerClock}
      onToggle={toggleTimer}
      onAdd={addTimerSeconds}
      onReset={resetTimer}
    />
  );
}