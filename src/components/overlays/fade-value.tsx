import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const OUT_MS = 140;
const IN_MS = 220;

/** Soft fade when a score / LP / resource ticks on the overlay. */
export function FadeValue({
  value,
  className,
}: {
  value: string | number;
  className?: string;
}) {
  const text = String(value);
  const [shown, setShown] = useState(text);
  const [on, setOn] = useState(true);
  const shownRef = useRef(text);
  const pending = useRef(text);

  useEffect(() => {
    pending.current = text;
    if (text === shownRef.current) return;
    setOn(false);
    const swap = window.setTimeout(() => {
      shownRef.current = pending.current;
      setShown(pending.current);
      setOn(true);
    }, OUT_MS);
    return () => window.clearTimeout(swap);
  }, [text]);

  return (
    <span
      className={cn("inline-block tabular-nums", className)}
      style={{
        opacity: on ? 1 : 0,
        transition: `opacity ${on ? IN_MS : OUT_MS}ms ease`,
      }}
    >
      {shown}
    </span>
  );
}
