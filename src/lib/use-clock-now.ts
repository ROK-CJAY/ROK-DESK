import { useEffect, useState } from "react";

/** Tick `now` only as fast as the clock needs. Overlay pages keep running in OBS. */
export function useClockNow({
  live = false,
  pauseWhenHidden = false,
  idleMs = 1000,
  liveMs = 250,
}: {
  live?: boolean;
  pauseWhenHidden?: boolean;
  idleMs?: number;
  liveMs?: number;
} = {}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let id = 0;
    const stop = () => {
      if (id) {
        window.clearInterval(id);
        id = 0;
      }
    };
    const start = () => {
      stop();
      if (pauseWhenHidden && document.hidden) return;
      id = window.setInterval(() => setNow(Date.now()), live ? liveMs : idleMs);
    };
    start();
    const onVis = () => {
      if (pauseWhenHidden && document.hidden) stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [idleMs, live, liveMs, pauseWhenHidden]);

  return now;
}
