import { app, shell } from "electron";
import fs from "node:fs";
import path from "node:path";

export function sourcesRoot() {
  return path.join(app.getPath("documents"), "ROK Desk", "Sources");
}

function segment(value) {
  return String(value || "").replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
}

function folderPath(dir) {
  const root = path.resolve(sourcesRoot());
  const parts = String(dir || "").split(/[\\/]/).map(segment).filter(Boolean);
  const target = path.resolve(root, ...parts);
  if (target !== root && !target.startsWith(root + path.sep)) return root;
  return target;
}

export function ensureSourcesRoot() {
  const root = sourcesRoot();
  fs.mkdirSync(root, { recursive: true });
  return root;
}

export function writeSourceFiles(groups) {
  const root = ensureSourcesRoot();
  if (!Array.isArray(groups)) return root;
  for (const group of groups) {
    const dir = folderPath(group?.dir);
    fs.mkdirSync(dir, { recursive: true });
    const files = group?.files && typeof group.files === "object" ? group.files : {};
    for (const [name, text] of Object.entries(files)) {
      const fileName = segment(name).replace(/ /g, "");
      if (!fileName.endsWith(".txt")) continue;
      const file = path.join(dir, fileName);
      const next = String(text ?? "");
      try {
        if (fs.readFileSync(file, "utf8") === next) continue;
      } catch {
        /* new file */
      }
      fs.writeFileSync(file, next);
    }
  }
  return root;
}

export function openSources(dir) {
  const target = folderPath(dir);
  fs.mkdirSync(target, { recursive: true });
  return shell.openPath(target);
}
