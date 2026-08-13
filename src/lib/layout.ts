export const CANVAS_W = 1920;
export const CANVAS_H = 1080;
export const SCOREBUG_BAR_H = 108;

export const WIDGET_IDS = [
  "scorebugBar",
  "scorebugP1",
  "scorebugP2",
  "scorebugP3",
  "scorebugP4",
  "scorebugCenter",
  "caster1",
  "caster2",
  "lowerThird",
  "timer",
  "resourceP1",
  "resourceP2",
  "winner",
  "upcoming",
  "rosterP1",
  "rosterP2",
] as const;

export type WidgetId = (typeof WIDGET_IDS)[number];
export type WidgetPos = { x: number; y: number };
export type LayoutMap = Record<WidgetId, WidgetPos>;

export const WIDGET_LABELS: Record<WidgetId, string> = {
  scorebugBar: "Scorebug",
  scorebugP1: "P1 plate",
  scorebugP2: "P2 plate",
  scorebugP3: "P3 plate",
  scorebugP4: "P4 plate",
  scorebugCenter: "Round plate",
  caster1: "Caster 1",
  caster2: "Caster 2",
  lowerThird: "Lower third",
  timer: "Clock",
  resourceP1: "P1 resource",
  resourceP2: "P2 resource",
  winner: "Winner",
  upcoming: "Up next",
  rosterP1: "P1 roster",
  rosterP2: "P2 roster",
};

export const DEFAULT_LAYOUT: LayoutMap = {
  scorebugBar: { x: 0, y: CANVAS_H - SCOREBUG_BAR_H },
  scorebugP1: { x: 48, y: 40 },
  scorebugP2: { x: 1352, y: 40 },
  scorebugP3: { x: 1352, y: 800 },
  scorebugP4: { x: 48, y: 800 },
  scorebugCenter: { x: 780, y: 48 },
  caster1: { x: 48, y: 668 },
  caster2: { x: 1472, y: 668 },
  lowerThird: { x: 672, y: 828 },
  timer: { x: 1572, y: 476 },
  resourceP1: { x: 48, y: 828 },
  resourceP2: { x: 1512, y: 828 },
  winner: { x: 0, y: 390 },
  upcoming: { x: 48, y: 220 },
  rosterP1: { x: 1012, y: 132 },
  rosterP2: { x: 28, y: 132 },
};

export function clampPos(pos: WidgetPos, fullWidth = false): WidgetPos {
  const maxX = fullWidth ? 0 : CANVAS_W - 80;
  return {
    x: Math.round(Math.min(maxX, Math.max(0, pos.x))),
    y: Math.round(Math.min(CANVAS_H - 40, Math.max(0, pos.y))),
  };
}

export function barPosFor(edge: "top" | "bottom"): WidgetPos {
  return { x: 0, y: edge === "top" ? 0 : CANVAS_H - SCOREBUG_BAR_H };
}

export function mergeLayout(raw: unknown): LayoutMap {
  const incoming =
    raw && typeof raw === "object" ? (raw as Partial<Record<WidgetId, Partial<WidgetPos>>>) : {};
  const next = { ...DEFAULT_LAYOUT };
  for (const id of WIDGET_IDS) {
    const pos = incoming[id];
    if (pos && typeof pos.x === "number" && typeof pos.y === "number") {
      next[id] = clampPos({ x: pos.x, y: pos.y }, id === "scorebugBar");
    }
  }
  return next;
}

export function layoutsEqual(a: LayoutMap, b: LayoutMap): boolean {
  return WIDGET_IDS.every((id) => a[id].x === b[id].x && a[id].y === b[id].y);
}

export function cloneLayout(layout: LayoutMap): LayoutMap {
  const next = { ...DEFAULT_LAYOUT };
  for (const id of WIDGET_IDS) {
    next[id] = { x: layout[id].x, y: layout[id].y };
  }
  return next;
}

export function isDefaultLayout(layout: LayoutMap): boolean {
  return layoutsEqual(layout, DEFAULT_LAYOUT);
}

export const COMMANDER_LAYOUT: Partial<LayoutMap> = {
  scorebugP1: { x: 24, y: 20 },
  scorebugP2: { x: 1596, y: 20 },
  scorebugP3: { x: 1596, y: 978 },
  scorebugP4: { x: 24, y: 978 },
  scorebugCenter: { x: 820, y: 16 },
};

export const VERSUS_PLATE_LAYOUT: Partial<LayoutMap> = {
  scorebugP1: { x: 48, y: 40 },
  scorebugP2: { x: 1352, y: 40 },
  scorebugCenter: { x: 780, y: 48 },
};
