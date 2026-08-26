import { gameOf } from "@/lib/games";
import { remainingSeconds, formatClock, resourceLimit, type DeskState } from "@/lib/desk-types";
import { ResourcePips } from "@/components/overlays/pips";
import { OverlayEditProvider, Placed } from "@/components/overlays/placed";
import type { OverlayEdit } from "@/components/overlays/placed";
import { CommanderScorebug, useCommanderOverlay } from "@/components/overlays/commander";
import { isCommanderLane } from "@/lib/games";
import { cn } from "@/lib/cn";
import { InitiativeMark } from "@/components/desk/initiative";
import { RokLayoutView } from "@/components/overlays/rok-layout";
import { PtcgPlayLayout } from "@/components/overlays/ptcg-play";
import { YgoPlayLayout } from "@/components/overlays/ygo-play";

function Flag({ code }: { code: string }) {
  if (!code) return null;
  return (
    <span className="inline-flex h-6 min-w-8 items-center justify-center rounded-xs bg-ov-fg/12 px-1.5 font-mono text-[0.72rem] tracking-wider text-ov-fg/80">
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
      <div className={cn("mt-1.5 flex", align === "right" && "justify-end")}>
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
    <p className={cn("mt-1 font-mono text-[0.95rem] tabular-nums text-ov-fg", align === "right" && "text-right")}>
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
  const hasInit = desk.gameId === "swu" && desk.initiativeSide === side;
  return (
    <div className={cn("min-w-0", align === "right" ? "text-right" : "text-left")}>
      <div className="flex items-center gap-2" style={{ flexDirection: align === "right" ? "row-reverse" : "row" }}>
        <span
          className={cn(
            "font-display truncate text-[1.85rem] leading-none font-semibold tracking-tight uppercase [text-shadow:0_1px_8px_rgb(0_0_0_/_0.55)]",
            hasInit ? "text-[#f3d27a]" : "text-ov-fg",
          )}
        >
          {player.name || "TBD"}
        </span>
        <InitiativeMark live={hasInit} />
        <Flag code={player.country} />
      </div>
      <p className="mt-1 truncate text-[0.98rem] leading-tight text-ov-fg/82">
        {player.archetype || player.extra || player.tag || "—"}
      </p>
      <TeamRow desk={desk} side={side} align={align} size="md" />
    </div>
  );
}

function SplitPlate({ desk, side }: { desk: DeskState; side: "p1" | "p2" }) {
  const align = side === "p2" ? "right" : "left";
  const player = desk[side];
  const hasInit = desk.gameId === "swu" && desk.initiativeSide === side;
  return (
    <div
      className={cn(
        "w-[400px] rounded-md border px-3.5 py-2.5",
        hasInit
          ? "border-[#f0c14b]/70 bg-[#f0c14b]/12 shadow-[0_0_24px_rgb(240_193_75_/_0.28)]"
          : "border-ov-fg/12 bg-ov-bg/92",
      )}
    >
      <div
        className="flex items-center gap-2"
        style={{ flexDirection: align === "right" ? "row-reverse" : "row" }}
      >
        <span
          className={cn(
            "font-display min-w-0 truncate text-[1.7rem] leading-none font-semibold tracking-tight uppercase",
            hasInit ? "text-[#f3d27a]" : "text-ov-fg",
          )}
        >
          {player.name || "TBD"}
        </span>
        <InitiativeMark live={hasInit} />
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
  if (desk.scorebugStyle === "play" && desk.gameId === "pokemon-tcg") {
    return (
      <OverlayEditProvider desk={desk} edit={edit}>
        <PtcgPlayLayout desk={desk} now={now} />
      </OverlayEditProvider>
    );
  }
  if (desk.scorebugStyle === "play" && desk.gameId === "yugioh") {
    return (
      <OverlayEditProvider desk={desk} edit={edit}>
        <YgoPlayLayout desk={desk} now={now} />
      </OverlayEditProvider>
    );
  }
  if (desk.scorebugStyle === "rok") {
    return (
      <OverlayEditProvider desk={desk} edit={edit}>
        <RokLayoutView desk={desk} now={now} />
      </OverlayEditProvider>
    );
  }
  const clock = formatClock(remainingSeconds(desk, now));
  const center = (
    <div className="flex min-w-[220px] flex-col items-center justify-center px-4">
      <div className="font-mono text-[0.82rem] tracking-[0.16em] text-ov-fg/80 uppercase">
        {desk.roundName}
        <span className="mx-1.5 text-ov-fg/35">·</span>
        Bo{desk.bestOf}
      </div>
      <div className="font-display mt-0.5 flex items-center gap-2.5 text-[2.7rem] leading-none font-semibold tabular-nums text-ov-fg [text-shadow:0_1px_10px_rgb(0_0_0_/_0.45)]">
        <span className="min-w-10 text-center">{desk.p1.score}</span>
        <span className="text-[1.6rem] text-ov-fg/45">–</span>
        <span className="min-w-10 text-center">{desk.p2.score}</span>
      </div>
      <div className="mt-0.5 font-mono text-[1.05rem] tabular-nums tracking-wide text-ov-fg">
        {clock}
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
          <div className="flex items-stretch border-t border-ov-fg/25 bg-ov-panel/96 shadow-[0_-10px_36px_rgb(0_0_0_/_0.5)]">
            <div
              className={cn(
                "w-2",
                desk.gameId === "swu" && desk.initiativeSide === "p1" ? "bg-[#f0c14b]" : "bg-game",
              )}
            />
            <div
              className={cn(
                "flex min-w-0 flex-1 items-center px-5 py-2.5",
                desk.gameId === "swu" && desk.initiativeSide === "p1" && "bg-linear-to-r from-[#f0c14b]/22 to-transparent",
              )}
            >
              <SideMeta desk={desk} side="p1" align="left" />
            </div>
            {center}
            <div
              className={cn(
                "flex min-w-0 flex-1 items-center justify-end px-5 py-2.5",
                desk.gameId === "swu" && desk.initiativeSide === "p2" && "bg-linear-to-l from-[#f0c14b]/22 to-transparent",
              )}
            >
              <SideMeta desk={desk} side="p2" align="right" />
            </div>
            <div
              className={cn(
                "w-2",
                desk.gameId === "swu" && desk.initiativeSide === "p2" ? "bg-[#f0c14b]" : "bg-game",
              )}
            />
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
