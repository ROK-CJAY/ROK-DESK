import assert from "node:assert/strict";
import { test } from "node:test";
import {
  inferPlayAgeDivision,
  isPtcgTitle,
  isVgcTitle,
  playAgeDivisionOf,
  ptcgDivisionOf,
  ptcgGameIdFor,
  titleStripActive,
  titleStripTarget,
  tomTitleOf,
  vgcGameIdFor,
} from "../src/lib/games.ts";

test("PTCG titles share the TCG rules and split by age division", () => {
  assert.equal(isPtcgTitle("pokemon-tcg"), true);
  assert.equal(isPtcgTitle("pokemon-tcg-seniors"), true);
  assert.equal(isPtcgTitle("pokemon-tcg-juniors"), true);
  assert.equal(isPtcgTitle("pokemon-vgc"), false);
  assert.equal(ptcgDivisionOf("pokemon-tcg"), "masters");
  assert.equal(ptcgDivisionOf("pokemon-tcg-seniors"), "seniors");
  assert.equal(ptcgDivisionOf("pokemon-tcg-juniors"), "juniors");
  assert.equal(ptcgGameIdFor("juniors"), "pokemon-tcg-juniors");
});

test("VGC titles share the VGC rules and split by age division", () => {
  assert.equal(isVgcTitle("pokemon-vgc"), true);
  assert.equal(isVgcTitle("pokemon-vgc-seniors"), true);
  assert.equal(isVgcTitle("pokemon-vgc-juniors"), true);
  assert.equal(isVgcTitle("pokemon-tcg"), false);
  assert.equal(playAgeDivisionOf("pokemon-vgc"), "masters");
  assert.equal(playAgeDivisionOf("pokemon-vgc-seniors"), "seniors");
  assert.equal(playAgeDivisionOf("pokemon-vgc-juniors"), "juniors");
  assert.equal(vgcGameIdFor("juniors"), "pokemon-vgc-juniors");
});

test("title strip groups PTCG and VGC until a division is picked", () => {
  assert.equal(titleStripActive("pokemon-tcg", "pokemon-tcg-juniors"), true);
  assert.equal(titleStripActive("pokemon-tcg", "pokemon-vgc"), false);
  assert.equal(titleStripTarget("pokemon-tcg", "pokemon-tcg-seniors"), "pokemon-tcg-seniors");
  assert.equal(titleStripTarget("pokemon-tcg", "one-piece"), "pokemon-tcg");
  assert.equal(titleStripActive("pokemon-vgc", "pokemon-vgc-juniors"), true);
  assert.equal(titleStripTarget("pokemon-vgc", "pokemon-vgc-seniors"), "pokemon-vgc-seniors");
  assert.equal(titleStripTarget("pokemon-vgc", "one-piece"), "pokemon-vgc");
});

test("event names map onto Play! Pokémon age divisions", () => {
  assert.equal(inferPlayAgeDivision("City Cup Juniors"), "juniors");
  assert.equal(inferPlayAgeDivision("Regionals — Seniors"), "seniors");
  assert.equal(inferPlayAgeDivision("Masters Day 1"), "masters");
  assert.equal(inferPlayAgeDivision("Open Challenge"), null);
});

test("TOM title follows the selected Play! Pokémon division", () => {
  assert.equal(tomTitleOf("pokemon-tcg-juniors"), "pokemon-tcg-juniors");
  assert.equal(tomTitleOf("pokemon-vgc-seniors"), "pokemon-vgc-seniors");
  assert.equal(tomTitleOf("one-piece"), "pokemon-tcg");
});
