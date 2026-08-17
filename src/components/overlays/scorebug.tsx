import { gameOf } from "@/lib/games";
import { remainingSeconds, formatClock, resourceLimit, type DeskState } from "@/lib/desk-types";
import { ResourcePips } from "@/components/overlays/pips";
import { OverlayEditProvider, Placed } from "@/components/overlays/placed";
import type { OverlayEdit } from "@/components/overlays/placed";
import { CommanderScorebug, useCommanderOverlay } from "@/components/overlays/commander";
import { isCommanderLane } from "@/lib/games";
import { cn } from "@/lib/cn";

function Flag({ code }: { code: string }) {
  if (!code) return null;
  return (
    <span className="inline-flex h-5 min-w-7 items-center justify-center rounded-xs bg-ov-fg/10 px-1 font-mono text-[0.62rem] tracking-wider text-ov-muted">
      {code}
    </span>
  );
}

function TeamRow({
  desk,
  side,
  align,
  size = "sm",
}: {
  desk: DeskState;
  side: "p1" | "p2";
  align: "left" | "right";
  size?: "sm" | "md";
}) {
  const game = gameOf(desk.gameId);
  if (!desk.showResources) return null;
  const player = desk[side];
  const max = resourceLimit(desk);
  if (game.resource.pips) {
    return (
      <div className={cn("mt-1 flex", align === "right" && "justify-end")}>
        <ResourcePips
          value={player.resource}
          max={max}
          invert={game.resource.invertWin}
          pipStyle={game.resource.pipStyle}
          team={player.team}
          down={player.down}
          size={size}
        />
      </div>
    );
  }
  return (
    <p className={cn("mt-0.5 font-mono text-[0.7rem] tabular-nums text-ov-fg", align === "right" && "text-right")}>
      {game.resource.shortLabel} {player.resource}
      {game.secondary ? ` · ${game.secondary.label} ${player.secondary}` : ""}
      {isCommanderLane(desk) ? ` · CMD ${player.cmdDamage}` : ""}
    </p>
  );
}

function SideMeta({
  desk,
  side,
  align,
}: {
  desk: DeskState;
  side: "p1" | "p2";
  align: "left" | "right";
}) {
  const player = desk[side];
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <div className="flex items-baseline gap-1.5" style={{ flexDirection: align === "right" ? "row-reverse" : "row" }}>
        <span className="font-display text-xl leading-none font-semibold tracking-tight text-ov-fg uppercase">
          {player.name || "TBD"}
        </span>
        <Flag code={player.country} />
      </div>
      <p className="mt-0.5 truncate text-[0.72rem] text-ov-muted">
        {player.archetype || player.extra || player.tag || "—"}
      </p>
      <TeamRow desk={desk} side={side} align={align} size="sm" />
    </div>
  );
}

function SplitPlate({ desk, side }: { desk: DeskState; side: "p1" | "p2" }) {
  const align = side === "p2" ? "right" : "left";
  const player = desk[side];
  return (
    <div className="w-[400px] rounded-md border border-ov-fg/12 bg-ov-bg/92 px-3.5 py-2.5">
      <div
        className="flex items-center gap-2"
        style={{ flexDirection: align === "right" ? "row-reverse" : "row" }}
      >
        <span className="font-display min-w-0 truncate text-[1.7rem] leading-none font-semibold tracking-tight text-ov-fg uppercase">
          {player.name || "TBD"}
        </span>
        <Flag code={player.country} />
        <span className="font-display ml-auto text-3xl leading-none font-semibold tabular-nums text-ov-fg">
          {player.score}
        </span>
      </div>
      <TeamRow desk={desk} side={side} align={align} size="md" />
      <p className={cn("mt-1 truncate text-[0.8rem] leading-tight text-ov-muted", align === "right" && "text-right")}>
        {player.archetype || player.extra || player.tag || ""}
      </p>
    </div>
  );
}

export function ScorebugView({
  desk,
  now = Date.now(),
  edit = null,
}: {
  desk: DeskState;
  now?: number;
  edit?: OverlayEdit | null;
}) {
  const game = gameOf(desk.gameId);
  if (useCommanderOverlay(desk)) {
    return <CommanderScorebug desk={desk} edit={edit} />;
  }
  const clock = formatClock(remainingSeconds(desk, now));
  const center = (
    <div className="flex flex-col items-center justify-center px-3">
      <div className="font-display flex items-center gap-2 text-3xl leading-none font-semibold tabular-nums">
        <span className="min-w-8 text-center">{desk.p1.score}</span>
        <span className="text-ov-muted text-xl">–</span>
        <span className="min-w-8 text-center">{desk.p2.score}</span>
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[0.65rem] tracking-[0.16em] text-ov-muted uppercase">
        <span>{desk.roundName}</span>
        <span className="text-ov-fg/25">·</span>
        <span>Bo{desk.bestOf}</span>
        <span className="text-ov-fg/25">·</span>
        <span className="tabular-nums">{clock}</span>
      </div>
    </div>
  );

  const body =
    desk.scorebugStyle === "split" ? (
      <div data-game={desk.gameId} className="pointer-events-none absolute inset-0">
        <Placed id="scorebugP1">
          <SplitPlate desk={desk} side="p1" />
        </Placed>
        <Placed id="scorebugP2">
          <SplitPlate desk={desk} side="p2" />
        </Placed>
        <Placed id="scorebugCenter">
          <div className="w-[280px] rounded-md border border-ov-fg/12 bg-ov-bg/92 px-4 py-2.5 text-center">
            <div className="font-mono text-[0.78rem] tracking-[0.18em] text-game uppercase">{game.short}</div>
            <div className="font-display text-lg font-semibold tracking-wide text-ov-fg uppercase">
              {desk.roundName}
            </div>
            <div className="font-mono text-[0.78rem] text-ov-muted uppercase">
              {desk.eventName} · Bo{desk.bestOf} · {clock}
            </div>
          </div>
        </Placed>
      </div>
    ) : (
      <div data-game={desk.gameId} className="pointer-events-none absolute inset-0">
        <Placed id="scorebugBar" fullWidth axis="y">
          <div className="flex items-stretch border-t border-ov-fg/20 bg-ov-panel shadow-[0_-8px_32px_rgb(0_0_0_/_0.45)]">
            <div className="w-1.5 bg-game" />
            <div className="flex min-w-0 flex-1 items-center px-4 py-2">
              <SideMeta desk={desk} side="p1" align="left" />
            </div>
            {center}
            <div className="flex min-w-0 flex-1 items-center justify-end px-4 py-2">
              <SideMeta desk={desk} side="p2" align="right" />
            </div>
            <div className="w-1.5 bg-game" />
          </div>
        </Placed>
      </div>
    );

  return (
    <OverlayEditProvider desk={desk} edit={edit}>
      {body}
    </OverlayEditProvider>
  );
}
