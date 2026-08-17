import { gameOf, isCommanderLane } from "@/lib/games";
import {
  isCommanderTable,
  seatsFor,
  type DeskState,
  type SeatId,
} from "@/lib/desk-types";
import { OverlayEditProvider, Placed } from "@/components/overlays/placed";
import type { OverlayEdit } from "@/components/overlays/placed";

const SEAT_WIDGET: Record<SeatId, "scorebugP1" | "scorebugP2" | "scorebugP3" | "scorebugP4"> = {
  p1: "scorebugP1",
  p2: "scorebugP2",
  p3: "scorebugP3",
  p4: "scorebugP4",
};

export function CommanderScorebug({
  desk,
  edit = null,
}: {
  desk: DeskState;
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
          <div className="w-[280px] rounded-md border border-ov-fg/10 bg-ov-bg/88 px-3 py-1.5 text-center">
            <div className="font-mono text-[0.65rem] tracking-[0.18em] text-game uppercase">
              {desk.formatName} · {desk.tableSize} pod
            </div>
            <div className="font-display text-sm font-semibold tracking-wide text-ov-fg uppercase">
              {desk.roundName}
            </div>
          </div>
        </Placed>
      </div>
    </OverlayEditProvider>
  );
}

function SeatPlate({ desk, seat }: { desk: DeskState; seat: SeatId }) {
  const player = desk[seat];
  const right = seat === "p2" || seat === "p3";
  const out = player.resource <= 0;
  const lethal = player.cmdDamage >= 21 || player.secondary >= 10;
  return (
    <div
      className={`w-[300px] rounded-md border border-ov-fg/10 bg-ov-bg/88 px-3 py-2 ${
        right ? "text-right" : ""
      } ${out || lethal ? "opacity-65" : ""}`}
    >
      <div className={`flex items-start gap-3 ${right ? "flex-row-reverse" : ""}`}>
        <div className="min-w-0 flex-1">
          <p className="font-display truncate text-xl leading-none font-semibold tracking-tight text-ov-fg uppercase">
            {player.name || "TBD"}
          </p>
          <p className="mt-0.5 truncate text-xs text-ov-muted">
            {player.archetype || "Commander"}
            {out ? " · Out" : lethal ? " · Lethal" : ""}
          </p>
        </div>
        <p className="font-display text-3xl leading-none font-semibold tabular-nums text-ov-fg">
          {player.resource}
        </p>
      </div>
      <p
        className={`mt-1 font-mono text-[0.62rem] tracking-[0.14em] text-ov-muted uppercase ${
          right ? "" : ""
        }`}
      >
        <span className={player.secondary > 0 ? "text-ov-fg" : ""}>Poi {player.secondary}</span>
        <span className="text-ov-fg/25"> · </span>
        <span className={player.cmdDamage > 0 ? "text-ov-fg" : ""}>Cmd {player.cmdDamage}</span>
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
            return (
              <div key={seat} className={right ? "text-right" : ""}>
                <p className="font-mono text-ov-kicker tracking-[0.22em] text-game uppercase">
                  Seat {seat.slice(1)} {player.country ? `· ${player.country}` : ""}
                </p>
                <h2 className="font-display text-5xl leading-none font-semibold tracking-tight text-ov-fg uppercase">
                  {player.name || "TBD"}
                </h2>
                <p className="mt-2 text-xl text-ov-muted">{player.archetype || "Commander"}</p>
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
