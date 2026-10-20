import { FadeValue } from "@/components/overlays/fade-value";
import { ManaPip } from "@/components/overlays/mana-pip";
import { WinStings } from "@/components/overlays/winner";
import { useCardImageSrc } from "@/components/ui/remote-art";
import { deckColorIdentity } from "@/lib/commander-colors";
import { formatClock, remainingSeconds, type DeskState, type PlayerSide, type SideId, type SpotlightCard } from "@/lib/desk-types";
import { currentPresentedSponsor, type Sponsor } from "@/lib/sponsors";

const CYAN = "#00eeff";
const PINK = "#ff4791";
const DECK = "#616161";

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

function CityBackdrop() {
  return (
    <img
      src="/overlays/stream-city.png"
      alt=""
      className="pointer-events-none absolute"
      style={{ top: 66, left: 0, width: 1920, height: 905 }}
    />
  );
}

function Frame({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) {
  return (
    <div
      className="pointer-events-none absolute"
      style={{ left: x, top: y, width: w, height: h, boxShadow: `inset 0 0 0 3px ${color}` }}
    />
  );
}

function LifeBadge({ value, side }: { value: number; side: SideId }) {
  const right = side === "p2";
  return (
    <div
      className="absolute z-20 grid place-items-center"
      style={{
        left: right ? 1713 : 121,
        top: 356,
        width: right ? 84 : 85,
        height: 74,
        background: right
          ? "linear-gradient(180deg, #ff5aa0 0%, #c2185b 100%)"
          : "linear-gradient(180deg, #5af0ff 0%, #0090a8 100%)",
        clipPath: "polygon(12% 0, 88% 0, 100% 28%, 100% 62%, 50% 100%, 0 62%, 0 28%)",
        filter: "drop-shadow(0 6px 10px rgb(0 0 0 / 0.55))",
      }}
    >
      <span className="font-display text-[2.5rem] leading-none font-bold text-white tabular-nums" style={{ marginTop: -8 }}>
        <FadeValue value={value} />
      </span>
    </div>
  );
}

const BACK = "/overlays/mtg-card-back.png";

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
      className="absolute max-w-none object-cover"
      style={{ top: 8, left: 8, width: "calc(100% - 16px)", height: "calc(100% - 16px)" }}
    />
  );
}

function GamePips({ won, needed, align }: { won: number; needed: number; align: "left" | "right" }) {
  return (
    <div className="absolute z-30 flex items-center gap-[7px]" style={{ top: 1006, left: align === "left" ? 353 : 1498 }}>
      {Array.from({ length: needed }, (_, i) => (
        <span
          key={i}
          className="size-[33px] rounded-full border-[3px] border-white"
          style={{ background: i < won ? "#fff" : "transparent" }}
        />
      ))}
    </div>
  );
}

function SponsorSlot({ sponsor }: { sponsor: Sponsor | null }) {
  if (!sponsor) return null;
  return (
    <>
      <p
        className="absolute z-10 font-display text-[1.7rem] leading-none font-bold tracking-[0.04em] text-white uppercase"
        style={{ top: 896, right: 336 }}
      >
        Presented by:
      </p>
      <div className="absolute z-10 flex items-center justify-center" style={{ left: 1607, top: 868, width: 297, height: 84 }}>
        {sponsor.logo ? (
          <img src={sponsor.logo} alt="" className="max-h-[84px] max-w-[297px] object-contain" />
        ) : (
          <p className="truncate font-display text-[1.7rem] leading-none font-bold tracking-[0.04em] text-white uppercase">{sponsor.name}</p>
        )}
      </div>
    </>
  );
}

export function MtgStreamLayout({ desk, now = Date.now() }: { desk: DeskState; now?: number }) {
  const clock = formatClock(remainingSeconds(desk, now, desk.gameId));
  const needed = Math.max(1, Math.ceil(desk.bestOf / 2));
  const sponsor = currentPresentedSponsor(desk.sponsors, desk.eventLogo, now, desk.sponsorSeconds);
  const round = roundLabel(desk.roundName);
  const played = desk.p1.score + desk.p2.score;
  const decided = desk.p1.score >= needed || desk.p2.score >= needed;
  const game = decided ? Math.max(1, played) : Math.min(desk.bestOf, played + 1);
  const headerLeft = desk.bestOf === 1 ? round : `${round} - Game ${game}`;
  return (
    <div data-game="mtg" className="pointer-events-none absolute inset-0">
      <CityBackdrop />

      <div className="absolute inset-x-0 top-0 z-20 h-[70px] bg-black" />
      <div
        className="absolute inset-x-0 z-20 h-2"
        style={{ top: 62, background: `linear-gradient(90deg, ${CYAN}, ${PINK})` }}
      />
      <p className="absolute z-30 font-display text-[2.05rem] leading-none font-bold tracking-[0.04em] text-white uppercase" style={{ left: 39, top: 20 }}>
        {headerLeft}
      </p>
      <p className="absolute z-30 font-display text-[2.05rem] leading-none font-bold tracking-[0.04em] text-white uppercase" style={{ right: 40, top: 20 }}>
        {desk.eventName.trim() || "Tournament"}
      </p>

      <div
        className="absolute z-30 flex flex-col items-center justify-center text-white"
        style={{
          left: 869,
          top: 0,
          width: 181,
          height: 125,
          background: "linear-gradient(180deg, #e23b3b 0%, #b00609 100%)",
          clipPath: "polygon(0 0, 100% 0, 100% 72%, 50% 100%, 0 72%)",
          filter: "drop-shadow(0 8px 14px rgb(0 0 0 / 0.45))",
        }}
      >
        <p className="font-display text-[1.35rem] leading-none font-bold tracking-[0.08em] uppercase">{round}</p>
        <p className="mt-1 font-display text-[2.6rem] leading-none font-bold tabular-nums">{clock}</p>
      </div>

      <Frame x={335} y={148} w={1249} h={704} color="transparent" />
      <div
        className="pointer-events-none absolute z-10"
        style={{
          left: 335,
          top: 148,
          width: 1249,
          height: 704,
          border: "3px solid transparent",
          borderImage: `linear-gradient(90deg, ${CYAN}, #ffffff 50%, ${PINK}) 1`,
        }}
      />

      <div className="absolute z-10 overflow-hidden" style={{ left: 15, top: 147, width: 297, height: 259 }}>
        {desk.p1.photoUrl.trim() ? <img src={desk.p1.photoUrl} alt="" className="size-full object-cover" /> : null}
      </div>
      <Frame x={15} y={147} w={297} h={259} color={CYAN} />
      <LifeBadge value={desk.p1.resource} side="p1" />
      <div className="absolute z-10" style={{ left: 15, top: 447, width: 297, height: 406 }}>
        <SideCard card={desk.sideSpotlight?.p1} />
      </div>
      <Frame x={15} y={447} w={297} h={406} color={CYAN} />

      <div className="absolute z-10 overflow-hidden" style={{ left: 1607, top: 147, width: 297, height: 259 }}>
        {desk.p2.photoUrl.trim() ? <img src={desk.p2.photoUrl} alt="" className="size-full object-cover" /> : null}
      </div>
      <Frame x={1607} y={147} w={297} h={259} color={PINK} />
      <LifeBadge value={desk.p2.resource} side="p2" />
      <div className="absolute z-10" style={{ left: 1607, top: 447, width: 297, height: 406 }}>
        <SideCard card={desk.sideSpotlight?.p2} />
      </div>
      <Frame x={1607} y={447} w={297} h={406} color={PINK} />

      <SponsorSlot sponsor={sponsor} />

      <div className="absolute inset-x-0 bottom-0 z-20 h-[111px] bg-black" />
      <div
        className="absolute inset-x-0 z-20 h-2"
        style={{ top: 969, background: `linear-gradient(90deg, ${PINK}, ${CYAN})` }}
      />

      <div className="absolute z-30" style={{ left: 39, top: 994 }}>
        <p className="font-display text-[1.9rem] leading-none font-bold tracking-[0.04em] text-white uppercase">
          {desk.p1.name || "Player One"}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <p className="font-display text-[1.35rem] leading-none font-bold tracking-[0.06em] uppercase" style={{ color: DECK }}>
            {desk.p1.archetype || "Deck"}
          </p>
          {deckColorIdentity(desk.p1.ink1, desk.p1.archetype).map((color) => (
            <ManaPip key={color} color={color} className="size-[1.15rem]" />
          ))}
        </div>
      </div>
      <GamePips won={desk.p1.score} needed={needed} align="left" />
      <p className="absolute z-30 font-display text-[1.9rem] leading-none font-bold text-white tabular-nums" style={{ left: 457, top: 1010 }}>
        <FadeValue value={recordLine(desk.p1)} />
      </p>

      <div className="absolute z-30 text-right" style={{ right: 40, top: 994 }}>
        <p className="font-display text-[1.9rem] leading-none font-bold tracking-[0.04em] text-white uppercase">
          {desk.p2.name || "Player Two"}
        </p>
        <div className="mt-2 flex items-center justify-end gap-2">
          {deckColorIdentity(desk.p2.ink1, desk.p2.archetype).map((color) => (
            <ManaPip key={color} color={color} className="size-[1.15rem]" />
          ))}
          <p className="font-display text-[1.35rem] leading-none font-bold tracking-[0.06em] uppercase" style={{ color: DECK }}>
            {desk.p2.archetype || "Deck"}
          </p>
        </div>
      </div>
      <GamePips won={desk.p2.score} needed={needed} align="right" />
      <p className="absolute z-30 font-display text-[1.9rem] leading-none font-bold text-white tabular-nums" style={{ left: 1422, top: 1010 }}>
        <FadeValue value={recordLine(desk.p2)} />
      </p>

      <img
        src={desk.eventLogo.trim() || "/overlays/rok-wordmark.png"}
        alt=""
        className="absolute z-40 object-contain"
        style={{ left: 829, top: 875, width: 262, height: 177 }}
      />
      <WinStings desk={desk} />
    </div>
  );
}
