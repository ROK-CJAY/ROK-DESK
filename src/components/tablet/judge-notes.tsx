import { liveMatchForSlot, resolveCasterEntrant } from "@/lib/caster-path";
import { cn } from "@/lib/cn";
import { type SeatId } from "@/lib/desk-types";
import { useDeskStore } from "@/lib/desk-store";
import { useTournamentStore } from "@/lib/tournament-store";

export function JudgeNotes({
  seat,
  readOnly = false,
  className,
}: {
  seat: SeatId;
  readOnly?: boolean;
  className?: string;
}) {
  const value = useDeskStore((s) => s.desk[seat].judgeNote ?? "");
  const setPlayer = useDeskStore((s) => s.setPlayer);

  const onChange = (judgeNote: string) => {
    if (judgeNote === value) return;
    setPlayer(seat, { judgeNote });
    const desk = useDeskStore.getState().desk;
    const t = useTournamentStore.getState().tournament;
    const live = liveMatchForSlot(t, desk.matchSlot ?? 1);
    const e = resolveCasterEntrant(t, desk[seat], seat, live);
    if (e && e.judgeNote !== judgeNote) useTournamentStore.getState().updateEntrant(e.id, { judgeNote });
  };

  return (
    <label className={cn("mt-3 grid gap-1 text-left", className)}>
      <span className="font-mono text-[0.58rem] tracking-[0.14em] text-muted uppercase">Judge notes</span>
      {readOnly ? (
        <p className="min-h-12 rounded-md border border-border bg-surface-2 px-2.5 py-2 text-sm whitespace-pre-wrap">
          {value.trim() || "—"}
        </p>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, 500))}
          rows={3}
          placeholder="Warnings, slow play, deck check…"
          className="min-h-16 w-full resize-y rounded-md border border-border bg-surface px-2.5 py-2 text-sm text-fg placeholder:text-subtle focus-visible:ring-ring/60 focus-visible:ring-2 focus-visible:outline-none"
        />
      )}
    </label>
  );
}
