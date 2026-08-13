import { useEffect, useState } from "react";
import { parseTournament, type TournamentState } from "@/lib/tournament-types";

export function useLiveTournament(pollMs = 400): TournamentState | null {
  const [tournament, setTournament] = useState<TournamentState | null>(null);

  useEffect(() => {
    let timer = 0;
    let cancelled = false;

    const tick = async () => {
      try {
        const res = await fetch("/api/tournament", { cache: "no-store" });
        if (res.ok) {
          const parsed = parseTournament(await res.json());
          if (!cancelled && parsed) setTournament(parsed);
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

  return tournament;
}
