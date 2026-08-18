export const LORCANA_INKS = [
  { id: "amber", label: "Amber" },
  { id: "amethyst", label: "Amethyst" },
  { id: "emerald", label: "Emerald" },
  { id: "ruby", label: "Ruby" },
  { id: "sapphire", label: "Sapphire" },
  { id: "steel", label: "Steel" },
] as const;

export type LorcanaInkId = (typeof LORCANA_INKS)[number]["id"];

export function isLorcanaInk(value: string): value is LorcanaInkId {
  return LORCANA_INKS.some((ink) => ink.id === value);
}

export function sanitizeInk(value: unknown): LorcanaInkId | "" {
  return typeof value === "string" && isLorcanaInk(value) ? value : "";
}

export function inkSrc(id: LorcanaInkId): string {
  return `/lorcana/inks/${id}.png`;
}

export function formatRecord(w = 0, l = 0, d = 0): string {
  return `${Math.max(0, Number(w) || 0)}-${Math.max(0, Number(l) || 0)}-${Math.max(0, Number(d) || 0)}`;
}

export function gameDiamonds(bestOf: number): number {
  return Math.max(1, Math.ceil(bestOf / 2));
}