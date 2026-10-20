export const WUBRG = ["W", "U", "B", "R", "G"] as const;
export type ManaColor = (typeof WUBRG)[number];

/** Broadcast-safe mana fills — dark enough for white type. */
export const MANA_FILL: Record<ManaColor | "C", string> = {
  W: "#c4b36a",
  U: "#0c5a96",
  B: "#2a2434",
  R: "#a12e24",
  G: "#14633f",
  C: "#5c5854",
};

export function normalizeColorIdentity(raw: unknown): ManaColor[] {
  const letters = Array.isArray(raw)
    ? raw.map(String)
    : typeof raw === "string"
      ? raw.split("")
      : [];
  const set = new Set(
    letters
      .map((c) => c.toUpperCase())
      .filter((c): c is ManaColor => (WUBRG as readonly string[]).includes(c)),
  );
  return WUBRG.filter((c) => set.has(c));
}

export function mergeColorIdentity(...lists: Array<readonly string[]>): ManaColor[] {
  const set = new Set<string>();
  for (const list of lists) for (const c of list) set.add(c.toUpperCase());
  return WUBRG.filter((c) => set.has(c));
}

/** Front face only — Scryfall DFC names are "Front // Back". */
export function commanderFaceName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  return trimmed.split(/\s*\/\/\s*/)[0]?.trim() || trimmed;
}

const NAMED_COLORS: Array<[RegExp, string]> = [
  [/\b(5c|five[- ]color|wubrg|domain)\b/i, "WUBRG"],
  [/\bsultai\b/i, "UBG"],
  [/\bizzet\b/i, "UR"],
  [/\bazorius\b/i, "WU"],
  [/\bdimir\b/i, "UB"],
  [/\brakdos\b/i, "BR"],
  [/\bgruul\b/i, "RG"],
  [/\bgolgari\b/i, "BG"],
  [/\bselesnya\b/i, "WG"],
  [/\borzhov\b/i, "WB"],
  [/\bboros\b/i, "RW"],
  [/\bsimic\b/i, "GU"],
  [/\bbant\b/i, "GWU"],
  [/\besper\b/i, "WUB"],
  [/\bgrixis\b/i, "UBR"],
  [/\bjund\b/i, "BRG"],
  [/\bnaya\b/i, "RGW"],
  [/\babzan\b/i, "WBG"],
  [/\bjeskai\b/i, "URW"],
  [/\bmardu\b/i, "RWB"],
  [/\btemur\b/i, "GUR"],
  [/\bmono[- ]?white\b|\bmonowhite\b/i, "W"],
  [/\bmono[- ]?blue\b|\bmonoblue\b/i, "U"],
  [/\bmono[- ]?black\b|\bmonoblack\b/i, "B"],
  [/\bmono[- ]?red\b|\bmonored\b/i, "R"],
  [/\bmono[- ]?green\b|\bmonogreen\b/i, "G"],
];

/** Explicit WUBRG letters win. Otherwise guess from a deck name like "Izzet Lessons". */
export function deckColorIdentity(explicit: string, deckName = ""): ManaColor[] {
  const picked = normalizeColorIdentity(explicit);
  if (picked.length) return picked;
  const name = deckName.trim();
  if (!name) return [];
  for (const [pattern, letters] of NAMED_COLORS) {
    if (pattern.test(name)) return normalizeColorIdentity(letters);
  }
  return [];
}

export function commanderPlateGradient(colors: readonly string[], right = false): string {
  const fills = (colors.length ? colors : ["C"]).map((c) => MANA_FILL[c as ManaColor] ?? MANA_FILL.C);
  const angle = right ? "270deg" : "90deg";
  const veil = "rgba(8, 10, 14, 0.42)";
  if (fills.length === 1) {
    return `linear-gradient(${angle}, ${fills[0]} 0%, ${fills[0]} 55%, ${veil} 100%)`;
  }
  const stripe = fills
    .map((hex, i) => {
      const a = (i / fills.length) * 100;
      const b = ((i + 1) / fills.length) * 100;
      return `${hex} ${a}% ${b}%`;
    })
    .join(", ");
  return `linear-gradient(${angle}, ${stripe}), linear-gradient(${veil}, ${veil})`;
}
