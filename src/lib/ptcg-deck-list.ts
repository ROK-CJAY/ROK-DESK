import type { DeckCard } from "@/lib/decklist";
import { decklistCount } from "@/lib/decklist";
import { playAgeDivisionOf, type GameId } from "@/lib/games";
import { decodeHtml } from "@/lib/ptcg-deck-parse";
import type { AgeDivision, Entrant } from "@/lib/tournament-types";

export type DeckListSection = {
  title: "Pokémon" | "Trainer" | "Energy";
  cards: DeckCard[];
  total: number;
};

export function ageLabel(division: AgeDivision): string {
  if (division === "juniors") return "Juniors";
  if (division === "seniors") return "Seniors";
  if (division === "masters") return "Masters";
  return "";
}

export function printAgeDivision(player: Entrant, gameId: GameId): AgeDivision {
  const fromEvent = playAgeDivisionOf(gameId);
  if (fromEvent) return fromEvent;
  if (player.ageDivision === "juniors" || player.ageDivision === "seniors" || player.ageDivision === "masters") {
    return player.ageDivision;
  }
  return "";
}

export function splitPtcgDeck(cards: DeckCard[] | undefined): DeckListSection[] {
  const poke: DeckCard[] = [];
  const trainer: DeckCard[] = [];
  const energy: DeckCard[] = [];
  for (const card of cards ?? []) {
    const cleaned = { ...card, name: decodeHtml(card.name) };
    const kind = sectionFor(cleaned);
    if (kind === "Energy") energy.push(cleaned);
    else if (kind === "Trainer") trainer.push(cleaned);
    else poke.push(cleaned);
  }
  return [
    { title: "Pokémon", cards: poke, total: decklistCount(poke) },
    { title: "Trainer", cards: trainer, total: decklistCount(trainer) },
    { title: "Energy", cards: energy, total: decklistCount(energy) },
  ];
}

export function padRows(cards: DeckCard[], min: number): (DeckCard | null)[] {
  const rows: (DeckCard | null)[] = [...cards];
  while (rows.length < min) rows.push(null);
  return rows;
}

export function isStandardFormat(formatName: string): boolean {
  const name = formatName.toLowerCase();
  if (name.includes("expanded")) return false;
  return true;
}

/** Current paper Standard letters shown on the Play! Pokémon deck list. */
export const STANDARD_REG_MARKS = ["H", "I", "J"] as const;

const REG_BY_SET: Record<string, string> = {
  svi: "G",
  sv1: "G",
  pal: "G",
  sv2: "G",
  obf: "G",
  sv3: "G",
  mew: "G",
  sv3pt5: "G",
  par: "G",
  sv4: "G",
  paf: "G",
  sv4pt5: "G",
  tef: "H",
  sv5: "H",
  twm: "H",
  sv6: "H",
  sfa: "H",
  sv6pt5: "H",
  scr: "H",
  sv7: "H",
  ssp: "H",
  sv8: "H",
  pre: "H",
  sv8pt5: "H",
  jtg: "I",
  sv9: "I",
  dri: "I",
  sv10: "I",
  wht: "I",
  zsv10pt5: "I",
  blk: "I",
  rsv10pt5: "I",
  meg: "I",
  me1: "I",
  pfl: "I",
  me2: "I",
  asc: "I",
  me2pt5: "I",
  por: "J",
  me3: "J",
  cri: "J",
  me4: "J",
  pbl: "J",
  me5: "J",
};

const REG_BY_NAME: Record<string, string> = {
  "temporal forces": "H",
  "twilight masquerade": "H",
  "shrouded fable": "H",
  "stellar crown": "H",
  "surging sparks": "H",
  "prismatic evolutions": "H",
  "journey together": "I",
  "destined rivals": "I",
  "white flare": "I",
  "black bolt": "I",
  "mega evolution": "I",
  "phantasmal flames": "I",
  "ascended heroes": "I",
  "perfect order": "J",
  "chaos rising": "J",
  "pitch black": "J",
};

export function regulationOf(card: DeckCard): string {
  const stored = String(card.regulation ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 1);
  if (/^[A-Z]$/.test(stored)) return stored;
  const idSet = card.id.split("-")[0]?.toLowerCase() ?? "";
  if (REG_BY_SET[idSet]) return REG_BY_SET[idSet];
  const code = card.set.trim().toLowerCase();
  if (REG_BY_SET[code]) return REG_BY_SET[code];
  return REG_BY_NAME[code] ?? "";
}

export function deckRegulationMarks(cards: DeckCard[] | undefined): string[] {
  const found = new Set<string>();
  for (const card of cards ?? []) {
    const mark = regulationOf(card);
    if (mark) found.add(mark);
  }
  return [...found].sort();
}

export function printRegulationMarks(cards: DeckCard[] | undefined): string[] {
  const found = deckRegulationMarks(cards);
  const extra = found.filter((mark) => !STANDARD_REG_MARKS.includes(mark as (typeof STANDARD_REG_MARKS)[number]) && mark >= "H");
  return [...STANDARD_REG_MARKS, ...extra];
}

export function deckTotal(player: Entrant): number {
  return decklistCount(player.decklist);
}

function sectionFor(card: DeckCard): DeckListSection["title"] {
  const type = card.type.toLowerCase();
  const name = decodeHtml(card.name).toLowerCase();
  if (type.includes("energy") || /\benergy\b/.test(name)) return "Energy";
  if (
    type.includes("trainer") ||
    type.includes("item") ||
    type.includes("supporter") ||
    type.includes("stadium") ||
    type.includes("tool")
  ) {
    return "Trainer";
  }
  return "Pokémon";
}
