import { useEffect, useState } from "react";
import { RotateCcw, RotateCw, Skull } from "lucide-react";
import { useDeskStore } from "@/lib/desk-store";
import {
  SEAT_LABELS,
  incomingCmd,
  isCommanderTable,
  seatsFor,
  type SeatId,
} from "@/lib/desk-types";
import { cn } from "@/lib/cn";

const TABLE_ORDER: SeatId[] = ["p4", "p3", "p1", "p2"];

export function PodPad() {
  const ready = useDeskStore((s) => s.ready);
  const hydrate = useDeskStore((s) => s.hydrate);
  const desk = useDeskStore((s) => s.desk);
  const bumpResource = useDeskStore((s) => s.bumpResource);
  const bumpSecondary = useDeskStore((s) => s.bumpSecondary);
  const bumpCmdFrom = useDeskStore((s) => s.bumpCmdFrom);
  const resetGame = useDeskStore((s) => s.resetGame);
  const [faceOut, setFaceOut] = useState(true);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        lock = await navigator.wakeLock?.request("screen");
      } catch {
        /* unsupported */
      }
    };
    void request();
    const onVis = () => {
      if (document.visibilityState === "visible") void request();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      void lock?.release();
    };
  }, []);

  if (!ready) {
    return (
      <div className="grid h-dvh place-items-center bg-bg text-muted">
        Loading pod…
      </div>
    );
  }

  const seats = desk.tableSize === 4 ? TABLE_ORDER : seatsFor(Math.max(desk.tableSize, 2) as 2 | 3 | 4);
  const commander = isCommanderTable(desk) || desk.gameId === "mtg";

  return (
    <div className="pod-shell flex h-dvh flex-col bg-bg text-fg" data-game={desk.gameId}>
      <header className="flex shrink-0 items-center justify-between gap-2 px-3 py-1.5">
        <div className="min-w-0">
          <p className="font-mono text-[0.6rem] tracking-[0.2em] text-muted uppercase">ROK · Pod pad</p>
          <p className="truncate text-sm text-fg">
            {desk.eventName}
            <span className="text-muted"> · {desk.roundName}</span>
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setFaceOut((v) => !v)}
            className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-muted"
          >
            <RotateCw className="mr-1 inline size-3.5" />
            {faceOut ? "Facing out" : "Upright"}
          </button>
          <button
            type="button"
            onClick={resetGame}
            className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-muted"
          >
            <RotateCcw className="mr-1 inline size-3.5" />
            Reset
          </button>
        </div>
      </header>

      <div
        className={cn(
          "min-h-0 flex-1 p-1.5",
          seats.length === 2 ? "grid grid-cols-2" : "grid grid-cols-2 grid-rows-2",
        )}
      >
        {seats.map((seat) => {
          const rotate = faceOut && (seat === "p3" || seat === "p4");
          return (
            <SeatPad
              key={seat}
              seat={seat}
              rotate={rotate}
              commander={commander}
              opponents={seats.filter((s) => s !== seat)}
              onLife={(d) => bumpResource(seat, d)}
              onPoison={(d) => bumpSecondary(seat, d)}
              onCmd={(from, d) => bumpCmdFrom(seat, from, d)}
            />
          );
        })}
      </div>
    </div>
  );
}

function SeatPad({
  seat,
  rotate,
  commander,
  opponents,
  onLife,
  onPoison,
  onCmd,
}: {
  seat: SeatId;
  rotate: boolean;
  commander: boolean;
  opponents: SeatId[];
  onLife: (delta: number) => void;
  onPoison: (delta: number) => void;
  onCmd: (from: SeatId, delta: number) => void;
}) {
  const player = useDeskStore((s) => s.desk[seat]);
  const oppNames = useDeskStore((s) => opponents.map((id) => s.desk[id].name).join("|"));
  const nameBySeat = Object.fromEntries(
    opponents.map((id, i) => [id, oppNames.split("|")[i] ?? ""]),
  ) as Record<SeatId, string>;
  const life = player.resource;
  const poison = player.secondary;
  const cmd = incomingCmd(player, seat);
  const out = life <= 0;
  const lethal = commander && (cmd >= 21 || poison >= 10);

  return (
    <section
      className={cn(
        "relative m-1 flex flex-col overflow-hidden rounded-xl border border-border bg-surface",
        (out || lethal) && "opacity-80",
      )}
    >
      <div className={cn("flex h-full flex-col p-2 sm:p-3", rotate && "rotate-180")}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-[0.6rem] tracking-[0.18em] text-muted uppercase">
              {SEAT_LABELS[seat]}
              {out ? " · Out" : lethal ? " · Lethal" : ""}
            </p>
            <p className="font-display truncate text-lg leading-none font-semibold uppercase sm:text-xl">
              {player.name || "Open"}
            </p>
            <p className="truncate text-xs text-muted">{player.archetype || "Commander"}</p>
          </div>
          {out || lethal ? <Skull className="size-4 text-live" /> : null}
        </div>

        <div className="relative my-1 flex min-h-0 flex-1 items-center justify-center">
          <button
            type="button"
            onClick={() => onLife(-1)}
            className="absolute inset-y-0 left-0 w-1/3 text-3xl text-subtle/50 active:bg-fg/5"
            aria-label={`${player.name || seat} minus one`}
          >
            −
          </button>
          <div className="pointer-events-none text-center">
            <p
              className={cn(
                "font-display leading-none font-semibold tabular-nums",
                life <= 0 ? "text-live" : "text-fg",
              )}
              style={{ fontSize: "clamp(3.2rem, 12vw, 6.5rem)" }}
            >
              {life}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onLife(1)}
            className="absolute inset-y-0 right-0 w-1/3 text-3xl text-subtle/50 active:bg-fg/5"
            aria-label={`${player.name || seat} plus one`}
          >
            +
          </button>
        </div>

        <div className="flex justify-center gap-2">
          {[-5, 5].map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => onLife(step)}
              className="min-h-11 min-w-14 rounded-md border border-border bg-surface-2 text-sm font-medium tabular-nums"
            >
              {step > 0 ? `+${step}` : step}
            </button>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <CounterChip label="Poi" value={poison} danger={poison >= 10} onDelta={onPoison} />
          {commander && opponents.length > 1 ? (
            <div className="flex items-center justify-center rounded-md border border-border px-2">
              <div className="text-center">
                <p className="font-mono text-[0.55rem] tracking-[0.16em] text-muted uppercase">Max cmd</p>
                <p className={cn("font-display text-xl leading-none font-semibold tabular-nums", cmd >= 21 && "text-live")}>
                  {cmd}
                </p>
              </div>
            </div>
          ) : (
            <CounterChip label="Cmd" value={cmd} danger={cmd >= 21} onDelta={(d) => onCmd(opponents[0] ?? "p1", d)} />
          )}
        </div>

        {commander && opponents.length > 1 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {opponents.map((from) => {
              const value = player.cmdFrom?.[from] ?? 0;
              return (
                <button
                  key={from}
                  type="button"
                  onClick={() => onCmd(from, 1)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    onCmd(from, -1);
                  }}
                  className={cn(
                    "min-h-10 flex-1 rounded-md border px-2 py-1 text-left",
                    value >= 21 ? "border-live bg-live/15" : "border-border bg-surface-2",
                  )}
                >
                  <span className="block truncate font-mono text-[0.55rem] tracking-wide text-muted uppercase">
                    {nameBySeat[from] || SEAT_LABELS[from]}
                  </span>
                  <span className="font-display text-lg leading-none font-semibold tabular-nums">{value}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CounterChip({
  label,
  value,
  danger,
  onDelta,
}: {
  label: string;
  value: number;
  danger?: boolean;
  onDelta: (delta: number) => void;
}) {
  return (
    <div className={cn("flex items-center justify-between rounded-md border px-1 py-1", danger ? "border-live" : "border-border")}>
      <button type="button" className="grid size-10 place-items-center text-lg" onClick={() => onDelta(-1)}>
        −
      </button>
      <div className="text-center">
        <p className="font-mono text-[0.55rem] tracking-[0.16em] text-muted uppercase">{label}</p>
        <p className="font-display text-xl leading-none font-semibold tabular-nums">{value}</p>
      </div>
      <button type="button" className="grid size-10 place-items-center text-lg" onClick={() => onDelta(1)}>
        +
      </button>
    </div>
  );
}
