import { useState } from "react";
import { useDeskStore } from "@/lib/desk-store";
import { SEAT_LABELS, type LoreLogEntry } from "@/lib/desk-types";
import { Button } from "@/components/ui/button";

function stamp(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

function line(entry: LoreLogEntry, name: string): string {
  if (entry.kind === "mark") return entry.text;
  const sign = entry.delta > 0 ? `+${entry.delta}` : String(entry.delta);
  return `${name}  ${sign}  →  ${entry.total}`;
}

export function LoreLogButton() {
  const [open, setOpen] = useState(false);
  const desk = useDeskStore((s) => s.desk);
  const log = desk.loreLog ?? [];
  return (
    <>
      <Button type="button" variant="outline" size="sm" className="h-8 px-2" onClick={() => setOpen(true)}>
        Log{log.length ? ` ${log.length}` : ""}
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 sm:items-center" onClick={() => setOpen(false)}>
          <div
            className="flex max-h-[80dvh] w-full max-w-md flex-col rounded-xl border border-border bg-bg p-3 shadow-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <p className="font-mono text-[0.58rem] tracking-[0.16em] text-muted uppercase">Match log</p>
                <p className="font-display text-lg leading-tight font-semibold uppercase">Lore history</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
            {log.length === 0 ? (
              <p className="px-1 py-6 text-sm text-muted">No lore changes yet. Every + or − is kept here until the match is reset.</p>
            ) : (
              <ol className="min-h-0 flex-1 space-y-1 overflow-y-auto">
                {[...log].reverse().map((entry) => (
                  <li
                    key={entry.id}
                    className={
                      entry.kind === "mark"
                        ? "rounded-md bg-surface-2 px-2 py-1.5 text-xs text-muted"
                        : "flex items-baseline justify-between gap-3 rounded-md px-2 py-1.5 text-sm"
                    }
                  >
                    <span className="min-w-0 font-medium">
                      {line(entry, entry.kind === "lore" ? desk[entry.side].name.trim() || SEAT_LABELS[entry.side] : "")}
                    </span>
                    <span className="shrink-0 font-mono text-[0.65rem] text-muted">{stamp(entry.at)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
