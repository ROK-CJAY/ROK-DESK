import { useDeskStore } from "@/lib/desk-store";
import { useTournamentStore } from "@/lib/tournament-store";
import type { SeatId } from "@/lib/desk-types";

export function reportMatchToBracket(side: SeatId) {
  const desk = useDeskStore.getState().desk;
  const tourney = useTournamentStore.getState();
  const t = tourney.tournament;
  const matchId = desk.streamMatchId ?? t.streamMatchId;
  if (!matchId) return false;
  const match = t.matches.find((row) => row.id === matchId);
  if (!match) return false;
  const entrantId = match[side]?.entrantId;
  if (!entrantId) return false;
  tourney.report(matchId, entrantId);
  return true;
}
