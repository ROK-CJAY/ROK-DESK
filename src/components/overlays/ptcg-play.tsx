import { useCardImageSrc } from "@/components/ui/remote-art";
import { FadeValue } from "@/components/overlays/fade-value";
import { formatClock, remainingSeconds, resourceLimit, type DeskState } from "@/lib/desk-types";
import { emptyPtcgSide, energyColor, type PtcgMon, type PtcgSideBoard } from "@/lib/ptcg-board";
import { PokeballIcon } from "@/components/overlays/pips";
import { OV_DEEP, OV_RAIL } from "@/lib/overlay-look";
import { cn } from "@/lib/cn";
import { WinStings } from "@/components/overlays/winner";

const RAIL_W = "21.25rem";
const SLOT =
  "rounded-lg border border-ov-fg/20 bg-ov-panel/95 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.45)]";
const ABILITY = "text-game";
const ABILITY_NAME = "text-game";

/**
 * Landscape illustration window of a printed TCG card.
 * Art box ≈ 5.5% sides, 12.5%–50.5% from the top of the card.
 */
function CardIllustration({
  image,
  id,
  size = "high",
  className,
}: {
  image?: string;
  id?: string;
  size?: "low" | "high";
  className?: string;
}) {
  const { src, onError } = useCardImageSrc(image, size, id);
  return (
    <div className={cn("relative overflow-hidden bg-ov-panel-deep", className)} style={{ aspectRatio: "5 / 3" }}>
      {src ? (
        <img
          key={src}
          src={src}
          alt=""
          decoding="async"
          onError={onError}
          className="pointer-events-none absolute max-w-none select-none"
          style={{
            width: "119%",
            left: "-9.5%",
            top: "-28%",
            height: "auto",
          }}
        />
      ) : null}
    </div>
  );
}

function EnergyPips({ cost, dim = "size-3" }: { cost: string[]; dim?: string }) {
  if (!cost.length) return null;
  return (
    <span className="inline-flex items-center gap-0.5">
      {cost.map((type, i) => (
        <span
          key={`${type}-${i}`}
          className={cn("rounded-full border border-white/40 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]", dim)}
          style={{ background: energyColor(type) }}
          title={type}
        />
      ))}
    </span>
  );
}

function hpFill(now: number, max: number) {
  const cap = max || now || 1;
  const pct = Math.max(0, Math.min(100, (now / cap) * 100));
  const fill = pct <= 10 ? "#ff3b3b" : pct <= 30 ? "#ff8a1f" : "#3dff6a";
  return { pct, fill };
}

function HpBar({ now, max, compact = false }: { now: number; max: number; compact?: boolean }) {
  const { pct, fill } = hpFill(now, max);
  return (
    <div className="flex items-center gap-2">
      <div className={cn("min-w-0 flex-1 overflow-hidden rounded-full bg-black/45", compact ? "h-1.5" : "h-2")}>
        <div
          className="h-full rounded-full transition-[width,background-color] duration-300"
          style={{ width: `${pct}%`, background: fill, boxShadow: `0 0 8px ${fill}` }}
        />
      </div>
      <span
        className={cn("font-mono shrink-0 tabular-nums", compact ? "text-[0.78rem]" : "text-[0.95rem]")}
        style={{ color: fill }}
      >
        <FadeValue value={`${now}/${max || now}`} />
      </span>
    </div>
  );
}

function ActiveCard({ mon }: { mon: PtcgMon }) {
  return (
    <div className="flex shrink-0 flex-col gap-2">
      <div className={cn("relative overflow-hidden", SLOT)}>
        <CardIllustration image={mon.image} id={mon.id} className="w-full" />
        <p className="pointer-events-none absolute top-2 right-2 rounded-sm bg-ov-fg px-2 py-0.5 font-display text-[1.15rem] leading-none font-semibold tracking-wide text-[color:var(--color-ov-panel-deep)] uppercase">
          {mon.name}
        </p>
      </div>
      <HpBar now={mon.hpNow} max={mon.hp} />
      {mon.abilities[0] ? (
        <p className="text-[0.92rem] leading-tight">
          <span className={cn("font-semibold tracking-wide uppercase", ABILITY)}>Ability</span>
          <span className={cn("ml-2", ABILITY_NAME)}>{mon.abilities[0].name}</span>
        </p>
      ) : null}
      <div className="space-y-1">
        {mon.attacks.slice(0, 2).map((atk) => (
          <p key={atk.name} className="flex items-center justify-between gap-2 text-[1.02rem] leading-tight text-ov-fg">
            <span className="flex min-w-0 items-center gap-2">
              <EnergyPips cost={atk.cost} />
              <span className="truncate font-medium">{atk.name}</span>
            </span>
            <span className="font-mono text-[1.05rem] tabular-nums text-ov-fg/90">{atk.damage}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function BenchRow({ mon }: { mon: PtcgMon | null }) {
  if (!mon) {
    return (
      <div className={cn("grid min-h-[5.25rem] flex-1 place-items-center", SLOT, "bg-ov-panel/90")}>
        <span className="text-[0.85rem] font-semibold tracking-[0.28em] text-ov-fg/40 uppercase">Empty</span>
      </div>
    );
  }
  return (
    <div className={cn("flex min-h-[5.25rem] flex-1 items-center gap-2.5 overflow-hidden px-2 py-1.5", SLOT)}>
      <CardIllustration image={mon.image} id={mon.id} className="w-[min(9.25rem,46%)] shrink-0 rounded-md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[1.15rem] leading-tight font-semibold tracking-wide text-ov-fg uppercase">
          {mon.name}
        </p>
        {mon.abilities[0] ? (
          <p className="truncate text-[0.78rem]">
            <span className={cn("font-semibold tracking-wide uppercase", ABILITY)}>Ability</span>
            <span className={cn("ml-1.5", ABILITY_NAME)}>{mon.abilities[0].name}</span>
          </p>
        ) : null}
        {mon.attacks[0] ? (
          <p className="flex items-center gap-1.5 truncate text-[0.88rem] text-ov-fg">
            <EnergyPips cost={mon.attacks[0].cost} dim="size-2.5" />
            <span className="truncate">{mon.attacks[0].name}</span>
            {mon.attacks[0].damage ? <span className="font-mono">{mon.attacks[0].damage}</span> : null}
          </p>
        ) : null}
        <HpBar now={mon.hpNow} max={mon.hp} compact />
      </div>
    </div>
  );
}

function SpotlightOverBench({ mon }: { mon: PtcgMon }) {
  const { src, onError } = useCardImageSrc(mon.image, "high", mon.id);
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-2 p-2", SLOT)}>
      <div className="min-h-0 flex-1 overflow-hidden rounded-md bg-black/40">
        {src ? <img key={src} src={src} alt="" decoding="async" onError={onError} className="h-full w-full object-contain" /> : null}
      </div>
      <p className="font-display text-center text-lg font-semibold tracking-wide text-ov-fg uppercase">{mon.name}</p>
      {mon.abilities[0] ? (
        <p className={cn("text-center text-[0.8rem]", ABILITY_NAME)}>{mon.abilities[0].name}</p>
      ) : null}
      {mon.attacks.slice(0, 2).map((atk) => (
        <p key={atk.name} className="flex items-center justify-between text-[0.9rem] text-ov-fg">
          <span className="flex items-center gap-1.5">
            <EnergyPips cost={atk.cost} />
            {atk.name}
          </span>
          <span className="font-mono">{atk.damage}</span>
        </p>
      ))}
    </div>
  );
}

function TurnChips({ board }: { board: PtcgSideBoard }) {
  const chip = (on: boolean, label: string) => (
    <span
      className={cn(
        "flex-1 rounded-md border px-1 py-1.5 text-center text-[0.68rem] font-semibold tracking-[0.14em] uppercase",
        on
          ? "border-live bg-live text-ov-fg"
          : "border-ov-fg/10 bg-black/40 text-ov-fg/35 line-through",
      )}
    >
      {label}
    </span>
  );
  return (
    <div className="mt-auto flex gap-1.5 pt-2">
      {chip(board.energy, "Energy")}
      {chip(board.supporter, "Supporter")}
      {chip(board.retreat, "Retreat")}
    </div>
  );
}

function Rail({
  desk,
  side,
  align,
}: {
  desk: DeskState;
  side: "p1" | "p2";
  align: "left" | "right";
}) {
  const player = desk[side];
  const board = desk.ptcgBoard?.[side] ?? emptyPtcgSide();
  const max = resourceLimit(desk);
  const prizes = Math.max(0, Math.min(max, player.resource));

  return (
    <aside
      className={cn(
        "absolute inset-y-0 flex flex-col px-2.5 pt-2.5 pb-3",
        align === "left" ? "left-0" : "right-0",
      )}
      style={{
        background: OV_RAIL,
        boxShadow: align === "right" ? "inset 0 0 0 1px color-mix(in srgb, var(--color-ov-muted) 53%, transparent), 0 0 18px color-mix(in srgb, var(--color-live) 20%, transparent)" : "inset 0 0 0 1px color-mix(in srgb, var(--color-ov-muted) 22%, transparent)",
        width: RAIL_W,
      }}
    >
      <header className="mb-2 flex shrink-0 items-start justify-between gap-2">
        <div className={cn("min-w-0 flex-1", align === "right" && "order-2 text-right")}>
          <div className={cn("flex items-center gap-2", align === "right" && "justify-end")}>
            <span className="rounded-sm bg-ov-fg/12 px-1.5 py-0.5 font-mono text-[0.95rem] leading-none tracking-wider text-ov-fg/90">
              {player.country || "—"}
            </span>
            <span className="font-mono text-[1.05rem] leading-none tabular-nums text-ov-fg/80">
              <FadeValue value={`${player.recordW}/${player.recordL}/${player.recordD}`} />
            </span>
          </div>
          <div className={cn("mt-0.5 flex items-center gap-2", align === "right" && "flex-row-reverse")}>
            <p className="font-display min-w-0 flex-1 truncate text-[2rem] leading-tight font-semibold tracking-wide text-ov-fg uppercase">
              {player.name || (align === "left" ? "Player 1" : "Player 2")}
            </p>
            <div className="flex shrink-0 gap-0.5">
              {Array.from({ length: max }, (_, i) => (
                <PokeballIcon key={i} filled={i < prizes} className="size-5" />
              ))}
            </div>
          </div>
        </div>
        <p className={cn("font-display text-[2.35rem] leading-none font-semibold text-ov-fg", align === "right" && "order-1")}>
          <FadeValue value={player.score} />
        </p>
      </header>
      {board.active ? (
        <ActiveCard mon={board.active} />
      ) : (
        <div className={cn("grid aspect-[5/3] shrink-0 place-items-center", SLOT, "bg-ov-panel/90")}>
          <span className="text-[0.8rem] font-semibold tracking-[0.28em] text-ov-fg/35 uppercase">Active</span>
        </div>
      )}
      <div className="mt-2 flex min-h-0 flex-1 flex-col gap-1.5">
        {board.spotlight ? (
          <SpotlightOverBench mon={board.spotlight} />
        ) : (
          (board.bench ?? []).map((mon, i) => <BenchRow key={i} mon={mon} />)
        )}
      </div>
      <TurnChips board={board} />
    </aside>
  );
}

export function PtcgPlayLayout({ desk, now = Date.now() }: { desk: DeskState; now?: number }) {
  const clock = formatClock(remainingSeconds(desk, now));
  const title = [desk.eventName, desk.eventPhase, desk.roundName].filter(Boolean).join(" · ") || "Round";
  return (
    <div data-game="pokemon-tcg" className="pointer-events-none absolute inset-0">
      <Rail desk={desk} side="p1" align="left" />
      <Rail desk={desk} side="p2" align="right" />
      <div
        className="absolute bottom-0 z-10 flex justify-center"
        style={{ left: RAIL_W, right: RAIL_W }}
      >
        <div
          className="rounded-t-md border border-white/25 px-6 py-1.5"
          style={{
            background: OV_DEEP,
            boxShadow: "0 0 18px var(--color-ov-panel-deep), 0 0 0 1px color-mix(in srgb, var(--color-ov-muted) 28%, transparent)",
          }}
        >
          <p className="font-display text-center text-[1.1rem] tracking-[0.08em] text-ov-fg uppercase">
            {title}
            <span className="mx-2 text-live">—</span>
            <span className="font-mono tabular-nums">{clock}</span>
          </p>
        </div>
      </div>
      <WinStings desk={desk} />
    </div>
  );
}
