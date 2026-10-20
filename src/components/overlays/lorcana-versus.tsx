import type { ReactNode } from "react";
import { ManaPip } from "@/components/overlays/mana-pip";
import { deckColorIdentity } from "@/lib/commander-colors";
import type { DeskState, PlayerSide, SideId } from "@/lib/desk-types";
import { formatRecord, inkSrc, isLorcanaInk } from "@/lib/lorcana";

const CYAN = "#00eeff";
const PINK = "#ff4791";
const WELL_TOP = 36;
const WELL_BOTTOM = 28;
const WELL_W = 640;
const WELL_X = 48;
const WELL_H = 1080 - WELL_TOP - WELL_BOTTOM;
const WELL_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><mask id="m"><rect width="1920" height="1080" fill="white"/><rect x="${WELL_X}" y="${WELL_TOP}" width="${WELL_W}" height="${WELL_H}" fill="black"/><rect x="${1920 - WELL_X - WELL_W}" y="${WELL_TOP}" width="${WELL_W}" height="${WELL_H}" fill="black"/></mask></defs><rect width="1920" height="1080" fill="white" mask="url(#m)"/></svg>`,
)}")`;

function PlayerFrame({
  desk,
  side,
  marks,
}: {
  desk: DeskState;
  side: SideId;
  marks: (player: PlayerSide) => ReactNode;
}) {
  const player = desk[side];
  const right = side === "p2";
  const accent = right ? PINK : CYAN;
  const photo = player.photoUrl.trim();
  const deck = player.archetype.trim();
  const record = formatRecord(player.recordW, player.recordL, player.recordD);
  return (
    <div
      className="absolute flex flex-col"
      style={{
        top: WELL_TOP,
        bottom: WELL_BOTTOM,
        width: WELL_W,
        left: right ? undefined : WELL_X,
        right: right ? WELL_X : undefined,
      }}
    >
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 overflow-hidden bg-transparent">
          {photo ? <img src={photo} alt="" className="size-full object-cover" /> : null}
        </div>
        <div className="pointer-events-none absolute inset-0" style={{ boxShadow: `inset 0 0 0 3px ${accent}` }} />
        <div className="pointer-events-none absolute" style={{ inset: 8, boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.55)" }} />
        <div
          className="absolute grid place-items-center font-display text-[1.7rem] leading-none font-bold tracking-[0.08em] text-[#111]"
          style={{
            top: -2,
            width: 92,
            height: 54,
            left: right ? 16 : undefined,
            right: right ? undefined : 16,
            background: accent,
            clipPath: "polygon(8% 0, 100% 0, 92% 100%, 0 100%)",
          }}
        >
          {right ? "P2" : "P1"}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-center bg-black px-4 py-3">
        <p className="w-full truncate text-center font-display text-[1.85rem] leading-none font-semibold text-white">
          {player.name || (right ? "Player 2" : "Player 1")}
        </p>
        {deck ? (
          <p className="mt-1.5 w-full truncate text-center font-display text-[1.15rem] leading-none font-semibold tracking-[0.08em] text-white/70 uppercase">
            {deck}
          </p>
        ) : null}
        {marks(player)}
        <p className="mt-1 font-mono text-[0.95rem] tracking-[0.16em] text-white/80 uppercase">{record}</p>
      </div>
    </div>
  );
}

function InkPair({ player }: { player: PlayerSide }) {
  const inks = [player.ink1, player.ink2].filter(isLorcanaInk);
  return (
    <div className="mt-3 flex h-12 items-center justify-center gap-3">
      {inks.length ? (
        inks.map((ink) => <img key={ink} src={inkSrc(ink)} alt="" className="size-12 drop-shadow-[0_2px_6px_rgb(0_0_0_/_0.65)]" />)
      ) : (
        <span className="size-12 rounded-full border border-white/25" />
      )}
    </div>
  );
}

function ManaRow({ player }: { player: PlayerSide }) {
  const colors = deckColorIdentity(player.ink1, player.archetype);
  if (!colors.length) return <div className="mt-3 h-12" />;
  return (
    <div className="mt-3 flex h-12 items-center justify-center gap-2">
      {colors.map((color) => (
        <ManaPip key={color} color={color} className="size-9" />
      ))}
    </div>
  );
}

function CityVersus({ desk, game, marks }: { desk: DeskState; game: string; marks: (player: PlayerSide) => ReactNode }) {
  const logo = desk.eventLogo.trim() || "/overlays/rok-wordmark.png";
  const title = desk.eventName.trim() || "Tournament";
  const roundRaw = desk.roundName.trim();
  const round = !roundRaw ? "" : /^round\b/i.test(roundRaw) ? roundRaw : /^\d+$/.test(roundRaw) ? `Round ${roundRaw}` : roundRaw;
  return (
    <div data-game={game} className="relative h-full w-full overflow-hidden bg-transparent">
      <img
        src="/overlays/stream-city-full.png"
        alt=""
        className="absolute inset-0 size-full object-cover object-center"
        style={{
          WebkitMaskImage: WELL_MASK,
          maskImage: WELL_MASK,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
        }}
      />
      <div
        className="absolute inset-y-0"
        style={{
          width: 520,
          left: "calc(50% - 260px)",
          background: "linear-gradient(90deg, transparent, rgb(0 0 0 / 0.28) 20%, rgb(0 0 0 / 0.4) 50%, rgb(0 0 0 / 0.28) 80%, transparent)",
        }}
      />
      <PlayerFrame desk={desk} side="p1" marks={marks} />
      <PlayerFrame desk={desk} side="p2" marks={marks} />
      <div
        className="absolute top-0 bottom-0 flex w-[460px] flex-col items-center justify-center text-center"
        style={{ left: "calc(50% - 230px)" }}
      >
        {logo ? <img src={logo} alt="" className="max-h-40 max-w-[18rem] object-contain drop-shadow-[0_10px_18px_rgb(0_0_0_/_0.55)]" /> : null}
        <p className="mt-5 max-w-full truncate font-display text-[1.7rem] leading-none font-semibold tracking-[0.18em] text-white uppercase">
          {title}
        </p>
        <div className="mt-5 h-px w-44" style={{ background: `linear-gradient(90deg, ${CYAN}, ${PINK})` }} />
        <p
          className="mt-6 font-display text-[7.5rem] leading-none font-bold tracking-[0.06em] text-white"
          style={{ textShadow: "0 10px 24px rgb(0 0 0 / 0.55)" }}
        >
          VS
        </p>
        <p className="mt-4 font-mono text-[1rem] tracking-[0.22em] text-white/75 uppercase">
          {[round, desk.bestOf > 1 ? `Best of ${desk.bestOf}` : ""].filter(Boolean).join(" · ") || "Match"}
        </p>
      </div>
    </div>
  );
}

export function LorcanaVersus({ desk }: { desk: DeskState }) {
  return <CityVersus desk={desk} game="lorcana" marks={(player) => <InkPair player={player} />} />;
}

export function MtgVersus({ desk }: { desk: DeskState }) {
  return <CityVersus desk={desk} game="mtg" marks={(player) => <ManaRow player={player} />} />;
}

export function OpVersus({ desk }: { desk: DeskState }) {
  return <CityVersus desk={desk} game="one-piece" marks={() => null} />;
}
