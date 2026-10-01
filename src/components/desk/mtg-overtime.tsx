import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDeskStore } from "@/lib/desk-store";
import { MTG_OT_LAST_TURN, MTG_TEAM_OT_LAST_TURN } from "@/lib/desk-types";
import { isCommanderLane } from "@/lib/games";
import { cn } from "@/lib/cn";

export function MtgOvertime({ compact = false }: { compact?: boolean }) {
  const desk = useDeskStore((s) => s.desk);
  const startOpOt = useDeskStore((s) => s.startOpOt);
  const nextOpTurn = useDeskStore((s) => s.nextOpTurn);
  const clearOpOt = useDeskStore((s) => s.clearOpOt);
  const [team, setTeam] = useState(false);
  if (desk.gameId !== "mtg" || isCommanderLane(desk)) return null;

  const started = desk.otTurn != null;
  const extra = desk.otCap === MTG_TEAM_OT_LAST_TURN ? MTG_TEAM_OT_LAST_TURN : MTG_OT_LAST_TURN;
  const done = started && desk.otTurn != null && desk.otTurn > extra;
  const sideName = desk.otSide === "p2" ? desk.p2.name.trim() || "Player 2" : desk.p1.name.trim() || "Player 1";
  const onLast = desk.otTurn === extra;
  const gamesTied = desk.p1.score === desk.p2.score;
  const lifeLead =
    desk.p1.resource === desk.p2.resource
      ? "Life is tied"
      : desk.p1.resource > desk.p2.resource
        ? `${desk.p1.name.trim() || "P1"} has more life`
        : `${desk.p2.name.trim() || "P2"} has more life`;

  return (
    <div className={cn("rounded-lg bg-surface-2 px-3 py-2", compact && "w-full")}>
      <div className="flex items-end justify-between gap-2">
        <p className="text-xs text-muted">End of match</p>
        <p className="text-right text-[0.65rem] text-subtle">
          {done
            ? "Turns done · unfinished game is a draw"
            : started
              ? desk.otTurn === 0
                ? `Turn 0 · ${sideName} finishes`
                : `Additional ${desk.otTurn} of ${extra} · ${sideName}`
              : team
                ? "Turn 0, then 3 more"
                : "Turn 0, then 5 more"}
        </p>
      </div>
      {started ? (
        <>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button variant="outline" size="sm" onClick={nextOpTurn} disabled={done}>
              {onLast ? "End turns" : "Next turn"}
            </Button>
            <Button variant="ghost" size="sm" onClick={clearOpOt}>
              Clear
            </Button>
          </div>
          {done ? (
            <p className="mt-2 text-[0.65rem] leading-relaxed text-subtle">
              {gamesTied ? `${lifeLead} (${desk.p1.resource}–${desk.p2.resource}). Single elim uses that if game wins are tied.` : "Game wins are not tied."} Extra turns from cards count against these. Do not start another game.
            </p>
          ) : (
            <p className="mt-2 text-[0.65rem] leading-relaxed text-subtle">
              Extra turns from cards count against the {extra}. This covers the game in progress only.
            </p>
          )}
        </>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button
              variant={team ? "outline" : "secondary"}
              size="sm"
              onClick={() => setTeam(false)}
            >
              5 turns
            </Button>
            <Button
              variant={team ? "secondary" : "outline"}
              size="sm"
              onClick={() => setTeam(true)}
            >
              Team · 3
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button variant="secondary" size="sm" onClick={() => startOpOt("p1", team ? MTG_TEAM_OT_LAST_TURN : MTG_OT_LAST_TURN)}>
              {desk.p1.name.trim() || "P1"} is on turn
            </Button>
            <Button variant="secondary" size="sm" onClick={() => startOpOt("p2", team ? MTG_TEAM_OT_LAST_TURN : MTG_OT_LAST_TURN)}>
              {desk.p2.name.trim() || "P2"} is on turn
            </Button>
          </div>
          <p className="mt-2 text-[0.65rem] leading-relaxed text-subtle">
            Start after any time extension. Turn 0 is the player whose turn it is. They finish, then {team ? "3" : "5"} more turns are shared. An unfinished game is a draw.
          </p>
        </>
      )}
    </div>
  );
}
