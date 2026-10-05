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
import { fetchCommanderArt, fetchCommanderColors } from "@/lib/card-lookup";
import { mergeColorIdentity, type ManaColor } from "@/lib/commander-colors";
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

function useCommanderArt(name: string): string {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let cancel = false;
    const query = name.trim();
    if (!query) {
      setSrc("");
      return;
    }
    void fetchCommanderArt(query).then((url) => {
      if (!cancel) setSrc(url);
    });
    return () => {
      cancel = true;
    };
  }, [name]);
  return src;
}

function useColorIdentity(commander: string, partner: string): Array<ManaColor | "C"> | null {
  const [colors, setColors] = useState<Array<ManaColor | "C"> | null>(null);
  useEffect(() => {
    let cancel = false;
    const names = [commander, partner].map((name) => name.trim()).filter(Boolean);
    if (!names.length) {
      setColors(null);
      return;
    }
    void Promise.all(names.map((name) => fetchCommanderColors(name))).then((rows) => {
      if (cancel) return;
      const merged = mergeColorIdentity(...rows);
      setColors(merged.length ? merged : ["C"]);
    });
    return () => {
      cancel = true;
    };
  }, [commander, partner]);
  return colors;
}

function ManaPips({ colors }: { colors: Array<ManaColor | "C"> }) {
  return (
    <div className="grid grid-flow-col grid-rows-2 gap-0.5">
      {colors.map((color) => (
        <ManaPip key={color} color={color} />
      ))}
    </div>
  );
}

function ManaPip({ color }: { color: ManaColor | "C" }) {
  const fill = color === "W" ? "#f4edd4" : color === "U" ? "#0e68ab" : color === "B" ? "#16141c" : color === "R" ? "#d3202a" : color === "G" ? "#00733e" : "#9a9388";
  const ink = color === "W" ? "#c4a24a" : color === "B" ? "#ddd8cf" : "#f7f4ee";
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-[1.125rem] shrink-0 drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.65)]">
      <circle cx="8" cy="8" r="7.2" fill={fill} stroke={color === "W" ? "#c4a24a" : "rgb(255 255 255 / 0.35)"} strokeWidth="0.8" />
      {color === "W" ? (
        <path fill={ink} d="M8 2.2 9.1 6.2h4.1L10 8.6l1.1 4L8 10.2 4.9 12.6 6 8.6 2.8 6.2h4.1z" />
      ) : null}
      {color === "U" ? <path fill={ink} d="M8 2.4c2.2 2.6 3.3 4.4 3.3 6.1A3.3 3.3 0 0 1 8 11.8 3.3 3.3 0 0 1 4.7 8.5C4.7 6.8 5.8 5 8 2.4Z" /> : null}
      {color === "B" ? (
        <path fill={ink} d="M8 3.1a2.1 2.1 0 0 0-2.1 2.2c0 .8.4 1.3.4 1.8 0 .3-.3.5-.6.7-.7.4-1.2 1.1-1.2 2a2.4 2.4 0 0 0 2.5 2.4h2c1.4 0 2.5-1 2.5-2.4 0-.9-.5-1.6-1.2-2-.3-.2-.6-.4-.6-.7 0-.5.4-1 .4-1.8A2.1 2.1 0 0 0 8 3.1Zm-1.15 2.3a.55.55 0 1 1 0 1.1.55.55 0 0 1 0-1.1Zm2.3 0a.55.55 0 1 1 0 1.1.55.55 0 0 1 0-1.1ZM8 8.2c.7 0 1.15.45.7 1.15-.35.5-.7.55-.7.55s-.35-.05-.7-.55c-.45-.7 0-1.15.7-1.15Z" />
      ) : null}
      {color === "R" ? <path fill={ink} d="M8.2 2.2c.4 1.8-.2 2.7-.8 3.6-.5.7-.5 1.3-.1 1.9.5.8 1.6.7 2 .1.3 1.5-.2 2.6-1.3 3.5-1.7 1.3-4.2.4-4.4-1.7-.1-1.5.8-2.4 1.1-3.6.2-.8-.1-1.5-.6-2.3 1.2.2 2.1-.2 4.1-1.5Z" /> : null}
      {color === "G" ? <path fill={ink} d="M8 2.3 11.4 8H9.3v1.2h1.4L8 13.2 5.3 9.2h1.4V8H4.6L8 2.3Z" /> : null}
      {color === "C" ? <path fill={ink} d="M8 3.2 12.2 8 8 12.8 3.8 8 8 3.2Z" /> : null}
    </svg>
  );
}

function SeatPlate({ desk, seat }: { desk: DeskState; seat: SeatId }) {
  const player = desk[seat];
  const right = seat === "p2" || seat === "p3";
  const out = player.resource <= 0;
  const lethal = player.cmdDamage >= 21 || player.secondary >= 10;
  const commander = commanderFaceName(player.archetype);
  const partner = commanderFaceName(player.extra);
  const showPartner = Boolean(partner && partner.toLowerCase() !== commander.toLowerCase());
  const art = useCommanderArt(commander);
  const partnerArt = useCommanderArt(showPartner ? partner : "");
  const colors = useColorIdentity(commander, showPartner ? partner : "");
  const split = Boolean(art && partnerArt);

  return (
    <div
      className={cn(
        "relative w-[380px] overflow-hidden rounded-md border border-ov-fg/10 bg-ov-bg/88 px-3.5 py-1.5 shadow-[0_10px_28px_rgb(0_0_0_/_0.4)]",
        right && "text-right",
        (out || lethal) && "opacity-70",
      )}
    >
      {art || partnerArt ? (
        <>
          <div className={cn("pointer-events-none absolute inset-0 flex", right && split && "flex-row-reverse")}>
            {split ? (
              <>
                <img src={art} alt="" referrerPolicy="no-referrer" className="h-full w-1/2 object-cover" />
                <img src={partnerArt} alt="" referrerPolicy="no-referrer" className="h-full w-1/2 object-cover" />
              </>
            ) : (
              <img src={art || partnerArt} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
            )}
          </div>
          <div
            className={cn(
              "pointer-events-none absolute inset-0",
              right
                ? "bg-linear-to-l from-black/82 via-black/72 to-black/58"
                : "bg-linear-to-r from-black/82 via-black/72 to-black/58",
            )}
          />
        </>
      ) : null}
      <div className={cn("relative z-10 flex items-start gap-3", right && "flex-row-reverse")}>
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
        <div className="flex shrink-0 flex-col items-center gap-0.5">
          <p className="font-display text-4xl leading-none font-semibold tabular-nums text-ov-fg [text-shadow:0_1px_8px_rgb(0_0_0_/_0.65)]">
            <FadeValue value={player.resource} />
          </p>
          {colors ? <ManaPips colors={colors} /> : null}
        </div>
      </div>
      <p
        className={cn(
          "relative z-10 mt-1 font-mono text-[0.68rem] tracking-[0.14em] text-ov-fg/80 uppercase [text-shadow:0_1px_6px_rgb(0_0_0_/_0.55)]",
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