import { ManaPip } from "@/components/overlays/mana-pip";
import { cn } from "@/lib/cn";
import { WUBRG, normalizeColorIdentity, type ManaColor } from "@/lib/commander-colors";

const LABEL: Record<ManaColor, string> = { W: "White", U: "Blue", B: "Black", R: "Red", G: "Green" };

export function ManaColorPicker({ value, onChange }: { value: string; onChange: (ink1: string) => void }) {
  const selected = normalizeColorIdentity(value);
  const toggle = (color: ManaColor) => {
    const next = selected.includes(color) ? selected.filter((item) => item !== color) : [...selected, color];
    onChange(WUBRG.filter((item) => next.includes(item)).join(""));
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {WUBRG.map((color) => {
        const on = selected.includes(color);
        return (
          <button
            key={color}
            type="button"
            title={LABEL[color]}
            aria-pressed={on}
            onClick={() => toggle(color)}
            className={cn("rounded-full border p-0.5 transition-opacity", on ? "border-accent" : "border-transparent opacity-40 hover:opacity-80")}
          >
            <ManaPip color={color} className="size-7" />
          </button>
        );
      })}
    </div>
  );
}
