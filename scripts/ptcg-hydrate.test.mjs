import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyHydratedList,
  deckCardsKeepOrder,
  decklistForCatalog,
  isPtcgDeckCard,
  mergeDecklist,
  printedNamesMatch,
} from "../src/lib/decklist.ts";
import { hydrateDeckCards } from "../src/lib/ptcg-deck-import.ts";
import { withDivisionDecklists } from "../src/lib/caster-path.ts";
import { blankEntrant, defaultTournament } from "../src/lib/tournament-types.ts";

const p1 = [
  { id: "paf-26", name: "Xatu", set: "PAF", number: "26", image: "", type: "Pokémon", qty: 4 },
  { id: "svi-181", name: "Nest Ball", set: "SVI", number: "181", image: "", type: "Trainer", qty: 4 },
  { id: "sve-2", name: "Basic Fire Energy", set: "SVE", number: "2", image: "", type: "Energy", qty: 8 },
];
const p2 = [
  { id: "brs-40", name: "Lumineon V", set: "BRS", number: "40", image: "", type: "Pokémon", qty: 2 },
  { id: "svi-181", name: "Nest Ball", set: "SVI", number: "181", image: "", type: "Trainer", qty: 4 },
  { id: "sve-4", name: "Basic Lightning Energy", set: "SVE", number: "4", image: "", type: "Energy", qty: 8 },
];

test("hydrate keeps both players' cards in order even when they share staples", () => {
  const flat = [...p1, ...p2];
  const merged = mergeDecklist(flat);
  assert.notEqual(merged.length, flat.length, "merge stacks shared Nest Ball");
  const kept = deckCardsKeepOrder(flat);
  assert.equal(kept.length, 6);
  assert.equal(kept[3]?.name, "Lumineon V");
  assert.equal(kept[4]?.name, "Nest Ball");
});

test("applyHydratedList refuses to replace a Pokémon with Energy", () => {
  const hits = [
    { id: "sve-2", name: "Basic Fire Energy", set: "SVE", number: "2", image: "", type: "Energy", qty: 8 },
    { id: "svi-181", name: "Nest Ball", set: "SVI", number: "181", image: "", type: "Trainer", qty: 4 },
    { id: "sve-4", name: "Basic Lightning Energy", set: "SVE", number: "4", image: "", type: "Energy", qty: 8 },
  ];
  const next = applyHydratedList(p2, hits);
  assert.equal(next[0]?.name, "Lumineon V");
  assert.equal(next[1]?.name, "Nest Ball");
  assert.equal(printedNamesMatch("Lumineon V", "Basic Fire Energy"), false);
});

test("applyHydratedCard keeps the submitted id and copies HP", () => {
  const orig = { id: "twm-129", name: "Drakloak", set: "TWM", number: "129", image: "https://x", type: "Pokémon", qty: 4 };
  const hit = {
    id: "sv6-129",
    name: "Drakloak",
    set: "TWM",
    number: "129",
    image: "https://y",
    type: "Pokémon",
    qty: 1,
    hp: "90",
    attacks: [{ name: "Dragon Headbutt", damage: "70" }],
    abilities: [{ name: "Recon Directive", text: "Look at the top 2." }],
  };
  const next = applyHydratedList([orig], [hit])[0];
  assert.equal(next.id, "twm-129");
  assert.equal(next.hp, "90");
  assert.equal(next.attacks?.[0]?.name, "Dragon Headbutt");
  assert.equal(next.qty, 4);
});

test("hydrateDeckCards is 1:1 and keeps P2 Pokémon", async () => {
  const flat = deckCardsKeepOrder([...p1, ...p2]);
  const hydrated = await hydrateDeckCards(flat);
  assert.equal(hydrated.length, 6);
  assert.equal(hydrated[0]?.name, "Xatu");
  assert.equal(hydrated[3]?.name, "Lumineon V");
  assert.equal(hydrated[3]?.hp, "170");
  assert.ok(hydrated[3]?.type !== "Energy");
  const p2out = applyHydratedList(p2, hydrated.slice(3));
  assert.equal(p2out[0]?.name, "Lumineon V");
  assert.equal(p2out[0]?.hp, "170");
  assert.equal(p2out[0]?.id, "brs-40");
  assert.equal(p2out[2]?.name, "Basic Lightning Energy");
});

test("PTCG submitted cards stay off other-game lookups", () => {
  const ptcg = { id: "twm-129", name: "Drakloak", set: "TWM", number: "129", image: "https://images.pokemontcg.io/sv6/129.png", type: "Pokémon", qty: 4 };
  const ygo = { id: "14558127", name: "Ash Blossom", set: "", number: "", image: "", type: "Monster", qty: 3 };
  assert.equal(isPtcgDeckCard(ptcg), true);
  assert.equal(isPtcgDeckCard(ygo), false);
  const mixed = [ptcg, ygo];
  assert.equal(decklistForCatalog(mixed, "ptcg").length, 2);
  assert.deepEqual(decklistForCatalog(mixed, "ygo").map((c) => c.name), ["Ash Blossom"]);
  assert.deepEqual(decklistForCatalog(mixed, "mtg").map((c) => c.name), ["Ash Blossom"]);
  assert.equal(decklistForCatalog([ptcg], "lorcana").length, 0);
});

test("Masters lists do not appear on Seniors or Juniors lookup", () => {
  const card = { id: "twm-129", name: "Drakloak", set: "TWM", number: "129", image: "", type: "Pokémon", qty: 4 };
  const t = defaultTournament();
  t.entrants = [blankEntrant({ id: "m1", name: "CJ Masters", decklist: [card] })];
  t.matches = [
    {
      id: "match-1",
      round: 1,
      position: 1,
      side: "swiss",
      p1: { entrantId: "m1", score: 0 },
      p2: { entrantId: null, score: 0 },
      p3: { entrantId: null, score: 0 },
      p4: { entrantId: null, score: 0 },
      winnerId: null,
      nextWinnerMatchId: null,
      nextWinnerSlot: null,
      nextLoserMatchId: null,
      nextLoserSlot: null,
      label: "R1",
    },
  ];
  t.streamMatchId = "match-1";
  const sitting = [
    { name: "CJ Masters", decklist: [card] },
    { name: "P2", decklist: [card] },
  ];
  const masters = withDivisionDecklists(sitting, t, "pokemon-tcg", 1);
  assert.equal(masters[0]?.decklist?.[0]?.name, "Drakloak");
  const seniors = withDivisionDecklists(sitting, t, "pokemon-tcg-seniors", 1);
  assert.equal(seniors[0]?.decklist?.length ?? 0, 0);
  assert.equal(seniors[1]?.decklist?.length ?? 0, 0);
  const juniors = withDivisionDecklists(sitting, t, "pokemon-tcg-juniors", 1);
  assert.equal(juniors[0]?.decklist?.length ?? 0, 0);
});
