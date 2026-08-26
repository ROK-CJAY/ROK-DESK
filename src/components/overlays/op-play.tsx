import { FadeValue } from "@/components/overlays/fade-value";
import { useCardImageSrc } from "@/components/ui/remote-art";
import {
  formatClock,
  remainingSeconds,
  resourceLimit,
  emptySpotlight,
  type DeskState,
  type PlayerSide,
} from "@/lib/desk-types";
import { liveSponsors } from "@/lib/sponsors";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

const SILVER = "#c5ccd6";
const GOLD = "#e4c56a";
const PLATE = "#10131af2";
const COL_W = "24rem";

function Chip({
  children,
  align,
}: {
  children: ReactNode;
  align: "left" | "right";
}) {
  return (
    <div
      className={cn("absolute top-4 rounded-lg px-6 py-2.5", align === "left" ? "left-4" : "right-4")}
      style={{
        background: PLATE,
        boxShadow: "inset 0 0 0 1px rgb(197 204 214 / 0.2), 0 10px 24px rgb(0 0 0 / 0.4)",
      }}
    >
      {children}
    </div>
  );
}

function CameraWell({ player, align }: { player: PlayerSide; align: "left" | "right" }) {
  const photo = player.photoUrl.trim();
  return (
    <div className="relative h-[20.5rem] w-full shrink-0 bg-transparent">
      {photo ? (
        <img
          src={photo}
          alt=""
          className="absolute inset-0 size-full object-cover"
          style={{ borderRadius: "1rem" }}
        />
      ) : null}
      <div
        className="pointer-events-none absolute inset-0 bg-transparent"
        style={{
          borderRadius: "1rem",
          border: `3.5px solid ${SILVER}`,
          background: "none",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 rounded-b-[1rem] px-3.5 pt-10 pb-2.5"
        style={{ background: "linear-gradient(180deg, transparent 0%, rgb(11 12 14 / 0.92) 58%)" }}
      >
        <p
          className={cn(
            "font-display truncate text-[2.15rem] leading-none font-semibold tracking-wide text-white uppercase",
            align === "right" && "text-right",
          )}
        >
          {player.name || (align === "right" ? "Player 2" : "Player 1")}
        </p>
      </div>
    </div>
  );
}

function LifePips({ remaining, max }: { remaining: number; max: number }) {
  const count = Math.max(1, max);
  return (
    <div className="flex items-center justify-center gap-2.5">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={cn(
            "size-5 rounded-full border-[2.5px] transition-[background-color,border-color] duration-300",
            i < remaining ? "border-[#e4c56a] bg-[#e4c56a]" : "border-[#e4c56a]/50 bg-transparent",
          )}
        />
      ))}
    </div>
  );
}

function CardSlot({ desk, side }: { desk: DeskState; side: "p1" | "p2" }) {
  const card = desk.sideSpotlight?.[side] ?? emptySpotlight();
  const fallback = "/op/card-back.png";
  const show = Boolean(card.visible && (card.image || card.id));
  const { src, onError } = useCardImageSrc(show ? card.image : "", "high", show ? card.id : "");
  const cardSrc = show && src ? src : fallback;
  return (
    <div className="relative mt-3 min-h-0 min-w-0 flex-1 overflow-hidden">
      <img
        key={cardSrc}
        src={cardSrc}
        alt=""
        decoding="async"
        onError={(event) => {
          if (event.currentTarget.src.endsWith(fallback)) return;
          onError();
          event.currentTarget.src = fallback;
        }}
        className="absolute inset-0 m-auto max-h-full max-w-full object-contain rounded-[0.65rem] border border-[#d4b46a]/45"
      />
    </div>
  );
}

function InfoWell({ desk, player, side }: { desk: DeskState; player: PlayerSide; side: "p1" | "p2" }) {
  const max = resourceLimit(desk);
  const life = Math.max(0, Math.min(max, player.resource));
  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl px-4 pt-4 pb-3"
      style={{
        background: "linear-gradient(180deg, #1a1d22 0%, #10131a 100%)",
        boxShadow: "inset 0 0 0 1px rgb(197 204 214 / 0.16)",
      }}
    >
      <div className="shrink-0">
        <p className="font-mono mb-2 text-center text-[0.72rem] tracking-[0.22em] text-white/50 uppercase">Life</p>
        <LifePips remaining={life} max={max} />
      </div>
      <div className="mt-4 flex shrink-0 items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[0.72rem] tracking-[0.2em] text-white/50 uppercase">DON!!</p>
          <p className="font-display text-[3.1rem] leading-none font-semibold tabular-nums" style={{ color: GOLD }}>
            <FadeValue value={player.secondary} />
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[0.72rem] tracking-[0.2em] text-white/50 uppercase">Games</p>
          <p className="font-display text-[3.1rem] leading-none font-semibold tabular-nums text-white">
            <FadeValue value={player.score} />
          </p>
        </div>
      </div>
      <CardSlot desk={desk} side={side} />
    </div>
  );
}

function SideColumn({
  desk,
  player,
  align,
}: {
  desk: DeskState;
  player: PlayerSide;
  align: "left" | "right";
}) {
  return (
    <aside
      className={cn("absolute top-[5.6rem] flex flex-col gap-3", align === "left" ? "left-4" : "right-4")}
      style={{ width: COL_W, bottom: "6.75rem" }}
    >
      <CameraWell player={player} align={align} />
      <InfoWell desk={desk} player={player} side={align === "left" ? "p1" : "p2"} />
    </aside>
  );
}

function SponsorRow({ desk }: { desk: DeskState }) {
  const rows = liveSponsors(desk.sponsors).slice(0, 4);
  if (rows.length === 0) return null;
  return (
    <div className="absolute bottom-4 left-4 flex max-w-[28rem] items-end gap-3">
      {rows.map((row) =>
        row.logo ? (
          <img
            key={row.id}
            src={row.logo}
            alt={row.name}
            className="h-14 max-w-[8.5rem] object-contain drop-shadow-[0_6px_14px_rgb(0_0_0_/_0.55)]"
          />
        ) : (
          <p
            key={row.id}
            className="font-display text-xl leading-none font-semibold tracking-wide text-white uppercase drop-shadow-[0_2px_8px_rgb(0_0_0_/_0.8)]"
          >
            {row.name}
          </p>
        ),
      )}
    </div>
  );
}

function EventMark({ desk }: { desk: DeskState }) {
  const src = desk.eventLogo.trim() || "/brand/rok-mark.png";
  return (
    <div className="absolute right-4 bottom-4">
      <img
        src={src}
        alt=""
        className="h-[4.6rem] max-w-[11rem] object-contain drop-shadow-[0_8px_18px_rgb(0_0_0_/_0.55)]"
      />
    </div>
  );
}

export function OpPlayLayout({ desk, now = Date.now() }: { desk: DeskState; now?: number }) {
  const clock = formatClock(remainingSeconds(desk, now));
  return (
    <div data-game="one-piece" className="pointer-events-none absolute inset-0">
      <Chip align="left">
        <p className="font-display text-[2.7rem] leading-none font-semibold tracking-[0.14em] text-white uppercase">
          {desk.roundName || "Match"}
        </p>
      </Chip>
      <Chip align="right">
        <p className="font-display text-[2.7rem] leading-none font-semibold tabular-nums tracking-wide text-white">
          {clock}
        </p>
      </Chip>
      <SideColumn desk={desk} player={desk.p1} align="left" />
      <SideColumn desk={desk} player={desk.p2} align="right" />
      <SponsorRow desk={desk} />
      <EventMark desk={desk} />
    </div>
  );
}
