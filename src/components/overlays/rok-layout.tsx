import { InitiativeMark } from "@/components/desk/initiative";
import { cardImageUrl } from "@/lib/card-lookup";
import { formatClock, remainingSeconds, resourceLimit, type DeskState, type SideId } from "@/lib/desk-types";
import { formatRecord, gameDiamonds, inkSrc, isLorcanaInk, type LorcanaInkId } from "@/lib/lorcana";
import { PokeballIcon } from "@/components/overlays/pips";
import { cn } from "@/lib/cn";

const WELL = "20.5rem";

export function rokCardBack(desk: DeskState): string {
  if (desk.gameId === "mtg") return "/mtg/card-back.png";
  if (desk.gameId === "yugioh") return "/ygo/card-back.png";
  if (desk.gameId === "pokemon-tcg") return "/ptcg/card-back-v2.png";
  if (desk.gameId === "riftbound") return "/riftbound/card-back.png";
  if (desk.gameId === "swu") return "/swu/card-back.png";
  return "/lorcana/card-back.png";
}

export function rokDiamondCount(desk: DeskState): number {
  if (
    desk.gameId === "mtg" ||
    desk.gameId === "yugioh" ||
    desk.gameId === "pokemon-tcg" ||
    desk.gameId === "riftbound" ||
    desk.gameId === "swu"
  ) {
    return Math.max(1, desk.bestOf);
  }
  return gameDiamonds(desk.bestOf);
}

export function RokLayoutView({ desk, now = Date.now() }: { desk: DeskState; now?: number }) {
  const clock = formatClock(remainingSeconds(desk, now));
  const card = desk.cardSpotlight;
  const fallback = rokCardBack(desk);
  const showCard = Boolean(card?.visible && card.image);
  const cardSrc = showCard ? cardImageUrl(card.image, "high") : fallback;

  return (
    <div data-game={desk.gameId} className="pointer-events-none absolute inset-0">
      <RokSide desk={desk} side="p1" clock={clock} cardSrc={cardSrc} fallback={fallback} />
      <RokSide desk={desk} side="p2" clock={clock} cardSrc={cardSrc} fallback={fallback} />
    </div>
  );
}

function RokSide({
  desk,
  side,
  clock,
  cardSrc,
  fallback,
}: {
  desk: DeskState;
  side: SideId;
  clock: string;
  cardSrc: string;
  fallback: string;
}) {
  const player = desk[side];
  const right = side === "p2";
  const lorcana = desk.gameId === "lorcana";
  const mtg = desk.gameId === "mtg";
  const ygo = desk.gameId === "yugioh";
  const ptcg = desk.gameId === "pokemon-tcg";
  const riftbound = desk.gameId === "riftbound";
  const swu = desk.gameId === "swu";
  const hasInit = swu && desk.initiativeSide === side;
  const max = resourceLimit(desk);
  const needed = rokDiamondCount(desk);
  const inks = [player.ink1, player.ink2].filter(isLorcanaInk);

  return (
    <div className={cn("absolute inset-y-0 flex", right ? "right-0 flex-row-reverse" : "left-0")}>
      <div className="flex flex-col" style={{ width: WELL }}>
        <div className="bg-black pt-3">
          <NamePlate name={player.name} />
        </div>
        <div className="relative aspect-[4/5] overflow-hidden border-2 border-ov-fg/80 bg-transparent">
          {lorcana ? (
            <div className={cn("absolute top-2.5 flex gap-2", right ? "left-2.5" : "right-2.5")}>
              {inks.map((ink) => (
                <InkEmblem key={ink} ink={ink} />
              ))}
            </div>
          ) : null}
          {hasInit ? (
            <div className={cn("absolute top-2.5", right ? "left-2.5" : "right-2.5")}>
              <InitiativeMark live />
            </div>
          ) : null}
        </div>
        <div className="flex min-h-0 flex-1 flex-col bg-black px-3 pt-2 pb-4">
          {mtg ? <MtgMeters life={player.resource} poison={player.secondary} /> : null}
          {ygo ? (
            <div className="mb-3">
              <LifeMeter label="LP" value={player.resource} />
            </div>
          ) : null}
          {swu ? (
            <div className="mb-3">
              <LifeMeter label="Base HP" value={player.resource} />
            </div>
          ) : null}
          <div className="mx-auto w-[9.2rem] bg-ov-fg px-2.5 py-1 text-center">
            <p className="font-display text-[1.4rem] leading-none font-semibold tabular-nums text-ov-bg">
              {formatRecord(player.recordW, player.recordL, player.recordD)}
            </p>
          </div>
          <div className="mt-2.5 flex justify-center gap-2.5">
            {Array.from({ length: needed }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "inline-block size-5 rotate-45 border-2",
                  i < player.score ? "border-[#e4c56a] bg-[#e4c56a]" : "border-[#e4c56a]/80 bg-transparent",
                )}
              />
            ))}
          </div>
          <div className="mt-auto">
            {!right ? (
              <>
                {desk.roundName.trim() ? (
                  <p className="font-display mb-2 text-[2.6rem] leading-none font-semibold tracking-wide text-ov-fg uppercase">
                    {desk.roundName}
                  </p>
                ) : null}
                <div className="min-h-12 border border-ov-fg/35 px-3 py-1.5">
                  <p className="font-display text-center text-[2.05rem] leading-none font-semibold tabular-nums tracking-wide text-ov-fg">
                    {clock}
                  </p>
                </div>
              </>
            ) : (
              <img
                src={cardSrc}
                alt=""
                className="mx-auto w-[15.5rem] rounded-[0.7rem] border border-[#d4b46a]/50 shadow-[0_18px_40px_rgb(0_0_0_/_0.55)]"
                onError={(event) => {
                  event.currentTarget.src = fallback;
                }}
              />
            )}
          </div>
        </div>
      </div>

      {lorcana || ptcg || riftbound ? (
        <div className="flex w-[2.65rem] shrink-0 flex-col">
          <div className="invisible pt-3">
            <NamePlate name={player.name} />
          </div>
          <div className="w-full" style={{ height: `calc(${WELL} * 5 / 4)` }}>
            {ptcg ? (
              <PrizeBallBar remaining={Math.min(max, Math.max(0, player.resource))} max={max} />
            ) : (
              <LoreLadder value={Math.min(max, Math.max(0, player.resource))} max={max} />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NamePlate({ name }: { name: string }) {
  return (
    <div className="bg-ov-fg px-3.5 py-2">
      <p className="font-display truncate text-center text-[2.55rem] leading-none font-semibold tracking-tight text-ov-bg uppercase">
        {name || "TBD"}
      </p>
    </div>
  );
}

function LifeMeter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm border border-ov-fg/20 px-2 py-1.5 text-center">
      <p className="font-mono text-[0.62rem] tracking-[0.16em] text-ov-fg/65 uppercase">{label}</p>
      <p className="font-display text-[2.55rem] leading-none font-semibold tabular-nums text-ov-fg">{value}</p>
    </div>
  );
}

function MtgMeters({ life, poison }: { life: number; poison: number }) {
  return (
    <div className="mb-3 grid grid-cols-2 gap-2">
      <div className="rounded-sm border border-ov-fg/20 px-2 py-1.5 text-center">
        <p className="font-mono text-[0.62rem] tracking-[0.16em] text-ov-fg/65 uppercase">Life</p>
        <p className="font-display text-[2.35rem] leading-none font-semibold tabular-nums text-ov-fg">{life}</p>
      </div>
      <div className="rounded-sm border border-ov-fg/20 px-2 py-1.5 text-center">
        <p className="font-mono text-[0.62rem] tracking-[0.16em] text-ov-fg/65 uppercase">Poison</p>
        <p
          className={cn(
            "font-display text-[2.35rem] leading-none font-semibold tabular-nums",
            poison >= 10 ? "text-[#e05a5a]" : "text-ov-fg",
          )}
        >
          {poison}
        </p>
      </div>
    </div>
  );
}

function PrizeBallBar({ remaining, max }: { remaining: number; max: number }) {
  const count = Math.max(1, max);
  return (
    <ol className="flex h-full w-full flex-col bg-[#8b1e22]">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="flex min-h-0 flex-1 items-center justify-center border border-black/45">
          <PokeballIcon filled={i < remaining} className="size-6" />
        </li>
      ))}
    </ol>
  );
}

function LoreLadder({ value, max }: { value: number; max: number }) {
  const top = Math.max(1, max);
  const steps = Array.from({ length: top + 1 }, (_, i) => top - i);
  return (
    <ol className="flex h-full w-full flex-col">
      {steps.map((n) => {
        const current = n === value;
        const zero = n === 0;
        return (
          <li
            key={n}
            className={cn(
              "flex min-h-0 flex-1 items-center justify-center border border-black/50 text-[0.82rem] font-bold tabular-nums",
              zero ? "bg-[#e2b13a] text-[#2a1a04]" : "bg-[#8b1e22] text-[#f3d6d4]",
              current && "ring-2 ring-ov-fg ring-inset",
            )}
          >
            {n}
          </li>
        );
      })}
    </ol>
  );
}

function InkEmblem({ ink }: { ink: LorcanaInkId }) {
  return (
    <img
      src={inkSrc(ink)}
      alt=""
      title={ink}
      className="size-10 drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.65)]"
    />
  );
}
