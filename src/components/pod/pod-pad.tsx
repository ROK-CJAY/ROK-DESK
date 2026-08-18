import { useEffect, useState } from "react";
import { RotateCcw, RotateCw, Skull } from "lucide-react";
import { useDeskStore } from "@/lib/desk-store";
import { SEAT_LABELS, seatsFor, type SeatId } from "@/lib/desk-types";
import { VgcJudgeTablet } from "@/components/tablet/vgc-judge";
import { TcgJudgeTablet } from "@/components/tablet/tcg-judge";
import { MtgJudgeTablet } from "@/components/tablet/mtg-judge";
import { SwuJudgeTablet } from "@/components/tablet/swu-judge";
import { YgoJudgeTablet } from "@/components/tablet/ygo-judge";
import { OpJudgeTablet } from "@/components/tablet/op-judge";
import { RiftJudgeTablet } from "@/components/tablet/rift-judge";
import { LorcanaJudgeTablet } from "@/components/tablet/lorcana-judge";
import { LorcanaPlayerTablet } from "@/components/tablet/lorcana-player";
import { DeltaPad } from "@/components/desk/delta-pad";
import { GuideButton, TabletGuide, useTabletGuide } from "@/components/tablet/tablet-guide";
import { isCommanderLane } from "@/lib/games";
import { cn } from "@/lib/cn";

const TABLE_ORDER: SeatId[] = ["p3", "p4", "p2", "p1"];

export function PodPad({ role = "judge" }: { role?: "judge" | "player" }) {
  const ready = useDeskStore((s) => s.ready);
  const hydrate = useDeskStore((s) => s.hydrate);
  const desk = useDeskStore((s) => s.desk);
  const bumpResource = useDeskStore((s) => s.bumpResource);
  const bumpSecondary = useDeskStore((s) => s.bumpSecondary);
  const bumpCmdDamage = useDeskStore((s) => s.bumpCmdDamage);
  const resetGame = useDeskStore((s) => s.resetGame);
  const [faceOut, setFaceOut] = useState(true);
  const guide = useTabletGuide("table");

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
      <div className="grid h-dvh place-items-center bg-bg text-muted">Loading tablet…</div>
    );
  }

  if (role !== "player") {
    if (desk.gameId === "pokemon-vgc") {
      return <VgcJudgeTablet />;
    }

    if (desk.gameId === "pokemon-tcg") {
      return <TcgJudgeTablet />;
    }

    if (desk.gameId === "mtg") {
      return <MtgJudgeTablet />;
    }

    if (desk.gameId === "swu") {
      return <SwuJudgeTablet />;
    }

    if (desk.gameId === "yugioh") {
      return <YgoJudgeTablet />;
    }

    if (desk.gameId === "one-piece") {
      return <OpJudgeTablet />;
    }

    if (desk.gameId === "riftbound") {
      return <RiftJudgeTablet />;
    }

    if (desk.gameId === "lorcana") {
      return <LorcanaJudgeTablet />;
    }
  }

  if (role === "player" && desk.gameId === "lorcana") {
    return <LorcanaPlayerTablet />;
  }

  const seats = desk.tableSize === 4 ? TABLE_ORDER : seatsFor(Math.max(desk.tableSize, 2) as 2 | 3 | 4);

  return (
    <div className="pod-shell flex h-dvh flex-col bg-bg text-fg" data-game={desk.gameId}>
      <header className="flex shrink-0 items-center justify-between gap-2 px-3 py-1.5">
        <div className="min-w-0">
          <p className="font-mono text-[0.6rem] tracking-[0.2em] text-muted uppercase">ROK · Player tablet</p>
          <p className="truncate text-sm text-fg">
            {desk.eventName}
            <span className="text-muted"> · {desk.formatName} · {desk.roundName}</span>
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
          <GuideButton onClick={guide.openGuide} />
        </div>
      </header>

      <div
        className={cn(
          "min-h-0 flex-1 p-1.5",
          seats.length === 2 ? "grid grid-cols-2" : "grid grid-cols-2 grid-rows-2",
        )}
      >
        {seats.map((seat) => (
          <SeatPad
            key={seat}
            seat={seat}
            rotate={
              faceOut &&
              (desk.tableSize >= 4 ? seat === "p3" || seat === "p4" : seat === "p2")
            }
            onLife={(d) => bumpResource(seat, d)}
            onPoison={(d) => bumpSecondary(seat, d)}
            onCmd={(d) => bumpCmdDamage(seat, d)}
          />
        ))}
      </div>
      <TabletGuide kind="table" open={guide.open} onClose={guide.close} />
    </div>
  );
}

function SeatPad({
  seat,
  rotate,
  onLife,
  onPoison,
  onCmd,
}: {
  seat: SeatId;
  rotate: boolean;
  onLife: (delta: number) => void;
  onPoison: (delta: number) => void;
  onCmd: (delta: number) => void;
}) {
  const player = useDeskStore((s) => s.desk[seat]);
  const commander = useDeskStore((s) => isCommanderLane(s.desk));
  const life = player.resource;
  const poison = player.secondary;
  const cmd = player.cmdDamage;
  const out = life <= 0;
  const lethal = commander && (cmd >= 21 || poison >= 10);

  return (
    <section
      className={cn(
        "relative m-1 flex flex-col overflow-hidden rounded-xl border border-border bg-surface",
        (out || lethal) && "opacity-80",
      )}
    >
      <div className={cn("flex h-full flex-col p-3", rotate && "rotate-180")}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-[0.6rem] tracking-[0.18em] text-muted uppercase">
              {SEAT_LABELS[seat]}
              {out ? " · Out" : lethal ? " · Lethal" : ""}
            </p>
            <p className="font-display truncate text-xl leading-none font-semibold uppercase">
              {player.name || "Open"}
            </p>
            <p className="truncate text-xs text-muted">{player.archetype || (commander ? "Commander" : "Open")}</p>
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
              style={{ fontSize: "clamp(3.6rem, 14vw, 7rem)" }}
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

        <div className="flex justify-center">
          <DeltaPad onDelta={onLife} size="tablet" />
        </div>

        <div className={cn("mt-3 grid gap-2", commander ? "grid-cols-2" : "grid-cols-1")}>
          <CounterChip label="Poi" value={poison} danger={poison >= 10} onDelta={onPoison} max={10} />
          {commander ? (
            <CounterChip label="Cmd" value={cmd} danger={cmd >= 21} onDelta={onCmd} max={21} />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function CounterChip({
  label,
  value,
  danger,
  onDelta,
  max,
}: {
  label: string;
  value: number;
  danger?: boolean;
  onDelta: (delta: number) => void;
  max: number;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 rounded-md border px-1 py-1.5",
        danger ? "border-live" : "border-border",
      )}
    >
      <div className="text-center">
        <p className="font-mono text-[0.55rem] tracking-[0.16em] text-muted uppercase">{label}</p>
        <p className="font-display text-2xl leading-none font-semibold tabular-nums">{value}</p>
      </div>
      <DeltaPad onDelta={onDelta} max={max} size="tablet" />
    </div>
  );
}
