import assert from "node:assert/strict";
import { test } from "node:test";
import { carryBestOf, currentBestOf, mergeImportedSet, pickBestOf } from "../src/lib/fgc-set-merge.ts";

const set = (id, bestOf, extra = {}) => ({ id, bestOf, losers1: false, losers2: false, score1: 0, score2: 0, ...extra });

test("TO-saved best-of wins over everything", () => {
  const merged = mergeImportedSet(set("a", 3), set("a", 3), { toBestOf: { a: 5 } });
  assert.equal(merged.bestOf, 5);
  assert.equal(merged.bestOfSet, "to");
});

test("re-import never resets a set's ROK Desk best-of", () => {
  // start.gg (or the old default) says 3, the desk has 5.
  assert.equal(mergeImportedSet(set("a", 3), set("a", 5)).bestOf, 5);
  assert.equal(mergeImportedSet(set("a", 3), set("a", 5, { bestOfSet: "manual" })).bestOfSet, "manual");
});

test("a set seen for the first time inherits the current set's best-of", () => {
  assert.equal(mergeImportedSet(set("new", 3), undefined, { inheritedBestOf: 5 }).bestOf, 5);
});

test("with no previous set at all, start.gg's best-of is used, else 3", () => {
  assert.equal(mergeImportedSet(set("new", 7), undefined, {}).bestOf, 7);
  assert.equal(pickBestOf({}), 3);
  assert.equal(pickBestOf({ startgg: 0 }), 3);
  assert.equal(pickBestOf({ startgg: 4 }), 3, "even numbers are not a best-of");
});

test("a set coming onto the board carries the previous board set's best-of unless TO/manual chose one", () => {
  assert.equal(carryBestOf(set("b", 3), set("a", 5)).bestOf, 5);
  assert.equal(carryBestOf(set("b", 3, { bestOfSet: "to" }), set("a", 5)).bestOf, 3);
  assert.equal(carryBestOf(set("b", 7, { bestOfSet: "manual" }), set("a", 5)).bestOf, 7);
  assert.equal(carryBestOf(set("b", 3), null).bestOf, 3);
});

test("currentBestOf reads the board's set", () => {
  assert.equal(currentBestOf([set("a", 5), set("b", 3)], "a"), 5);
  assert.equal(currentBestOf([set("a", 5)], "zzz"), null);
  assert.equal(currentBestOf([set("a", 5)], null), null);
});
