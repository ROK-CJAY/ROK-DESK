import type { DeskState } from "@/lib/desk-types";
import { currentPresentedSponsor } from "@/lib/sponsors";
import { useClockNow } from "@/lib/use-clock-now";
import { cn } from "@/lib/cn";

export function PresentedByBar({
  desk,
  now,
  className,
  sponsors = false,
}: {
  desk: DeskState;
  now?: number;
  className?: string;
  /** Show the rotation whenever sponsors exist, not only after an event logo replaces ROK. */
  sponsors?: boolean;
}) {
  const ticking = useClockNow({ pauseWhenHidden: false });
  const sponsor = currentPresentedSponsor(desk.sponsors, desk.eventLogo, now ?? ticking, desk.sponsorSeconds);
  if (!sponsor) return null;
  if (!sponsors && !desk.eventLogo.trim()) return null;
  return (
    <div className={cn("flex items-center gap-4 bg-black px-5 py-2", className)}>
      <p className="font-display shrink-0 text-[1.45rem] leading-none font-semibold tracking-[0.06em] text-white uppercase">
        Presented by:
      </p>
      <div className="flex h-14 w-56 items-center justify-center">
        {sponsor.logo ? (
          <img src={sponsor.logo} alt="" className="max-h-full max-w-full object-contain" />
        ) : (
          <p className="truncate font-display text-[1.45rem] leading-none font-semibold text-white uppercase">{sponsor.name}</p>
        )}
      </div>
    </div>
  );
}
