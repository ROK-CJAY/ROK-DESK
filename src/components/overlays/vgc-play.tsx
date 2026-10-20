import { FadeValue } from "@/components/overlays/fade-value";
import { emptyTeam, spriteFallbackUrl, spriteUrl, type TeamMon } from "@/lib/pokemon-vgc";
import type { DeskState, PlayerSide } from "@/lib/desk-types";
import { OV_CHROME, OV_LIVE, OV_RAIL } from "@/lib/overlay-look";
import { cn } from "@/lib/cn";
import { PresentedByBar } from "@/components/overlays/presented-by";
import { WinStings } from "@/components/overlays/winner";

const RED = OV_LIVE;
const CYAN = "#00eeff";
const PINK = "#ff4791";
const SILVER = OV_CHROME;
const PLATE = OV_RAIL;

function recordOf(player: PlayerSide) {
  return `${Math.max(0, player.recordW || 0)}/${Math.max(0, player.recordL || 0)}/${Math.max(0, player.recordD || 0)}`;
}

function MonTile({ mon, down }: { mon: TeamMon; down: boolean }) {
  const art = spriteUrl(mon);
  const empty = !mon.species.trim() && !art;
  return (
    <div
      className={cn(
        "relative min-h-0 overflow-hidden rounded-lg",
        down && "opacity-40 grayscale",
      )}
      style={{
        background: OV_RAIL,
        boxShadow: "inset 0 0 0 1px rgb(197 204 214 / 0.18)",
      }}
    >
      {art ? (
        <img
          src={art}
          alt=""
          className="absolute inset-0 size-full object-contain p-0.5"
          onError={(event) => {
            const fallback = spriteFallbackUrl(mon);
            if (fallback && event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
          }}
        />
      ) : empty ? (
        <div className="absolute inset-[22%] rounded-full border border-white/12" />
      ) : null}
    </div>
  );
}

function ScorePip({ value, color = RED }: { value: number; color?: string }) {
  return (
    <span
      className="grid size-[3.15rem] shrink-0 place-items-center rounded-full font-display text-[1.85rem] leading-none font-semibold text-[#111]"
      style={{ background: color, boxShadow: `0 0 0 2px rgb(244 244 241 / 0.16), 0 6px 14px ${color}88` }}
    >
      <FadeValue value={value} />
    </span>
  );
}

function SideCard({
  player,
  align,
  accent,
}: {
  player: PlayerSide;
  align: "left" | "right";
  accent?: string;
}) {
  const team = emptyTeam().map((slot, i) => player.team?.[i] ?? slot);
  const right = align === "right";
  return (
    <div
      className="flex min-w-0 flex-col overflow-hidden rounded-lg"
      style={{
        background: PLATE,
        boxShadow: accent
          ? `inset 0 0 0 2px ${accent}, 0 14px 36px rgb(0 0 0 / 0.45)`
          : "inset 0 0 0 1px rgb(197 204 214 / 0.22), 0 14px 36px rgb(0 0 0 / 0.45)",
      }}
    >
      <div
        className={cn(
          "flex h-[4.55rem] shrink-0 items-center gap-3 px-3.5",
          right && "flex-row-reverse",
        )}
      >
        <p
          className={cn(
            "font-display min-w-0 flex-1 truncate text-[2.15rem] leading-none font-semibold tracking-wide uppercase",
            right && "text-right",
          )}
          style={{ color: accent ?? "var(--color-ov-fg)" }}
        >
          {player.name || (right ? "Player 2" : "Player 1")}
        </p>
        <ScorePip value={player.score} color={accent} />
        <span className="font-mono shrink-0 text-[1.35rem] leading-none tabular-nums tracking-wide text-ov-fg/88">
          <FadeValue value={recordOf(player)} />
        </span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-6 gap-1.5 px-3 pt-0.5 pb-2.5">
        {team.map((mon, i) => (
          <MonTile key={`${mon.species}-${i}`} mon={mon} down={Boolean(player.down?.[i])} />
        ))}
      </div>
    </div>
  );
}

function CameraWell({ player, accent = SILVER }: { player: PlayerSide; accent?: string }) {
  const photo = player.photoUrl.trim();
  return (
    <div className="relative h-full min-h-0 bg-transparent">
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
          border: `3px solid ${accent}`,
          background: "none",
          boxShadow: "none",
        }}
      />
    </div>
  );
}

export function VgcPlayLayout({ desk, tone = "rok" }: { desk: DeskState; now?: number; tone?: "rok" | "stream" }) {
  const stream = tone === "stream";
  const p1 = stream ? CYAN : undefined;
  const p2 = stream ? PINK : undefined;
  return (
    <div data-game={desk.gameId} className="pointer-events-none absolute inset-0">
      <div
        className="absolute top-0 right-0 left-0 z-10 grid items-stretch gap-x-3 px-5 pt-4"
        style={{
          bottom: "auto",
          height: "12.15rem",
          gridTemplateColumns: "16.75rem minmax(0,1fr) 11.25rem minmax(0,1fr) 16.75rem",
        }}
      >
        <CameraWell player={desk.p1} accent={p1} />
        <SideCard player={desk.p1} align="left" accent={p1} />
        <div className="flex min-h-0 flex-col items-center justify-center px-1">
          {desk.eventLogo ? (
            <img src={desk.eventLogo} alt="" className="max-h-[7.4rem] max-w-full object-contain drop-shadow-[0_8px_18px_rgb(0_0_0_/_0.45)]" />
          ) : (
            <img src={stream ? "/overlays/rok-wordmark.png" : "/brand/rok-mark.png"} alt="" className={stream ? "h-14 max-w-full object-contain" : "h-16 w-16 object-contain opacity-90"} />
          )}
          <p className="font-display mt-1.5 max-w-full truncate text-center text-[1.15rem] leading-none font-semibold tracking-[0.16em] text-ov-fg uppercase">
            {desk.roundName || "Match"}
          </p>
        </div>
        <SideCard player={desk.p2} align="right" accent={p2} />
        <CameraWell player={desk.p2} accent={p2} />
      </div>
      <div className="absolute right-0 bottom-5 left-0 z-20 flex justify-center">
        <PresentedByBar desk={desk} />
      </div>
      <WinStings desk={desk} />
    </div>
  );
}
