import assert from "node:assert/strict";
import { test } from "node:test";
import { matchDeckLines } from "../src/lib/ptcg-deck-match.ts";
import {
  allowedLimitlessUrl,
  energyNameCandidates,
  parseLimitlessDeckHtml,
  parseLimitlessShareCards,
  parsePtcgDeckText,
} from "../src/lib/ptcg-deck-parse.ts";

const SAMPLE = `
Pokémon: 10
4 Charmander PAF 26
3 Charizard ex OBF 125
1 Pikachu (SVI) 25
Trainer: 12
4 Arven SVI 166
4 Nest Ball SVI 181
Energy: 8
4 Basic {Fire} Energy SVE 2
4 Lightning Energy
3 Basic {P} Energy MEE 5
4 Telepathic {P} Energy POR 88
`;

test("parses PTCGL / Limitless copy-as-text", () => {
  const rows = parsePtcgDeckText(SAMPLE);
  assert.equal(rows.length, 9);
  assert.equal(rows[0]?.name, "Charmander");
  assert.equal(rows[0]?.set, "PAF");
  assert.equal(rows[0]?.number, "26");
  assert.equal(rows[2]?.set, "SVI");
  assert.equal(rows[5]?.name, "Basic Fire Energy");
  assert.equal(rows[5]?.set, "SVE");
  assert.equal(rows[6]?.name, "Lightning Energy");
  assert.equal(rows[7]?.name, "Basic Psychic Energy");
  assert.equal(rows[7]?.set, "MEE");
  assert.equal(rows[8]?.name, "Telepathic Psychic Energy");
  assert.ok(rows[8]?.names.includes("Telepathic Energy"));
});

test("parses Limitless HTML cards", () => {
  const html = `
    <div class="decklist-card" data-set="TEU" data-number="99">
      <span class="card-count">3</span>
      <span class="card-name">Jirachi</span>
    </div>
    <div class="decklist-card" data-set="SSH" data-number="138">
      <span class="card-count">3</span>
      <span class="card-name">Zacian V</span>
    </div>`;
  const rows = parseLimitlessDeckHtml(html);
  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.name, "Jirachi");
  assert.equal(rows[0]?.set, "TEU");
  assert.equal(rows[1]?.qty, 3);
});

test("parses Limitless share card blobs", () => {
  const rows = parseLimitlessShareCards("4xi:POR~88;3xi:MEE~5;2xi:WHT~84");
  assert.equal(rows.length, 3);
  assert.equal(rows[0]?.set, "POR");
  assert.equal(rows[0]?.number, "88");
  assert.equal(rows[0]?.qty, 4);
  assert.equal(rows[1]?.set, "MEE");
});

test("{P} expands to Psychic, not the letter P", () => {
  const names = energyNameCandidates("Basic {P} Energy");
  assert.ok(names.includes("Basic Psychic Energy"));
  assert.equal(names.includes("Basic P Energy"), false);
});

test("does not match Warp Energy or Fates Collide N from a typed line", () => {
  const lines = parsePtcgDeckText("3 Basic {P} Energy MEE 5\n4 N SSP 185");
  const catalog = [
    { id: "cin-48", name: "Warp Energy", number: "48", supertype: "Energy", set: { id: "cin", name: "Crimson Invasion" } },
    { id: "mee-5", name: "Basic Psychic Energy", number: "5", supertype: "Energy", set: { id: "mee", name: "Mega Evolution Energies" } },
    { id: "sve-5", name: "Basic Psychic Energy", number: "5", supertype: "Energy", set: { id: "sve" } },
    { id: "fco-105", name: "N", number: "105", supertype: "Trainer", set: { id: "fco", name: "Fates Collide" } },
    { id: "sv8-185", name: "N", number: "185", supertype: "Trainer", set: { id: "sv8", name: "Surging Sparks" } },
  ];
  const hits = matchDeckLines(lines, catalog);
  assert.equal(hits[0]?.card?.id, "mee-5");
  assert.equal(hits[1]?.card?.id, "sv8-185");
});

test("only public Limitless hosts are allowed", () => {
  assert.ok(allowedLimitlessUrl("https://limitlesstcg.com/decks/?list=3692"));
  assert.ok(allowedLimitlessUrl("https://play.limitlesstcg.com/tournament/abc/decklist"));
  assert.ok(allowedLimitlessUrl("https://my.limitlesstcg.com/shared/6a95bc2a932b04243429ded9"));
  assert.equal(allowedLimitlessUrl("https://evil.example/decks"), null);
  assert.equal(allowedLimitlessUrl("http://limitlesstcg.com/decks/?list=1"), null);
});
