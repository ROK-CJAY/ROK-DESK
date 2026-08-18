import { cn } from "@/lib/cn";
import { LORCANA_INKS, inkSrc, isLorcanaInk, type LorcanaInkId } from "@/lib/lorcana";

export function InkPicker({
  ink1,
  ink2,
  onChange,
  size = "md",
}: {
  ink1: string;
  ink2: string;
  onChange: (next: { ink1: string; ink2: string }) => void;
  size?: "sm" | "md";
}) {
  const selected = [ink1, ink2].filter(isLorcanaInk);
  const toggle = (id: LorcanaInkId) => {
    if (ink1 === id) onChange({ ink1: ink2, ink2: "" });
    else if (ink2 === id) onChange({ ink1, ink2: "" });
    else if (!ink1) onChange({ ink1: id, ink2 });
    else if (!ink2) onChange({ ink1, ink2: id });
    else onChange({ ink1, ink2: id });
  };

  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        {LORCANA_INKS.map((ink) => {
          const on = selected.includes(ink.id);
          return (
            <button
              key={ink.id}
              type="button"
              title={ink.label}
              onClick={() => toggle(ink.id)}
              className={cn(
                "rounded-md border p-0.5 transition-colors",
                on ? "border-accent bg-surface" : "border-transparent opacity-45 hover:opacity-80",
              )}
            >
              <img src={inkSrc(ink.id)} alt={ink.label} className={size === "sm" ? "size-7" : "size-9"} />
            </button>
          );
        })}
      </div>
      <p className="text-[0.7rem] text-muted">
        {selected.map((id) => LORCANA_INKS.find((ink) => ink.id === id)?.label).join(" / ") || "Tap up to two inks"}
      </p>
    </div>
  );
}