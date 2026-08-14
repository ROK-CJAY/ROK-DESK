export type LookupAttack = {
  name: string;
  cost?: string[];
  damage?: string;
  text?: string;
};

export type LookupAbility = {
  name: string;
  text?: string;
};

export type LookupCard = {
  id: string;
  name: string;
  set?: string;
  number?: string;
  image?: string;
  type?: string;
  text?: string;
  category?: string;
  hp?: string;
  rarity?: string;
  stage?: string;
  trainerType?: string;
  retreat?: string;
  attacks?: LookupAttack[];
  abilities?: LookupAbility[];
};

export const TCGDEX_BASE = "https://api.tcgdex.net/v2/en";

export function cardLookupReady(): boolean {
  return true;
}

export function cardImageUrl(image?: string, size: "low" | "high" = "high"): string {
  if (!image) return "";
  if (image.endsWith(".webp") || image.endsWith(".png") || image.endsWith(".jpg")) return image;
  return `${image}/${size}.webp`;
}

export async function searchLookupCards(query: string, liveOnly = true): Promise<LookupCard[]> {
  const q = query.trim();
  if (!q) return [];
  const url = new URL(`${TCGDEX_BASE}/cards`);
  url.searchParams.set("name", q);
  url.searchParams.set("pagination:itemsPerPage", "30");
  if (liveOnly) url.searchParams.set("legal.standard", "true");
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Card lookup failed (${res.status})`);
  const data = (await res.json()) as unknown;
  return normalizeList(data);
}

export async function fetchLookupCard(id: string): Promise<LookupCard | null> {
  const res = await fetch(`${TCGDEX_BASE}/cards/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Card detail failed (${res.status})`);
  const data = (await res.json()) as unknown;
  if (!data || typeof data !== "object") return null;
  return normalizeCard(data as Record<string, unknown>);
}

function normalizeList(data: unknown): LookupCard[] {
  const rows = Array.isArray(data) ? data : [];
  const cards: LookupCard[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const card = normalizeCard(row as Record<string, unknown>);
    if (card.name) cards.push(card);
  }
  return cards;
}

function normalizeCard(item: Record<string, unknown>): LookupCard {
  const set = isRecord(item.set) ? item.set : null;
  const types = Array.isArray(item.types) ? item.types.map(String) : [];
  const attacks = Array.isArray(item.attacks)
    ? item.attacks.flatMap((row) => {
        if (!isRecord(row) || !row.name) return [];
        return [
          {
            name: String(row.name),
            cost: Array.isArray(row.cost) ? row.cost.map(String) : undefined,
            damage: row.damage != null ? String(row.damage) : undefined,
            text: row.effect ? String(row.effect) : row.text ? String(row.text) : undefined,
          },
        ];
      })
    : undefined;
  const abilities = Array.isArray(item.abilities)
    ? item.abilities.flatMap((row) => {
        if (!isRecord(row) || !row.name) return [];
        return [{ name: String(row.name), text: row.effect ? String(row.effect) : row.text ? String(row.text) : undefined }];
      })
    : undefined;
  const text = item.effect
    ? String(item.effect)
    : item.description
      ? String(item.description)
      : item.text
        ? String(item.text)
        : undefined;
  return {
    id: String(item.id ?? item.name ?? ""),
    name: String(item.name ?? "").trim(),
    set: set?.name ? String(set.name) : item.set ? String(item.set) : undefined,
    number: item.localId != null ? String(item.localId) : item.number ? String(item.number) : undefined,
    image: item.image ? String(item.image) : undefined,
    type: types.join(" / ") || (item.trainerType ? String(item.trainerType) : item.category ? String(item.category) : undefined),
    text,
    category: item.category ? String(item.category) : undefined,
    hp: item.hp != null ? String(item.hp) : undefined,
    rarity: item.rarity ? String(item.rarity) : undefined,
    stage: item.stage ? String(item.stage) : undefined,
    trainerType: item.trainerType ? String(item.trainerType) : undefined,
    retreat: item.retreat != null ? String(item.retreat) : undefined,
    attacks,
    abilities,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
