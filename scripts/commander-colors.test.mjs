import assert from "node:assert/strict";
import { test } from "node:test";
import {
  commanderFaceName,
  commanderPlateGradient,
  mergeColorIdentity,
  normalizeColorIdentity,
} from "../src/lib/commander-colors.ts";

test("color identity keeps WUBRG order", () => {
  assert.deepEqual(normalizeColorIdentity(["G", "W", "U"]), ["W", "U", "G"]);
  assert.deepEqual(normalizeColorIdentity("WUBRG"), ["W", "U", "B", "R", "G"]);
  assert.deepEqual(normalizeColorIdentity(["X", "U"]), ["U"]);
});

test("partner decks merge identity", () => {
  assert.deepEqual(mergeColorIdentity(["U", "G"], ["W", "B"]), ["W", "U", "B", "G"]);
});

test("DFC commanders show the front face", () => {
  assert.equal(commanderFaceName("Jace, Vryn's Prodigy // Jace, Telepath Unbound"), "Jace, Vryn's Prodigy");
});

test("plate gradient uses both partner colors", () => {
  const css = commanderPlateGradient(["U", "G"], false);
  assert.match(css, /linear-gradient/);
  assert.match(css, /#0c5a96/);
  assert.match(css, /#14633f/);
});
