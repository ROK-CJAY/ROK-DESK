import assert from "node:assert/strict";
import { test } from "node:test";
import { fingerprintTomReports, pickTomReportSet } from "../src/lib/tom-folder-watch.ts";

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

test("fingerprint changes when TOM rewrites pairings", () => {
  const a = fingerprintTomReports([{ path: "pairings.html", lastModified: 1, size: 10 }]);
  const b = fingerprintTomReports([{ path: "pairings.html", lastModified: 2, size: 12 }]);
  assert.notEqual(a, b);
});
