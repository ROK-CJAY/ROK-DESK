import type { CSSProperties, ReactNode } from "react";
import type { OverlaySourceId } from "@/components/desk/sources";
import { lookFor, lookStyle, type OverlayLookBook } from "@/lib/overlay-look";

export function OverlayLookRoot({
  book,
  source,
  className,
  children,
}: {
  book?: OverlayLookBook;
  source?: OverlaySourceId;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className ?? "h-full w-full"} style={lookStyle(lookFor(book, source)) as CSSProperties}>
      {children}
    </div>
  );
}
