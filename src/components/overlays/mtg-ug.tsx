import { FadeValue } from "@/components/overlays/fade-value";
import { WinStings } from "@/components/overlays/winner";
import { useCardImageSrc } from "@/components/ui/remote-art";
import { formatClock, remainingSeconds, type DeskState, type PlayerSide, type SideId, type SpotlightCard } from "@/lib/desk-types";

const RAIL = "20rem";
const TOP = "6.5rem";
const CAM = "14.5rem";
const RED = "#d4534c";
const GRAY = "#3a3d42";
const BLACK = "#000000";
const WHITE = "#ffffff";
const BACK = "/mtg/card-back.png";

function recordLine(player: PlayerSide) {
  const w = Math.max(0, player.recordW || 0);
  const l = Math.max(0, player.recordL || 0);
  const d = Math.max(0, player.recordD || 0);
  return d > 0 ? `${w}-${l}-${d}` : `${w}-${l}`;
}

function roundLabel(raw: string): string {
  const text = raw.trim();
  if (!text) return "Round";
  if (/^round\b/i.test(text)) return text;
  if (/^\d+$/.test(text)) return `Round ${text}`;
  return text;
}

function flagEmoji(code: string) {
  const cc = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(...[...cc].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65));
}

function Heart({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-7 shrink-0">
      <path
        fill={color}
        d="M12 20.2s-7.2-4.5-7.2-9.3C4.8 8 6.7 6.1 9.2 6.1c1.4 0 2.5.7 3 1.7.5-1 1.6-1.7 3-1.7 2.5 0 4.4 1.9 4.4 4.8 0 4.8-7.2 9.3-7.2 9.3z"
      />
    </svg>
  );
}

function NamePlate({ desk, side }: { desk: DeskState; side: SideId }) {
  const player = desk[side];
  const right = side === "p2";
  const accent = right ? GRAY : RED;
  const flag = flagEmoji(player.country);
  const meta = [player.pronouns.trim(), recordLine(player), player.archetype.trim()].filter(Boolean).join("  |  ");
  return (
    <div
      className="flex h-full min-w-0 items-center gap-3 px-4"
      style={{
        background: accent,
        flexDirection: right ? "row-reverse" : "row",
        paddingRight: right ? "1rem" : "9rem",
        paddingLeft: right ? "9rem" : "1rem",
      }}
    >
      <div className="grid h-[4.4rem] min-w-[4.6rem] place-items-center bg-white px-2">
        <span className="font-display text-[2.7rem] leading-none font-semibold text-black tabular-nums">
          <FadeValue value={player.resource} />
        </span>
      </div>
      <div className="grid h-[3.3rem] min-w-[2.6rem] place-items-center bg-black px-2">
        <span className="font-display text-[1.8rem] leading-none font-semibold text-white tabular-nums">
          <FadeValue value={player.score} />
        </span>
      </div>
      {flag ? <span className="shrink-0 text-[1.7rem] leading-none">{flag}</span> : null}
      <div className={right ? "min-w-0 text-right" : "min-w-0"}>
        <p className="font-display truncate text-[2.15rem] leading-none font-semibold tracking-wide text-white uppercase">
          {player.name || "TBD"}
        </p>
        {meta ? (
          <p className="mt-1.5 truncate text-[0.95rem] leading-none text-white/85">{meta}</p>
        ) : null}
      </div>
    </div>
  );
}

function CameraWell({ photo, accent }: { photo: string; accent: string }) {
  return (
    <div className="relative h-full w-full bg-transparent">
      {photo ? <img src={photo} alt="" className="absolute inset-0 size-full object-cover" /> : null}
      <div className="pointer-events-none absolute inset-1.5" style={{ boxShadow: `inset 0 0 0 3px ${accent}` }} />
    </div>
  );
}

function SideCard({ card }: { card?: SpotlightCard }) {
  const show = Boolean(card?.visible && (card.image || card.id));
  const { src, onError } = useCardImageSrc(show ? card?.image : "", "high", show ? card?.id : "");
  const art = show && src ? src : BACK;
  return (
    <img
      key={art}
      src={art}
      alt=""
      decoding="async"
      onError={(event) => {
        if (event.currentTarget.src.endsWith(BACK)) return;
        onError();
      }}
      className="h-full max-h-full w-auto max-w-full rounded-[0.35rem] object-contain shadow-[0_16px_32px_rgb(0_0_0_/_0.55)]"
    />
  );
}

function Rail({ desk, side }: { desk: DeskState; side: SideId }) {
  const right = side === "p2";
  const accent = right ? GRAY : RED;
  const player = desk[side];
  const card = desk.sideSpotlight?.[side];
  return (
    <div
      className="absolute bottom-0 z-10 flex flex-col"
      style={{ top: TOP, width: RAIL, [right ? "right" : "left"]: 0, background: BLACK }}
    >
      <div className="shrink-0" style={{ height: CAM }}>
        <CameraWell photo={player.photoUrl.trim()} accent={accent} />
      </div>
      <div className="flex h-[3.1rem] shrink-0 items-center gap-2 px-4" style={{ flexDirection: right ? "row-reverse" : "row" }}>
        <Heart color={accent === GRAY ? WHITE : RED} />
        <p className="font-display text-[2.1rem] leading-none font-semibold text-white tabular-nums">
          <FadeValue value={player.resource} />
        </p>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-3 pt-1 pb-3">
        <SideCard card={card} />
      </div>
    </div>
  );
}

export function MtgUgLayout({ desk, now = Date.now() }: { desk: DeskState; now?: number }) {
  const clock = formatClock(remainingSeconds(desk, now, desk.gameId));
  return (
    <div data-game="mtg" className="pointer-events-none absolute inset-0">
      <div className="absolute inset-x-0 top-0 z-20 grid grid-cols-2" style={{ height: TOP }}>
        <NamePlate desk={desk} side="p1" />
        <NamePlate desk={desk} side="p2" />
      </div>
      <div className="absolute top-0 left-1/2 z-30 flex h-[6.5rem] -translate-x-1/2 flex-col items-center justify-center bg-black px-5">
        <img src="/brand/rok-mark.png" alt="" className="h-11 w-auto object-contain" />
        <p className="mt-1 font-display text-[1.15rem] leading-none font-semibold tracking-[0.08em] text-white uppercase">
          ROK Gaming Lounge
        </p>
      </div>
      <Rail desk={desk} side="p1" />
      <Rail desk={desk} side="p2" />
      <div
        className="pointer-events-none absolute z-10"
        style={{ top: TOP, right: RAIL, bottom: 0, left: RAIL, boxShadow: "inset 0 0 0 3px #ffffff" }}
      />
      <div className="absolute left-1/2 z-30 flex -translate-x-1/2 overflow-hidden border-2 border-white bg-black" style={{ top: "calc(6.5rem + 1.15rem)" }}>
        <p className="px-4 py-1.5 font-display text-[1.55rem] leading-none font-semibold tracking-[0.08em] text-white uppercase">
          {roundLabel(desk.roundName)}
        </p>
        <div className="w-0.5 self-stretch bg-white" />
        <p className="px-4 py-1.5 font-display text-[1.55rem] leading-none font-semibold text-white tabular-nums">{clock}</p>
      </div>
      <img
        src="/brand/rok-mark.png"
        alt=""
        className="absolute bottom-3 left-3 z-20 h-16 w-auto object-contain drop-shadow-[0_6px_16px_rgb(0_0_0_/_0.8)]"
      />
      <WinStings desk={desk} />
    </div>
  );
}
