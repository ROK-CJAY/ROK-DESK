import assert from "node:assert/strict";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { register } from "node:module";

register("data:text/javascript,export async function resolve(s,c,n){if(s.startsWith('@/'))return{url:new URL('../src/'+s.slice(2),import.meta.url).href,shortCircuit:true};return n(s,c);}", pathToFileURL("./"));

const {
  DEFAULT_LOOK,
  DEFAULT_LOOK_BOOK,
  lookFor,
  lookStyle,
  mergeLook,
  setSourceLook,
  applyLookToAll,
} = await import("../src/lib/overlay-look.ts");

test("mergeLook fills stroke defaults", () => {
  const look = mergeLook({ fg: "#ff0000" });
  assert.equal(look.fg, "#ff0000");
  assert.equal(look.strokeWidth, 0);
  assert.equal(look.displayFont, DEFAULT_LOOK.displayFont);
});

test("lookStyle exposes rail, gold, and stroke tokens", () => {
  const style = lookStyle(mergeLook({ accent: "#e4c56a", panel: "#10131a", strokeWidth: 2, stroke: "#000000" }));
  assert.equal(style["--color-game"], "#e4c56a");
  assert.ok(String(style["--ov-rail"]).includes("linear-gradient"));
  assert.equal(style["--ov-stroke"], "#000000");
  assert.notEqual(style["--ov-stroke-width"], "0px");
});

test("scorebug look is independent of winner look", () => {
  let book = DEFAULT_LOOK_BOOK;
  book = setSourceLook(book, "scorebug", { ...DEFAULT_LOOK, accent: "#e4c56a" });
  book = setSourceLook(book, "winner", { ...DEFAULT_LOOK, fg: "#00ff00" });
  assert.equal(lookFor(book, "scorebug").accent, "#e4c56a");
  assert.equal(lookFor(book, "winner").fg, "#00ff00");
  assert.equal(lookFor(book, "scorebug").fg, DEFAULT_LOOK.fg);
});

test("apply to all copies onto every given source", () => {
  const look = mergeLook({ accent: "#6d8cff" });
  const book = applyLookToAll(look, ["scorebug", "hud", "versus"]);
  assert.equal(lookFor(book, "scorebug").accent, "#6d8cff");
  assert.equal(lookFor(book, "hud").accent, "#6d8cff");
  assert.equal(lookFor(book, "versus").accent, "#6d8cff");
  assert.equal(lookFor(book, "winner").accent, DEFAULT_LOOK.accent);
});
