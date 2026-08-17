import { Button } from "@/components/ui/button";
import { useDeskStore } from "@/lib/desk-store";
import { cn } from "@/lib/cn";

export function InitiativeToggle({ compact = false }: { compact?: boolean }) {
  const desk = useDeskStore((s) => s.desk);
  const setInitiative = useDeskStore((s) => s.setInitiative);
  if (desk.gameId !== "swu") return null;

  return (
    <div className={cn("rounded-lg bg-surface-2", compact ? "px-3 py-2" : "px-4 py-3")}>
      <p className="font-mono text-center text-[0.58rem] tracking-[0.16em] text-muted uppercase">Initiative</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
        <Button
          variant={desk.initiativeSide === "p1" ? "default" : "outline"}
          size="sm"
          onClick={() => setInitiative("p1")}
        >
          {desk.initiativeSide === "p1" ? <InitiativeGlyph className="size-3.5" /> : null}
          {desk.p1.name || "Player 1"}
        </Button>
        <Button variant={desk.initiativeSide ? "outline" : "secondary"} size="sm" onClick={() => setInitiative(null)}>
          Clear
        </Button>
        <Button
          variant={desk.initiativeSide === "p2" ? "default" : "outline"}
          size="sm"
          onClick={() => setInitiative("p2")}
        >
          {desk.initiativeSide === "p2" ? <InitiativeGlyph className="size-3.5" /> : null}
          {desk.p2.name || "Player 2"}
        </Button>
      </div>
    </div>
  );
}

export function InitiativeGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M12 1.4 21.6 7v10L12 22.6 2.4 17V7L12 1.4Zm0 2.5L4.6 8.1v7.8L12 20.1l7.4-4.2V8.1L12 3.9Z"
      />
      <path fill="currentColor" d="M12 6.4 16.6 12 12 17.6 7.4 12 12 6.4Z" />
    </svg>
  );
}

export function InitiativeMark({
  live,
  tone = "overlay",
}: {
  live: boolean;
  tone?: "overlay" | "desk";
}) {
  if (!live) return null;
  const overlay = tone === "overlay";
  return (
    <span
      className={cn(
        "init-token inline-flex shrink-0 items-center gap-1.5 rounded-sm px-2 py-1 font-mono font-semibold tracking-[0.16em] uppercase",
        overlay
          ? "bg-[#f0c14b] text-[#1a1406] shadow-[0_0_16px_rgb(240_193_75_/_0.55)]"
          : "bg-accent text-accent-fg",
      )}
    >
      <InitiativeGlyph className="size-3.5" />
      Init
    </span>
  );
}
