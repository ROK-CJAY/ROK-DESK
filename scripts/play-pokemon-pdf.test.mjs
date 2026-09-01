import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("Play! Pokémon templates are real PDFs", () => {
  for (const file of ["public/play-pokemon/deck-list-85x11.pdf", "public/play-pokemon/vg-team-list.pdf"]) {
    const bytes = readFileSync(file);
    assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
    assert.ok(bytes.byteLength > 50_000, `${file} looks too small`);
    assert.ok(bytes.byteLength < 1_500_000, `${file} is too large for in-browser open`);
  }
});
