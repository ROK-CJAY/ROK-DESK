import { useCardImageSrc } from "@/components/ui/remote-art";
import { FadeValue } from "@/components/overlays/fade-value";
import { formatClock, remainingSeconds, emptySpotlight, type DeskState, type SideId } from "@/lib/desk-types";
import { cn } from "@/lib/cn";

const RAIL_W = "23rem";
const TICKER_H = "3.35rem";
const RAIL_PAD = "0.625rem";
const RAIL_BG = "linear-gradient(180deg, #16191e 0%, #0b0c0e 100%)";
const SILVER = "#c5ccd6";
const RED = "#d4534c";
const GOLD = "#e4c56a";

function sideAccent(side: SideId) {
  return side === "p1" ? SILVER : RED;
}

function recordLine(w = 0, l = 0, d = 0) {
  const wins = Math.max(0, Number(w) || 0);
  const losses = Math.max(0, Number(l) || 0);
  const draws = Math.max(0, Number(d) || 0);
  return draws > 0 ? `${wins}W – ${losses}L – ${draws}D` : `${wins}W – ${losses}L`;
}

function Spine({ align }: { align: "left" | "right" }) {
  return (
    <div
      className="flex w-[2.35rem] shrink-0 items-center justify-center border-white/10"
      style={{
        background: "linear-gradient(180deg, #1a1d22 0%, #0b0c0e 100%)",
        borderRight: align === "left" ? "1px solid #2a2e35" : undefined,
        borderLeft: align === "right" ? "1px solid #2a2e35" : undefined,
      }}
    >
      <p
        className="font-mono text-[0.68rem] font-semibold tracking-[0.42em] text-white/45 uppercase"
        style={{
          writingMode: "vertical-rl",
          transform: align === "left" ? "rotate(180deg)" : undefined,
        }}
      >
        Feature Duelist
      </p>
    </div>
  );
}

function CameraWell({
  photoUrl,
  accent,
}: {
  photoUrl: string;
  accent: string;
}) {
  return (
    <div className="relative min-h-0 flex-[1.15] overflow-hidden">
      {photoUrl ? (
        <img
          src={photoUrl}
          alt=""
          className="absolute object-cover"
          style={{
            inset: `0 ${RAIL_PAD}`,
            borderRadius: "1.5rem",
          }}
        />
      ) : null}
      <div
        className="pointer-events-none absolute bg-transparent"
        style={{
          inset: `0 ${RAIL_PAD}`,
          borderRadius: "1.5rem",
          border: `2.5px solid ${accent}`,
          boxShadow: "0 0 0 100vmax #10131a",
        }}
      />
    </div>
  );
}

function CardWell({
  image,
  id,
  visible,
}: {
  image?: string;
  id?: string;
  visible: boolean;
}) {
  const show = visible && Boolean(image || id);
  const { src, onError } = useCardImageSrc(show ? image : "", "high", show ? id : "");
  return (
    <div
      className="relative min-h-0 flex-1 overflow-hidden rounded-md bg-transparent"
      style={{ boxShadow: "inset 0 0 0 1.5px #c5ccd655" }}
    >
      {show && src ? (
        <img
          key={src}
          src={src}
          alt=""
          decoding="async"
          onError={onError}
          className="absolute inset-[6%] size-[88%] object-contain drop-shadow-[0_12px_24px_rgb(0_0_0_/_0.55)]"
        />
      ) : (
        <div
          className="absolute"
          style={{
            inset: "14% 18%",
            border: "1.5px solid rgb(197 204 214 / 0.22)",
            borderRadius: "50%",
          }}
        />
      )}
    </div>
  );
}

function Rail({ desk, side, align }: { desk: DeskState; side: "p1" | "p2"; align: "left" | "right" }) {
  const player = desk[side];
  const accent = sideAccent(side);
  const card = desk.sideSpotlight?.[side] ?? emptySpotlight();
  const right = align === "right";

  return (
    <aside
      className={cn("absolute top-0 flex", right ? "right-0 flex-row-reverse" : "left-0")}
      style={{
        width: RAIL_W,
        bottom: TICKER_H,
      }}
    >
      <Spine align={align} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={cn("shrink-0 px-2.5 pt-2.5 pb-2", right && "text-right")}
          style={{ background: RAIL_BG }}
        >
          <div className={cn("flex items-center gap-2", right && "flex-row-reverse")}>
            <span className="font-mono text-[0.92rem] leading-none tabular-nums tracking-wide text-white/80">
              <FadeValue value={recordLine(player.recordW, player.recordL, player.recordD)} />
            </span>
            {player.country ? (
              <span
                className="rounded-sm px-1.5 py-0.5 font-mono text-[0.78rem] leading-none tracking-wider text-[#0b0c0e]"
                style={{ background: accent }}
              >
                {player.country}
              </span>
            ) : null}
          </div>
          <p className="font-display mt-1 truncate text-[2.35rem] leading-none font-semibold tracking-wide text-white uppercase">
            {player.name || (right ? "Player 2" : "Player 1")}
          </p>
        </header>
        <CameraWell photoUrl={player.photoUrl.trim()} accent={accent} />
        <div
          className={cn("flex min-h-0 flex-1 flex-col px-2.5 pb-2", right && "text-right")}
          style={{ background: RAIL_BG }}
        >
          <div className="my-2 shrink-0">
            <p className="font-mono text-[0.58rem] tracking-[0.22em] text-white/40 uppercase">Deck type</p>
            <p className="font-display truncate text-[1.15rem] leading-tight font-semibold tracking-wide text-white/90 uppercase">
              {player.archetype || player.extra || "—"}
            </p>
          </div>
          <CardWell image={card.image} id={card.id} visible={Boolean(card.visible)} />
        </div>
      </div>
    </aside>
  );
}

function GameChip({ value, accent }: { value: number; accent: string }) {
  return (
    <span
      className="grid size-11 shrink-0 place-items-center rounded-sm font-display text-[1.85rem] leading-none font-semibold tabular-nums text-[#0b0c0e]"
      style={{ background: accent }}
    >
      <FadeValue value={value} />
    </span>
  );
}

function TopBar({ desk, clock }: { desk: DeskState; clock: string }) {
  return (
    <div
      className="absolute z-10 flex items-stretch overflow-hidden rounded-md"
      style={{
        left: `calc(${RAIL_W} + 1.1rem)`,
        right: `calc(${RAIL_W} + 1.1rem)`,
        top: "0.65rem",
        height: "3.7rem",
        background: "#0b0c0ecc",
        boxShadow: `inset 3px 0 0 ${SILVER}, inset -3px 0 0 ${RED}, 0 8px 28px rgb(0 0 0 / 0.45)`,
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
        <GameChip value={desk.p1.score} accent={SILVER} />
        <div className="min-w-0">
          <p className="font-mono text-[0.58rem] tracking-[0.2em] text-white/45 uppercase">LP</p>
          <p
            className={cn(
              "font-display text-[2.05rem] leading-none font-semibold tabular-nums",
              desk.p1.resource <= 0 ? "text-[#d4534c]" : "text-white",
            )}
          >
            <FadeValue value={desk.p1.resource} />
          </p>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center px-4">
        <img src="/brand/rok-mark.png" alt="" className="mb-0.5 h-5 w-5 object-contain opacity-90" />
        <p className="font-display text-[1.85rem] leading-none font-semibold tabular-nums" style={{ color: GOLD }}>
          {clock}
        </p>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-3 px-3">
        <div className="min-w-0 text-right">
          <p className="font-mono text-[0.58rem] tracking-[0.2em] text-white/45 uppercase">LP</p>
          <p
            className={cn(
              "font-display text-[2.05rem] leading-none font-semibold tabular-nums",
              desk.p2.resource <= 0 ? "text-[#d4534c]" : "text-white",
            )}
          >
            <FadeValue value={desk.p2.resource} />
          </p>
        </div>
        <GameChip value={desk.p2.score} accent={RED} />
      </div>
    </div>
  );
}

function Ticker({ desk }: { desk: DeskState }) {
  const left = [desk.eventName, desk.eventPhase].filter(Boolean).join(" · ") || "ROK Desk";
  const mid = desk.formatName || "Yu-Gi-Oh!";
  const right = desk.roundName || "Match";
  return (
    <div
      className="absolute right-0 bottom-0 left-0 z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4"
      style={{
        height: TICKER_H,
        background: "linear-gradient(90deg, #0b0c0e 0%, #16191e 50%, #0b0c0e 100%)",
        boxShadow: "inset 0 1px 0 #c5ccd644",
      }}
    >
      <div className="flex min-w-0 items-center gap-3">
        {desk.eventLogo ? (
          <img src={desk.eventLogo} alt="" className="h-8 max-w-28 object-contain" />
        ) : (
          <img src="/brand/rok-mark.png" alt="" className="size-8 object-contain" />
        )}
        <p className="font-display min-w-0 truncate text-[1.35rem] font-semibold tracking-wide text-white uppercase">
          {left}
        </p>
      </div>
      <p className="max-w-[28rem] truncate text-center font-mono text-[0.78rem] tracking-[0.16em] text-white/70 uppercase">
        {mid}
      </p>
      <p className="truncate text-right font-mono text-[0.72rem] tracking-[0.16em] uppercase" style={{ color: GOLD }}>
        {right}
      </p>
    </div>
  );
}

export function YgoPlayLayout({ desk, now = Date.now() }: { desk: DeskState; now?: number }) {
  const clock = formatClock(remainingSeconds(desk, now));
  return (
    <div data-game="yugioh" className="pointer-events-none absolute inset-0">
      <Rail desk={desk} side="p1" align="left" />
      <Rail desk={desk} side="p2" align="right" />
      <TopBar desk={desk} clock={clock} />
      <Ticker desk={desk} />
    </div>
  );
}
