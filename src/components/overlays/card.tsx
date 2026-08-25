import { OverlayEditProvider, Placed } from "@/components/overlays/placed";
import type { OverlayEdit } from "@/components/overlays/placed";
import { RemoteArt } from "@/components/ui/remote-art";
import type { DeskState } from "@/lib/desk-types";

export function CardSpotlightView({
  desk,
  edit = null,
}: {
  desk: DeskState;
  edit?: OverlayEdit | null;
}) {
  const card = desk.cardSpotlight;
  const show = Boolean(card?.visible && (card.image || card.id));
  if (!show && !edit) return null;

  return (
    <OverlayEditProvider desk={desk} edit={edit}>
      <Placed id="cardSpotlight">
        {show ? (
          <figure className="w-[26rem]">
            <RemoteArt
              image={card.image}
              id={card.id}
              className="w-full rounded-xl shadow-[0_24px_60px_rgb(0_0_0_/_0.45)]"
            />
            <figcaption className="mt-3 rounded-lg bg-ov-panel/90 px-3 py-2">
              <p className="font-display text-2xl leading-none font-semibold tracking-wide text-ov-fg uppercase">
                {card.name}
              </p>
              <p className="mt-1 font-mono text-[0.72rem] tracking-wide text-ov-muted uppercase">
                {[card.set, card.number, card.type].filter(Boolean).join(" · ")}
              </p>
            </figcaption>
          </figure>
        ) : (
          <div className="h-[28rem] w-[20rem]" />
        )}
      </Placed>
    </OverlayEditProvider>
  );
}
