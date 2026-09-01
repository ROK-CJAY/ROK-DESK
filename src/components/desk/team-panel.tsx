import { useState } from "react";
import { TeamSixEditor } from "@/components/desk/team-editor";
import { useDeskStore } from "@/lib/desk-store";
import type { SeatId } from "@/lib/desk-types";
import { cn } from "@/lib/cn";
import { emptyTeam, teamHasMons } from "@/lib/pokemon-vgc";
import { isVgcTitle } from "@/lib/games";

export function TeamPanel() {
  const desk = useDeskStore((s) => s.desk);
  const setPlayer = useDeskStore((s) => s.setPlayer);
  const [seat, setSeat] = useState<SeatId>("p1");
  if (!isVgcTitle(desk.gameId)) return null;
  const player = desk[seat];

  return (
    <section className="@container rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">VGC teams</p>
          <p className="mt-1 text-sm text-muted">Sixes for the team-preview overlay.</p>
        </div>
        <div className="grid w-full grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1 sm:max-w-md">
          <SeatTab
            active={seat === "p1"}
            onClick={() => setSeat("p1")}
            kicker="Player 1 · right"
            name={desk.p1.name || "Open"}
            ready={teamHasMons(desk.p1.team)}
          />
          <SeatTab
            active={seat === "p2"}
            onClick={() => setSeat("p2")}
            kicker="Player 2 · left"
            name={desk.p2.name || "Open"}
            ready={teamHasMons(desk.p2.team)}
          />
        </div>
      </div>
      <div className="mt-4">
        <TeamSixEditor
          listId={`prod-${seat}`}
          team={player.team?.length ? player.team : emptyTeam()}
          onChange={(team) => setPlayer(seat, { team })}
        />
      </div>
    </section>
  );
}

function SeatTab({
  active,
  onClick,
  kicker,
  name,
  ready,
}: {
  active: boolean;
  onClick: () => void;
  kicker: string;
  name: string;
  ready: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active ? "1" : "0"}
      className={cn(
        "rounded-md px-3 py-2 text-left transition-colors duration-150",
        active ? "bg-surface text-fg" : "text-muted hover:text-fg",
      )}
    >
      <span className="block font-mono text-[0.6rem] tracking-[0.16em] uppercase">{kicker}</span>
      <span className="mt-0.5 flex items-center gap-2 text-sm font-medium">
        <span className="truncate">{name}</span>
        {ready ? <span className="size-1.5 shrink-0 rounded-full bg-ok" /> : null}
      </span>
    </button>
  );
}
