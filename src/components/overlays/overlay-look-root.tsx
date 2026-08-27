import type { CSSProperties, ReactNode } from "react";
import type { OverlaySourceId } from "@/components/desk/sources";
import { lookFor, lookStyle, type OverlayLookBook } from "@/lib/overlay-look";
import { cn } from "@/lib/cn";

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
  const look = lookFor(book, source);
  return (
    <div
      className={cn("h-full w-full", className)}
      data-ov-case={look.uppercase ? "upper" : "normal"}
      style={lookStyle(look) as CSSProperties}
    >
      {children}
    </div>
  );
}