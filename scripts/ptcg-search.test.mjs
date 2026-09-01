import assert from "node:assert/strict";
import { test } from "node:test";
import { isStandardLegal, searchCatalog } from "../src/lib/ptcg-catalog.ts";

test("Live search is Standard H+ only", async () => {
  const ionoLive = await searchCatalog("iono", true);
  assert.ok(ionoLive);
  assert.ok(ionoLive.every((card) => isStandardLegal(card)));
  assert.equal(ionoLive.some((card) => card.name === "Iono" && !isStandardLegal(card)), false);

  const nest = await searchCatalog("nest ball", true);
  assert.ok(nest);
  assert.ok(nest.every((card) => isStandardLegal(card)));
  if (nest.length) assert.equal(nest[0]?.name, "Nest Ball");

  const xatuLive = await searchCatalog("xatu", true);
  assert.ok(xatuLive);
  assert.ok(xatuLive.every((card) => isStandardLegal(card)));
});

test("All printings includes older cards and print codes", async () => {
  const ionoAll = await searchCatalog("iono", false);
  assert.ok(ionoAll?.some((card) => card.name === "Iono"));
  const lumineon = await searchCatalog("lumineon v", false);
  assert.ok(lumineon?.some((card) => card.id === "swsh9-40"));
  const print = await searchCatalog("brs 40", false);
  assert.equal(print?.[0]?.id, "swsh9-40");
  const xatu = await searchCatalog("xatu", false);
  assert.ok(xatu?.[0]?.hp);
  assert.ok((xatu?.[0]?.attacks ?? []).length);
});
