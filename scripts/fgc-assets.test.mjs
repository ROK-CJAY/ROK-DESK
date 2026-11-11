import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { register } from "node:module";
import { checkImage, packShapeFrom, safeAssetPath, skinIndexes, skinPath, stagePath } from "../src/lib/fgc-asset-paths.ts";

// Resolve the app's "@/..." alias for the server module under test.
const src = new URL("../src/", import.meta.url).href;
register(`data:text/javascript,${encodeURIComponent(`export async function resolve(s, c, n) { if (s.startsWith("@/")) s = ${JSON.stringify(src)} + s.slice(2) + ".ts"; return n(s, c); }`)}`);

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(12).fill(0), 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);

test("file names follow each pack's prefix / postfix (real StreamHelperAssets names)", () => {
  assert.equal(skinPath("sf6", packShapeFrom("website", { prefix: "file_", postfix: "_" }), "AKI", 0), "games/sf6/website/file_AKI_0.png");
  assert.equal(skinPath("tekken8", packShapeFrom("full", { prefix: "TK8_ch_", postfix: "_icon_new_webp_" }), "ali", 0), "games/tekken8/full/TK8_ch_ali_icon_new_webp_0.png");
  assert.equal(skinPath("ssbu", packShapeFrom("website", { prefix: "", postfix: "_" }), "mario", 7), "games/ssbu/website/mario_7.png");
  assert.equal(stagePath("tekken8", packShapeFrom("stage_icon", { prefix: "file_", postfix: "" }, "stage"), "Arena"), "games/tekken8/stage_icon/file_Arena.png");
  assert.equal(stagePath("ssbu", packShapeFrom("stage_icon", null, "stage"), "battlefield"), "games/ssbu/stage_icon/stage_2_battlefield.png");
});

test("skin indexes come from the pack config, not a guessed 8", () => {
  const config = { image_sizes: { mario: { 0: {}, 1: {}, 7: {} }, miifighter: { 0: {} } } };
  assert.deepEqual(skinIndexes(config, "mario"), [0, 1, 7]);
  assert.deepEqual(skinIndexes(config, "miifighter"), [0]);
  assert.deepEqual(skinIndexes(config, "random"), [], "not in the pack = no art");
  assert.equal(skinIndexes({}, "mario"), null);
});

test("downloads are validated: 404 text, HTML pages and cut-off PNGs are rejected", () => {
  assert.deepEqual(checkImage(200, "image/png", PNG), { ok: true, type: "png" });
  assert.equal(checkImage(404, "text/plain", new TextEncoder().encode("404: Not Found")).ok, false);
  assert.equal(checkImage(200, "text/html", new TextEncoder().encode("<html>")).ok, false);
  const cut = checkImage(200, "image/png", PNG.subarray(0, 14));
  assert.equal(cut.ok, false);
  assert.equal(cut.retry, true);
  assert.equal(checkImage(200, "image/png", PNG, PNG.length + 5).ok, false);
});

test("asset paths cannot escape the cache", () => {
  assert.ok(safeAssetPath("games/ssbu/website/mario_0.png"));
  assert.equal(safeAssetPath("games/../../etc/passwd.png"), null);
  assert.equal(safeAssetPath("games/ssbu/website/..%2F..%2Fx.png"), null);
  assert.equal(safeAssetPath("games/ssbu/website/mario_0.exe"), null);
});

test("server download retries transient failures and writes atomically", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rok-assets-"));
  // Desktop points ROK_DATA_DIR at the PGLite folder; assets live beside it.
  process.env.ROK_DATA_DIR = path.join(dir, "pgdata");
  const { downloadAssets, readAsset } = await import("../src/lib/fgc-asset-store.ts");
  let calls = 0;
  const fetcher = async (url) => {
    calls += 1;
    if (url.endsWith("mario_0.png") && calls === 1) return new Response("busy", { status: 503 });
    if (url.endsWith("mario_0.png")) return new Response(PNG, { status: 200, headers: { "content-type": "image/png" } });
    if (url.endsWith("half_0.png")) return new Response(PNG.subarray(0, 14), { status: 200, headers: { "content-type": "image/png" } });
    return new Response("404: Not Found", { status: 404, headers: { "content-type": "text/plain" } });
  };
  const results = await downloadAssets(["games/ssbu/website/mario_0.png", "games/ssbu/website/random_0.png", "games/ssbu/website/half_0.png"], { fetcher });
  const by = Object.fromEntries(results.map((row) => [row.path.split("/").pop(), row.status]));
  assert.deepEqual(by, { "mario_0.png": "saved", "random_0.png": "missing", "half_0.png": "failed" });
  assert.ok(await readAsset("games/ssbu/website/mario_0.png"));
  assert.equal(await readAsset("games/ssbu/website/half_0.png"), null, "a cut-off file is never kept");
  const leftovers = fs.readdirSync(path.join(dir, "fgc-assets", "ssbu", "website")).filter((name) => name.endsWith(".tmp"));
  assert.deepEqual(leftovers, []);
  const again = await downloadAssets(["games/ssbu/website/mario_0.png"], { fetcher: async () => { throw new Error("should use cache"); } });
  assert.equal(again[0].status, "cached");
  fs.rmSync(dir, { recursive: true, force: true });
});
