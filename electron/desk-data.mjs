import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

const SKIP = new Set([
  "Cache",
  "Code Cache",
  "GPUCache",
  "CachedData",
  "DawnGraphiteCache",
  "DawnWebGPUCache",
  "GrShaderCache",
  "ShaderCache",
  "logs",
  "blob_storage",
]);

const README = `ROK Desk event data
===================

Players, tournament state, overlays, and the local database live here.

Uninstalling or replacing the portable .exe does not delete this folder.
Reinstall ROK Desk and the last event comes back.

Browser profiles (cookies / logins) are in the sibling folder:
  ROK Desk Browser
`;

/** Roaming AppData — not next to a portable exe, not inside Program Files. */
export function deskDataRoot() {
  return path.join(app.getPath("appData"), "ROK Desk");
}

export function applyStableUserData() {
  const dest = deskDataRoot();
  fs.mkdirSync(dest, { recursive: true });
  const current = app.getPath("userData");
  const sources = [];
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    const portable = process.env.PORTABLE_EXECUTABLE_DIR;
    sources.push(
      path.join(portable, "ROK Desk"),
      path.join(portable, "data"),
      path.join(portable, "rok-desk"),
    );
  }
  sources.push(path.join(app.getPath("appData"), "rok-desk"));
  if (path.resolve(current) !== path.resolve(dest)) sources.unshift(current);

  const destHasData =
    fs.existsSync(path.join(dest, "pgdata")) || fs.existsSync(path.join(dest, "Local Storage"));
  if (!destHasData) {
    for (const from of sources) {
      if (!from || path.resolve(from) === path.resolve(dest) || !fs.existsSync(from)) continue;
      try {
        copyUserData(from, dest);
        break;
      } catch {
        /* locked / first run */
      }
    }
  }

  try {
    fs.writeFileSync(path.join(dest, "README.txt"), README);
  } catch {
    /* ignore */
  }

  if (path.resolve(app.getPath("userData")) !== path.resolve(dest)) {
    app.setPath("userData", dest);
  }
  try {
    app.setPath("sessionData", dest);
  } catch {
    /* older electron */
  }
  return dest;
}

function copyUserData(from, to) {
  for (const name of fs.readdirSync(from)) {
    if (SKIP.has(name) || name === "README.txt") continue;
    const src = path.join(from, name);
    const dst = path.join(to, name);
    if (fs.existsSync(dst)) continue;
    fs.cpSync(src, dst, { recursive: true, errorOnExist: false, force: false });
  }
}
