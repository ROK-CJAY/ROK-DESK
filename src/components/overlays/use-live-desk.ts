import { useEffect, useState } from "react";
import { parseDesk, type DeskState, type MatchSlot } from "@/lib/desk-types";
import { slugOf, type GameId } from "@/lib/games";

export function useLiveDesk(gameId?: GameId, pollMs = 400, slot: MatchSlot = 1): DeskState | null {
  const [desk, setDesk] = useState<DeskState | null>(null);

  useEffect(() => {
    let timer = 0;
    let cancelled = false;
    const path = gameId
      ? `/api/desk?game=${encodeURIComponent(slugOf(gameId))}&slot=${slot}`
      : "/api/desk";

    const tick = async () => {
      try {
        const res = await fetch(path, { cache: "no-store" });
        if (res.ok) {
          const parsed = parseDesk(await res.json());
          if (!cancelled && parsed) {
            setDesk((prev) => (prev && prev.version === parsed.version ? prev : parsed));
          }
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
  }, [gameId, pollMs, slot]);

  return desk;
}
