import assert from "node:assert/strict";
import { test } from "node:test";
import {
  chooseTomReportSet,
  fingerprintTomReports,
  listTomReportSets,
  pickTomReportSet,
  tomDirectoryPickerId,
  tomReportIdentity,
} from "../src/lib/tom-folder-watch.ts";

test("picks the newest reports folder that has pairings", () => {
  const files = [
    { path: "old-event/pairings.html", name: "pairings.html", lastModified: 100, size: 10 },
    { path: "old-event/standings.html", name: "standings.html", lastModified: 100, size: 10 },
    { path: "data/reports/pairings.html", name: "pairings.html", lastModified: 900, size: 20 },
    { path: "data/reports/standings.html", name: "standings.html", lastModified: 900, size: 20 },
    { path: "data/reports/roster.html", name: "roster.html", lastModified: 800, size: 30 },
  ];
  const picked = pickTomReportSet(files);
  assert.deepEqual(
    picked.map((f) => f.path).sort(),
    ["data/reports/pairings.html", "data/reports/roster.html", "data/reports/standings.html"],
  );
});

test("preferDir pins an older event even when another folder is newer", () => {
  const files = [
    { path: "old-event/pairings.html", name: "pairings.html", lastModified: 100, size: 10 },
    { path: "old-event/standings.html", name: "standings.html", lastModified: 100, size: 10 },
    { path: "data/reports/pairings.html", name: "pairings.html", lastModified: 900, size: 20 },
    { path: "data/reports/standings.html", name: "standings.html", lastModified: 900, size: 20 },
  ];
  const picked = pickTomReportSet(files, "old-event");
  assert.deepEqual(
    picked.map((f) => f.path).sort(),
    ["old-event/pairings.html", "old-event/standings.html"],
  );
});

test("preferName matches the TOM event title on a report set", () => {
  const files = [
    { path: "old-event/pairings.html", name: "pairings.html", lastModified: 100, size: 10 },
    { path: "data/reports/pairings.html", name: "pairings.html", lastModified: 900, size: 20 },
  ];
  const sets = listTomReportSets(files).map((set) => ({
    ...set,
    eventName: set.dir === "old-event" ? "Worlds VG cup at ROK" : "League Challenge",
  }));
  const chosen = chooseTomReportSet(sets, { preferName: "Worlds VG cup at ROK" });
  assert.equal(chosen?.dir, "old-event");
});

test("same reports folder keeps each tournament's files apart", () => {
  assert.equal(tomReportIdentity("Worlds VG cup at ROKstandings.html").label, "Worlds VG cup at ROK");
  assert.equal(tomReportIdentity("pairings.html").stem, "");
  const files = [
    { path: "data/reports/Worlds VG cup at ROKstandings.html", name: "Worlds VG cup at ROKstandings.html", lastModified: 100, size: 10 },
    { path: "data/reports/Worlds VG cup at ROKpairings.html", name: "Worlds VG cup at ROKpairings.html", lastModified: 100, size: 10 },
    { path: "data/reports/Worlds VG cup at ROKroster.html", name: "Worlds VG cup at ROKroster.html", lastModified: 100, size: 10 },
    { path: "data/reports/Friday League Challengestandings.html", name: "Friday League Challengestandings.html", lastModified: 900, size: 10 },
    { path: "data/reports/Friday League Challengepairings.html", name: "Friday League Challengepairings.html", lastModified: 900, size: 10 },
  ];
  const sets = listTomReportSets(files);
  assert.equal(sets.length, 2);
  const worlds = chooseTomReportSet(sets, { preferName: "Worlds VG cup at ROK" });
  assert.deepEqual(
    worlds?.files.map((f) => f.name).sort(),
    ["Worlds VG cup at ROKpairings.html", "Worlds VG cup at ROKroster.html", "Worlds VG cup at ROKstandings.html"],
  );
  const newest = chooseTomReportSet(sets);
  assert.equal(newest?.eventName, "Friday League Challenge");
});

test("fingerprint changes when TOM rewrites pairings", () => {
  const a = fingerprintTomReports([{ path: "pairings.html", lastModified: 1, size: 10 }]);
  const b = fingerprintTomReports([{ path: "pairings.html", lastModified: 2, size: 12 }]);
  assert.notEqual(a, b);
});

test("preferKind skips VG reports when the desk wants TCG", () => {
  const sets = listTomReportSets([
    { path: "vg/pairings.html", name: "pairings.html", lastModified: 900, size: 20 },
    { path: "tcg/pairings.html", name: "pairings.html", lastModified: 100, size: 10 },
  ]).map((set) => ({
    ...set,
    gameKind: set.dir === "vg" ? "vg" : "tcg",
    eventName: set.dir === "vg" ? "VG Cup" : "TCG League Challenge",
  }));
  const tcg = chooseTomReportSet(sets, { preferKind: "tcg" });
  assert.equal(tcg?.dir, "tcg");
  const vg = chooseTomReportSet(sets, { preferKind: "vg" });
  assert.equal(vg?.dir, "vg");
  const blocked = chooseTomReportSet(
    sets.filter((s) => s.gameKind === "vg"),
    { preferKind: "tcg" },
  );
  assert.equal(blocked, undefined);
});

test("directory picker ids stay at or under Chromium's 32-character limit", () => {
  const ids = [
    "pokemon-tcg",
    "pokemon-tcg-seniors",
    "pokemon-tcg-juniors",
    "pokemon-vgc",
    "pokemon-vgc-seniors",
    "pokemon-vgc-juniors",
  ].map((id) => tomDirectoryPickerId(id));
  assert.ok(ids.every((id) => id.length <= 32));
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(tomDirectoryPickerId().length <= 32);
});
