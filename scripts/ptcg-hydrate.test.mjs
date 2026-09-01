import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyHydratedList,
  deckCardsKeepOrder,
  mergeDecklist,
  printedNamesMatch,
} from "../src/lib/decklist.ts";
import { hydrateDeckCards } from "../src/lib/ptcg-deck-import.ts";

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
  assert.equal(p2out[2]?.name, "Basic Lightning Energy");
});
