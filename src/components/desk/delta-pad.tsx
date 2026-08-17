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
  size?: "desk" | "tablet";
  className?: string;
}) {
  const [raw, setRaw] = useState(String(defaultAmount));
  const amount = parseDelta(raw, defaultAmount, max);
  const tall = size === "tablet";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Button
        type="button"
        variant="outline"
        size={tall ? "score" : "sm"}
        onClick={() => onDelta(-amount)}
        aria-label={`Subtract ${amount}`}
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
          tall ? "h-12 w-16 text-lg" : "h-8 w-14 text-sm",
        )}
      />
      <Button
        type="button"
        variant="outline"
        size={tall ? "score" : "sm"}
        onClick={() => onDelta(amount)}
        aria-label={`Add ${amount}`}
      >
        +
      </Button>
    </div>
  );
}
