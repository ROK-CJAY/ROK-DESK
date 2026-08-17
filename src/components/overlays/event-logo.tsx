import { OverlayEditProvider, Placed } from "@/components/overlays/placed";
import type { OverlayEdit } from "@/components/overlays/placed";
import type { DeskState } from "@/lib/desk-types";
import { cn } from "@/lib/cn";

export function EventLogoMark({
  desk,
  size = "md",
  className,
}: {
  desk: DeskState;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  if (!desk.eventLogo) return null;
  return (
    <img
      src={desk.eventLogo}
      alt={desk.eventName || "Event logo"}
      className={cn(
        "object-contain",
        size === "sm" && "max-h-10 max-w-24",
        size === "md" && "max-h-16 max-w-36",
        size === "lg" && "max-h-28 max-w-56",
        className,
      )}
    />
  );
}

export function EventLogoView({
  desk,
  edit = null,
}: {
  desk: DeskState;
  edit?: OverlayEdit | null;
}) {
  if (!desk.eventLogo && !edit) return null;

  return (
    <OverlayEditProvider desk={desk} edit={edit}>
      <Placed id="eventLogo">
        {desk.eventLogo ? (
          <div className="flex h-28 w-56 items-center justify-start">
            <EventLogoMark desk={desk} size="lg" />
          </div>
        ) : (
          <div className="h-28 w-56" />
        )}
      </Placed>
    </OverlayEditProvider>
  );
}
