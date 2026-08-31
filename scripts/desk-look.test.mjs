import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const src = (file) => readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");

test("applyGame restores a title's own look, does not copy the previous game", () => {
  const store = src("lib/desk-store.ts");
  assert.match(store, /overlayLook: \{ sources: \{ \.\.\.DEFAULT_LOOK_BOOK\.sources \} \}/);
  assert.doesNotMatch(
    store,
    /matchSlot: nextSlot, lanes, version: prev\.version \+ 1, overlayLook: prev\.overlayLook/,
  );
});

test("match slots of the same title share look", () => {
  const store = src("lib/desk-store.ts");
  assert.match(
    store,
    /matchSlot: slot, lanes, version: prev\.version \+ 1, overlayLook: prev\.overlayLook/,
  );
});

test("deskLaneOf uses a saved title look, not the live game look", () => {
  const types = src("lib/desk-types.ts");
  assert.match(types, /if \(parsed\) return \{ \.\.\.parsed, gameId, matchSlot: wanted, lanes: live\.lanes \}/);
  assert.doesNotMatch(types, /overlayLook: live\.overlayLook/);
});

test("play and ROK layouts mount win stings and look tokens", () => {
  const files = [
    "components/overlays/lorcana-play.tsx",
    "components/overlays/ygo-play.tsx",
    "components/overlays/ptcg-play.tsx",
    "components/overlays/op-play.tsx",
    "components/overlays/vgc-play.tsx",
    "components/overlays/rok-layout.tsx",
  ];
  for (const file of files) {
    const text = src(file);
    assert.match(text, /WinStings/, `${file} missing WinStings`);
  }
  assert.match(src("components/overlays/lorcana-play.tsx"), /OV_RAIL/);
  assert.match(src("components/overlays/ygo-play.tsx"), /OV_GOLD/);
  assert.match(src("components/overlays/op-play.tsx"), /OV_RAIL/);
  assert.match(src("components/overlays/vgc-play.tsx"), /OV_CHROME/);
  assert.match(src("components/overlays/winner.tsx"), /source="game-win"/);
  assert.match(src("components/overlays/winner.tsx"), /source="winner"/);
});

test("look editor is per title, not desk-wide", () => {
  const editor = src("components/desk/look-editor.tsx");
  assert.match(editor, /this title only/);
  assert.doesNotMatch(editor, /stay with the desk when you switch titles/);
});
