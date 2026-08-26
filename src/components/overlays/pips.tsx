import { cn } from "@/lib/cn";
import { emptyTeam, spriteFallbackUrl, spriteUrl, type TeamMon } from "@/lib/pokemon-vgc";

export type PipStyle = "dot" | "pokeball" | "team";

export function ResourcePips({
  value,
  max,
  invert: _invert = false,
  size = "md",
  pipStyle = "dot",
  team,
  down,
}: {
  value: number;
  max: number;
  invert?: boolean;
  size?: "sm" | "md" | "lg";
  pipStyle?: PipStyle;
  team?: TeamMon[];
  down?: boolean[];
}) {
  if (pipStyle === "team") {
    return <TeamPips team={team} value={value} max={max} size={size} down={down} />;
  }
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
              "rounded-full border transition-[opacity,background-color,border-color] duration-300 ease-out",
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

export function TeamPips({
  team,
  value,
  max = 6,
  size = "md",
  onToggle,
  down,
  tone = "overlay",
}: {
  team: TeamMon[] | undefined;
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  onToggle?: (index: number) => void;
  down?: boolean[];
  tone?: "overlay" | "desk";
}) {
  const slots = emptyTeam().map((slot, i) => team?.[i] ?? slot).slice(0, max);
  const dim = size === "lg" ? "size-12" : size === "sm" ? "size-7" : "size-9";

  return (
    <span className="inline-flex items-center gap-1" aria-hidden={!onToggle}>
      {slots.map((mon, i) => {
        const alive = down ? !down[i] : i < value;
        const art = spriteUrl(mon);
        const inner = (
          <>
            {art ? (
              <img
                src={art}
                alt=""
                className="size-full object-contain p-0.5"
                onError={(event) => {
                  const fallback = spriteFallbackUrl(mon);
                  if (fallback && event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
                }}
              />
            ) : (
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  tone === "desk" ? "bg-muted" : "bg-ov-muted/45",
                )}
              />
            )}
          </>
        );
        const shell = cn(
          "grid shrink-0 place-items-center overflow-hidden rounded-full border transition-[opacity,filter,transform] duration-300 ease-out",
          dim,
          tone === "desk" ? "border-border bg-surface-2" : "border-ov-fg/15 bg-ov-fg/10",
          !alive && "opacity-35 grayscale",
        );
        if (onToggle) {
          return (
            <button
              key={i}
              type="button"
              onClick={() => onToggle(i)}
              className={cn(shell, "hover:scale-110")}
              aria-label={alive ? `KO ${mon.species || `slot ${i + 1}`}` : `Revive ${mon.species || `slot ${i + 1}`}`}
              title={mon.species || `Slot ${i + 1}`}
            >
              {inner}
            </button>
          );
        }
        return (
          <span key={i} className={shell} title={mon.species || undefined}>
            {inner}
          </span>
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
