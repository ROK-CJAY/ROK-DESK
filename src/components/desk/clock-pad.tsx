import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatClock, parseClockInput } from "@/lib/desk-types";

export function ClockPad({
  label,
  note,
  remaining,
  preset,
  running,
  compact = false,
  onSet,
  onToggle,
  onAdd,
  onReset,
}: {
  label: string;
  note?: string;
  remaining: number;
  preset: number;
  running: boolean;
  compact?: boolean;
  onSet: (seconds: number) => void;
  onToggle: () => void;
  onAdd: (delta: number) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState(formatClock(remaining));

  useEffect(() => {
    setDraft(formatClock(remaining));
  }, [remaining]);

  const applyDraft = () => {
    const parsed = parseClockInput(draft);
    if (parsed == null) {
      setDraft(formatClock(remaining));
      return;
    }
    onSet(parsed);
    setDraft(formatClock(parsed));
  };

  return (
    <div className={compact ? "flex flex-wrap items-center gap-1.5" : "grid gap-2 rounded-lg bg-surface-2 px-3 py-2"}>
      {compact ? (
        <>
          <p className="font-display text-xl leading-none font-semibold tabular-nums">{formatClock(remaining)}</p>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={applyDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyDraft();
              }
            }}
            inputMode="numeric"
            placeholder="0:00"
            aria-label={`Set ${label}`}
            className="h-8 w-16 font-mono text-sm tabular-nums"
          />
          <Button variant="outline" size="sm" onClick={applyDraft}>
            Set
          </Button>
          <Button variant={running ? "live" : "secondary"} size="sm" onClick={onToggle}>
            {running ? "Pause" : "Start"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAdd(60)}>
            +1m
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAdd(180)}>
            +3m
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAdd(-60)}>
            −1m
          </Button>
          <Button variant="outline" size="sm" onClick={onReset}>
            Reset
          </Button>
          <p className="text-[0.65rem] text-subtle">
            {label}
            {note ? ` · ${note}` : ""}
          </p>
        </>
      ) : (
        <>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs text-muted">{label}</p>
          <p className="font-display text-2xl font-semibold tabular-nums">{formatClock(remaining)}</p>
        </div>
        <p className="text-[0.65rem] text-subtle">
          Set {formatClock(preset)}
          {note ? ` · ${note}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={applyDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              applyDraft();
            }
          }}
          inputMode="numeric"
          placeholder="0:00"
          aria-label={`Set ${label}`}
          className="h-9 w-24 font-mono tabular-nums"
        />
        <Button variant="outline" size="sm" onClick={applyDraft}>
          Set
        </Button>
        <Button variant={running ? "live" : "secondary"} size="sm" onClick={onToggle}>
          {running ? "Pause" : "Start"}
        </Button>
        <Button variant="outline" size="sm" onClick={onReset}>
          Reset
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => onAdd(60)}>
          +1m
        </Button>
        <Button variant="outline" size="sm" onClick={() => onAdd(180)}>
          +3m
        </Button>
        <Button variant="outline" size="sm" onClick={() => onAdd(-60)}>
          −1m
        </Button>
      </div>
        </>
      )}
    </div>
  );
}
