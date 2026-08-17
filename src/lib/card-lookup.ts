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
  mana?: string;
  attacks?: LookupAttack[];
  abilities?: LookupAbility[];
};

export const TCGDEX_BASE = "https://api.tcgdex.net/v2/en";
export const SCRYFALL_BASE = "https://api.scryfall.com";
export const SWU_PROXY = "/api/swu-cards";
export const YGO_PROXY = "/api/ygo-cards";
export const OP_PROXY = "/api/op-cards";
export const RIFT_PROXY = "/api/rift-cards";

export function cardLookupReady(): boolean {
  return true;
}

export function cardImageUrl(image?: string, size: "low" | "high" = "high"): string {
  if (!image) return "";
  if (/\.(webp|png|jpe?g)(\?|#|$)/i.test(image)) return image;
  if (image.startsWith("/api/")) return image;
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
  if (!data || typeof data === "object" === false) return null;
  return normalizeCard(data as Record<string, unknown>);
}

export function scryfallLegalFor(formatName: string): string | null {
  const name = formatName.toLowerCase();
  if (name.includes("standard")) return "standard";
  if (name.includes("pioneer")) return "pioneer";
  if (name.includes("modern")) return "modern";
  if (name.includes("legacy")) return "legacy";
  if (name.includes("vintage")) return "vintage";
  if (name.includes("pauper")) return "pauper";
  if (name.includes("commander") || name.includes("cedh") || name.includes("edh")) return "commander";
  return null;
}

export async function searchScryfallCards(query: string, legal: string | null = null, uniquePrints = false): Promise<LookupCard[]> {
  const q = query.trim();
  if (!q) return [];
  const parts = [`${q}`];
  if (legal && !uniquePrints) parts.push(`legal:${legal}`);
  const url = new URL(`${SCRYFALL_BASE}/cards/search`);
  url.searchParams.set("q", parts.join(" "));
  url.searchParams.set("unique", uniquePrints ? "prints" : "cards");
  url.searchParams.set("order", uniquePrints ? "released" : "name");
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Scryfall lookup failed (${res.status})`);
  const data = (await res.json()) as unknown;
  if (!isRecord(data) || !Array.isArray(data.data)) return [];
  return data.data.flatMap((row) => {
    if (!isRecord(row)) return [];
    const card = normalizeScryfall(row);
    return card.name ? [card] : [];
  });
}

export async function fetchScryfallCard(id: string): Promise<LookupCard | null> {
  const res = await fetch(`${SCRYFALL_BASE}/cards/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as unknown;
  if (!isRecord(data)) return null;
  return normalizeScryfall(data);
}

export async function searchSwuCards(query: string): Promise<LookupCard[]> {
  const q = query.trim();
  if (!q) return [];
  const url = new URL(SWU_PROXY, window.location.origin);
  url.searchParams.set("q", q);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`SWU lookup failed (${res.status})`);
  const data = (await res.json()) as unknown;
  const rows = isRecord(data) && Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
  return rows.flatMap((row) => {
    if (!isRecord(row)) return [];
    const card = normalizeSwu(row);
    return card.name ? [card] : [];
  });
}

export async function fetchSwuCard(id: string): Promise<LookupCard | null> {
  const [set, number] = id.split("-");
  if (!set || !number) return null;
  const url = new URL(SWU_PROXY, window.location.origin);
  url.searchParams.set("set", set);
  url.searchParams.set("number", number);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as unknown;
  if (!isRecord(data)) return null;
  return normalizeSwu(data);
}

export function ygoFormatFor(formatName: string): string | null {
  const name = formatName.toLowerCase();
  if (name.includes("goat")) return "goat";
  if (name.includes("edison")) return "tcg";
  if (name.includes("master")) return "tcg";
  if (name.includes("advanced") || name.includes("tcg")) return "tcg";
  return null;
}

export async function searchYgoCards(query: string, format: string | null = null): Promise<LookupCard[]> {
  const q = query.trim();
  if (!q) return [];
  const url = new URL(YGO_PROXY, window.location.origin);
  url.searchParams.set("q", q);
  if (format) url.searchParams.set("format", format);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (res.status === 400 || res.status === 404) return [];
  if (!res.ok) throw new Error(`YGO lookup failed (${res.status})`);
  const data = (await res.json()) as unknown;
  const rows = isRecord(data) && Array.isArray(data.data) ? data.data : [];
  return rows.flatMap((row) => {
    if (!isRecord(row)) return [];
    const card = normalizeYgo(row);
    return card.name ? [card] : [];
  });
}

export async function fetchYgoCard(id: string): Promise<LookupCard | null> {
  if (!id) return null;
  const url = new URL(YGO_PROXY, window.location.origin);
  url.searchParams.set("id", id);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as unknown;
  const row = isRecord(data) && Array.isArray(data.data) ? data.data[0] : data;
  if (!isRecord(row)) return null;
  return normalizeYgo(row);
}

export async function searchOpCards(query: string): Promise<LookupCard[]> {
  const q = query.trim();
  if (!q) return [];
  const url = new URL(OP_PROXY, window.location.origin);
  url.searchParams.set("q", q);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`OP lookup failed (${res.status})`);
  const data = (await res.json()) as unknown;
  const rows = isRecord(data) && Array.isArray(data.data) ? data.data : [];
  return rows.flatMap((row) => {
    if (!isRecord(row)) return [];
    const card = normalizeOp(row);
    return card.name ? [card] : [];
  });
}

export async function fetchOpCard(id: string): Promise<LookupCard | null> {
  if (!id) return null;
  const url = new URL(OP_PROXY, window.location.origin);
  url.searchParams.set("id", id);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as unknown;
  const row = isRecord(data) && isRecord(data.data) ? data.data : isRecord(data) ? data : null;
  return row ? normalizeOp(row) : null;
}

export async function searchRiftCards(query: string): Promise<LookupCard[]> {
  const q = query.trim();
  if (!q) return [];
  const url = new URL(RIFT_PROXY, window.location.origin);
  url.searchParams.set("q", q);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Riftbound lookup failed (${res.status})`);
  const data = (await res.json()) as unknown;
  const rows = isRecord(data) && Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
  return rows.flatMap((row) => {
    if (!isRecord(row)) return [];
    const card = normalizeRift(row);
    return card.name ? [card] : [];
  });
}

export async function fetchRiftCard(id: string): Promise<LookupCard | null> {
  if (!id) return null;
  const url = new URL(RIFT_PROXY, window.location.origin);
  url.searchParams.set("id", id);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as unknown;
  if (!isRecord(data)) return null;
  return normalizeRift(data);
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

function normalizeScryfall(item: Record<string, unknown>): LookupCard {
  const faces = Array.isArray(item.card_faces) ? item.card_faces.filter(isRecord) : [];
  const face = faces[0];
  const images = isRecord(item.image_uris) ? item.image_uris : face && isRecord(face.image_uris) ? face.image_uris : null;
  const image = images?.normal ? String(images.normal) : images?.large ? String(images.large) : images?.small ? String(images.small) : undefined;
  const textParts = faces.length
    ? faces.map((f) => [f.name, f.oracle_text].filter(Boolean).join(" — ")).join("\n\n")
    : item.oracle_text
      ? String(item.oracle_text)
      : undefined;
  return {
    id: String(item.id ?? ""),
    name: String(item.name ?? "").trim(),
    set: item.set_name ? String(item.set_name) : undefined,
    number: item.collector_number != null ? String(item.collector_number) : undefined,
    image,
    type: item.type_line ? String(item.type_line) : face?.type_line ? String(face.type_line) : undefined,
    text: textParts,
    mana: item.mana_cost ? String(item.mana_cost) : face?.mana_cost ? String(face.mana_cost) : undefined,
    rarity: item.rarity ? String(item.rarity) : undefined,
  };
}

function normalizeSwu(item: Record<string, unknown>): LookupCard {
  const set = item.Set != null ? String(item.Set) : undefined;
  const number = item.Number != null ? String(item.Number) : undefined;
  const fronts = item.FrontText ? String(item.FrontText) : "";
  const backs = item.BackText ? String(item.BackText) : "";
  const aspects = Array.isArray(item.Aspects) ? item.Aspects.map(String).join(" / ") : item.Aspects ? String(item.Aspects) : "";
  return {
    id: set && number ? `${set}-${number}` : String(item.cid ?? item.Name ?? ""),
    name: String(item.Name ?? "").trim(),
    set,
    number,
    image: item.FrontArt ? String(item.FrontArt) : undefined,
    type: [item.Type, aspects].filter(Boolean).map(String).join(" · ") || undefined,
    text: [fronts, backs].filter(Boolean).join("\n\n") || undefined,
    hp: item.HP != null && String(item.HP) ? String(item.HP) : undefined,
    mana: item.Cost != null && String(item.Cost) ? String(item.Cost) : undefined,
    rarity: item.Rarity ? String(item.Rarity) : undefined,
    category: item.Type ? String(item.Type) : undefined,
  };
}

function normalizeYgo(item: Record<string, unknown>): LookupCard {
  const images = Array.isArray(item.card_images) ? item.card_images.filter(isRecord) : [];
  const art = images[0];
  const image = art?.image_url ? String(art.image_url) : art?.image_url_small ? String(art.image_url_small) : undefined;
  const atk = item.atk != null ? String(item.atk) : "";
  const def = item.def != null ? String(item.def) : "";
  const level = item.level != null ? `Lv ${item.level}` : item.linkval != null ? `Link ${item.linkval}` : "";
  const stats = [item.attribute, item.race, level, atk || def ? `${atk}/${def}` : ""].filter(Boolean).join(" · ");
  return {
    id: String(item.id ?? item.name ?? ""),
    name: String(item.name ?? "").trim(),
    set: item.archetype ? String(item.archetype) : undefined,
    image,
    type: item.type ? String(item.type) : undefined,
    text: item.desc ? String(item.desc) : undefined,
    rarity: stats || undefined,
    category: item.type ? String(item.type) : undefined,
  };
}

function normalizeOp(item: Record<string, unknown>): LookupCard {
  const id = String(item.id ?? item.card_id ?? "");
  const colors = Array.isArray(item.colors) ? item.colors.map(String).join(" / ") : "";
  const types = Array.isArray(item.types) ? item.types.map(String).join(" / ") : "";
  const rawImage = item.img_full_url
    ? String(item.img_full_url)
    : item.img_url && String(item.img_url).startsWith("http")
      ? String(item.img_url)
      : "";
  const image = id ? `/api/op-art?id=${encodeURIComponent(id)}` : rawImage.split("?")[0] || undefined;
  const text = [item.effect ? String(item.effect) : "", item.trigger ? `Trigger: ${item.trigger}` : ""].filter(Boolean).join("\n\n") || undefined;
  const cost = item.cost != null ? String(item.cost) : "";
  const power = item.power != null ? String(item.power) : "";
  const counter = item.counter != null ? String(item.counter) : "";
  return {
    id,
    name: String(item.name ?? "").trim(),
    set: id.split("-")[0],
    number: id,
    image,
    type: [item.category, colors, types].filter(Boolean).map(String).join(" · ") || undefined,
    text,
    mana: cost || undefined,
    hp: power || undefined,
    rarity: [item.rarity, power ? `${power} power` : "", counter ? `${counter} counter` : ""].filter(Boolean).map(String).join(" · ") || undefined,
    category: item.category ? String(item.category) : undefined,
  };
}

function normalizeRift(item: Record<string, unknown>): LookupCard {
  const classification = isRecord(item.classification) ? item.classification : {};
  const attributes = isRecord(item.attributes) ? item.attributes : {};
  const textBlock = isRecord(item.text) ? item.text : {};
  const set = isRecord(item.set) ? item.set : {};
  const media = isRecord(item.media) ? item.media : {};
  const domains = Array.isArray(classification.domain) ? classification.domain.map(String).join(" / ") : "";
  const energy = attributes.energy != null ? String(attributes.energy) : "";
  const might = attributes.might != null ? String(attributes.might) : "";
  const power = attributes.power != null ? String(attributes.power) : "";
  const stats = [
    energy ? `Energy ${energy}` : "",
    might ? `Might ${might}` : "",
    power ? `Power ${power}` : "",
  ].filter(Boolean);
  return {
    id: String(item.id ?? ""),
    name: String(item.name ?? "").trim(),
    set: set.label ? String(set.label) : set.set_id ? String(set.set_id) : undefined,
    number: item.riftbound_id ? String(item.riftbound_id) : item.collector_number != null ? String(item.collector_number) : undefined,
    image: media.image_url ? String(media.image_url) : undefined,
    type: [classification.type, classification.supertype, domains].filter(Boolean).map(String).join(" · ") || undefined,
    text: textBlock.plain ? String(textBlock.plain) : textBlock.rich ? String(textBlock.rich).replace(/<[^>]+>/g, "") : undefined,
    mana: energy || undefined,
    hp: might || undefined,
    rarity: [classification.rarity, ...stats].filter(Boolean).map(String).join(" · ") || undefined,
    category: classification.type ? String(classification.type) : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
