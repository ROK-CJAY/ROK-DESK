import { cn } from "@/lib/cn";
import { LORCANA_INKS, inkSrc, lorcanaInks, packInks, type LorcanaInkId } from "@/lib/lorcana";

export function InkPicker({
  ink1,
  ink2,
  inks = "",
  onChange,
  size = "md",
  quiet = false,
}: {
  ink1: string;
  ink2: string;
  inks?: string;
  onChange: (next: { ink1: string; ink2: string; inks: string }) => void;
  size?: "sm" | "md" | "lg";
  quiet?: boolean;
}) {
  const selected = lorcanaInks({ ink1, ink2, inks });
  const toggle = (id: LorcanaInkId) => {
    const next = selected.includes(id) ? selected.filter((ink) => ink !== id) : [...selected, id];
    onChange(packInks(next));
  };

  return (
    <div className="grid gap-1.5">
      <div className={cn("flex flex-wrap", size === "lg" ? "gap-2" : size === "sm" ? "gap-1" : "gap-1.5")}>
        {LORCANA_INKS.map((ink) => {
          const on = selected.includes(ink.id);
          return (
            <button
              key={ink.id}
              type="button"
              title={ink.label}
              onClick={() => toggle(ink.id)}
              className={cn(
                "rounded-md border transition-colors",
                size === "lg" ? "p-1" : "p-0.5",
                on ? "border-accent bg-surface" : "border-transparent opacity-45 hover:opacity-80",
              )}
            >
              <img
                src={inkSrc(ink.id)}
                alt={ink.label}
                className={size === "lg" ? "size-12" : size === "sm" ? "size-7" : "size-9"}
              />
            </button>
          );
        })}
      </div>
      {quiet ? null : (
        <p className="text-[0.7rem] text-muted">
          {selected.map((id) => LORCANA_INKS.find((ink) => ink.id === id)?.label).join(" / ") || "Tap any inks"}
        </p>
      )}
    </div>
  );
}