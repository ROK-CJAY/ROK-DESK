import { cardImageUrl } from "@/lib/card-lookup";
import { formatClock, remainingSeconds, resourceLimit, type DeskState } from "@/lib/desk-types";
import { emptyPtcgSide, energyColor, type PtcgMon, type PtcgSideBoard } from "@/lib/ptcg-board";
import { PokeballIcon } from "@/components/overlays/pips";
import { cn } from "@/lib/cn";

const RAIL_W = "21.25rem";
const SLOT =
  "rounded-lg border border-[#7ec8ff]/45 bg-[#0a2d72]/90 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]";

/**
 * Landscape illustration window of a printed TCG card.
 * Art box ≈ 5.5% sides, 12.5%–50.5% from the top of the card.
 */
function CardIllustration({
  image,
  size = "high",
  className,
}: {
  image?: string;
  size?: "low" | "high";
  className?: string;
}) {
  const src = cardImageUrl(image, size);
  return (
    <div className={cn("relative overflow-hidden bg-[#061530]", className)} style={{ aspectRatio: "5 / 3" }}>
      {src ? (
        <img
          src={src}
          alt=""
          decoding="async"
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
        {now}/{max || now}
      </span>
    </div>
  );
}

function ActiveCard({ mon }: { mon: PtcgMon }) {
  return (
    <div className="flex shrink-0 flex-col gap-2">
      <div className={cn("relative overflow-hidden", SLOT)}>
        <CardIllustration image={mon.image} className="w-full" />
        <p className="pointer-events-none absolute top-2 right-2 rounded-md bg-[#071a40]/85 px-2 py-0.5 font-display text-[1.15rem] leading-none font-semibold tracking-wide text-white uppercase">
          {mon.name}
        </p>
      </div>
      <HpBar now={mon.hpNow} max={mon.hp} />
      {mon.abilities[0] ? (
        <p className="text-[0.92rem] leading-tight">
          <span className="font-semibold tracking-wide text-[#ff6b9a] uppercase">Ability</span>
          <span className="ml-2 text-[#ff9fbe]">{mon.abilities[0].name}</span>
        </p>
      ) : null}
      <div className="space-y-1">
        {mon.attacks.slice(0, 2).map((atk) => (
          <p key={atk.name} className="flex items-center justify-between gap-2 text-[1.02rem] leading-tight text-white">
            <span className="flex min-w-0 items-center gap-2">
              <EnergyPips cost={atk.cost} />
              <span className="truncate font-medium">{atk.name}</span>
            </span>
            <span className="font-mono text-[1.05rem] tabular-nums text-white/90">{atk.damage}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function BenchRow({ mon }: { mon: PtcgMon | null }) {
  if (!mon) {
    return (
      <div className={cn("grid min-h-[5.25rem] flex-1 place-items-center", SLOT, "bg-[#08245c]/90")}>
        <span className="text-[0.85rem] font-semibold tracking-[0.28em] text-white/40 uppercase">Empty</span>
      </div>
    );
  }
  return (
    <div className={cn("flex min-h-[5.25rem] flex-1 items-center gap-2.5 overflow-hidden px-2 py-1.5", SLOT)}>
      <CardIllustration image={mon.image} className="w-[min(9.25rem,46%)] shrink-0 rounded-md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[1.15rem] leading-tight font-semibold tracking-wide text-white uppercase">
          {mon.name}
        </p>
        {mon.abilities[0] ? (
          <p className="truncate text-[0.78rem]">
            <span className="font-semibold tracking-wide text-[#ff6b9a] uppercase">Ability</span>
            <span className="ml-1.5 text-[#ff9fbe]">{mon.abilities[0].name}</span>
          </p>
        ) : null}
        {mon.attacks[0] ? (
          <p className="flex items-center gap-1.5 truncate text-[0.88rem] text-white">
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
  const src = cardImageUrl(mon.image, "high");
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-2 p-2", SLOT)}>
      <div className="min-h-0 flex-1 overflow-hidden rounded-md bg-black/40">
        {src ? <img src={src} alt="" decoding="async" className="h-full w-full object-contain" /> : null}
      </div>
      <p className="font-display text-center text-lg font-semibold tracking-wide text-white uppercase">{mon.name}</p>
      {mon.abilities[0] ? (
        <p className="text-center text-[0.8rem] text-[#ff9fbe]">{mon.abilities[0].name}</p>
      ) : null}
      {mon.attacks.slice(0, 2).map((atk) => (
        <p key={atk.name} className="flex items-center justify-between text-[0.9rem] text-white">
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
          ? "border-[#7ec8ff]/70 bg-[#3ec6ff] text-[#04204a]"
          : "border-white/10 bg-black/30 text-white/35 line-through",
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
        background:
          align === "left"
            ? "linear-gradient(180deg, #0b2f6e 0%, #082552 100%)"
            : "linear-gradient(180deg, #0b3b86 0%, #082a60 100%)",
        boxShadow: align === "right" ? "inset 0 0 0 1px #3ec6ff88, 0 0 24px #2ad0ff55" : "inset 0 0 0 1px #1a4a9a",
        width: RAIL_W,
      }}
    >
      <header className="mb-2 flex shrink-0 items-start justify-between gap-2">
        <div className={cn("min-w-0", align === "right" && "order-2 text-right")}>
          <div className={cn("flex items-center gap-1.5", align === "right" && "justify-end")}>
            <span className="rounded-sm bg-white/12 px-1 py-0.5 font-mono text-[0.62rem] tracking-wider text-white/80">
              {player.country || "—"}
            </span>
            <span className="font-mono text-[0.68rem] tabular-nums text-white/70">
              {player.recordW}/{player.recordL}/{player.recordD}
            </span>
          </div>
          <p className="font-display truncate text-[1.35rem] leading-tight font-semibold tracking-wide text-white uppercase">
            {player.name || (align === "left" ? "Player 1" : "Player 2")}
          </p>
        </div>
        <p className={cn("font-display text-[2.35rem] leading-none font-semibold text-white", align === "right" && "order-1")}>
          {player.score}
        </p>
      </header>
      <div className={cn("mb-2 flex shrink-0 gap-1", align === "right" && "justify-end")}>
        {Array.from({ length: max }, (_, i) => (
          <PokeballIcon key={i} filled={i < prizes} className="size-4" />
        ))}
      </div>
      {board.active ? (
        <ActiveCard mon={board.active} />
      ) : (
        <div className={cn("grid aspect-[5/3] shrink-0 place-items-center", SLOT, "bg-[#08245c]/90")}>
          <span className="text-[0.8rem] font-semibold tracking-[0.28em] text-white/35 uppercase">Active</span>
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
          className="rounded-t-md border border-[#7ec8ff] px-6 py-1.5"
          style={{
            background: "#071a40",
            boxShadow: "0 0 18px #071a40, 0 0 0 1px #0b2f6e",
          }}
        >
          <p className="font-display text-center text-[1.1rem] tracking-[0.08em] text-white uppercase">
            {title}
            <span className="mx-2 text-[#3ec6ff]">—</span>
            <span className="font-mono tabular-nums">{clock}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
