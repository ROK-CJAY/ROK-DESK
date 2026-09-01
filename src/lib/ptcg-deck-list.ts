import type { DeckCard } from "@/lib/decklist";
import { decklistCount } from "@/lib/decklist";
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

export function splitPtcgDeck(cards: DeckCard[] | undefined): DeckListSection[] {
  const poke: DeckCard[] = [];
  const trainer: DeckCard[] = [];
  const energy: DeckCard[] = [];
  for (const card of cards ?? []) {
    const kind = sectionFor(card);
    if (kind === "Energy") energy.push(card);
    else if (kind === "Trainer") trainer.push(card);
    else poke.push(card);
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

export function deckTotal(player: Entrant): number {
  return decklistCount(player.decklist);
}

function sectionFor(card: DeckCard): DeckListSection["title"] {
  const type = card.type.toLowerCase();
  const name = card.name.toLowerCase();
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
