import { useEffect, useState } from "react";
import { commanderFaceName, gameOf, isCommanderLane } from "@/lib/games";
import {
  formatClock,
  isCommanderTable,
  remainingSeconds,
  seatsFor,
  type DeskState,
  type SeatId,
} from "@/lib/desk-types";
import { OverlayEditProvider, Placed } from "@/components/overlays/placed";
import type { OverlayEdit } from "@/components/overlays/placed";
import { FadeValue } from "@/components/overlays/fade-value";
import { fetchCommanderColors } from "@/lib/card-lookup";
import { commanderPlateGradient, mergeColorIdentity } from "@/lib/commander-colors";
import { cn } from "@/lib/cn";

const SEAT_WIDGET: Record<SeatId, "scorebugP1" | "scorebugP2" | "scorebugP3" | "scorebugP4"> = {
  p1: "scorebugP1",
  p2: "scorebugP2",
  p3: "scorebugP3",
  p4: "scorebugP4",
};

const CHIP =
  "w-[280px] rounded-md border border-ov-fg/12 bg-ov-bg/88 px-3 py-1.5 text-center shadow-[0_8px_24px_rgb(0_0_0_/_0.35)]";

export function CommanderScorebug({
  desk,
  now = Date.now(),
  edit = null,
}: {
  desk: DeskState;
  now?: number;
  edit?: OverlayEdit | null;
}) {
  const seats = seatsFor(desk.tableSize);
  return (
    <OverlayEditProvider desk={desk} edit={edit}>
      <div data-game={desk.gameId} className="pointer-events-none absolute inset-0">
        {seats.map((seat) => {
          const right = seat === "p2" || seat === "p3";
          return (
            <Placed
              key={seat}
              id={SEAT_WIDGET[seat]}
              pin={right ? "right" : "left"}
              pinInset={24}
              axis="y"
            >
              <SeatPlate desk={desk} seat={seat} />
            </Placed>
          );
        })}
        <Placed id="scorebugCenter">
          <div className={CHIP}>
            <div className="font-mono text-[0.65rem] tracking-[0.18em] text-game uppercase">
              {desk.formatName} · {desk.tableSize} pod
            </div>
            <div className="font-display text-sm font-semibold tracking-wide text-ov-fg uppercase">
              {desk.roundName}
            </div>
          </div>
        </Placed>
        <Placed id="timer">
          <CommanderClock desk={desk} now={now} />
        </Placed>
      </div>
    </OverlayEditProvider>
  );
}

export function CommanderClock({ desk, now }: { desk: DeskState; now: number }) {
  const left = remainingSeconds(desk, now);
  return (
    <div className={CHIP}>
      <div className="font-mono text-[0.65rem] tracking-[0.18em] text-game uppercase">Round clock</div>
      <div
        className={cn(
          "font-display text-sm font-semibold tracking-wide tabular-nums uppercase",
          left === 0 ? "text-live" : "text-ov-fg",
        )}
      >
        {formatClock(left)}
      </div>
    </div>
  );
}

function usePlateColors(commander: string, partner: string): string[] {
  const [colors, setColors] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    const names = [commander, partner].map((n) => n.trim()).filter(Boolean);
    if (!names.length) {
      setColors([]);
      return;
    }
    void Promise.all(names.map((n) => fetchCommanderColors(n))).then((rows) => {
      if (cancelled) return;
      setColors(mergeColorIdentity(...rows));
    });
    return () => {
      cancelled = true;
    };
  }, [commander, partner]);
  return colors;
}

function SeatPlate({ desk, seat }: { desk: DeskState; seat: SeatId }) {
  const player = desk[seat];
  const right = seat === "p2" || seat === "p3";
  const out = player.resource <= 0;
  const lethal = player.cmdDamage >= 21 || player.secondary >= 10;
  const commander = commanderFaceName(player.archetype);
  const partner = commanderFaceName(player.extra);
  const showPartner = Boolean(partner && partner.toLowerCase() !== commander.toLowerCase());
  const colors = usePlateColors(commander, partner);
  const tinted = colors.length > 0;

  return (
    <div
      className={cn(
        "w-[380px] overflow-hidden rounded-md border px-3.5 py-2.5 shadow-[0_10px_28px_rgb(0_0_0_/_0.4)]",
        tinted ? "border-ov-fg/20" : "border-ov-fg/10 bg-ov-bg/88",
        right && "text-right",
        (out || lethal) && "opacity-70",
      )}
      style={tinted ? { backgroundImage: commanderPlateGradient(colors, right) } : undefined}
    >
      <div className={cn("flex items-start gap-3", right && "flex-row-reverse")}>
        <div className="min-w-0 flex-1">
          <p className="font-display truncate text-2xl leading-none font-semibold tracking-tight text-ov-fg uppercase [text-shadow:0_1px_8px_rgb(0_0_0_/_0.65)]">
            {player.name || "TBD"}
          </p>
          <p className="mt-1 truncate text-[0.92rem] leading-tight text-ov-fg/90 [text-shadow:0_1px_6px_rgb(0_0_0_/_0.55)]">
            {commander || "Commander"}
            {out ? " · Out" : lethal ? " · Lethal" : ""}
          </p>
          {showPartner ? (
            <p className="mt-0.5 truncate text-[0.82rem] leading-tight text-ov-fg/80 [text-shadow:0_1px_6px_rgb(0_0_0_/_0.55)]">
              {partner}
            </p>
          ) : null}
        </div>
        <p className="font-display text-4xl leading-none font-semibold tabular-nums text-ov-fg [text-shadow:0_1px_8px_rgb(0_0_0_/_0.65)]">
          <FadeValue value={player.resource} />
        </p>
      </div>
      <p
        className={cn(
          "mt-1.5 font-mono text-[0.68rem] tracking-[0.14em] text-ov-fg/80 uppercase [text-shadow:0_1px_6px_rgb(0_0_0_/_0.55)]",
        )}
      >
        <span className={player.secondary > 0 ? "text-ov-fg" : ""}>
          Poi <FadeValue value={player.secondary} />
        </span>
        <span className="text-ov-fg/35"> · </span>
        <span className={player.cmdDamage > 0 ? "text-ov-fg" : ""}>
          Cmd <FadeValue value={player.cmdDamage} />
        </span>
      </p>
    </div>
  );
}

export function CommanderVersus({ desk }: { desk: DeskState }) {
  const seats = seatsFor(desk.tableSize);
  const game = gameOf(desk.gameId);
  return (
    <div data-game={desk.gameId} className="relative h-full w-full overflow-hidden bg-ov-bg">
      <img
        src="/slates/playmat.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-35"
      />
      <div className="absolute inset-0 bg-linear-to-b from-ov-bg via-ov-bg/80 to-ov-bg" />
      <div className="relative flex h-full flex-col justify-between px-16 py-12">
        <header className="flex items-end justify-between gap-8">
          <div className="flex min-w-0 items-end gap-5">
            {desk.eventLogo ? (
              <img src={desk.eventLogo} alt="" className="max-h-28 max-w-56 object-contain" />
            ) : null}
            <div className="min-w-0">
              <p className="font-mono text-ov-kicker tracking-[0.28em] text-game uppercase">
                {desk.sponsorLine}
              </p>
              <h1 className="font-display mt-1 text-5xl font-semibold tracking-tight text-ov-fg uppercase">
                {desk.eventName}
              </h1>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-ov-kicker tracking-[0.22em] text-ov-muted uppercase">
              {game.name}
            </p>
            <p className="font-display text-2xl font-semibold text-ov-fg uppercase">
              {desk.formatName} · {desk.tableSize}-player
            </p>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-x-16 gap-y-10">
          {(desk.tableSize === 4 ? (["p1", "p2", "p4", "p3"] as SeatId[]) : seats).map((seat) => {
            const player = desk[seat];
            const right = seat === "p2" || seat === "p3";
            const commander = commanderFaceName(player.archetype);
            const partner = commanderFaceName(player.extra);
            const showPartner = Boolean(partner && partner.toLowerCase() !== commander.toLowerCase());
            return (
              <div key={seat} className={right ? "text-right" : ""}>
                <p className="font-mono text-ov-kicker tracking-[0.22em] text-game uppercase">
                  Seat {seat.slice(1)} {player.country ? `· ${player.country}` : ""}
                </p>
                <h2 className="font-display text-5xl leading-none font-semibold tracking-tight text-ov-fg uppercase">
                  {player.name || "TBD"}
                </h2>
                <p className="mt-2 text-xl text-ov-muted">{commander || "Commander"}</p>
                {showPartner ? <p className="text-lg text-ov-muted">{partner}</p> : null}
              </div>
            );
          })}
        </div>

        <footer className="flex items-center justify-between text-ov-muted">
          <p className="font-mono text-ov-kicker tracking-[0.2em] uppercase">{desk.roundName}</p>
          <p className="font-mono text-ov-kicker tracking-[0.2em] uppercase">
            Starting life {desk.p1.resource || 40}
          </p>
        </footer>
      </div>
    </div>
  );
}

export function useCommanderOverlay(desk: DeskState) {
  return isCommanderTable(desk) || (isCommanderLane(desk) && desk.tableSize > 2);
}