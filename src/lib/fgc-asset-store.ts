/**
 * Server-side Tournament Stream Helper asset cache, so OBS browser sources load skins and
 * stage icons from ROK Desk (/api/fgc/assets?file=...) instead of each browser's IndexedDB.
 * Every download is validated (status, content type, image signature, complete PNG, length),
 * retried on transient failures, and written atomically (temp file + rename).
 */
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { checkImage, pngComplete, retryDelay, safeAssetPath, sniffImage, TSH_RAW } from "@/lib/fgc-asset-paths";

export type AssetResult = { path: string; status: "saved" | "cached" | "missing" | "failed"; reason?: string };

export function assetRoot(): string {
  const data = (typeof process !== "undefined" ? process.env.ROK_DATA_DIR?.trim() : "") || path.join(process.cwd(), "data");
  return path.join(data, "fgc-assets");
}

function localPath(rel: string): string | null {
  const parts = safeAssetPath(rel);
  if (!parts) return null;
  const root = assetRoot();
  const file = path.join(root, parts.game, parts.folder, parts.file);
  return file.startsWith(root + path.sep) ? file : null;
}

const TYPES: Record<string, string> = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };

/** A cached file that is still a complete image, or null. */
export async function readAsset(rel: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const file = localPath(rel);
  if (!file) return null;
  try {
    const bytes = new Uint8Array(await readFile(file));
    const type = sniffImage(bytes);
    if (!type || (type === "png" && !pngComplete(bytes))) return null;
    return { bytes, contentType: TYPES[type] };
  } catch {
    return null;
  }
}

export function remoteAssetUrl(rel: string): string | null {
  return safeAssetPath(rel) ? `${TSH_RAW}/${rel}` : null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function downloadOne(rel: string, force: boolean, fetcher: typeof fetch): Promise<AssetResult> {
  const file = localPath(rel);
  const url = remoteAssetUrl(rel);
  if (!file || !url) return { path: rel, status: "failed", reason: "bad path" };
  if (!force && (await readAsset(rel))) return { path: rel, status: "cached" };
  let reason = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt) await sleep(retryDelay(attempt - 1));
    try {
      const res = await fetcher(url, { redirect: "follow" });
      const bytes = new Uint8Array(await res.arrayBuffer());
      const encoded = !!res.headers.get("content-encoding");
      const length = encoded ? null : Number(res.headers.get("content-length")) || null;
      const check = checkImage(res.status, res.headers.get("content-type"), bytes, length);
      if (check.ok) {
        await mkdir(path.dirname(file), { recursive: true });
        const temp = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
        try {
          await writeFile(temp, bytes);
          await rename(temp, file);
        } catch (err) {
          await rm(temp, { force: true }).catch(() => undefined);
          throw err;
        }
        return { path: rel, status: "saved" };
      }
      reason = check.reason;
      if (!check.retry) return { path: rel, status: res.status === 404 ? "missing" : "failed", reason };
    } catch (err) {
      reason = err instanceof Error ? err.message : "download failed";
    }
  }
  return { path: rel, status: "failed", reason };
}

/** Download a batch, four at a time. */
export async function downloadAssets(paths: string[], options: { force?: boolean; fetcher?: typeof fetch } = {}): Promise<AssetResult[]> {
  const queue = [...new Set(paths)];
  const results: AssetResult[] = [];
  const fetcher = options.fetcher ?? fetch;
  const worker = async () => {
    for (;;) {
      const next = queue.shift();
      if (!next) return;
      results.push(await downloadOne(next, !!options.force, fetcher));
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, queue.length || 1) }, () => worker()));
  return results;
}
