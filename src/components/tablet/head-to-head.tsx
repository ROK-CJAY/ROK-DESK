import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const FACE_KEY = "rok.tablet.headToHead";
const STACK_KEY = "rok.tablet.stacked";

function useStoredFlag(key: string) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(localStorage.getItem(key) === "1");
  }, [key]);
  const toggle = () => {
    setOn((value) => {
      const next = !value;
      localStorage.setItem(key, next ? "1" : "0");
      return next;
    });
  };
  return { on, toggle };
}

/** Flip Player 2. Default is both seats upright. */
export function useHeadToHead() {
  return useStoredFlag(FACE_KEY);
}

/** One above the other. Default is side by side. Independent of the flip. */
export function useStackedSeats() {
  return useStoredFlag(STACK_KEY);
}

function LayoutButton({
  on,
  onClick,
  title,
  children,
}: {
  on: boolean;
  onClick: () => void;
  title: string;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "rounded-md border px-2.5 py-1.5 text-xs",
        on ? "border-accent bg-accent/15 text-fg" : "border-border bg-surface text-muted",
      )}
    >
      {children}
    </button>
  );
}

export function HeadToHeadButton({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <LayoutButton on={on} onClick={onClick} title={on ? "Turn off the flip" : "Flip one seat for head to head"}>
      {on ? "Head to head" : "Upright"}
    </LayoutButton>
  );
}

export function StackButton({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <LayoutButton on={on} onClick={onClick} title={on ? "Switch to side by side" : "Stack one above the other"}>
      {on ? "Stacked" : "Side by side"}
    </LayoutButton>
  );
}
