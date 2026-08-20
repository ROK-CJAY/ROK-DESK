#!/usr/bin/env node
/** Production Node bundle for the desktop wrapper (not the Vercel preset). */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.env.ROK_DESKTOP = "1";
const result = spawnSync("npx", ["vite", "build"], {
  stdio: "inherit",
  env: process.env,
  shell: true,
  cwd: root,
});
if (result.status) process.exit(result.status === null ? 1 : result.status);

// Nitro inlines PGLite JS but not the wasm/data blobs it loads from disk.
const pgliteDist = join(root, "node_modules/@electric-sql/pglite/dist");
const dest = join(root, ".output/server/_libs");
mkdirSync(dest, { recursive: true });
for (const name of ["pglite.data", "pglite.wasm", "initdb.wasm"]) {
  const from = join(pgliteDist, name);
  if (!existsSync(from)) {
    console.error(`[desktop] missing PGLite asset ${from}`);
    process.exit(1);
  }
  copyFileSync(from, join(dest, name));
}
console.log("[desktop] copied PGLite wasm/data next to the server bundle");
