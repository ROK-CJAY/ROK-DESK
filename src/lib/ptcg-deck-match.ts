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

/** Limitless / PTCGL printed set codes → pokemontcg.io set ids. */
const PRINTED_SETS: Record<string, string[]> = {
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
  POR: ["por"],
  CRI: ["cri", "cin"],
  CIN: ["cin", "cri"],
  FCO: ["fco"],
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

function nameEquals(cardName: string, candidates: string[]): boolean {
  const card = norm(cardName);
  return candidates.some((name) => norm(name) === card);
}

function setAliases(printed?: string): string[] {
  const code = String(printed ?? "").trim().toUpperCase();
  if (!code) return [];
  return [code.toLowerCase(), ...(PRINTED_SETS[code] ?? [])];
}

export function setMatches(card: MatchableCard, printed?: string): boolean {
  const aliases = setAliases(printed);
  if (!aliases.length) return false;
  const id = String(card.set?.id ?? "").toLowerCase();
  const name = String(card.set?.name ?? "").toLowerCase();
  const printedName = String(printed ?? "").toLowerCase();
  if (aliases.includes(id)) return true;
  if (aliases.some((alias) => id === alias || id.endsWith(alias) || id.startsWith(alias))) return true;
  if (printedName.length >= 3 && name.includes(printedName)) return true;
  return false;
}

function score(card: MatchableCard, line: ParsedDeckLine): number {
  if (!nameEquals(card.name, line.names)) return -1;
  if (line.set && !setMatches(card, line.set)) return -1;
  if (line.number && normNum(card.number) !== normNum(line.number)) return -1;
  let points = 50;
  const energy = String(card.supertype ?? "").toLowerCase() === "energy";
  const wantsEnergy = line.names.some((name) => /\benergy\b/i.test(name));
  if (wantsEnergy && energy) points += 20;
  if (wantsEnergy && !energy) return -1;
  return points;
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
  return bestScore >= 50 ? best : null;
}

export function matchDeckLines(lines: ParsedDeckLine[], cards: MatchableCard[]): DeckMatch[] {
  return lines.map((line) => ({ line, card: matchDeckLine(line, cards) }));
}
