import type { OverlaySourceId } from "@/components/desk/sources";

export type OverlayFontId =
  | "barlow"
  | "oswald"
  | "bebas"
  | "anton"
  | "teko"
  | "dm-sans"
  | "inter"
  | "source-sans"
  | "nunito"
  | "ibm-plex"
  | "jetbrains"
  | "roboto-mono";

export type OverlayLook = {
  fg: string;
  muted: string;
  accent: string;
  panel: string;
  live: string;
  displayFont: OverlayFontId;
  bodyFont: OverlayFontId;
  monoFont: OverlayFontId;
  scale: number;
  panelAlpha: number;
  radius: number;
  tracking: number;
  uppercase: boolean;
};

export type OverlayLookBook = {
  sources: Partial<Record<OverlaySourceId, OverlayLook>>;
};

export const FONT_OPTIONS: { id: OverlayFontId; label: string; stack: string; role: "display" | "body" | "mono" }[] = [
  { id: "barlow", label: "Barlow Condensed", stack: '"Barlow Condensed", "Arial Narrow", sans-serif', role: "display" },
  { id: "oswald", label: "Oswald", stack: 'Oswald, "Arial Narrow", sans-serif', role: "display" },
  { id: "bebas", label: "Bebas Neue", stack: '"Bebas Neue", "Arial Narrow", sans-serif', role: "display" },
  { id: "anton", label: "Anton", stack: 'Anton, Impact, sans-serif', role: "display" },
  { id: "teko", label: "Teko", stack: 'Teko, "Arial Narrow", sans-serif', role: "display" },
  { id: "dm-sans", label: "DM Sans", stack: '"DM Sans", "Segoe UI", sans-serif', role: "body" },
  { id: "inter", label: "Inter", stack: 'Inter, "Segoe UI", sans-serif', role: "body" },
  { id: "source-sans", label: "Source Sans 3", stack: '"Source Sans 3", "Segoe UI", sans-serif', role: "body" },
  { id: "nunito", label: "Nunito Sans", stack: '"Nunito Sans", "Segoe UI", sans-serif', role: "body" },
  { id: "ibm-plex", label: "IBM Plex Mono", stack: '"IBM Plex Mono", ui-monospace, monospace', role: "mono" },
  { id: "jetbrains", label: "JetBrains Mono", stack: '"JetBrains Mono", ui-monospace, monospace', role: "mono" },
  { id: "roboto-mono", label: "Roboto Mono", stack: '"Roboto Mono", ui-monospace, monospace', role: "mono" },
];

export const LOOK_PRESETS: { id: string; label: string; look: Partial<OverlayLook> }[] = [
  {
    id: "house",
    label: "House",
    look: {
      fg: "#f4f4f1",
      muted: "#b7b9be",
      accent: "#8d97a8",
      panel: "#16191e",
      live: "#d4534c",
      displayFont: "barlow",
      bodyFont: "dm-sans",
      monoFont: "ibm-plex",
    },
  },
  {
    id: "broadcast",
    label: "Broadcast",
    look: {
      fg: "#f7f7f5",
      muted: "#c8c4ba",
      accent: "#e8d48b",
      panel: "#14120e",
      live: "#e24b3a",
      displayFont: "oswald",
      bodyFont: "inter",
      monoFont: "ibm-plex",
    },
  },
  {
    id: "night",
    label: "Night",
    look: {
      fg: "#e8eef8",
      muted: "#9aa8c2",
      accent: "#6d8cff",
      panel: "#10141c",
      live: "#ff6b6b",
      displayFont: "teko",
      bodyFont: "dm-sans",
      monoFont: "jetbrains",
    },
  },
  {
    id: "paper",
    label: "Paper",
    look: {
      fg: "#241810",
      muted: "#6a5648",
      accent: "#8a2e32",
      panel: "#efe6d8",
      live: "#b42318",
      monoFont: "ibm-plex",
    },
  },
  {
    id: "rok",
    label: "ROK",
    look: {
      fg: "#f4f4f1",
      muted: "#c5ccd6",
      accent: "#e4c56a",
      panel: "#10131a",
      live: "#d4534c",
      displayFont: "barlow",
      bodyFont: "dm-sans",
      monoFont: "ibm-plex",
    },
  },
];

export const DEFAULT_LOOK: OverlayLook = {
  fg: "#f4f4f1",
  muted: "#b7b9be",
  accent: "#8d97a8",
  panel: "#16191e",
  live: "#d4534c",
  displayFont: "barlow",
  bodyFont: "dm-sans",
  monoFont: "ibm-plex",
  scale: 100,
  panelAlpha: 100,
  radius: 12,
  tracking: 0,
  uppercase: true,
};

export const DEFAULT_LOOK_BOOK: OverlayLookBook = { sources: {} };

export function mergeLook(raw: unknown): OverlayLook {
  const incoming = raw && typeof raw === "object" ? (raw as Partial<OverlayLook>) : {};
  return {
    fg: pickHex(incoming.fg, DEFAULT_LOOK.fg),
    muted: pickHex(incoming.muted, DEFAULT_LOOK.muted),
    accent: pickHex(incoming.accent, DEFAULT_LOOK.accent),
    panel: pickHex(incoming.panel, DEFAULT_LOOK.panel),
    live: pickHex(incoming.live, DEFAULT_LOOK.live),
    displayFont: isFont(incoming.displayFont) ? incoming.displayFont : DEFAULT_LOOK.displayFont,
    bodyFont: isFont(incoming.bodyFont) ? incoming.bodyFont : DEFAULT_LOOK.bodyFont,
    monoFont: isFont(incoming.monoFont) ? incoming.monoFont : DEFAULT_LOOK.monoFont,
    scale: clampScale(typeof incoming.scale === "number" ? incoming.scale : DEFAULT_LOOK.scale),
    panelAlpha: clampAlpha(typeof incoming.panelAlpha === "number" ? incoming.panelAlpha : DEFAULT_LOOK.panelAlpha),
    radius: clampRadius(typeof incoming.radius === "number" ? incoming.radius : DEFAULT_LOOK.radius),
    tracking: clampTracking(typeof incoming.tracking === "number" ? incoming.tracking : DEFAULT_LOOK.tracking),
    uppercase: incoming.uppercase !== false,
  };
}

export function mergeLookBook(raw: unknown): OverlayLookBook {
  const incoming = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const sources: OverlayLookBook["sources"] = {};
  const bag = isRecord(incoming.sources) ? incoming.sources : incoming;
  for (const [key, value] of Object.entries(bag)) {
    if (key === "sources" || key === "sourceScale") continue;
    if (value && typeof value === "object" && "fg" in (value as object)) {
      sources[key as OverlaySourceId] = mergeLook(value);
    }
  }
  return { sources };
}

export function lookFor(book: OverlayLookBook | undefined, source?: OverlaySourceId): OverlayLook {
  if (!source || !book?.sources[source]) return { ...DEFAULT_LOOK };
  return mergeLook(book.sources[source]);
}

export function setSourceLook(book: OverlayLookBook, source: OverlaySourceId, look: OverlayLook): OverlayLookBook {
  return { sources: { ...book.sources, [source]: mergeLook(look) } };
}

export function resetSourceLook(book: OverlayLookBook, source: OverlaySourceId): OverlayLookBook {
  const sources = { ...book.sources };
  delete sources[source];
  return { sources };
}

export function looksEqual(a: OverlayLook, b: OverlayLook): boolean {
  return (
    a.fg === b.fg &&
    a.muted === b.muted &&
    a.accent === b.accent &&
    a.panel === b.panel &&
    a.live === b.live &&
    a.displayFont === b.displayFont &&
    a.bodyFont === b.bodyFont &&
    a.monoFont === b.monoFont &&
    a.scale === b.scale &&
    a.panelAlpha === b.panelAlpha &&
    a.radius === b.radius &&
    a.tracking === b.tracking &&
    a.uppercase === b.uppercase
  );
}

export function fontStack(id: OverlayFontId): string {
  return FONT_OPTIONS.find((f) => f.id === id)?.stack ?? FONT_OPTIONS[0].stack;
}

export function lookStyle(look: OverlayLook): Record<string, string> {
  const s = clampScale(look.scale) / 100;
  const alpha = clampAlpha(look.panelAlpha) / 100;
  const radius = clampRadius(look.radius);
  return {
    "--color-ov-fg": look.fg,
    "--color-ov-muted": look.muted,
    "--color-ov-panel": hexAlpha(look.panel, alpha),
    "--color-game": look.accent,
    "--color-live": look.live,
    "--font-display": fontStack(look.displayFont),
    "--font-sans": fontStack(look.bodyFont),
    "--font-mono": fontStack(look.monoFont),
    "--text-ov-score": `${4.25 * s}rem`,
    "--text-ov-name": `${2.65 * s}rem`,
    "--text-ov-meta": `${1.05 * s}rem`,
    "--text-ov-kicker": `${0.78 * s}rem`,
    "--text-ov-hero": `${6.5 * s}rem`,
    "--ov-scale": String(s),
    "--ov-tracking": `${clampTracking(look.tracking) / 100}em`,
    "--ov-radius": `${radius}px`,
    "--radius-xs": `${Math.max(2, Math.round(radius * 0.33))}px`,
    "--radius-sm": `${Math.max(4, Math.round(radius * 0.66))}px`,
    "--radius-md": `${radius}px`,
    "--radius-lg": `${Math.round(radius * 1.33)}px`,
    "--radius-xl": `${Math.round(radius * 2)}px`,
    "--radius": `${radius}px`,
  };
}

function pickHex(value: unknown, fallback: string): string {
  if (typeof value === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)) return value;
  return fallback;
}

function isFont(value: unknown): value is OverlayFontId {
  return typeof value === "string" && FONT_OPTIONS.some((f) => f.id === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function clampScale(value: number): number {
  return Math.min(140, Math.max(70, Math.round(value)));
}

export function clampAlpha(value: number): number {
  return Math.min(100, Math.max(40, Math.round(value)));
}

export function clampRadius(value: number): number {
  return Math.min(28, Math.max(0, Math.round(value)));
}

export function clampTracking(value: number): number {
  return Math.min(16, Math.max(0, Math.round(value)));
}

export function applyLookToAll(look: OverlayLook, ids: OverlaySourceId[]): OverlayLookBook {
  const sources: OverlayLookBook["sources"] = {};
  const next = mergeLook(look);
  for (const id of ids) sources[id] = next;
  return { sources };
}

function hexAlpha(hex: string, alpha: number): string {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  if (full.length !== 6) return hex;
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${full}${a}`;
}
