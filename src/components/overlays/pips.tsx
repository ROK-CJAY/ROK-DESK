import { cn } from "@/lib/cn";

export type PipStyle = "dot" | "pokeball";

export function ResourcePips({
  value,
  max,
  invert: _invert = false,
  size = "md",
  pipStyle = "dot",
}: {
  value: number;
  max: number;
  invert?: boolean;
  size?: "sm" | "md" | "lg";
  pipStyle?: PipStyle;
}) {
  const count = Math.max(0, max);
  const dim = size === "lg" ? "size-5" : size === "sm" ? "size-3" : "size-3.5";
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const filled = i < value;
        if (pipStyle === "pokeball") {
          return <PokeballIcon key={i} filled={filled} className={dim} />;
        }
        return (
          <span
            key={i}
            className={cn(
              "rounded-full border transition-opacity duration-150",
              dim,
              filled
                ? "border-game bg-game"
                : "border-ov-muted/40 bg-transparent opacity-50",
            )}
          />
        );
      })}
    </span>
  );
}

export function PokeballIcon({
  filled,
  className,
}: {
  filled: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="7.15" fill={filled ? "#f4f1ee" : "transparent"} />
      {filled ? (
        <path d="M1 8a7 7 0 0 1 14 0H1z" fill="#ee1515" />
      ) : null}
      <circle
        cx="8"
        cy="8"
        r="7.15"
        fill="none"
        stroke={filled ? "#161616" : "currentColor"}
        strokeWidth="1.2"
        className={filled ? "" : "text-ov-muted/55"}
      />
      <rect
        x="1.1"
        y="7.15"
        width="13.8"
        height="1.7"
        fill={filled ? "#161616" : "currentColor"}
        className={filled ? "" : "text-ov-muted/45"}
      />
      <circle
        cx="8"
        cy="8"
        r="2.35"
        fill={filled ? "#f4f1ee" : "transparent"}
        stroke={filled ? "#161616" : "currentColor"}
        strokeWidth="1.15"
        className={filled ? "" : "text-ov-muted/55"}
      />
      <circle
        cx="8"
        cy="8"
        r="0.85"
        fill={filled ? "#f4f1ee" : "transparent"}
        stroke={filled ? "#161616" : "currentColor"}
        strokeWidth="0.7"
        className={filled ? "" : "text-ov-muted/40"}
      />
    </svg>
  );
}
