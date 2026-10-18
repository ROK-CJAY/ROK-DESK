import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function parseDelta(raw: string, fallback = 1, max = 9999): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

export function DeltaPad({
  onDelta,
  defaultAmount = 1,
  max = 9999,
  size = "desk",
  className,
}: {
  onDelta: (delta: number) => void;
  defaultAmount?: number;
  max?: number;
  size?: "desk" | "tablet" | "fluid";
  className?: string;
}) {
  const [raw, setRaw] = useState(String(defaultAmount));
  const amount = parseDelta(raw, defaultAmount, max);
  const tall = size === "tablet";
  const fluid = size === "fluid";

  return (
    <div className={cn("flex items-center", fluid ? "gap-[clamp(0.25rem,1cqw,0.6rem)]" : "gap-1.5", className)}>
      <Button
        type="button"
        variant="outline"
        size={tall ? "score" : "sm"}
        onClick={() => onDelta(-amount)}
        aria-label={`Subtract ${amount}`}
        className={fluid ? "h-[clamp(1.45rem,6cqh,2.6rem)] min-w-[clamp(1.45rem,6cqh,2.6rem)] px-[clamp(0.35rem,1.2cqw,0.7rem)] text-[clamp(0.85rem,3.2cqh,1.35rem)]" : undefined}
      >
        −
      </Button>
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        value={raw}
        onChange={(e) => setRaw(e.target.value.replace(/[^\d]/g, ""))}
        onBlur={() => setRaw(String(amount))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onDelta(amount);
          }
        }}
        aria-label="Amount"
        className={cn(
          "min-w-0 rounded-md border border-border bg-surface text-center font-semibold tabular-nums text-fg",
          "focus-visible:ring-ring/60 focus-visible:ring-2 focus-visible:outline-none",
          tall ? "h-12 w-16 text-lg" : fluid ? "h-[clamp(1.45rem,6cqh,2.6rem)] w-[clamp(2rem,7cqw,3.6rem)] text-[clamp(0.8rem,3cqh,1.2rem)]" : "h-8 w-14 text-sm",
        )}
      />
      <Button
        type="button"
        variant="outline"
        size={tall ? "score" : "sm"}
        onClick={() => onDelta(amount)}
        aria-label={`Add ${amount}`}
        className={fluid ? "h-[clamp(1.45rem,6cqh,2.6rem)] min-w-[clamp(1.45rem,6cqh,2.6rem)] px-[clamp(0.35rem,1.2cqw,0.7rem)] text-[clamp(0.85rem,3.2cqh,1.35rem)]" : undefined}
      >
        +
      </Button>
    </div>
  );
}
