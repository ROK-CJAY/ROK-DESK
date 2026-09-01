import type { LookupCard } from "@/lib/card-lookup";

export type DeckCard = {
  id: string;
  name: string;
  set: string;
  number: string;
  image: string;
  type: string;
  qty: number;
  regulation?: string;
};

export function emptyDecklist(): DeckCard[] {
  return [];
}

export function mergeDecklist(raw: unknown): DeckCard[] {
  if (!Array.isArray(raw)) return [];
  const rows: DeckCard[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const name = String(r.name ?? "").trim();
    const id = String(r.id ?? name).trim();
    if (!id && !name) continue;
    const qty = clampQty(r.qty);
    const existing = rows.find((row) => row.id === id);
    if (existing) {
      existing.qty = clampQty(existing.qty + qty);
      if (!existing.regulation) {
        const mark = regMark(r.regulation);
        if (mark) existing.regulation = mark;
      }
      continue;
    }
    rows.push({
      id: id || name,
      name: name || id,
      set: String(r.set ?? ""),
      number: String(r.number ?? ""),
      image: String(r.image ?? ""),
      type: String(r.type ?? ""),
      qty,
      ...(regMark(r.regulation) ? { regulation: regMark(r.regulation) } : {}),
    });
  }
  return rows;
}

export function clampQty(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(99, n));
}

export function decklistCount(cards: DeckCard[] | undefined): number {
  return (cards ?? []).reduce((sum, card) => sum + card.qty, 0);
}

function regMark(value: unknown): string {
  const mark = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 1);
  return mark;
}

export function addDeckCard(list: DeckCard[], card: LookupCard, qty = 1): DeckCard[] {
  const id = card.id || card.name;
  if (!id) return list;
  const next = mergeDecklist(list);
  const existing = next.find((row) => row.id === id);
  if (existing) {
    existing.qty = clampQty(existing.qty + qty);
    return next;
  }
  next.push({
    id,
    name: card.name,
    set: card.set ?? "",
    number: card.number ?? "",
    image: card.image ?? "",
    type: card.type ?? "",
    qty: clampQty(qty),
    ...(regMark(card.regulation) ? { regulation: regMark(card.regulation) } : {}),
  });
  return next;
}

export function setDeckQty(list: DeckCard[], id: string, qty: number): DeckCard[] {
  if (qty < 1) return list.filter((row) => row.id !== id);
  return list.map((row) => (row.id === id ? { ...row, qty: clampQty(qty) } : row));
}

export function removeDeckCard(list: DeckCard[], id: string): DeckCard[] {
  return list.filter((row) => row.id !== id);
}

export function lookupFromDeck(card: DeckCard): LookupCard {
  return {
    id: card.id,
    name: card.name,
    set: card.set || undefined,
    number: card.number || undefined,
    image: card.image || undefined,
    type: card.type || undefined,
  };
}

export function filterDecklist(list: DeckCard[] | undefined, query: string): DeckCard[] {
  const rows = list ?? [];
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (card) =>
      card.name.toLowerCase().includes(q) ||
      card.set.toLowerCase().includes(q) ||
      card.number.toLowerCase().includes(q) ||
      card.type.toLowerCase().includes(q),
  );
}

export function hasSavedDecklist(players: { decklist?: DeckCard[] }[]): boolean {
  return players.some((player) => (player.decklist ?? []).length > 0);
}
