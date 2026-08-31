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

function setMatches(card: MatchableCard, printed?: string): boolean {
  if (!printed) return false;
  const code = printed.toLowerCase();
  const id = String(card.set?.id ?? "").toLowerCase();
  const name = String(card.set?.name ?? "").toLowerCase();
  if (!code) return false;
  if (id === code) return true;
  if (id.endsWith(code) || id.startsWith(code)) return true;
  if (name.includes(code)) return true;
  return false;
}

function score(card: MatchableCard, line: ParsedDeckLine): number {
  if (!nameEquals(card.name, line.names)) return -1;
  let points = 40;
  const energy = String(card.supertype ?? "").toLowerCase() === "energy";
  const wantsEnergy = line.names.some((name) => /\benergy\b/i.test(name));
  if (wantsEnergy && energy) points += 25;
  if (wantsEnergy && !energy) points -= 20;
  if (line.number && normNum(card.number) === normNum(line.number)) points += 30;
  if (setMatches(card, line.set)) points += 35;
  const date = String(card.set?.releaseDate ?? "").replace(/-/g, "");
  points += Math.min(9, date.length ? Number(date.slice(0, 8)) % 10 : 0);
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
  return bestScore >= 40 ? best : null;
}

export function matchDeckLines(lines: ParsedDeckLine[], cards: MatchableCard[]): DeckMatch[] {
  return lines.map((line) => ({ line, card: matchDeckLine(line, cards) }));
}
