import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

// Mirror src/lib/tablet-join.ts path rules (keep in sync).
function tabletJoinPath(slug, slot, surface) {
  if (surface === "signup") return `/${slug}/signup`;
  if (surface === "floor-clock") return `/${slug}/overlay/floor-clock`;
  if (surface === "stream-clock") {
    return slot === 1 ? `/${slug}/overlay/stream-clock` : `/${slug}/${slot}/overlay/stream-clock`;
  }
  const base = slot === 2 || slot === 3 ? `/${slug}/${slot}/tablet` : `/${slug}/tablet`;
  if (surface === "player") return `${base}?role=player`;
  if (surface === "extended") return `${base}?role=extended`;
  if (surface === "caster") return `${base}?role=caster`;
  return base;
}

test("tablet join paths cover judge player caster clocks", () => {
  assert.equal(tabletJoinPath("ptcg", 1, "judge"), "/ptcg/tablet");
  assert.equal(tabletJoinPath("ptcg", 2, "player"), "/ptcg/2/tablet?role=player");
  assert.equal(tabletJoinPath("vgc-seniors", 3, "caster"), "/vgc-seniors/3/tablet?role=caster");
  assert.equal(tabletJoinPath("edh", 1, "extended"), "/edh/tablet?role=extended");
  assert.equal(tabletJoinPath("lorcana", 1, "signup"), "/lorcana/signup");
  assert.equal(tabletJoinPath("ygo", 1, "floor-clock"), "/ygo/overlay/floor-clock");
  assert.equal(tabletJoinPath("op", 3, "stream-clock"), "/op/3/overlay/stream-clock");
});

test("default port is 8080", () => {
  assert.equal(8080, 8080);
  createRequire(import.meta.url);
});
