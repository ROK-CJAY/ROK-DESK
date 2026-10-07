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
import { LorcanaPlayerExtendedTablet } from "@/components/tablet/lorcana-player-extended";
import { YgoPlayerTablet } from "@/components/tablet/ygo-player";
import { CasterTablet } from "@/components/tablet/caster-tablet";
import { DeltaPad } from "@/components/desk/delta-pad";
import { GuideButton, TabletGuide, useTabletGuide } from "@/components/tablet/tablet-guide";
import { formatCommanderLine, isCommanderLane, isMtgTitle, isPtcgTitle, isVgcTitle } from "@/lib/games";
import { commanderFaceName } from "@/lib/commander-colors";
import { fetchCommanderArt } from "@/lib/card-lookup";
import { cn } from "@/lib/cn";
import { HeadToHeadButton, StackButton, useHeadToHead, useStackedSeats } from "@/components/tablet/head-to-head";

const TABLE_ORDER: SeatId[] = ["p3", "p4", "p2", "p1"];

export function PodPad({ role = "judge" }: { role?: "judge" | "player" | "extended" | "caster" }) {
  const ready = useDeskStore((s) => s.ready);
  const hydrate = useDeskStore((s) => s.hydrate);
  const desk = useDeskStore((s) => s.desk);
  const bumpResource = useDeskStore((s) => s.bumpResource);
  const bumpSecondary = useDeskStore((s) => s.bumpSecondary);
  const bumpCmdDamage = useDeskStore((s) => s.bumpCmdDamage);
  const bumpCmdFrom = useDeskStore((s) => s.bumpCmdFrom);
  const resetGame = useDeskStore((s) => s.resetGame);
  const [faceOut, setFaceOut] = useState(true);
  const face = useHeadToHead();
  const stack = useStackedSeats();
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

  if (role === "caster") {
    return <CasterTablet />;
  }

  if (role !== "player" && role !== "extended") {
    if (isVgcTitle(desk.gameId)) {
      return <VgcJudgeTablet />;
    }

    if (isPtcgTitle(desk.gameId)) {
      return <TcgJudgeTablet />;
    }

    if (isMtgTitle(desk.gameId)) {
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

  if (role === "extended" && desk.gameId === "lorcana") {
    return <LorcanaPlayerExtendedTablet />;
  }

  if (role === "player" && desk.gameId === "lorcana") {
    return <LorcanaPlayerTablet />;
  }

  if (role === "player" && desk.gameId === "yugioh") {
    return <YgoPlayerTablet />;
  }

  const seats = desk.tableSize === 4 ? TABLE_ORDER : seatsFor(Math.max(desk.tableSize, 2) as 2 | 3 | 4);
  const commander = isCommanderLane(desk);
  const duelStack = !commander && seats.length === 2 && stack.on;

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
          {commander || seats.length !== 2 ? (
            <button
              type="button"
              onClick={() => setFaceOut((v) => !v)}
              className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-muted"
            >
              <RotateCw className="mr-1 inline size-3.5" />
              {faceOut ? "Facing out" : "Upright"}
            </button>
          ) : (
            <>
              <StackButton on={stack.on} onClick={stack.toggle} />
              <HeadToHeadButton on={face.on} onClick={face.toggle} />
            </>
          )}
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
          "grid min-h-0 flex-1 gap-1.5 p-1.5",
          seats.length === 2 ? (duelStack ? "grid-cols-1 grid-rows-2" : "grid-cols-2") : "grid-cols-2 grid-rows-2",
        )}
      >
        {seats.map((seat) => (
          <SeatPad
            key={seat}
            seat={seat}
            rotate={
              commander || seats.length !== 2
                ? faceOut && (desk.tableSize >= 4 ? seat === "p3" || seat === "p4" : seat === "p2")
                : face.on && seat === "p2"
            }
            onLife={(d) => bumpResource(seat, d)}
            onPoison={(d) => bumpSecondary(seat, d)}
            onCmd={(d) => bumpCmdDamage(seat, d)}
            onCmdFrom={(from, d) => bumpCmdFrom(seat, from, d)}
          />
        ))}
      </div>
      <TabletGuide kind="table" open={guide.open} onClose={guide.close} />
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

function SeatPad({
  seat,
  rotate,
  onLife,
  onPoison,
  onCmd,
  onCmdFrom,
}: {
  seat: SeatId;
  rotate: boolean;
  onLife: (delta: number) => void;
  onPoison: (delta: number) => void;
  onCmd: (delta: number) => void;
  onCmdFrom: (from: SeatId, delta: number) => void;
}) {
  const player = useDeskStore((s) => s.desk[seat]);
  const commander = useDeskStore((s) => isCommanderLane(s.desk));
  const life = player.resource;
  const poison = player.secondary;
  const cmd = player.cmdDamage;
  const out = life <= 0;
  const lethal = commander && (cmd >= 21 || poison >= 10);
  const commanderName = commander ? commanderFaceName(player.archetype) : "";
  const partnerName = commander ? commanderFaceName(player.extra) : "";
  const showPartner = Boolean(partnerName && partnerName.toLowerCase() !== commanderName.toLowerCase());
  const art = useCommanderArt(commanderName);
  const partnerArt = useCommanderArt(showPartner ? partnerName : "");
  const artSplit = Boolean(art && partnerArt);
  const tableSize = useDeskStore((s) => s.desk.tableSize);
  const others = seatsFor(tableSize).filter((id) => id !== seat);
  const [cmdSplit, setCmdSplit] = useState(false);

  return (
    <section
      className={cn(
        "@container/seat relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-surface",
        (out || lethal) && "opacity-80",
      )}
      style={{ containerType: "size" }}
    >
      <div className={cn("absolute inset-0 flex min-h-0 flex-col gap-1 p-2", rotate && "rotate-180")}>
        {art || partnerArt ? (
          <>
            <div className="pointer-events-none absolute inset-0 flex">
              {artSplit ? (
                <>
                  <img src={art} alt="" referrerPolicy="no-referrer" className="h-full w-1/2 object-cover object-[center_18%]" />
                  <img src={partnerArt} alt="" referrerPolicy="no-referrer" className="h-full w-1/2 object-cover object-[center_18%]" />
                </>
              ) : (
                <img src={art || partnerArt} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover object-[center_18%]" />
              )}
            </div>
            <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/80 via-black/62 to-black/80" />
          </>
        ) : null}
        <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-1">
          <div className="flex shrink-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-[0.58rem] tracking-[0.18em] text-muted uppercase">
                {SEAT_LABELS[seat]}
                {out ? " · Out" : lethal ? " · Lethal" : ""}
              </p>
              <p className="font-display truncate text-base leading-tight font-semibold uppercase [text-shadow:0_1px_8px_rgb(0_0_0_/_0.7)] @[18rem]/seat:text-lg">
                {player.name || "Open"}
              </p>
              <p className="truncate text-[0.7rem] leading-tight text-muted">
                {commander
                  ? formatCommanderLine(player.archetype, player.extra) || "Commander"
                  : player.archetype || "Open"}
              </p>
            </div>
            {out || lethal ? <Skull className="size-4 shrink-0 text-live" /> : null}
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <button
              type="button"
              onClick={() => onLife(-1)}
              className="absolute top-1/2 left-1 z-10 grid size-14 -translate-y-1/2 place-items-center rounded-lg border border-white/25 bg-black/70 text-4xl leading-none text-white shadow-md active:bg-black/85"
              aria-label={`${player.name || seat} minus one`}
            >
              −
            </button>
            <FitLife value={life} danger={life <= 0} />
            <button
              type="button"
              onClick={() => onLife(1)}
              className="absolute top-1/2 right-1 z-10 grid size-14 -translate-y-1/2 place-items-center rounded-lg border border-white/25 bg-black/70 text-4xl leading-none text-white shadow-md active:bg-black/85"
              aria-label={`${player.name || seat} plus one`}
            >
              +
            </button>
          </div>

          <div className="flex shrink-0 justify-center">
            <DeltaPad onDelta={onLife} size="desk" />
          </div>

          <div className="grid shrink-0 gap-1.5">
            <div className={cn("grid gap-1.5", commander ? "grid-cols-2" : "grid-cols-1")}>
              <CounterChip label="Poi" value={poison} danger={poison >= 10} onDelta={onPoison} />
              {commander && !cmdSplit ? (
                <CounterChip
                  label="Cmd"
                  value={cmd}
                  danger={cmd >= 21}
                  onDelta={onCmd}
                  onLabel={() => setCmdSplit(true)}
                />
              ) : null}
              {commander && cmdSplit ? (
                <button
                  type="button"
                  onClick={() => setCmdSplit(false)}
                  className={cn(
                    "flex min-w-0 flex-col items-center justify-center rounded-md border bg-surface/80 px-1 py-1",
                    cmd >= 21 ? "border-live" : "border-border",
                  )}
                >
                  <span className="font-mono text-[0.52rem] tracking-[0.14em] text-muted uppercase">Total</span>
                  <span className="font-display text-xl leading-none font-semibold tabular-nums">{cmd}</span>
                </button>
              ) : null}
            </div>
            {commander && cmdSplit ? (
              <div className={cn("grid gap-1", others.length > 1 ? "grid-cols-3" : "grid-cols-1")}>
                {others.map((from) => (
                  <CmdSource key={from} seat={seat} from={from} onDelta={(delta) => onCmdFrom(from, delta)} />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function FitLife({ value, danger }: { value: number; danger?: boolean }) {
  return (
    <div className="grid h-full w-full place-items-center overflow-hidden px-14">
      <p
        className={cn(
          "pointer-events-none font-display leading-none font-semibold tabular-nums [font-size:clamp(2.5rem,min(28cqh,20cqw),9rem)] [text-shadow:0_1px_8px_rgb(0_0_0_/_0.7)]",
          danger ? "text-live" : "text-fg",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function CounterChip({
  label,
  value,
  danger,
  onDelta,
  onLabel,
}: {
  label: string;
  value: number;
  danger?: boolean;
  onDelta: (delta: number) => void;
  onLabel?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center justify-between gap-1 rounded-md border bg-surface/80 px-1 py-1",
        danger ? "border-live" : "border-border",
      )}
    >
      <button
        type="button"
        onClick={() => onDelta(-1)}
        aria-label={`${label} minus one`}
        className="grid size-9 shrink-0 place-items-center rounded-md text-xl leading-none text-fg active:bg-fg/10"
      >
        −
      </button>
      <div className="min-w-0 text-center">
        {onLabel ? (
          <button
            type="button"
            onClick={onLabel}
            className="font-mono text-[0.52rem] tracking-[0.16em] text-muted uppercase underline decoration-dotted underline-offset-2"
          >
            {label}
          </button>
        ) : (
          <p className="font-mono text-[0.52rem] tracking-[0.16em] text-muted uppercase">{label}</p>
        )}
        <p className="font-display text-xl leading-none font-semibold tabular-nums">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => onDelta(1)}
        aria-label={`${label} plus one`}
        className="grid size-9 shrink-0 place-items-center rounded-md text-xl leading-none text-fg active:bg-fg/10"
      >
        +
      </button>
    </div>
  );
}

function CmdSource({
  seat,
  from,
  onDelta,
}: {
  seat: SeatId;
  from: SeatId;
  onDelta: (delta: number) => void;
}) {
  const name = useDeskStore((s) => s.desk[from].name);
  const value = useDeskStore((s) => s.desk[seat].cmdFrom?.[from] ?? 0);
  const label = name.trim().split(/\s+/)[0]?.slice(0, 8) || from.toUpperCase();
  return <CounterChip label={label} value={value} danger={value >= 21} onDelta={onDelta} />;
}
