import type { ParsedDeckLine } from "@/lib/ptcg-deck-parse";

export type MatchableCard = {
  id: string;
  name: string;
  number?: string;
  supertype?: string;
  set?: { id?: string; name?: string; releaseDate?: string };
  images?: { small?: string; large?: string };
};

export type DeckMatch = {
  line: ParsedDeckLine;
  card: MatchableCard | null;
};

/** Limitless / PTCGL printed codes → pokemontcg.io / local catalog set ids. */
export const PRINTED_SETS: Record<string, string[]> = {
  SVI: ["sv1"],
  PAL: ["sv2"],
  OBF: ["sv3"],
  MEW: ["sv3pt5", "sv3.5"],
  PAR: ["sv4"],
  PAF: ["sv4pt5", "sv4.5"],
  TEF: ["sv5"],
  TWM: ["sv6"],
  SFA: ["sv6pt5", "sv6.5"],
  SCR: ["sv7"],
  SSP: ["sv8"],
  PRE: ["sv8pt5", "sv8.5"],
  JTG: ["sv9"],
  DRI: ["sv10"],
  WHT: ["zsv10pt5", "sv10pt5", "wht"],
  BLK: ["rsv10pt5", "sv10pt5", "blk"],
  SVE: ["sve"],
  MEE: ["mee"],
  MEP: ["mep", "svp"],
  MEG: ["me1", "meg", "me01"],
  PFL: ["me2"],
  ASC: ["me2pt5", "me02.5", "asc"],
  POR: ["me3", "me03"],
  CRI: ["me4", "me04"],
  PBL: ["me5", "me05", "pbl"],
  CIN: ["cin"],
  FCO: ["fco"],
};

const SET_NAMES: Record<string, string[]> = {
  SVI: ["scarlet violet", "scarlet & violet"],
  PAL: ["paldea evolved"],
  OBF: ["obsidian flames"],
  MEW: ["151"],
  PAR: ["paradox rift"],
  PAF: ["paldean fates"],
  TEF: ["temporal forces"],
  TWM: ["twilight masquerade"],
  SFA: ["shrouded fable"],
  SCR: ["stellar crown"],
  SSP: ["surging sparks"],
  PRE: ["prismatic evolutions"],
  JTG: ["journey together"],
  DRI: ["destined rivals"],
  WHT: ["white flare"],
  BLK: ["black bolt"],
  SVE: ["scarlet violet energy", "scarlet & violet energies"],
  MEE: ["mega evolution energy", "mega evolution energies"],
  MEG: ["mega evolution"],
  PFL: ["phantasmal flames"],
  ASC: ["ascended heroes"],
  POR: ["perfect order"],
  CRI: ["chaos rising"],
  PBL: ["pitch black"],
  CIN: ["crimson invasion"],
  FCO: ["fates collide"],
};

function norm(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normNum(value?: string): string {
  return String(value ?? "")
    .trim()
    .replace(/^0+/, "")
    .toLowerCase();
}

export function nameEquals(cardName: string, candidates: string[]): boolean {
  if (!candidates.length) return false;
  const card = norm(cardName);
  return candidates.some((name) => {
    const want = norm(name);
    if (!want) return false;
    return card === want || card.startsWith(`${want} `);
  });
}

export function setAliases(printed?: string): string[] {
  const code = String(printed ?? "").trim().toUpperCase();
  if (!code) return [];
  const extra = PRINTED_SETS[code] ?? [];
  return [...new Set([code.toLowerCase(), ...extra.map((id) => id.toLowerCase())])];
}

export function printedCodesForSet(setId?: string): string[] {
  const id = String(setId ?? "").trim();
  if (!id) return [];
  const lower = id.toLowerCase();
  const codes = [id.toUpperCase()];
  for (const [printed, aliases] of Object.entries(PRINTED_SETS)) {
    if (printed.toLowerCase() === lower || aliases.some((alias) => alias.toLowerCase() === lower)) {
      codes.push(printed);
    }
  }
  return [...new Set(codes)];
}

/** Short code for a deck-list SET column (PBL, JTG, DRI). */
export function printedSetCode(set?: string, id?: string): string {
  const raw = String(set ?? "").trim();
  const upper = raw.toUpperCase();
  if (PRINTED_SETS[upper]) return upper;
  if (/^[A-Z]{2,5}$/.test(upper) && isLimitlessArtCode(upper)) return upper;

  const named = norm(raw);
  if (named) {
    for (const [code, names] of Object.entries(SET_NAMES)) {
      if (names.includes(named)) return code;
    }
  }

  const setId = String(id ?? "").split("-")[0];
  const mapped = printedCodesForSet(setId).find((code) => Boolean(PRINTED_SETS[code]));
  if (mapped) return mapped;
  const art = limitlessPrintedCodes(setId)[0];
  return art || raw;
}

/** Limitless CDN folders (PBL, JTG, MEG). Not pokemontcg.io ids like me5 / sv9 / sv6pt5. */
export function isLimitlessArtCode(code: string): boolean {
  const printed = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (printed.length < 2 || printed.length > 5) return false;
  if (/PT\d/i.test(printed)) return false;
  if (/^(SV|SWSH|SM|XY|BW|ME)\d+$/i.test(printed)) return false;
  return true;
}

export function limitlessPrintedCodes(setId?: string): string[] {
  const id = String(setId ?? "").trim();
  if (!id) return [];
  const lower = id.toLowerCase();
  const upper = id.toUpperCase();
  const codes: string[] = [];
  const add = (code: string) => {
    const printed = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!isLimitlessArtCode(printed) || codes.includes(printed)) return;
    codes.push(printed);
  };
  if (PRINTED_SETS[upper]) add(upper);
  for (const [printed, aliases] of Object.entries(PRINTED_SETS)) {
    if (printed.toLowerCase() === lower || aliases.some((alias) => alias.toLowerCase() === lower)) add(printed);
  }
  add(upper);
  return codes;
}

export function catalogIdsForLine(line: ParsedDeckLine): string[] {
  const number = String(line.number ?? "").trim();
  if (!number) return [];
  const padded = number.padStart(3, "0");
  const ids: string[] = [];
  for (const set of setAliases(line.set)) {
    ids.push(`${set}-${number}`, `${set}-${padded}`);
  }
  return [...new Set(ids)];
}

export function setMatches(card: MatchableCard, printed?: string): boolean {
  const code = String(printed ?? "").trim().toUpperCase();
  if (!code) return false;
  const aliases = setAliases(code);
  const id = String(card.set?.id ?? "").toLowerCase();
  if (aliases.includes(id)) return true;
  const name = norm(String(card.set?.name ?? ""));
  const names = SET_NAMES[code] ?? [];
  if (names.some((label) => name === label)) return true;
  return false;
}

function score(card: MatchableCard, line: ParsedDeckLine): number {
  const numberOk = !line.number || normNum(card.number) === normNum(line.number);
  const setOk = !line.set || setMatches(card, line.set);
  const named = line.names.length > 0;
  const nameOk = named ? nameEquals(card.name, line.names) : true;

  if (named && !nameOk) return -1;

  if (!named) {
    if (line.set && line.number && setOk && numberOk) return 80;
    return -1;
  }

  const energy = String(card.supertype ?? "").toLowerCase() === "energy";
  const wantsEnergy = line.names.some((name) => /\benergy\b/i.test(name));
  if (wantsEnergy && !energy) return -1;

  if (setOk && numberOk) return 100;
  if (setOk) return 72;
  if (numberOk) return 55;
  return 40;
}

export function matchDeckLine(line: ParsedDeckLine, cards: MatchableCard[]): MatchableCard | null {
  let best: MatchableCard | null = null;
  let bestScore = 0;
  for (const card of cards) {
    const next = score(card, line);
    if (next > bestScore) {
      best = card;
      bestScore = next;
    }
  }
  return bestScore >= 40 ? best : null;
}

export function matchDeckLines(lines: ParsedDeckLine[], cards: MatchableCard[]): DeckMatch[] {
  return lines.map((line) => ({ line, card: matchDeckLine(line, cards) }));
}
