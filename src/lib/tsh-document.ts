import { readFile } from "node:fs/promises";
import path from "node:path";

export function renderTshDocument(html: string, baseHref: string) {
  const head = `<base href="${baseHref}"><style>html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:transparent}</style>`;
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (tag) => `${tag}${head}`) : `<head>${head}</head>${html}`;
}

export async function readTshLayout(file: string) {
  const safe = file.replace(/\\/g, "/");
  if (!/^[a-zA-Z0-9_./-]+\.html$/i.test(safe) || safe.includes("..")) return null;
  const roots = [path.join(process.cwd(), "public/tsh/layout"), path.join(process.cwd(), ".output/public/tsh/layout"), "/workspace/public/tsh/layout"];
  for (const root of roots) {
    try {
      return await readFile(path.join(root, safe), "utf8");
    } catch {
      // try the next place the published app keeps public files
    }
  }
  return null;
}
