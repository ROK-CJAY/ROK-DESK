import { liveMatchForSlot, resolveCasterEntrant } from "@/lib/caster-path";
import { seatsFor, type DeskState } from "@/lib/desk-types";
import type { TournamentState } from "@/lib/tournament-types";

export function withDeskJudgeNotes(t: TournamentState, desk?: DeskState | null): TournamentState {
  if (!desk || desk.gameId !== t.gameId) return t;
  const live = liveMatchForSlot(t, desk.matchSlot ?? 1);
  let changed = false;
  const entrants = t.entrants.map((row) => ({ ...row }));
  for (const seat of seatsFor(desk.tableSize)) {
    const player = desk[seat];
    const note = player.judgeNote?.trim() ?? "";
    if (!note) continue;
    const hit = resolveCasterEntrant(t, player, seat, live);
    if (!hit) continue;
    const idx = entrants.findIndex((row) => row.id === hit.id);
    if (idx < 0 || entrants[idx]!.judgeNote === note) continue;
    entrants[idx] = { ...entrants[idx]!, judgeNote: note };
    changed = true;
  }
  return changed ? { ...t, entrants } : t;
}
