import assert from "node:assert/strict";
import { test } from "node:test";
import { isLimitlessArtCode, limitlessPrintedCodes, matchDeckLines, printedSetCode } from "../src/lib/ptcg-deck-match.ts";
import {
  allowedLimitlessUrl,
  decodeHtml,
  energyNameCandidates,
  parseLimitlessCardPage,
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

test("maps Limitless PBL/POR/CRI to catalog set ids, not Temporal Forces", () => {
  const lines = parseLimitlessShareCards("3xi:PBL~39;4xi:POR~88;4xi:POR~81;1xi:CRI~70");
  const catalog = [
    { id: "me5-39", name: "Dhelmise", number: "39", set: { id: "me5", name: "Pitch Black" } },
    { id: "sv5-81", name: "Iron Crown ex", number: "81", set: { id: "sv5", name: "Temporal Forces" } },
    { id: "cin-70", name: "Kartana-GX", number: "70", set: { id: "cin", name: "Crimson Invasion" } },
    { id: "me4-70", name: "Patrat", number: "70", set: { id: "me4", name: "Chaos Rising" } },
    { id: "me3-81", name: "Poké Pad", number: "81", set: { id: "me3", name: "Perfect Order" } },
    { id: "me3-88", name: "Telepathic Psychic Energy", number: "88", supertype: "Energy", set: { id: "me3", name: "Perfect Order" } },
  ];
  const hits = matchDeckLines(lines, catalog);
  assert.equal(hits[0]?.card?.id, "me5-39");
  assert.equal(hits[1]?.card?.id, "me3-88");
  assert.equal(hits[2]?.card?.id, "me3-81");
  assert.equal(hits[3]?.card?.id, "me4-70");
});

test("named PTCGL lines prefer the card name when the collector number is from another print", () => {
  const lines = parsePtcgDeckText("4 Charmander PAF 26\n2 Pikachu ex SVI 238");
  const catalog = [
    { id: "sv4pt5-26", name: "Xatu", number: "26", set: { id: "sv4pt5", name: "Paldean Fates" } },
    { id: "sv4pt5-7", name: "Charmander", number: "7", set: { id: "sv4pt5", name: "Paldean Fates" } },
    { id: "sv1-238", name: "Miriam", number: "238", set: { id: "sv1", name: "Scarlet & Violet" } },
    { id: "sv8-238", name: "Pikachu ex", number: "238", set: { id: "sv8", name: "Surging Sparks" } },
    { id: "sv1-73", name: "Pikachu ex", number: "73", set: { id: "sv1", name: "Scarlet & Violet" } },
  ];
  const hits = matchDeckLines(lines, catalog);
  assert.equal(hits[0]?.card?.id, "sv4pt5-7");
  assert.equal(hits[1]?.card?.id, "sv1-73");
});

test("parenthetical print names still match Boss's Orders / Professor's Research", () => {
  const lines = parsePtcgDeckText("2 Boss's Orders PAL 172\n2 Professor's Research SVI 189");
  const catalog = [
    { id: "me1-114", name: "Boss's Orders", number: "114", set: { id: "me1", name: "Mega Evolution" } },
    { id: "sv2-172", name: "Boss's Orders (Ghetsis)", number: "172", set: { id: "sv2", name: "Paldea Evolved" } },
    { id: "pgo-78", name: "Professor's Research", number: "78", set: { id: "pgo", name: "Pokémon GO" } },
    { id: "sv1-189", name: "Professor's Research (Professor Sada)", number: "189", set: { id: "sv1", name: "Scarlet & Violet" } },
  ];
  const hits = matchDeckLines(lines, catalog);
  assert.equal(hits[0]?.card?.id, "sv2-172");
  assert.equal(hits[1]?.card?.id, "sv1-189");
});

test("only public Limitless hosts are allowed", () => {
  assert.ok(allowedLimitlessUrl("https://limitlesstcg.com/decks/?list=3692"));
  assert.ok(allowedLimitlessUrl("https://play.limitlesstcg.com/tournament/abc/decklist"));
  assert.ok(allowedLimitlessUrl("https://my.limitlesstcg.com/shared/6a95bc2a932b04243429ded9"));
  assert.ok(allowedLimitlessUrl("my.limitlesstcg.com/shared/6a95bc2a932b04243429ded9"));
  assert.ok(allowedLimitlessUrl("/shared/6a95bc2a932b04243429ded9"));
  assert.equal(allowedLimitlessUrl("https://evil.example/decks"), null);
  assert.equal(allowedLimitlessUrl("http://evil.example/decks"), null);
});

test("maps Limitless BRS / SSH onto Sword & Shield catalog ids", () => {
  const lines = parsePtcgDeckText("2 Lumineon V BRS 40\n3 Zacian V SSH 138");
  const catalog = [
    { id: "swsh9-40", name: "Lumineon V", number: "40", set: { id: "swsh9", name: "Brilliant Stars" } },
    { id: "swsh1-138", name: "Zacian V", number: "138", set: { id: "swsh1", name: "Sword & Shield" } },
    { id: "sv7-36", name: "Lumineon", number: "36", set: { id: "sv7", name: "Stellar Crown" } },
  ];
  const hits = matchDeckLines(lines, catalog);
  assert.equal(hits[0]?.card?.id, "swsh9-40");
  assert.equal(hits[1]?.card?.id, "swsh1-138");
  assert.equal(printedSetCode("Brilliant Stars", "swsh9-40"), "BRS");
  assert.deepEqual(limitlessPrintedCodes("swsh9"), ["BRS"]);
  assert.deepEqual(limitlessPrintedCodes("BRS"), ["BRS"]);
});

test("Limitless art URLs use printed codes, not pokemontcg.io set ids", () => {
  assert.equal(isLimitlessArtCode("PBL"), true);
  assert.equal(isLimitlessArtCode("MEG"), true);
  assert.equal(isLimitlessArtCode("JTG"), true);
  assert.equal(isLimitlessArtCode("SVE"), true);
  assert.equal(isLimitlessArtCode("ME5"), false);
  assert.equal(isLimitlessArtCode("SV9"), false);
  assert.equal(isLimitlessArtCode("SV6PT5"), false);
  assert.equal(isLimitlessArtCode("RSV10PT5"), false);
  assert.deepEqual(limitlessPrintedCodes("me5"), ["PBL"]);
  assert.deepEqual(limitlessPrintedCodes("sv9"), ["JTG"]);
  assert.deepEqual(limitlessPrintedCodes("PBL"), ["PBL"]);
  assert.deepEqual(limitlessPrintedCodes("MEG"), ["MEG"]);
  assert.deepEqual(limitlessPrintedCodes("sv6pt5"), ["SFA"]);
  assert.equal(printedSetCode("Pitch Black", "me5-39"), "PBL");
  assert.equal(printedSetCode("Journey Together", "sv9-56"), "JTG");
  assert.equal(printedSetCode("Destined Rivals", "sv10-10"), "DRI");
  assert.equal(printedSetCode("Chaos Rising", "me4-70"), "CRI");
  assert.equal(printedSetCode("JTG"), "JTG");
});

test("decodes Limitless HTML entities and reads Trainer type from the card page", () => {
  assert.equal(decodeHtml("Lana&#039;s Aid"), "Lana's Aid");
  assert.equal(decodeHtml("Lana&#39;s Aid"), "Lana's Aid");
  assert.equal(decodeHtml("Boss&apos;s Orders"), "Boss's Orders");
  const lana = parseLimitlessCardPage(`
    <title>Lana&#039;s Aid - Twilight Masquerade (TWM) #207 – Limitless</title>
    <span class="card-text-name"><a href="/cards/TWM/207">Lana&#039;s Aid</a></span>
    <p class="card-text-type">Trainer - Supporter</p>
    <div class="regulation-mark">H Regulation Mark</div>
  `);
  assert.equal(lana?.name, "Lana's Aid");
  assert.equal(lana?.supertype, "Trainer");
  assert.equal(lana?.regulation, "H");
  const stretcher = parseLimitlessCardPage(`
    <title>Night Stretcher - Shrouded Fable (SFA) #61 – Limitless</title>
    <span class="card-text-name"><a href="/cards/SFA/61">Night Stretcher</a></span>
    <p class="card-text-type">
            Trainer
              - Item
    </p>
  `);
  assert.equal(stretcher?.name, "Night Stretcher");
  assert.equal(stretcher?.supertype, "Trainer");
});
