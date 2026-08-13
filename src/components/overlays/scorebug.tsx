import { gameOf } from "@/lib/games";
import { remainingSeconds, formatClock, type DeskState } from "@/lib/desk-types";
import { ResourcePips } from "@/components/overlays/pips";
import { OverlayEditProvider, Placed } from "@/components/overlays/placed";
import type { OverlayEdit } from "@/components/overlays/placed";
import { CommanderScorebug, useCommanderOverlay } from "@/components/overlays/commander";
import { isCommanderLane } from "@/lib/games";

function Flag({ code }: { code: string }) {
  if (!code) return null;
  return (
    <span className="inline-flex h-5 min-w-7 items-center justify-center rounded-xs bg-ov-fg/10 px-1 font-mono text-[0.65rem] tracking-wider text-ov-muted">
      {code}
    </span>
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
  const game = gameOf(desk.gameId);
  const player = desk[side];
  const format = game.formats.find((f) => f.label === desk.formatName);
  const max = format?.resourceMax ?? game.resource.max;

  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <div className="flex items-baseline gap-2" style={{ flexDirection: align === "right" ? "row-reverse" : "row" }}>
        <span className="font-display text-ov-name leading-none font-semibold tracking-tight text-ov-fg uppercase">
          {player.name || "TBD"}
        </span>
        <Flag code={player.country} />
      </div>
      <div
        className="mt-1 flex items-center gap-2 text-ov-meta text-ov-muted"
        style={{ flexDirection: align === "right" ? "row-reverse" : "row" }}
      >
        <span className="truncate">
          {player.archetype || player.extra || player.tag || "—"}
        </span>
        {desk.showResources && game.resource.pips ? (
          <ResourcePips
            value={player.resource}
            max={max}
            invert={game.resource.invertWin}
            pipStyle={game.resource.pipStyle}
          />
        ) : null}
        {desk.showResources && !game.resource.pips ? (
          <span className="font-mono tabular-nums text-ov-fg">
            {game.resource.shortLabel} {player.resource}
            {game.secondary ? ` · ${game.secondary.label} ${player.secondary}` : ""}
            {isCommanderLane(desk) ? ` · CMD ${player.cmdDamage}` : ""}
          </span>
        ) : null}
      </div>
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
    <div className="flex flex-col items-center justify-center px-5">
      <div className="font-display flex items-center gap-3 text-ov-score leading-none font-semibold tabular-nums">
        <span className="min-w-12 text-center">{desk.p1.score}</span>
        <span className="text-ov-muted text-3xl">–</span>
        <span className="min-w-12 text-center">{desk.p2.score}</span>
      </div>
      <div className="mt-0.5 flex items-center gap-2 font-mono text-ov-kicker tracking-[0.18em] text-ov-muted uppercase">
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
          <div className="w-[520px] rounded-lg border border-ov-fg/10 bg-ov-bg/90 px-5 py-3">
            <div className="mb-1 h-0.5 w-16 bg-game" />
            <SideMeta desk={desk} side="p1" align="left" />
            <div className="font-display mt-2 text-4xl font-semibold tabular-nums text-ov-fg">
              {desk.p1.score}
            </div>
          </div>
        </Placed>
        <Placed id="scorebugP2">
          <div className="w-[520px] rounded-lg border border-ov-fg/10 bg-ov-bg/90 px-5 py-3">
            <div className="mb-1 ml-auto h-0.5 w-16 bg-game" />
            <SideMeta desk={desk} side="p2" align="right" />
            <div className="font-display mt-2 text-right text-4xl font-semibold tabular-nums text-ov-fg">
              {desk.p2.score}
            </div>
          </div>
        </Placed>
        <Placed id="scorebugCenter">
          <div className="w-[360px] rounded-md border border-ov-fg/10 bg-ov-bg/90 px-4 py-2 text-center">
            <div className="font-mono text-ov-kicker tracking-[0.2em] text-game uppercase">
              {game.short}
            </div>
            <div className="font-display text-lg font-semibold tracking-wide text-ov-fg uppercase">
              {desk.roundName}
            </div>
            <div className="font-mono text-ov-kicker text-ov-muted uppercase">
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
            <div className="flex min-w-0 flex-1 items-center px-6 py-3">
              <SideMeta desk={desk} side="p1" align="left" />
            </div>
            {center}
            <div className="flex min-w-0 flex-1 items-center justify-end px-6 py-3">
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
