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

export type ParsedDeckLine = {
  qty: number;
  name: string;
  set?: string;
  number?: string;
  names: string[];
};

const SECTION = /^(pok[eé]mon|trainer|energy|cards?)\s*:/i;

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

  return [...seen];
}

export function parsePtcgDeckText(text: string): ParsedDeckLine[] {
  const lines: ParsedDeckLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || SECTION.test(line) || line.startsWith("#") || line.startsWith("//")) continue;
    const parsed = parseDeckLine(line);
    if (parsed) lines.push(parsed);
  }
  return lines;
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
    qty: Math.max(1, Math.min(99, Number(qty) || 1)),
    name: expandEnergyGlyphs(cleaned) || cleaned,
    set: set?.toUpperCase(),
    number,
    names: energyNameCandidates(cleaned),
  };
}
