import { cardImageUrl } from "@/lib/card-lookup";
import { formatClock, remainingSeconds, resourceLimit, type DeskState, type SideId } from "@/lib/desk-types";
import { formatRecord, gameDiamonds, inkSrc, isLorcanaInk, type LorcanaInkId } from "@/lib/lorcana";
import { cn } from "@/lib/cn";

export function RokLayoutView({ desk, now = Date.now() }: { desk: DeskState; now?: number }) {
  const clock = formatClock(remainingSeconds(desk, now));
  const card = desk.cardSpotlight;
  const showCard = Boolean(card?.visible && card.image);
  const cardSrc = showCard ? cardImageUrl(card.image, "high") : "/lorcana/card-back.png";

  return (
    <div data-game={desk.gameId} className="pointer-events-none absolute inset-0">
      <RokSide desk={desk} side="p1" />
      <RokSide desk={desk} side="p2" />
      <div className="absolute bottom-[3.6%] left-[1.4%] w-[20rem]">
        {desk.roundName.trim() ? (
          <p className="font-display text-[3.4rem] leading-none font-semibold tracking-wide text-ov-fg uppercase [text-shadow:0_2px_12px_rgb(0_0_0_/_0.65)]">
            {desk.roundName}
          </p>
        ) : null}
        <div className="mt-2 min-h-12 border border-ov-fg/35 bg-ov-bg/70 px-3 py-1.5">
          <p className="font-display text-center text-[2.05rem] leading-none font-semibold tabular-nums tracking-wide text-ov-fg">
            {clock}
          </p>
        </div>
      </div>
      <figure className="absolute right-[1.4%] bottom-[2.6%] w-[15.5rem]">
        <img
          src={cardSrc}
          alt=""
          className="w-full rounded-[0.7rem] border border-[#d4b46a]/50 shadow-[0_18px_40px_rgb(0_0_0_/_0.55)]"
          onError={(event) => {
            event.currentTarget.src = "/lorcana/card-back.png";
          }}
        />
      </figure>
    </div>
  );
}

function RokSide({ desk, side }: { desk: DeskState; side: SideId }) {
  const player = desk[side];
  const right = side === "p2";
  const max = resourceLimit(desk);
  const lore = Math.min(max, Math.max(0, player.resource));
  const needed = gameDiamonds(desk.bestOf);
  const inks = [player.ink1, player.ink2].filter(isLorcanaInk);

  return (
    <div className={cn("absolute top-[1.8%] flex items-start", right ? "right-[1%] flex-row-reverse" : "left-[1%]")}>
      <div className="w-[22.5rem]">
        <div className={cn("flex items-stretch", right && "flex-row-reverse")}>
          <div className="min-w-0 flex-1">
            <div className="rounded-sm bg-ov-fg px-3.5 py-2">
              <p className="font-display truncate text-center text-[2.55rem] leading-none font-semibold tracking-tight text-ov-bg uppercase">
                {player.name || "TBD"}
              </p>
            </div>
            <div className="relative mt-2 aspect-[4/5] overflow-hidden rounded-sm border border-ov-fg/25 bg-black">
              <div className={cn("absolute top-2.5 flex gap-2", right ? "left-2.5" : "right-2.5")}>
                {inks.map((ink) => (
                  <InkEmblem key={ink} ink={ink} />
                ))}
              </div>
            </div>
          </div>
          <LoreLadder value={lore} max={max} flip={right} />
        </div>
        <div className="relative mx-auto -mt-px w-[9.2rem]">
          <div className="bg-ov-fg px-2.5 py-1 text-center">
            <p className="font-display text-[1.4rem] leading-none font-semibold tabular-nums text-ov-bg">
              {formatRecord(player.recordW, player.recordL, player.recordD)}
            </p>
          </div>
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
      </div>
    </div>
  );
}

function LoreLadder({ value, max, flip }: { value: number; max: number; flip?: boolean }) {
  const top = Math.max(1, max);
  const steps = Array.from({ length: top + 1 }, (_, i) => top - i);
  return (
    <ol className={cn("flex w-[2.65rem] shrink-0 flex-col", flip ? "mr-1.5" : "ml-1.5")}>
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