import { useId, type CSSProperties } from "react";
import { emptyTeam, spriteFallbackUrl, spriteUrl, type TeamMon } from "@/lib/pokemon-vgc";
import type { DeskState, PlayerSide } from "@/lib/desk-types";
import { cn } from "@/lib/cn";

const W = 1920;
const H = 1080;
const PAD = 28;
const SPINE = 348;
const GAP = 18;
const RADIUS = 28;
const NAME_H = 78;
const NAME_INSET = 22;
const CAM_W = (W - PAD * 2 - GAP * 2 - SPINE) / 2;
const CAM_H = H - PAD * 2;
const P1 = { x: PAD, y: PAD, w: CAM_W, h: CAM_H };
const P2 = { x: PAD + CAM_W + GAP + SPINE + GAP, y: PAD, w: CAM_W, h: CAM_H };
const SPINE_X = PAD + CAM_W + GAP;
const CHROME = "#10131a";
const CHROME_2 = "#16191e";
const SILVER = "#c5ccd6";
const PLATE = "#f4f4f1";
const INK = "#0b0c0e";

function box(r: { x: number; y: number; w: number; h: number }): CSSProperties {
  return { left: r.x, top: r.y, width: r.w, height: r.h };
}

function MonTile({ mon, down }: { mon: TeamMon; down: boolean }) {
  const art = spriteUrl(mon);
  const empty = !mon.species.trim() && !art;
  return (
    <div
      className={cn(
        "relative h-full min-h-0 w-full overflow-hidden rounded-[1.05rem]",
        down && "opacity-40 grayscale",
      )}
      style={{
        background: "linear-gradient(180deg, #1c1f25 0%, #121418 100%)",
        boxShadow: "inset 0 0 0 1.5px rgb(197 204 214 / 0.2)",
      }}
    >
      {art ? (
        <img
          src={art}
          alt=""
          className="absolute inset-0 size-full object-contain p-1"
          onError={(event) => {
            const fallback = spriteFallbackUrl(mon);
            if (fallback && event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
          }}
        />
      ) : empty ? (
        <div className="absolute inset-[18%] rounded-full border border-white/12" />
      ) : null}
    </div>
  );
}

function NamePlate({
  player,
  x,
  y,
  w,
}: {
  player: PlayerSide;
  x: number;
  y: number;
  w: number;
}) {
  return (
    <div
      className="absolute flex items-center justify-center rounded-lg px-5"
      style={{
        left: x,
        top: y,
        width: w,
        height: NAME_H,
        background: PLATE,
        boxShadow: "0 10px 28px rgb(0 0 0 / 0.4)",
      }}
    >
      <p className="font-display min-w-0 truncate text-center text-[2.55rem] leading-none font-semibold tracking-[0.04em] uppercase" style={{ color: INK }}>
        {player.name || "TBD"}
      </p>
    </div>
  );
}

function CameraWell({
  player,
  rect,
}: {
  player: PlayerSide;
  rect: { x: number; y: number; w: number; h: number };
}) {
  const photo = player.photoUrl.trim();
  return (
    <>
      {photo ? (
        <img
          src={photo}
          alt=""
          className="absolute object-cover"
          style={{ ...box(rect), borderRadius: RADIUS }}
        />
      ) : null}
      <div
        className="absolute"
        style={{
          ...box(rect),
          borderRadius: RADIUS,
          border: `3.5px solid ${SILVER}`,
          boxShadow: "inset 0 0 0 1px rgb(11 12 14 / 0.35)",
        }}
      />
    </>
  );
}

export function VgcVersusView({ desk }: { desk: DeskState }) {
  const uid = useId().replace(/:/g, "");
  const maskId = `vgc-vs-${uid}`;
  const fillId = `vgc-vs-fill-${uid}`;
  const p1Team = emptyTeam().map((slot, i) => desk.p1.team?.[i] ?? slot);
  const p2Team = emptyTeam().map((slot, i) => desk.p2.team?.[i] ?? slot);
  const nameY = PAD + CAM_H - NAME_INSET - NAME_H;
  const nameW = CAM_W - NAME_INSET * 2;

  return (
    <div data-game="pokemon-vgc" className="pointer-events-none relative h-full w-full overflow-hidden">
      <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHROME_2} />
            <stop offset="100%" stopColor={CHROME} />
          </linearGradient>
          <mask id={maskId} maskUnits="userSpaceOnUse">
            <rect width={W} height={H} fill="white" />
            <rect x={P1.x} y={P1.y} width={P1.w} height={P1.h} rx={RADIUS} fill="black" />
            <rect x={P2.x} y={P2.y} width={P2.w} height={P2.h} rx={RADIUS} fill="black" />
          </mask>
        </defs>
        <rect width={W} height={H} fill={`url(#${fillId})`} mask={`url(#${maskId})`} />
      </svg>

      <CameraWell player={desk.p1} rect={P1} />
      <CameraWell player={desk.p2} rect={P2} />

      <div
        className="absolute flex flex-col items-center"
        style={{ left: SPINE_X, top: PAD, width: SPINE, height: CAM_H }}
      >
        <div className="flex h-[8.5rem] w-full shrink-0 items-center justify-center px-3 pt-2">
          {desk.eventLogo ? (
            <img src={desk.eventLogo} alt="" className="max-h-[7.6rem] max-w-full object-contain" />
          ) : (
            <img src="/brand/rok-mark.png" alt="" className="h-16 w-16 object-contain opacity-90" />
          )}
        </div>

        <div className="relative min-h-0 w-full flex-1 px-3.5">
          <div className="grid h-full grid-cols-2 grid-rows-6 gap-x-12 gap-y-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={`p1-${i}`} className="min-h-0" style={{ gridColumn: 1, gridRow: i + 1 }}>
                <MonTile mon={p1Team[i]} down={Boolean(desk.p1.down?.[i])} />
              </div>
            ))}
            {Array.from({ length: 6 }, (_, i) => (
              <div key={`p2-${i}`} className="min-h-0" style={{ gridColumn: 2, gridRow: i + 1 }}>
                <MonTile mon={p2Team[i]} down={Boolean(desk.p2.down?.[i])} />
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <p
              className="font-display leading-none font-semibold tracking-tight text-white uppercase"
              style={{
                fontSize: "7.2rem",
                textShadow: "0 4px 0 rgb(11 12 14 / 0.35), 0 10px 28px rgb(0 0 0 / 0.55)",
              }}
            >
              VS
            </p>
          </div>
        </div>

        <div className="h-[calc(78px+22px)] w-full shrink-0" />
      </div>

      <NamePlate player={desk.p1} x={P1.x + NAME_INSET} y={nameY} w={nameW} />
      <NamePlate player={desk.p2} x={P2.x + NAME_INSET} y={nameY} w={nameW} />
      <div
        className="absolute flex items-center justify-center rounded-lg px-3"
        style={{
          left: SPINE_X + 18,
          top: nameY,
          width: SPINE - 36,
          height: NAME_H,
          background: PLATE,
          boxShadow: "0 10px 28px rgb(0 0 0 / 0.4)",
        }}
      >
        <p className="font-display min-w-0 truncate text-center text-[1.55rem] leading-none font-semibold tracking-[0.12em] uppercase" style={{ color: INK }}>
          {desk.roundName || "Match"}
        </p>
      </div>
    </div>
  );
}
