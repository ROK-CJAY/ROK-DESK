import { useEffect, useState } from "react";
import { ClockPad } from "@/components/desk/clock-pad";
import { useDeskStore } from "@/lib/desk-store";
import { remainingSeconds } from "@/lib/desk-types";

export function RoundClock({ compact = false }: { compact?: boolean }) {
  const desk = useDeskStore((s) => s.desk);
  const toggleTimer = useDeskStore((s) => s.toggleTimer);
  const setTimerClock = useDeskStore((s) => s.setTimerClock);
  const addTimerSeconds = useDeskStore((s) => s.addTimerSeconds);
  const resetTimer = useDeskStore((s) => s.resetTimer);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  return (
    <ClockPad
      label="Stream clock"
      note="featured match"
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
