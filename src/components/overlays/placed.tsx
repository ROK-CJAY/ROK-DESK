import { createContext, useContext, useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { CANVAS_H, CANVAS_W, WIDGET_LABELS, type WidgetId, type WidgetPos } from "@/lib/layout";
import { useOverlayScale } from "@/components/overlays/scale-frame";
import type { DeskState } from "@/lib/desk-types";

export type OverlayEdit = {
  selected: WidgetId | null;
  select: (id: WidgetId) => void;
  move: (id: WidgetId, pos: WidgetPos, commit: boolean, size?: { width: number; height: number }) => void;
};

const EditContext = createContext<OverlayEdit | null>(null);
const DeskContext = createContext<DeskState | null>(null);

export function OverlayEditProvider({
  desk,
  edit,
  children,
}: {
  desk: DeskState;
  edit?: OverlayEdit | null;
  children: ReactNode;
}) {
  return (
    <DeskContext.Provider value={desk}>
      <EditContext.Provider value={edit ?? null}>{children}</EditContext.Provider>
    </DeskContext.Provider>
  );
}

export function useOverlayEdit() {
  return useContext(EditContext);
}

export function useOverlayDesk(fallback: DeskState) {
  return useContext(DeskContext) ?? fallback;
}

export function Placed({
  id,
  children,
  fullWidth = false,
  axis = "xy",
  pin,
  pinInset = 24,
  className,
}: {
  id: WidgetId;
  children: ReactNode;
  fullWidth?: boolean;
  axis?: "xy" | "y";
  pin?: "left" | "right";
  pinInset?: number;
  className?: string;
}) {
  const desk = useContext(DeskContext);
  const edit = useContext(EditContext);
  const scale = useOverlayScale();
  const pos = desk?.layout[id] ?? { x: 0, y: 0 };
  const selected = edit?.selected === id;
  const nodeRef = useRef<HTMLDivElement | null>(null);

  const measure = () => {
    const node = nodeRef.current;
    if (!node) return undefined;
    const ring = node.querySelector("[data-placed-body]") as HTMLElement | null;
    const box = (ring ?? node).getBoundingClientRect();
    return { width: box.width / scale, height: box.height / scale };
  };

  useEffect(() => {
    if (!edit || !selected) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const step = event.shiftKey ? 20 : 4;
      let { x, y } = pos;
      if (event.key === "ArrowLeft" && axis === "xy") x -= step;
      else if (event.key === "ArrowRight" && axis === "xy") x += step;
      else if (event.key === "ArrowUp") y -= step;
      else if (event.key === "ArrowDown") y += step;
      else return;
      event.preventDefault();
      edit.move(id, { x, y }, true, measure());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [edit, selected, pos, axis, id]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!edit) return;
    event.preventDefault();
    event.stopPropagation();
    edit.select(id);
    const origin = { ...pos };
    const startX = event.clientX;
    const startY = event.clientY;
    const pointerId = event.pointerId;
    const node = event.currentTarget;
    node.setPointerCapture(pointerId);

    const onMove = (ev: globalThis.PointerEvent) => {
      const dx = axis === "y" ? 0 : (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      edit.move(id, { x: origin.x + dx, y: origin.y + dy }, false, measure());
    };
    const onUp = (ev: globalThis.PointerEvent) => {
      const dx = axis === "y" ? 0 : (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      edit.move(id, { x: origin.x + dx, y: origin.y + dy }, true, measure());
      node.releasePointerCapture(pointerId);
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerup", onUp);
      node.removeEventListener("pointercancel", onUp);
    };
    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerup", onUp);
    node.addEventListener("pointercancel", onUp);
  };

  const left = pin === "right" ? "auto" : pin === "left" ? pinInset : fullWidth ? 0 : pos.x;

  return (
    <div
      className={cn(
        "pointer-events-auto absolute",
        edit && "cursor-grab touch-none select-none",
        selected && "z-20",
        className,
      )}
      style={{
        left,
        right: pin === "right" ? pinInset : "auto",
        top: pos.y,
        width: fullWidth ? "100%" : undefined,
        maxWidth: pin || fullWidth ? undefined : CANVAS_W,
        maxHeight: CANVAS_H,
      }}
      onPointerDown={onPointerDown}
      ref={nodeRef}
      data-widget={id}
      data-editing={edit ? "1" : "0"}
      data-pin={pin ?? ""}
    >
      {edit ? (
        <div
          className={cn(
            "pointer-events-none absolute -top-6 font-mono text-[0.65rem] tracking-[0.14em] uppercase",
            pin === "right" ? "right-0" : "left-0",
            selected ? "text-accent" : "text-ov-muted",
          )}
        >
          {WIDGET_LABELS[id]}
        </div>
      ) : null}
      <div
        data-placed-body
        className={cn(
          edit && "rounded-md ring-1 ring-ov-fg/25",
          selected && "ring-2 ring-accent",
        )}
      >
        {children}
      </div>
    </div>
  );
}
