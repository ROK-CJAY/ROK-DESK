import { useEffect, useRef, useState } from "react";
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
  onCmdFrom,
}: {
  seat: SeatId;
  rotate: boolean;
  onLife: (delta: number) => void;
  onPoison: (delta: number) => void;
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
  const quad = tableSize >= 4 ? TABLE_ORDER : seatsFor(tableSize);
  const [cmdEdit, setCmdEdit] = useState<SeatId | null>(null);

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
        <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-[clamp(0.2rem,1cqh,0.55rem)]">
          <div className="flex shrink-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={cn("font-mono tracking-[0.18em] uppercase [font-size:clamp(0.48rem,2.2cqw,0.75rem)]", art || partnerArt ? "text-white/75" : "text-muted")}>
                {SEAT_LABELS[seat]}
                {out ? " · Out" : lethal ? " · Lethal" : ""}
              </p>
              <p className={cn("font-display truncate leading-tight font-semibold uppercase [font-size:clamp(0.8rem,5cqw,1.7rem)] [text-shadow:0_1px_8px_rgb(0_0_0_/_0.7)]", (art || partnerArt) && "text-white")}>
                {player.name || "Open"}
              </p>
              <p className={cn("truncate leading-tight [font-size:clamp(0.58rem,2.6cqw,0.95rem)]", art || partnerArt ? "text-white/75" : "text-muted")}>
                {commander
                  ? formatCommanderLine(player.archetype, player.extra) || "Commander"
                  : player.archetype || "Open"}
              </p>
            </div>
            {out || lethal ? <Skull className="size-[clamp(0.9rem,3cqw,1.35rem)] shrink-0 text-live" /> : null}
          </div>

          <div className="@container/life relative min-h-0 flex-1 overflow-hidden" style={{ containerType: "size" }}>
            <LifeStepButton
              sign={-1}
              label={`${player.name || seat} minus life`}
              onLife={onLife}
              className="absolute top-1/2 left-1 z-10 grid size-[clamp(1.65rem,42cqh,4.5rem)] -translate-y-1/2 place-items-center rounded-lg border border-white/25 bg-black/70 text-[clamp(1.1rem,22cqh,2.6rem)] leading-none text-white shadow-md active:bg-black/85"
            />
            <FitLife value={life} danger={life <= 0} onArt={Boolean(art || partnerArt)} />
            <LifeStepButton
              sign={1}
              label={`${player.name || seat} plus life`}
              onLife={onLife}
              className="absolute top-1/2 right-1 z-10 grid size-[clamp(1.65rem,42cqh,4.5rem)] -translate-y-1/2 place-items-center rounded-lg border border-white/25 bg-black/70 text-[clamp(1.1rem,22cqh,2.6rem)] leading-none text-white shadow-md active:bg-black/85"
            />
          </div>

          <div className={cn("grid shrink-0 gap-1.5", commander ? "grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]" : "grid-cols-1")}>
            <CounterChip label="Poi" value={poison} danger={poison >= 10} onDelta={onPoison} />
            {commander ? (
              <div className={cn("grid h-[clamp(3.1rem,22cqh,6.2rem)] min-h-0 gap-1", quad.length > 2 ? "grid-cols-2 grid-rows-2" : "grid-cols-2")}>
                {quad.map((id) => (
                  <CmdSeat
                    key={id}
                    owner={seat}
                    from={id}
                    onOpen={() => setCmdEdit(id)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
        {commander && cmdEdit && cmdEdit !== seat ? (
          <CmdPopup
            owner={seat}
            from={cmdEdit}
            onDelta={(delta) => onCmdFrom(cmdEdit, delta)}
            onClose={() => setCmdEdit(null)}
          />
        ) : null}
      </div>
    </section>
  );
}

function LifeStepButton({
  sign,
  label,
  className,
  onLife,
}: {
  sign: 1 | -1;
  label: string;
  className: string;
  onLife: (delta: number) => void;
}) {
  const held = useRef(false);
  const delay = useRef<number | null>(null);
  const repeat = useRef<number | null>(null);
  const stop = () => {
    if (delay.current != null) window.clearTimeout(delay.current);
    if (repeat.current != null) window.clearInterval(repeat.current);
    delay.current = null;
    repeat.current = null;
  };
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        held.current = false;
        stop();
        delay.current = window.setTimeout(() => {
          held.current = true;
          onLife(sign * 5);
          repeat.current = window.setInterval(() => onLife(sign * 5), 500);
        }, 500);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onClick={() => {
        if (held.current) {
          held.current = false;
          return;
        }
        onLife(sign);
      }}
    >
      {sign < 0 ? "−" : "+"}
    </button>
  );
}

function FitLife({ value, danger, onArt }: { value: number; danger?: boolean; onArt?: boolean }) {
  return (
    <div className="grid h-full w-full place-items-center overflow-hidden px-[clamp(1.6rem,18cqw,4.5rem)]">
      <p
        className={cn(
          "pointer-events-none font-display leading-none font-semibold tabular-nums [font-size:clamp(1.35rem,min(72cqh,42cqw),8rem)] [text-shadow:0_1px_8px_rgb(0_0_0_/_0.7)]",
          danger ? "text-live" : onArt ? "text-white" : "text-fg",
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
  large,
  hideLabel,
}: {
  label: string;
  value: number;
  danger?: boolean;
  onDelta: (delta: number) => void;
  onLabel?: () => void;
  large?: boolean;
  hideLabel?: boolean;
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
        className={cn(
          "grid shrink-0 place-items-center rounded-md leading-none text-fg active:bg-fg/10",
          large ? "size-[clamp(2.1rem,9cqh,3.4rem)] text-[clamp(1.25rem,4.6cqh,2rem)]" : "size-[clamp(1.35rem,6cqh,2.4rem)] text-[clamp(0.85rem,3.2cqh,1.4rem)]",
        )}
      >
        −
      </button>
      <div className="min-w-0 text-center">
        {hideLabel ? null : onLabel ? (
          <button
            type="button"
            onClick={onLabel}
            className={cn(
              "font-mono tracking-[0.16em] text-muted uppercase underline decoration-dotted underline-offset-2",
              large ? "text-[clamp(0.6rem,2.5cqw,0.8rem)]" : "text-[clamp(0.55rem,2.2cqw,0.72rem)]",
            )}
          >
            {label}
          </button>
        ) : (
          <p className={cn("font-mono tracking-[0.16em] text-muted uppercase", large ? "text-[clamp(0.6rem,2.5cqw,0.8rem)]" : "text-[clamp(0.55rem,2.2cqw,0.72rem)]")}>{label}</p>
        )}
        <p className={cn("font-display leading-none font-semibold tabular-nums", large ? "text-[clamp(1.7rem,7cqh,2.8rem)]" : "text-[clamp(0.9rem,4cqh,1.55rem)]")}>{value}</p>
      </div>
      <button
        type="button"
        onClick={() => onDelta(1)}
        aria-label={`${label} plus one`}
        className={cn(
          "grid shrink-0 place-items-center rounded-md leading-none text-fg active:bg-fg/10",
          large ? "size-[clamp(2.1rem,9cqh,3.4rem)] text-[clamp(1.25rem,4.6cqh,2rem)]" : "size-[clamp(1.35rem,6cqh,2.4rem)] text-[clamp(0.85rem,3.2cqh,1.4rem)]",
        )}
      >
        +
      </button>
    </div>
  );
}

function CmdSeat({
  owner,
  from,
  onOpen,
}: {
  owner: SeatId;
  from: SeatId;
  onOpen: () => void;
}) {
  const name = useDeskStore((s) => s.desk[from].name);
  const value = useDeskStore((s) => s.desk[owner].cmdFrom?.[from] ?? 0);
  const mine = owner === from;
  const label = name.trim().split(/\s+/)[0]?.slice(0, 8) || from.slice(1);
  const lethal = !mine && value >= 21;
  if (mine) {
    return (
      <div className="flex h-full min-h-0 min-w-0 flex-col items-center justify-center overflow-hidden rounded-md border-2 border-accent bg-surface px-1 py-0.5">
        <span className="font-mono tracking-[0.14em] text-muted uppercase [font-size:clamp(0.45rem,2cqw,0.68rem)]">{from.slice(1)}</span>
        <span className="font-display leading-none font-semibold text-fg [font-size:clamp(0.75rem,3.6cqh,1.35rem)]">ME</span>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-col items-center justify-center overflow-hidden rounded-md border bg-surface/90 px-1 py-0.5",
        lethal ? "border-live" : "border-border",
      )}
    >
      <span className="max-w-full truncate font-mono tracking-[0.12em] text-muted uppercase [font-size:clamp(0.45rem,2cqw,0.68rem)]">{label}</span>
      <span className={cn("font-display leading-none font-semibold tabular-nums [font-size:clamp(0.8rem,3.8cqh,1.45rem)]", lethal && "text-live")}>{value}</span>
    </button>
  );
}

function CmdPopup({
  owner,
  from,
  onDelta,
  onClose,
}: {
  owner: SeatId;
  from: SeatId;
  onDelta: (delta: number) => void;
  onClose: () => void;
}) {
  const name = useDeskStore((s) => s.desk[from].name);
  const value = useDeskStore((s) => s.desk[owner].cmdFrom?.[from] ?? 0);
  const label = name.trim() || `Seat ${from.slice(1)}`;
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-3" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-surface p-4 shadow-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono tracking-[0.16em] text-muted uppercase [font-size:clamp(0.55rem,2.2cqw,0.75rem)]">Commander damage</p>
            <p className="truncate font-display leading-tight font-semibold uppercase [font-size:clamp(1.15rem,5.2cqw,1.9rem)]">{label}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-xs text-muted">
            Close
          </button>
        </div>
        <CounterChip label="Cmd" value={value} danger={value >= 21} onDelta={onDelta} large hideLabel />
      </div>
    </div>
  );
}
