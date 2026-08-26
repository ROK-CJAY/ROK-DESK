import { FadeValue } from "@/components/overlays/fade-value";
import { useCardImageSrc } from "@/components/ui/remote-art";
import {
  emptySpotlight,
  formatClock,
  remainingSeconds,
  resourceLimit,
  type DeskState,
  type PlayerSide,
} from "@/lib/desk-types";
import { formatRecord, gameDiamonds, inkSrc, isLorcanaInk } from "@/lib/lorcana";
import { cn } from "@/lib/cn";

const SILVER = "#c5ccd6";
const GOLD = "#e4c56a";
const RAIL_BG = "linear-gradient(180deg, #16191e 0%, #0b0c0e 100%)";
const INFO_W = "20.75rem";
const LORE_W = "3.15rem";
const BACK = "/lorcana/card-back.png";

function CameraWell({ player, seat }: { player: PlayerSide; seat: "P1" | "P2" }) {
  const photo = player.photoUrl.trim();
  return (
    <div className="relative h-[30.5rem] w-full shrink-0 bg-transparent">
      {photo ? (
        <img src={photo} alt="" className="absolute inset-0 size-full object-cover" />
      ) : null}
      <div
        className="pointer-events-none absolute inset-0 bg-transparent"
        style={{ border: `3px solid ${SILVER}`, background: "none" }}
      />
      <span
        className="absolute right-2 bottom-2 font-mono text-[0.72rem] tracking-[0.18em] text-white uppercase"
        style={{ textShadow: "0 1px 6px rgb(0 0 0 / 0.85)" }}
      >
        {seat}
      </span>
    </div>
  );
}

function InkSlot({ ink }: { ink: string }) {
  if (isLorcanaInk(ink)) {
    return (
      <img
        src={inkSrc(ink)}
        alt=""
        title={ink}
        className="size-11 drop-shadow-[0_2px_4px_rgb(0_0_0_/_0.65)]"
      />
    );
  }
  return (
    <span
      className="size-11"
      style={{
        clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
        background: "rgb(197 204 214 / 0.1)",
        boxShadow: "inset 0 0 0 2px rgb(197 204 214 / 0.28)",
      }}
    />
  );
}

function InkRow({ player }: { player: PlayerSide }) {
  return (
    <div className="flex h-11 items-center justify-center gap-2.5">
      <InkSlot ink={player.ink1} />
      <InkSlot ink={player.ink2} />
    </div>
  );
}

function Diamonds({ won, needed }: { won: number; needed: number }) {
  return (
    <div className="flex justify-center gap-2.5">
      {Array.from({ length: needed }, (_, i) => (
        <span
          key={i}
          className={cn(
            "inline-block size-[1.15rem] rotate-45 border-2 transition-[background-color,border-color,box-shadow] duration-300",
            i < won
              ? "border-[#e4c56a] bg-[#e4c56a] shadow-[0_0_10px_rgb(228_197_106_/_0.45)]"
              : "border-[#e4c56a]/75 bg-transparent",
          )}
        />
      ))}
    </div>
  );
}

function CardSlot({ desk, side }: { desk: DeskState; side: "p1" | "p2" }) {
  const card = desk.sideSpotlight?.[side] ?? emptySpotlight();
  const show = Boolean(card.visible && (card.image || card.id));
  const { src, onError } = useCardImageSrc(show ? card.image : "", "high", show ? card.id : "");
  const cardSrc = show && src ? src : BACK;
  return (
    <div className="h-[24.5rem] shrink-0 overflow-hidden">
      <img
        key={cardSrc}
        src={cardSrc}
        alt=""
        decoding="async"
        onError={(event) => {
          if (event.currentTarget.src.endsWith(BACK)) return;
          onError();
          event.currentTarget.src = BACK;
        }}
        className="h-full w-full object-contain object-bottom"
      />
    </div>
  );
}

function LoreTrack({ value, max }: { value: number; max: number }) {
  const top = Math.max(1, max);
  const lore = Math.max(0, Math.min(top, value));
  const steps = Array.from({ length: top }, (_, i) => top - i);
  return (
    <div
      className="flex h-full shrink-0 flex-col"
      style={{
        width: LORE_W,
        background: "#10131a",
        boxShadow: "inset 0 0 0 1px rgb(197 204 214 / 0.16)",
      }}
    >
      <p
        className={cn(
          "font-mono shrink-0 py-1.5 text-center text-[0.68rem] tracking-[0.16em] uppercase",
          lore >= top ? "text-[#e4c56a]" : "text-white/40",
        )}
      >
        Win
      </p>
      <ol className="flex min-h-0 flex-1 flex-col">
        {steps.map((n) => {
          const current = n === lore;
          const reached = n <= lore && lore > 0;
          return (
            <li
              key={n}
              className={cn(
                "flex min-h-0 flex-1 items-center justify-center text-[1.2rem] font-bold tabular-nums transition-[background-color,color] duration-300",
                current
                  ? "bg-[#e4c56a] text-[#1a1408]"
                  : reached
                    ? "text-[#e4c56a]"
                    : "text-white/42",
              )}
            >
              {n}
            </li>
          );
        })}
      </ol>
      <p
        className={cn(
          "font-mono shrink-0 py-1.5 text-center text-[0.62rem] tracking-[0.12em] uppercase",
          lore === 0 ? "text-[#e4c56a]" : "text-white/40",
        )}
      >
        Start
      </p>
    </div>
  );
}

function Rail({
  desk,
  player,
  side,
}: {
  desk: DeskState;
  player: PlayerSide;
  side: "p1" | "p2";
}) {
  const right = side === "p2";
  const max = resourceLimit(desk);
  const needed = gameDiamonds(desk.bestOf);
  const record = formatRecord(player.recordW, player.recordL, player.recordD);
  return (
    <div className={cn("absolute inset-y-0 flex", right ? "right-0 flex-row-reverse" : "left-0")}>
      <div className="flex h-full flex-col overflow-hidden" style={{ width: INFO_W, background: RAIL_BG }}>
        <CameraWell player={player} seat={right ? "P2" : "P1"} />
        <div className="flex shrink-0 flex-col items-center gap-1.5 px-3 pt-2 pb-1">
          <p className="font-display w-full truncate text-center text-[2.05rem] leading-[1.05] font-semibold tracking-wide text-white uppercase">
            {player.name || (right ? "Player 2" : "Player 1")}
          </p>
          <InkRow player={player} />
          <Diamonds won={player.score} needed={needed} />
          <p className="font-mono text-[0.95rem] tracking-[0.14em] text-white/70 uppercase">
            <FadeValue value={record} />
          </p>
        </div>
        <CardSlot desk={desk} side={side} />
      </div>
      <LoreTrack value={player.resource} max={max} />
    </div>
  );
}

function TopCenter({ desk, clock }: { desk: DeskState; clock: string }) {
  const logo = desk.eventLogo.trim() || "/brand/rok-mark.png";
  const headline =
    [desk.eventPhase.trim(), desk.roundName.trim()].filter(Boolean).join(" · ") || "Match";
  return (
    <div className="absolute top-3 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center">
      <img
        src={logo}
        alt=""
        className="h-[4.4rem] max-w-[11rem] object-contain drop-shadow-[0_8px_16px_rgb(0_0_0_/_0.5)]"
      />
      <div
        className="mt-1.5 flex items-center gap-3 rounded-md px-3.5 py-1"
        style={{
          background: "#10131af0",
          boxShadow: "inset 0 0 0 1px rgb(197 204 214 / 0.18)",
        }}
      >
        <p className="font-display max-w-[28rem] truncate text-[1.35rem] leading-none font-semibold tracking-[0.14em] text-white uppercase">
          {headline}
        </p>
        <span className="h-4 w-px bg-white/25" />
        <p className="font-display text-[1.35rem] leading-none font-semibold tabular-nums tracking-wide text-white">
          {clock}
        </p>
      </div>
    </div>
  );
}

export function LorcanaPlayLayout({ desk, now = Date.now() }: { desk: DeskState; now?: number }) {
  const clock = formatClock(remainingSeconds(desk, now));
  return (
    <div data-game="lorcana" className="pointer-events-none absolute inset-0">
      <Rail desk={desk} player={desk.p1} side="p1" />
      <Rail desk={desk} player={desk.p2} side="p2" />
      <TopCenter desk={desk} clock={clock} />
    </div>
  );
}
