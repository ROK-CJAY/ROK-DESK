/** PTCGL / Limitless energy glyphs. `{P}` is Psychic, not the letter P. */
export const ENERGY_GLYPHS: Record<string, string> = {
  G: "Grass",
  R: "Fire",
  W: "Water",
  L: "Lightning",
  P: "Psychic",
  F: "Fighting",
  D: "Darkness",
  M: "Metal",
  Y: "Fairy",
  C: "Colorless",
  N: "Dragon",
};

const TYPE_NAMES = Object.values(ENERGY_GLYPHS);
const TYPE_BY_LOWER = Object.fromEntries(TYPE_NAMES.map((name) => [name.toLowerCase(), name]));

export type ParsedDeckLine = {
  qty: number;
  name: string;
  set: string;
  number: string;
  names: string[];
  raw: string;
};

const SECTION = /^(pok[eé]mon|trainer|energy|cards?|item|supporter|stadium|tool|total|sideboard|list)\s*:?/i;

export function allowedLimitlessUrl(raw: string): URL | null {
  const text = raw.trim();
  if (!/^https:\/\//i.test(text)) return null;
  try {
    const url = new URL(text);
    const host = url.hostname.toLowerCase();
    const ok =
      host === "my.limitlesstcg.com" ||
      host === "limitlesstcg.com" ||
      host === "www.limitlesstcg.com" ||
      host === "mew.limitlesstcg.com" ||
      host === "play.limitlesstcg.com";
    return ok ? url : null;
  } catch {
    return null;
  }
}

export function limitlessShareId(url: URL): string | null {
  const shared = url.pathname.match(/\/shared\/([a-f0-9]{16,})$/i);
  if (shared) return shared[1];
  const api = url.pathname.match(/\/dm\/share\/([a-f0-9]{16,})$/i);
  if (api) return api[1];
  return null;
}

export function expandEnergyGlyphs(raw: string): string {
  return raw
    .replace(/\{([A-Za-z]+)\}/g, (_, key: string) => {
      const letter = ENERGY_GLYPHS[key.toUpperCase()];
      if (letter) return letter;
      return TYPE_BY_LOWER[key.toLowerCase()] ?? key;
    })
    .replace(/\s+/g, " ")
    .trim();
}

export function stripEnergyGlyphs(raw: string): string {
  return raw
    .replace(/\s*\{[A-Za-z]+\}\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function energyNameCandidates(raw: string): string[] {
  const seen = new Set<string>();
  const add = (value: string) => {
    const next = value.replace(/\s+/g, " ").trim();
    if (next) seen.add(next);
  };

  const base = raw.replace(/\s+/g, " ").trim();
  add(base);
  add(expandEnergyGlyphs(base));
  const stripped = stripEnergyGlyphs(base);
  if (!/^basic energy$/i.test(stripped)) add(stripped);

  const letter = base.match(/^basic\s+([GRWLPFDMYNC])\s+energy$/i);
  if (letter) add(`Basic ${ENERGY_GLYPHS[letter[1].toUpperCase()] ?? letter[1]} Energy`);

  const glyphBasic = base.match(/^basic\s+\{([A-Za-z]+)\}\s+energy$/i);
  if (glyphBasic) {
    const key = glyphBasic[1];
    const type = ENERGY_GLYPHS[key.toUpperCase()] ?? TYPE_BY_LOWER[key.toLowerCase()] ?? key;
    add(`Basic ${type} Energy`);
    add(`${type} Energy`);
  }

  const typed = stripped.match(new RegExp(`^(?:basic\\s+)?(${TYPE_NAMES.join("|")})\\s+energy$`, "i"));
  if (typed) {
    const type = TYPE_BY_LOWER[typed[1].toLowerCase()] ?? typed[1];
    add(`${type} Energy`);
    add(`Basic ${type} Energy`);
  }

  return [...seen];
}

export function parsePtcgDeckText(text: string): ParsedDeckLine[] {
  const htmlLines = parseLimitlessDeckHtml(text);
  if (htmlLines.length) return htmlLines;
  const shareLines = parseLimitlessShareCards(text);
  if (shareLines.length) return shareLines;

  const lines: ParsedDeckLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\u00a0/g, " ").trim();
    if (!line || SECTION.test(line) || line.startsWith("#") || line.startsWith("//")) continue;
    if (/^https?:\/\//i.test(line) && line.split(/\s+/).length === 1) continue;
    const parsed = parseDeckLine(line);
    if (parsed) lines.push(parsed);
  }
  return lines;
}

export function parseLimitlessShareCards(raw: string): ParsedDeckLine[] {
  const blob = raw.match(/\d+xi:[A-Za-z0-9]+~\d+[A-Za-z]?(?:;\d+xi:[A-Za-z0-9]+~\d+[A-Za-z]?)*/);
  if (!blob) return [];
  const lines: ParsedDeckLine[] = [];
  for (const part of blob[0].split(";")) {
    const hit = part.match(/^(\d+)xi:([A-Za-z0-9]+)~(\d+[A-Za-z]?)$/i);
    if (!hit) continue;
    const set = hit[2].toUpperCase();
    const number = hit[3].replace(/^0+/, "") || hit[3];
    lines.push({
      qty: clampQty(hit[1]),
      name: `${set} ${number}`,
      set,
      number,
      names: [],
      raw: part,
    });
  }
  return lines;
}

export function parseLimitlessDeckHtml(html: string): ParsedDeckLine[] {
  const fromHref = parseLimitlessHrefCards(html);
  if (fromHref.length) return fromHref;
  const fromBlocks: ParsedDeckLine[] = [];
  const blocks = html.matchAll(/<div[^>]*class="[^"]*decklist-card[^"]*"[^>]*>[\s\S]*?<\/div>/gi);
  for (const match of blocks) {
    const block = match[0] ?? "";
    const set = attr(block, "data-set");
    const number = attr(block, "data-number");
    const qty = Number((block.match(/class="card-count"[^>]*>\s*(\d+)/i) ?? [])[1] ?? 0);
    const name = decode((block.match(/class="card-name"[^>]*>([^<]+)/i) ?? [])[1] ?? "").trim();
    if (!name || qty < 1) continue;
    fromBlocks.push(row(String(qty), name, set, number, `${qty} ${name} ${set} ${number}`.trim()));
  }
  return fromBlocks;
}

function parseLimitlessHrefCards(html: string): ParsedDeckLine[] {
  if (!/limitlesstcg\.com\/cards\//i.test(html)) return [];
  const lines: ParsedDeckLine[] = [];
  const re =
    /href="https?:\/\/(?:www\.)?limitlesstcg\.com\/cards\/([^"\/]+)\/([^"\/?#]+)"[\s\S]{0,400}?alt="([^"]+)"[\s\S]{0,400}?cc-num[^>]*>(\d+)/gi;
  for (const match of html.matchAll(re)) {
    lines.push(row(match[4], decode(match[3]), match[1], match[2].replace(/^0+/, "") || match[2]));
  }
  return lines;
}

function attr(block: string, name: string): string {
  return (block.match(new RegExp(`${name}="([^"]*)"`, "i")) ?? [])[1] ?? "";
}

function decode(value: string): string {
  return value
    .replace(/&/g, "&")
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/'/g, "'");
}

function parseDeckLine(line: string): ParsedDeckLine | null {
  const cleaned = line.replace(/\s+(PH|RH|SV|holo|reverse)$/i, "").trim();
  let m = cleaned.match(/^(\d+)x?\s+(.+?)\s+\(([A-Za-z0-9]{2,8})\)\s+(\d+[A-Za-z]?)\s*$/);
  if (!m) m = cleaned.match(/^(\d+)x?\s+(.+?)\s+([A-Z][A-Z0-9]{1,7})\s+(\d+[A-Za-z]?)\s*$/);
  if (m) return row(m[1], m[2] ?? "", m[3], m[4], line);
  m = cleaned.match(/^(\d+)x?\s+(.+)$/);
  if (!m) return null;
  const name = (m[2] ?? "").trim();
  if (!name) return null;
  return row(m[1], name, "", "", line);
}

function row(qty: string, name: string, set?: string, number?: string, raw?: string): ParsedDeckLine {
  const cleaned = name.replace(/\s+/g, " ").trim();
  return {
    qty: clampQty(qty),
    name: expandEnergyGlyphs(cleaned) || cleaned,
    set: (set ?? "").toUpperCase(),
    number: number ?? "",
    names: energyNameCandidates(cleaned),
    raw: raw ?? `${qty} ${cleaned} ${set ?? ""} ${number ?? ""}`.trim(),
  };
}

function clampQty(value: string): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(99, n));
}
