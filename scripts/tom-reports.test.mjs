import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cleanTomPlayerName,
  collapseTomEntrants,
  detectTomGameKind,
  inferTomTitle,
  isJunkTomPlayerName,
  parseTomFiles,
  sampleTomFiles,
  splitTomReportsByDivision,
  titleForTomDivision,
} from "../src/lib/tom-reports.ts";

test("sample TOM reports still yield eight named players", () => {
  const reports = parseTomFiles(sampleTomFiles());
  assert.equal(reports.players.length, 8);
  assert.equal(reports.pairings.length, 4);
  assert.equal(reports.eventName, "ROK League Challenge");
  assert.ok(reports.players.every((p) => !/\d+\s*[/\-]\s*\d+/.test(p.name)));
});

test("TOM pairings records are stripped and merge with the roster", () => {
  const roster = `<html><body>
<h1>Worlds VG cup at ROK</h1>
<table>
<tr><td>Worlds VG cup at ROK</td><td>Player List</td></tr>
<tr><th>#</th><th>Name</th><th>Division</th><th>Player ID</th></tr>
<tr><td>1</td><td>Brady Walker</td><td>Seniors</td><td>100000000001</td></tr>
<tr><td>2</td><td>Carlos Vidal</td><td>Masters</td><td>100000000002</td></tr>
<tr><td>3</td><td>Diego Rosales</td><td>Masters</td><td>100000000003</td></tr>
<tr><td>4</td><td>Ethan Matijevic</td><td>Masters</td><td>100000000004</td></tr>
</table>
</body></html>`;

  const pairings = `<html><body>
<h1>Worlds VG cup at ROK</h1>
<h2>Round 3 Pairings</h2>
<table>
<tr><td>Table</td><td>Player 1</td><td></td><td>Player 2</td></tr>
<tr><td>1</td><td>Brady Walker (0/2/0 (0) - SR)</td><td>vs</td><td>Carlos Vidal (0/2/0 (0) - MA)</td></tr>
<tr><td>2</td><td>Diego Rosales (1/1/0 (3) - MA)</td><td>vs</td><td>Ethan Matijevic (1/1/0 (3) - MA)</td></tr>
</table>
</body></html>`;

  const reports = parseTomFiles([
    { name: "roster.html", html: roster },
    { name: "pairings.html", html: pairings },
  ]);
  assert.equal(reports.eventName, "Worlds VG cup at ROK");
  assert.equal(reports.players.length, 4, reports.players.map((p) => p.name).join(" | "));
  assert.deepEqual(
    reports.players.map((p) => p.name).sort(),
    ["Brady Walker", "Carlos Vidal", "Diego Rosales", "Ethan Matijevic"],
  );
  assert.ok(!reports.players.some((p) => /vg cup/i.test(p.name)));
  assert.equal(reports.pairings.length, 2);
  assert.equal(reports.pairings[0]?.p1.name, "Brady Walker");
  assert.equal(reports.pairings[0]?.p1.division, "seniors");
  assert.equal(reports.pairings[0]?.p2?.name, "Carlos Vidal");
  assert.equal(reports.pairings[0]?.p2?.division, "masters");
});

test("centered TOM banner is not a player", () => {
  const html = `<html><body>
<table width="100%">
<tr>
  <td align="center"><font size="5">Worlds VG cup at ROK</font></td>
  <td align="center"><font size="5">Standings</font></td>
</tr>
</table>
<table>
<tr><th>Standing</th><th>Name</th><th>Flight</th><th>Drop</th><th>Record</th><th>Points</th><th>Opp%</th><th>OppOpp%</th></tr>
<tr><td>1</td><td>James Dimarco</td><td>1</td><td>0</td><td>2 / 0 / 0</td><td>6</td><td>50%</td><td>50%</td></tr>
<tr><td>2</td><td>Kevin Guzman</td><td>1</td><td>0</td><td>2 / 0 / 0</td><td>6</td><td>50%</td><td>50%</td></tr>
</table>
</body></html>`;
  const reports = parseTomFiles([{ name: "standings.html", html }]);
  assert.equal(reports.players.length, 2, reports.players.map((p) => p.name).join(" | "));
  assert.ok(!reports.players.some((p) => /worlds/i.test(p.name)));
});

test("cleanTomPlayerName strips nested record suffixes and ids", () => {
  assert.equal(cleanTomPlayerName("Brady Walker (0/2/0 (0) - SR)"), "Brady Walker");
  assert.equal(cleanTomPlayerName("Diego Rosales (1/1/0 (3) - MA)"), "Diego Rosales");
  assert.equal(cleanTomPlayerName("Alex Rivera (111111111111)"), "Alex Rivera");
  assert.equal(cleanTomPlayerName("Riley Chen 2/0/0 (6) - MA"), "Riley Chen");
});

test("event titles are junk player names", () => {
  assert.equal(isJunkTomPlayerName("Worlds VG cup at ROK"), true);
  assert.equal(isJunkTomPlayerName("Brady Walker"), false);
  assert.equal(isJunkTomPlayerName("Standings"), true);
});

test("collapseTomEntrants merges decorated duplicates already on the desk", () => {
  const { rows, idMap } = collapseTomEntrants(
    [
      { id: "a", name: "Brady Walker", playerId: "100000000001" },
      { id: "b", name: "Brady Walker (0/2/0 (0) - SR)", playerId: "" },
      { id: "c", name: "Worlds VG cup at ROK", playerId: "" },
      { id: "d", name: "Carlos Vidal (0/2/0 (0) - MA)", playerId: "" },
    ],
    "Worlds VG cup at ROK",
  );
  assert.deepEqual(
    rows.map((r) => r.name).sort(),
    ["Brady Walker", "Carlos Vidal"],
  );
  assert.equal(idMap.get("b"), "a");
  assert.equal(idMap.has("c"), false);
});

test("inferTomTitle sends VG cup reports to VGC, not PTCG", () => {
  assert.equal(inferTomTitle("Worlds VG cup at ROK", "pokemon-tcg"), "pokemon-vgc");
  assert.equal(inferTomTitle("Juniors League Challenge", "pokemon-vgc"), "pokemon-vgc-juniors");
  assert.equal(
    inferTomTitle("League Challenge", "pokemon-tcg", {
      html: "<h1>Pokémon Trading Card Game</h1>",
    }),
    "pokemon-tcg",
  );
  assert.equal(
    inferTomTitle("City Championship", "pokemon-vgc", {
      players: [
        { division: "seniors" },
        { division: "seniors" },
        { division: "masters" },
      ],
    }),
    "pokemon-vgc-seniors",
  );
});

test("TOM Game Type TCG never lands on VGC, VG never lands on PTCG", () => {
  assert.equal(detectTomGameKind("gametype=\"VIDEO_GAME\" mode=\"CUSTOM\""), "vg");
  assert.equal(detectTomGameKind("gametype=\"TRADING_CARD_GAME\""), "tcg");
  assert.equal(detectTomGameKind("VG Cup or Challenge"), "vg");
  assert.equal(detectTomGameKind("TCG League Challenge"), "tcg");
  assert.equal(detectTomGameKind("Pokémon Trading Card Game"), "tcg");
  assert.equal(detectTomGameKind("Pokémon Video Game"), "vg");
  assert.equal(
    inferTomTitle("Friday Night", "pokemon-vgc", { html: "<p>Trading Card Game</p>" }),
    "pokemon-tcg",
  );
  assert.equal(
    inferTomTitle("Friday Night", "pokemon-tcg", { html: "<p>Video Game</p>" }),
    "pokemon-vgc",
  );
});

test("TOM standings Senior Division player is not swallowed by Masters", () => {
  const html = `<html><body class="report">
<h3>Standings - Round 3/3 </h3>
<p>Tournament: <b>Worlds VG cup at ROK</b></p>
<h2>Senior Division</h2>
<table class="report border">
<tr><th>Standing</th><th>Name</th><th>Flight</th><th>Drop</th><th>Record</th><th>Points</th><th>Opp%</th><th>OppOpp%</th></tr>
<tr><td>1</td><td>Brady Walker</td><td>1</td><td></td><td>0/3/0 (0)</td><td>0</td><td>44.44%</td><td>52.78%</td></tr>
</table>
<h2>Masters Division</h2>
<table class="report border">
<tr><th>Standing</th><th>Name</th><th>Flight</th><th>Drop</th><th>Record</th><th>Points</th><th>Opp%</th><th>OppOpp%</th></tr>
<tr><td>1</td><td>James Dimarco</td><td>1</td><td></td><td>3/0/0 (9)</td><td>9</td><td>55.56%</td><td>61.11%</td></tr>
<tr><td>2</td><td>Kevin Guzman</td><td>1</td><td></td><td>2/1/0 (6)</td><td>6</td><td>66.67%</td><td>47.22%</td></tr>
</table>
<h2>All</h2>
<table class="report border">
<tr><th>Standing</th><th>Name</th><th>Flight</th><th>Drop</th><th>Record</th><th>Points</th><th>Opp%</th><th>OppOpp%</th></tr>
<tr><td>1</td><td>James Dimarco</td><td>1</td><td></td><td>3/0/0 (9)</td><td>9</td><td>55.56%</td><td>61.11%</td></tr>
<tr><td>2</td><td>Kevin Guzman</td><td>1</td><td></td><td>2/1/0 (6)</td><td>6</td><td>66.67%</td><td>47.22%</td></tr>
<tr><td>3</td><td>Brady Walker</td><td>1</td><td></td><td>0/3/0 (0)</td><td>0</td><td>44.44%</td><td>52.78%</td></tr>
</table>
</body></html>`;
  const reports = parseTomFiles([{ name: "standings.html", html }]);
  const brady = reports.players.find((p) => p.name === "Brady Walker");
  const james = reports.players.find((p) => p.name === "James Dimarco");
  assert.equal(brady?.division, "seniors");
  assert.equal(brady?.standing, 1);
  assert.equal(james?.division, "masters");
  const slices = splitTomReportsByDivision(reports);
  assert.deepEqual(
    slices.map((s) => [s.division, s.reports.players.map((p) => p.name)]).sort(),
    [
      ["masters", ["James Dimarco", "Kevin Guzman"]],
      ["seniors", ["Brady Walker"]],
    ].sort(),
  );
  assert.equal(titleForTomDivision("seniors", "pokemon-vgc", "vg"), "pokemon-vgc-seniors");
  assert.equal(titleForTomDivision("masters", "pokemon-vgc", "vg"), "pokemon-vgc");
});
