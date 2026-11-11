import assert from "node:assert/strict";
import { test } from "node:test";
import { losersSuffix, mergeImportedSet, withLosers } from "../src/lib/fgc-set-merge.ts";

const base = { id: "1", bestOf: 3, losers1: false, losers2: false, score1: 0, score2: 0 };

test("(L) is appended only to the side on losers", () => {
  const set = { losers1: false, losers2: true };
  assert.equal(withLosers("ROK | Khao", set, "p1"), "ROK | Khao");
  assert.equal(withLosers("ROK | Khao", set, "p2"), "ROK | Khao (L)");
  assert.equal(losersSuffix(set, "p2"), " (L)");
  assert.equal(losersSuffix(null, "p1"), "");
});

test("(L) is never doubled and empty names stay empty", () => {
  const set = { losers1: true, losers2: false };
  assert.equal(withLosers("Khao (L)", set, "p1"), "Khao (L)");
  assert.equal(withLosers("", set, "p1"), "");
});

test("re-import keeps manual Losers ticks", () => {
  const previous = { ...base, losers1: true, losers2: false, score1: 2 };
  const fresh = { ...base, losers1: false, losers2: false, score1: 1 };
  const merged = mergeImportedSet(fresh, previous);
  assert.equal(merged.losers1, true);
  assert.equal(merged.score1, 1, "automatic scores still follow start.gg");
  assert.equal(mergeImportedSet(fresh, previous, { keepScores: true }).score1, 2);
});

test("first import takes start.gg's Grand Final losers seed", () => {
  const fresh = { ...base, losers2: true };
  assert.equal(mergeImportedSet(fresh, undefined).losers2, true);
});
