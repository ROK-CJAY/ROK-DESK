import type { LookupAbility, LookupAttack, LookupCard } from "@/lib/card-lookup";

export type DeckCard = {
  id: string;
  name: string;
  set: string;
  number: string;
  image: string;
  type: string;
  qty: number;
  regulation?: string;
  hp?: string;
  text?: string;
  attacks?: LookupAttack[];
  abilities?: LookupAbility[];
};

export function emptyDecklist(): DeckCard[] {
  return [];
}

function asAttacks(value: unknown): LookupAttack[] | undefined {
  if (!Array.isArray(value) || !value.length) return undefined;
  const rows = value.flatMap((item) => {
    if (!item || typeof item !== "object" || !("name" in item)) return [];
    const row = item as Record<string, unknown>;
    const name = String(row.name ?? "").trim();
    if (!name) return [];
    return [
      {
        name,
        cost: Array.isArray(row.cost) ? row.cost.map(String) : undefined,
        damage: row.damage != null && String(row.damage) ? String(row.damage) : undefined,
        text: row.text ? String(row.text) : undefined,
      },
    ];
  });
  return rows.length ? rows : undefined;
}

function asAbilities(value: unknown): LookupAbility[] | undefined {
  if (!Array.isArray(value) || !value.length) return undefined;
  const rows = value.flatMap((item) => {
    if (!item || typeof item !== "object" || !("name" in item)) return [];
    const row = item as Record<string, unknown>;
    const name = String(row.name ?? "").trim();
    if (!name) return [];
    return [{ name, text: row.text ? String(row.text) : undefined }];
  });
  return rows.length ? rows : undefined;
}

function extrasFrom(raw: Record<string, unknown>): Partial<DeckCard> {
  const hp = raw.hp != null && String(raw.hp).trim() ? String(raw.hp) : undefined;
  const text = raw.text != null && String(raw.text).trim() ? String(raw.text) : undefined;
  const attacks = asAttacks(raw.attacks);
  const abilities = asAbilities(raw.abilities);
  return {
    ...(hp ? { hp } : {}),
    ...(text ? { text } : {}),
    ...(attacks ? { attacks } : {}),
    ...(abilities ? { abilities } : {}),
  };
}

function fillMissing(into: DeckCard, from: Record<string, unknown>) {
  const extra = extrasFrom(from);
  if (!into.hp && extra.hp) into.hp = extra.hp;
  if (!into.text && extra.text) into.text = extra.text;
  if (!into.attacks?.length && extra.attacks) into.attacks = extra.attacks;
  if (!into.abilities?.length && extra.abilities) into.abilities = extra.abilities;
  if (!into.image && from.image) into.image = String(from.image);
  if (!into.type && from.type) into.type = String(from.type);
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
      fillMissing(existing, r);
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
      ...extrasFrom(r),
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

/** Keep each row in place — do not stack by id. Hydrate needs 1:1 with the request. */
export function deckCardsKeepOrder(raw: unknown, cap = 160): DeckCard[] {
  if (!Array.isArray(raw)) return [];
  const rows: DeckCard[] = [];
  for (const item of raw) {
    const one = mergeDecklist([item])[0];
    rows.push(
      one ?? {
        id: "",
        name: "",
        set: "",
        number: "",
        image: "",
        type: "",
        qty: 1,
      },
    );
    if (rows.length >= cap) break;
  }
  return rows;
}

export function printedNamesMatch(a: string, b: string): boolean {
  const fold = (value: string) =>
    value
      .toLowerCase()
      .replace(/['’`]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  return Boolean(a) && fold(a) === fold(b);
}

export function applyHydratedCard(orig: DeckCard, hit?: DeckCard | null): DeckCard {
  if (!hit) return orig;
  if (orig.name && hit.name && !printedNamesMatch(orig.name, hit.name)) return orig;
  return {
    ...orig,
    ...hit,
    id: orig.id,
    qty: orig.qty,
    name: orig.name || hit.name,
    set: orig.set || hit.set,
    number: orig.number || hit.number,
    image: hit.image || orig.image,
    hp: hit.hp || orig.hp,
    text: hit.text || orig.text,
    attacks: hit.attacks?.length ? hit.attacks : orig.attacks,
    abilities: hit.abilities?.length ? hit.abilities : orig.abilities,
  };
}

export function applyHydratedList(orig: DeckCard[], hits: DeckCard[] | undefined): DeckCard[] {
  if (!orig.length) return orig;
  if (!hits?.length) return orig;
  return orig.map((card, i) => applyHydratedCard(card, hits[i]));
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
    fillMissing(existing, card as unknown as Record<string, unknown>);
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
    ...extrasFrom(card as unknown as Record<string, unknown>),
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
    category: card.type || undefined,
    hp: card.hp,
    text: card.text,
    attacks: card.attacks,
    abilities: card.abilities,
    regulation: card.regulation,
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
