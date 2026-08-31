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

export type ParsedDeckLine = {
  qty: number;
  name: string;
  set?: string;
  number?: string;
  names: string[];
};

const SECTION = /^(pok[eé]mon|trainer|energy|cards?)\s*:/i;

export function allowedLimitlessUrl(raw: string): URL | null {
  const text = raw.trim();
  if (!/^https?:\/\//i.test(text)) return null;
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
    .replace(/\{([A-Za-z])\}/g, (_, key: string) => ENERGY_GLYPHS[key.toUpperCase()] ?? key)
    .replace(/\s+/g, " ")
    .trim();
}

export function stripEnergyGlyphs(raw: string): string {
  return raw
    .replace(/\s*\{[A-Za-z]\}\s*/g, " ")
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

  const glyphBasic = base.match(/^basic\s+\{([A-Za-z])\}\s+energy$/i);
  if (glyphBasic) add(`Basic ${ENERGY_GLYPHS[glyphBasic[1].toUpperCase()] ?? glyphBasic[1]} Energy`);

  const typed = stripped.match(new RegExp(`^(?:basic\s+)?(${TYPE_NAMES.join("|")})\s+energy$`, "i"));
  if (typed) {
    const type = typed[1][0].toUpperCase() + typed[1].slice(1).toLowerCase();
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
    const line = raw.trim();
    if (!line || SECTION.test(line) || line.startsWith("#") || line.startsWith("//")) continue;
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
    lines.push({
      qty: clampQty(hit[1]),
      name: `${hit[2].toUpperCase()} ${hit[3]}`,
      set: hit[2].toUpperCase(),
      number: hit[3].replace(/^0+/, "") || hit[3],
      names: [],
    });
  }
  return lines;
}

export function parseLimitlessDeckHtml(html: string): ParsedDeckLine[] {
  if (!/limitlesstcg\.com\/cards\//i.test(html) && !/class="card-count"/i.test(html)) return [];
  const lines: ParsedDeckLine[] = [];
  const re =
    /href="https?:\/\/(?:www\.)?limitlesstcg\.com\/cards\/([^"\/]+)\/([^"\/?#]+)"[\s\S]{0,400}?alt="([^"]+)"[\s\S]{0,400}?cc-num[^>]*>(\d+)/gi;
  for (const match of html.matchAll(re)) {
    lines.push(row(match[4], decode(match[3]), match[1], match[2].replace(/^0+/, "") || match[2]));
  }
  return lines;
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
  const qtyNameSetNum = line.match(/^(\d+)\s+(.+?)\s+([A-Za-z0-9]{2,8})\s+(\d+[A-Za-z]?)\s*$/);
  if (qtyNameSetNum) {
    return row(qtyNameSetNum[1], qtyNameSetNum[2], qtyNameSetNum[3], qtyNameSetNum[4]);
  }
  const qtyNameParen = line.match(/^(\d+)\s+(.+?)\s+\(([A-Za-z0-9]{2,8})\)\s+(\d+[A-Za-z]?)\s*$/);
  if (qtyNameParen) {
    return row(qtyNameParen[1], qtyNameParen[2], qtyNameParen[3], qtyNameParen[4]);
  }
  const qtyName = line.match(/^(\d+)\s+(.+?)\s*$/);
  if (qtyName) return row(qtyName[1], qtyName[2]);
  return null;
}

function row(qty: string, name: string, set?: string, number?: string): ParsedDeckLine {
  const cleaned = name.replace(/\s+/g, " ").trim();
  return {
    qty: clampQty(qty),
    name: expandEnergyGlyphs(cleaned) || cleaned,
    set: set?.toUpperCase(),
    number,
    names: energyNameCandidates(cleaned),
  };
}

function clampQty(value: string): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(99, n));
}
