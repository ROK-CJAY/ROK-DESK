import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compareVersion,
  isNewerVersion,
  normalizeVersion,
  parseVersion,
  pickGithubRelease,
  releaseToStatus,
} from "../src/lib/app-update.ts";

test("normalizes v-prefix and parses beta tags", () => {
  assert.equal(normalizeVersion("v1.2.12-beta"), "1.2.12-beta");
  assert.deepEqual(parseVersion("v1.2.13-beta"), {
    major: 1,
    minor: 2,
    patch: 13,
    pre: "beta",
  });
});

test("newer tagged beta beats the running build", () => {
  assert.equal(isNewerVersion("1.2.13-beta", "1.2.12-beta"), true);
  assert.equal(isNewerVersion("1.2.12-beta", "1.2.12-beta"), false);
  assert.ok(compareVersion("1.2.12", "1.2.12-beta") > 0);
});

test("picks the first non-draft GitHub release", () => {
  const picked = pickGithubRelease([
    { tag_name: "v1.2.13-beta", draft: true },
    { tag_name: "v1.2.12-beta", html_url: "https://github.com/ROK-CJAY/ROK-DESK/releases/tag/v1.2.12-beta", body: "fix" },
  ]);
  assert.equal(picked?.tag_name, "v1.2.12-beta");
  const status = releaseToStatus("1.2.11-beta", picked);
  assert.equal(status.status, "available");
  assert.equal(status.latest, "1.2.12-beta");
  assert.match(status.url ?? "", /ROK-DESK/);
});
