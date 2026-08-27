import { OverlayEditProvider, Placed } from "@/components/overlays/placed";
import type { OverlayEdit } from "@/components/overlays/placed";
import { RemoteArt } from "@/components/ui/remote-art";
import { visibleCardStack, type DeskState, type SpotlightCard } from "@/lib/desk-types";
import { cn } from "@/lib/cn";

const OFFSET_X = 34;
const OFFSET_Y = 48;

export function CardStackArt({
  stack,
  className,
  cardClassName = "w-[26rem]",
  offsetX = OFFSET_X,
  offsetY = OFFSET_Y,
  caption = true,
}: {
  stack: SpotlightCard[];
  className?: string;
  cardClassName?: string;
  offsetX?: number;
  offsetY?: number;
  caption?: boolean;
}) {
  if (!stack.length) return null;
  const top = stack[stack.length - 1]!;
  return (
    <figure
      className={cn("relative", className)}
      style={{
        width: `calc(var(--stack-card-w, 26rem) + ${(stack.length - 1) * offsetX}px)`,
        paddingBottom: (stack.length - 1) * offsetY,
      }}
    >
      <div className={cn("relative", cardClassName)} style={{ ["--stack-card-w" as string]: "100%" }}>
        {stack.map((card, index) => (
          <div
            key={`${card.id}-${index}`}
            className={index === 0 ? "relative" : "absolute top-0 left-0 w-full"}
            style={{
              transform: `translate(${index * offsetX}px, ${index * offsetY}px)`,
              zIndex: index + 1,
            }}
          >
            <RemoteArt
              image={card.image}
              id={card.id}
              className={cn("w-full rounded-xl shadow-[0_18px_40px_rgb(0_0_0_/_0.5)]", cardClassName)}
            />
          </div>
        ))}
      </div>
      {caption && top ? (
        <figcaption className="relative z-10 mt-3 rounded-lg bg-ov-panel/90 px-3 py-2">
          {stack.length > 1 ? (
            <p className="font-mono text-[0.68rem] tracking-[0.18em] text-game uppercase">
              Combo · {stack.length} cards
            </p>
          ) : null}
          <p className="font-display text-2xl leading-none font-semibold tracking-wide text-ov-fg uppercase">
            {top.name}
          </p>
          <p className="mt-1 font-mono text-[0.72rem] tracking-wide text-ov-muted uppercase">
            {[top.set, top.number, top.type].filter(Boolean).join(" · ")}
          </p>
        </figcaption>
      ) : null}
    </figure>
  );
}

export function CardSpotlightView({
  desk,
  edit = null,
}: {
  desk: DeskState;
  edit?: OverlayEdit | null;
}) {
  const stack = visibleCardStack(desk);
  const show = stack.length > 0;
  if (!show && !edit) return null;

  return (
    <OverlayEditProvider desk={desk} edit={edit}>
      <Placed id="cardSpotlight">
        {show ? <CardStackArt stack={stack} /> : <div className="h-[28rem] w-[20rem]" />}
      </Placed>
    </OverlayEditProvider>
  );
}
