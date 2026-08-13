import { useEffect, useState } from "react";
import { parseDesk, type DeskState } from "@/lib/desk-types";

export function useLiveDesk(pollMs = 400): DeskState | null {
  const [desk, setDesk] = useState<DeskState | null>(null);

  useEffect(() => {
    let timer = 0;
    let cancelled = false;

    const tick = async () => {
      try {
        const res = await fetch("/api/desk", { cache: "no-store" });
        if (res.ok) {
          const parsed = parseDesk(await res.json());
          if (!cancelled && parsed) setDesk(parsed);
        }
      } catch {
        /* keep last good frame */
      }
      if (!cancelled) timer = window.setTimeout(() => void tick(), pollMs);
    };

    void tick();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pollMs]);

  return desk;
}
