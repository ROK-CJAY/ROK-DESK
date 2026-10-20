import { FadeValue } from "@/components/overlays/fade-value";
import { ManaPip } from "@/components/overlays/mana-pip";
import { WinStings } from "@/components/overlays/winner";
import { useCardImageSrc } from "@/components/ui/remote-art";
import { deckColorIdentity } from "@/lib/commander-colors";
import { formatClock, remainingSeconds, visibleCardStack, type DeskState, type PlayerSide, type SideId } from "@/lib/desk-types";
import { currentSponsor } from "@/lib/sponsors";

const BAR = "4.15rem";
const COL = "24.5rem";
const EDGE = "18rem";
const ROK_RED = "#d4534c";
const ROK_BLACK = "#000000";
const ROK_WHITE = "#ffffff";
const ROK_GRAY = "#a3a3a3";
const ROK_GRAY_DEEP = "#242424";

function recordLine(player: PlayerSide) {
  const w = Math.max(0, player.recordW || 0);
  const l = Math.max(0, player.recordL || 0);
  const d = Math.max(0, player.recordD || 0);
  return d > 0 ? `${w}-${l}-${d}` : `${w}-${l}`;
}

function GamePips({ won, needed }: { won: number; needed: number }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {Array.from({ length: needed }, (_, i) => (
        <span
          key={i}
          className="size-[0.95rem] rounded-full border-2"
          style={{ borderColor: i < won ? ROK_WHITE : ROK_GRAY, background: i < won ? ROK_WHITE : "transparent" }}
        />
      ))}
    </div>
  );
}

function LifeBadge({ value, edge }: { value: number; edge: "top" | "bottom" }) {
  const down = edge === "top";
  return (
    <div
      className="pointer-events-none absolute left-1/2 z-10 flex -translate-x-1/2 items-center justify-center"
      style={{
        width: "6.1rem",
        height: "5.15rem",
        top: down ? 0 : "auto",
        bottom: down ? "auto" : 0,
        background: ROK_RED,
        clipPath: down ? "polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)" : "polygon(50% 0, 100% 30%, 100% 100%, 0 100%, 0 30%)",
        filter: "drop-shadow(0 8px 14px rgb(0 0 0 / 0.45))",
      }}
    >
      <span
        className="font-display text-[2.85rem] leading-none font-semibold text-white tabular-nums"
        style={{ marginTop: down ? "-0.55rem" : "0.55rem" }}
      >
        <FadeValue value={value} />
      </span>
    </div>
  );
}

function roundLabel(raw: string): string {
  const text = raw.trim();
  if (!text) return "Round";
  if (/^round\b/i.test(text)) return text;
  if (/^\d+$/.test(text)) return `Round ${text}`;
  return text;
}

function ScoreBar({
  desk,
  side,
  edge,
  now,
}: {
  desk: DeskState;
  side: SideId;
  edge: "top" | "bottom";
  now: number;
}) {
  const player = desk[side];
  const needed = Math.max(1, Math.ceil(desk.bestOf / 2));
  const colors = deckColorIdentity(player.ink1, player.archetype);
  const sponsor = edge === "bottom" ? currentSponsor(desk.sponsors, now, desk.sponsorSeconds) : null;
  const manaReserve = colors.length ? 0.85 + colors.length * 1.7 : 0;
  return (
    <div
      className="absolute right-0 left-0 z-20"
      style={{
        height: BAR,
        top: edge === "top" ? 0 : "auto",
        bottom: edge === "bottom" ? 0 : "auto",
        background: ROK_BLACK,
      }}
    >
      <div className="grid h-full grid-cols-[1fr_6.4rem_1fr] items-center">
        <div className="flex min-w-0 items-center gap-3 pr-4" style={{ paddingLeft: `calc(${COL} + 0.9rem)` }}>
          <GamePips won={player.score} needed={needed} />
          <p className="font-display shrink-0 text-[1.45rem] leading-none font-semibold tabular-nums" style={{ color: ROK_WHITE }}>
            <FadeValue value={recordLine(player)} />
          </p>
          <div className="min-w-0">
            <p className="font-display truncate text-[1.7rem] leading-none font-semibold tracking-wide uppercase" style={{ color: ROK_WHITE }}>
              {player.name || "TBD"}
            </p>
            {player.pronouns.trim() ? (
              <p className="mt-1 truncate font-mono text-[0.68rem] tracking-[0.16em] uppercase" style={{ color: ROK_GRAY }}>{player.pronouns}</p>
            ) : null}
          </div>
        </div>
        <div />
        <div
          className="flex min-w-0 items-center justify-end gap-3 pl-5"
          style={{ paddingRight: `calc(${EDGE} + 0.4rem + ${manaReserve}rem)` }}
        >
          {player.secondary > 0 ? (
            <p className="shrink-0 font-mono text-[0.72rem] tracking-[0.14em] uppercase" style={{ color: ROK_GRAY }}>
              Psn <FadeValue value={player.secondary} />
            </p>
          ) : null}
          <p className="font-display min-w-0 truncate text-[1.55rem] leading-none font-semibold tracking-wide uppercase" style={{ color: ROK_WHITE }}>
            {player.archetype || ""}
          </p>
        </div>
      </div>
      <LifeBadge value={player.resource} edge={edge} />
      {colors.length ? (
        <div className="absolute inset-y-0 z-10 flex items-center gap-1" style={{ right: `calc(${EDGE} + 0.4rem)` }}>
          {colors.map((color) => (
            <ManaPip key={color} color={color} className="size-[1.45rem]" />
          ))}
        </div>
      ) : null}
      {edge === "top" ? (
        <div className="absolute inset-y-0 left-0 flex items-center" style={{ width: COL }}>
          <EventLockup desk={desk} />
        </div>
      ) : null}
      {edge === "top" ? (
        <div className="absolute inset-y-0 right-0 flex items-center justify-end gap-2.5 px-2 py-[5px]" style={{ width: EDGE }}>
          <img src="/brand/rok-mark.png" alt="" className="max-h-full w-auto max-w-[4.6rem] shrink-0 object-contain" />
          <p className="min-w-0 truncate font-display text-[1.55rem] leading-none font-semibold tracking-[0.04em] text-white uppercase">
            ROK Gaming Lounge
          </p>
        </div>
      ) : null}
      {sponsor ? (
        <div className="absolute inset-y-0 right-0 flex items-center justify-end gap-2.5 px-2 py-[5px]" style={{ width: EDGE }}>
          {sponsor.logo ? <img src={sponsor.logo} alt="" className="max-h-full w-auto max-w-[7rem] shrink-0 object-contain" /> : null}
          {sponsor.name ? (
            <p className="min-w-0 truncate font-display text-[1.55rem] leading-none font-semibold tracking-[0.04em] text-white uppercase">
              {sponsor.name}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CameraWell({ photo }: { photo: string }) {
  return (
    <div className="relative h-full min-h-0 w-full bg-transparent">
      {photo ? <img src={photo} alt="" className="absolute inset-0 size-full object-cover" /> : null}
      <div className="pointer-events-none absolute inset-0" style={{ boxShadow: `inset 0 0 0 3px ${ROK_RED}` }} />
    </div>
  );
}

function FeatureCard({ desk }: { desk: DeskState }) {
  const stack = visibleCardStack(desk);
  const card = stack[stack.length - 1];
  const show = Boolean(card && (card.image || card.id));
  const { src, onError } = useCardImageSrc(show ? card.image : "", "high", show ? card.id : "");
  const art = show && src ? src : "/mtg/card-back.png";
  return (
    <img
      key={art}
      src={art}
      alt=""
      decoding="async"
      onError={(event) => {
        if (event.currentTarget.src.endsWith("/mtg/card-back.png")) return;
        onError();
      }}
      className="h-full max-h-full w-auto max-w-full rounded-[0.45rem] bg-black object-contain shadow-[0_18px_36px_rgb(0_0_0_/_0.7)]"
    />
  );
}

function EventLockup({ desk }: { desk: DeskState }) {
  const logo = desk.eventLogo.trim();
  const title = desk.eventName.trim();
  if (!logo && !title) return null;
  return (
    <div className="flex h-full min-w-0 items-center gap-2.5 px-3 py-[5px]">
      {logo ? <img src={logo} alt="" className="max-h-full w-auto max-w-[5.5rem] shrink-0 object-contain" /> : null}
      {title ? (
        <p className="font-display min-w-0 truncate text-[1.7rem] leading-none font-semibold tracking-[0.04em] text-white uppercase">
          {title}
        </p>
      ) : null}
    </div>
  );
}

export function MtgPlayLayout({ desk, now = Date.now() }: { desk: DeskState; now?: number }) {
  const clock = formatClock(remainingSeconds(desk, now, desk.gameId));
  return (
    <div data-game="mtg" className="pointer-events-none absolute inset-0">
      <ScoreBar desk={desk} side="p1" edge="top" now={now} />
      <ScoreBar desk={desk} side="p2" edge="bottom" now={now} />
      <div className="absolute z-10 flex flex-col" style={{ top: BAR, bottom: BAR, left: 0, width: COL }}>
        <div className="min-h-0 flex-1">
          <CameraWell photo={desk.p1.photoUrl.trim()} />
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center px-3 py-2" style={{ background: "#111111" }}>
          <FeatureCard desk={desk} />
        </div>
        <div className="relative z-10 grid h-[3.25rem] shrink-0 grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="flex min-w-0 items-center px-4" style={{ background: ROK_RED }}>
            <p className="font-display truncate text-[1.85rem] leading-none font-semibold tracking-[0.08em] text-white uppercase">
              {roundLabel(desk.roundName)}
            </p>
          </div>
          <div className="flex items-center justify-end px-4" style={{ background: ROK_GRAY_DEEP }}>
            <p className="font-display text-[1.85rem] leading-none font-semibold text-white tabular-nums">{clock}</p>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <CameraWell photo={desk.p2.photoUrl.trim()} />
        </div>
      </div>
      <WinStings desk={desk} />
    </div>
  );
}
