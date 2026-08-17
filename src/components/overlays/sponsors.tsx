import { OverlayEditProvider, Placed } from "@/components/overlays/placed";
import type { OverlayEdit } from "@/components/overlays/placed";
import { currentSponsor, liveSponsors } from "@/lib/sponsors";
import type { DeskState } from "@/lib/desk-types";
import { cn } from "@/lib/cn";

export function SponsorsView({
  desk,
  now = Date.now(),
  edit = null,
  compact = false,
}: {
  desk: DeskState;
  now?: number;
  edit?: OverlayEdit | null;
  compact?: boolean;
}) {
  const live = liveSponsors(desk.sponsors);
  const current = currentSponsor(desk.sponsors, now, desk.sponsorSeconds);
  if (!current && !edit) return null;

  return (
    <OverlayEditProvider desk={desk} edit={edit}>
      <Placed id="sponsors">
        {current ? (
          <div
            className={cn(
              "rounded-xl border border-ov-fg/10 bg-ov-bg/88 px-5 py-3 shadow-[0_12px_28px_rgb(0_0_0_/_0.35)]",
              compact ? "w-[240px]" : "w-[420px] px-8 py-5",
            )}
          >
            <p className="font-mono text-ov-kicker tracking-[0.24em] text-game uppercase">Presented by</p>
            <div
              key={current.id}
              className={cn("mt-2 flex items-center justify-center", compact ? "h-16" : "h-28")}
            >
              {current.logo ? (
                <img
                  src={current.logo}
                  alt={current.name}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <p
                  className={cn(
                    "font-display font-semibold tracking-tight text-ov-fg uppercase",
                    compact ? "text-2xl" : "text-4xl",
                  )}
                >
                  {current.name}
                </p>
              )}
            </div>
            {current.logo && current.name ? (
              <p className="mt-1 text-center font-mono text-[0.68rem] tracking-[0.16em] text-ov-muted uppercase">
                {current.name}
              </p>
            ) : null}
            {live.length > 1 ? (
              <div className="mt-2 flex justify-center gap-1.5">
                {live.map((row) => (
                  <span
                    key={row.id}
                    className={cn(
                      "size-1.5 rounded-full",
                      row.id === current.id ? "bg-game" : "bg-ov-fg/25",
                    )}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className={compact ? "h-24 w-[240px]" : "h-36 w-[420px]"} />
        )}
      </Placed>
    </OverlayEditProvider>
  );
}
