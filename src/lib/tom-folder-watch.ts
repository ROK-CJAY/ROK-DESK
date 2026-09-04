const DB_NAME = "rok-desk-tom";
const STORE = "handles";
const HANDLE_KEY = "reports-dir";
const PICK_KEY = "reports-pick";
const POLL_MS = 2500;
const MAX_DEPTH = 5;
const MAX_BYTES = 8 * 1024 * 1024;

export type TomWatchFile = {
  path: string;
  name: string;
  lastModified: number;
  size: number;
};

export type TomWatchRead = TomWatchFile & { html: string };

export type TomWatchSet = {
  dir: string;
  label: string;
  eventName: string;
  roundLabel: string;
  gameKind: "tcg" | "vg" | "go" | "unknown";
  newest: number;
  files: TomWatchFile[];
};

type FsDir = FileSystemDirectoryHandle & {
  entries?: () => AsyncIterableIterator<[string, FileSystemHandle]>;
  values?: () => AsyncIterableIterator<FileSystemHandle>;
  queryPermission?: (desc: { mode: "read" }) => Promise<PermissionState>;
  requestPermission?: (desc: { mode: "read" }) => Promise<PermissionState>;
};

type FsFile = FileSystemFileHandle & {
  getFile: () => Promise<File>;
};

declare global {
  interface Window {
    showDirectoryPicker?: (opts?: { id?: string; mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandle>;
  }
}

export function canWatchTomFolder(): boolean {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

export function fingerprintTomReports(files: { path: string; lastModified: number; size: number }[]): string {
  return files
    .map((f) => `${f.path}:${f.lastModified}:${f.size}`)
    .sort()
    .join("|");
}

export function reportDirOf(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash === -1 ? "" : path.slice(0, slash);
}

export function listTomReportSets(files: TomWatchFile[]): TomWatchSet[] {
  const groups = new Map<string, TomWatchFile[]>();
  for (const file of files) {
    const dir = reportDirOf(file.path);
    const list = groups.get(dir) ?? [];
    list.push(file);
    groups.set(dir, list);
  }
  const sets: TomWatchSet[] = [];
  for (const [dir, list] of groups) {
    const pairings = list.filter((f) => /pairing/i.test(f.name));
    const standings = list.filter((f) => /standing/i.test(f.name));
    const roster = list.filter((f) => /roster/i.test(f.name));
    const picked = [...pairings, ...standings, ...roster];
    const filesForSet = picked.length ? picked : list;
    if (!filesForSet.length) continue;
    sets.push({
      dir,
      label: dir || ".",
      eventName: "",
      roundLabel: "",
      gameKind: "unknown",
      newest: Math.max(0, ...filesForSet.map((f) => f.lastModified)),
      files: filesForSet,
    });
  }
  return sets.sort((a, b) => b.newest - a.newest);
}

export function chooseTomReportSet(
  sets: TomWatchSet[],
  opts?: { preferDir?: string | null; preferName?: string; preferKind?: "tcg" | "vg" },
): TomWatchSet | undefined {
  if (!sets.length) return undefined;
  const kind = opts?.preferKind;
  if (opts && "preferDir" in opts && opts.preferDir != null) {
    const hit = sets.find((s) => s.dir === opts.preferDir);
    if (hit) {
      if (kind && hit.gameKind !== "unknown" && hit.gameKind !== kind) return undefined;
      return hit;
    }
  }
  const pool = kind
    ? sets.filter((s) => s.gameKind === kind || s.gameKind === "unknown")
    : sets;
  if (!pool.length) return undefined;
  const want = opts?.preferName?.trim().toLowerCase();
  if (want) {
    const hit = pool.find((s) => s.eventName.trim().toLowerCase() === want);
    if (hit) return hit;
  }
  let best: TomWatchSet | undefined;
  let bestScore = -1;
  for (const set of pool) {
    const pairings = set.files.some((f) => /pairing/i.test(f.name));
    const standings = set.files.some((f) => /standing/i.test(f.name));
    const roster = set.files.some((f) => /roster/i.test(f.name));
    const kindBoost = kind && set.gameKind === kind ? 16 : 0;
    const score = kindBoost + (pairings ? 8 : 0) + (standings ? 4 : 0) + (roster ? 2 : 0) + set.newest / 1e13;
    if (score > bestScore) {
      bestScore = score;
      best = set;
    }
  }
  return best;
}

export function pickTomReportSet(files: TomWatchFile[], preferDir?: string): TomWatchFile[] {
  return chooseTomReportSet(listTomReportSets(files), { preferDir })?.files ?? [];
}

export function tomWatchSetTitle(set: TomWatchSet): string {
  const kind = set.gameKind === "vg" ? "VG" : set.gameKind === "tcg" ? "TCG" : set.gameKind === "go" ? "GO" : "";
  const name = set.eventName.trim() || set.label;
  const base = kind ? `${kind} · ${name}` : name;
  return set.roundLabel ? `${base} · ${set.roundLabel}` : base;
}

/** Chromium `showDirectoryPicker({ id })` rejects ids longer than 32 characters. */
export function tomDirectoryPickerId(gameId?: string): string {
  const key = String(gameId ?? "")
    .replace(/^pokemon-/, "")
    .replace("tcg-seniors", "ptcg-sr")
    .replace("tcg-juniors", "ptcg-jr")
    .replace("vgc-seniors", "vgc-sr")
    .replace("vgc-juniors", "vgc-jr")
    .replace(/^tcg$/, "ptcg")
    .replace(/[^a-z0-9-]+/gi, "")
    .slice(0, 20);
  return (key ? `rok-tom-${key}` : "rok-tom-reports").slice(0, 32);
}

export async function sameTomDirectory(
  a: FileSystemDirectoryHandle | null | undefined,
  b: FileSystemDirectoryHandle | null | undefined,
): Promise<boolean> {
  if (!a || !b) return false;
  if (a === b) return true;
  try {
    if (typeof a.isSameEntry === "function") return await a.isSameEntry(b);
  } catch {
    /* ignore */
  }
  return false;
}

export async function pickTomReportsDirectory(gameId?: string): Promise<FileSystemDirectoryHandle> {
  if (!window.showDirectoryPicker) throw new Error("This browser cannot watch a folder. Use Chrome, Edge, or ROK Desk desktop.");
  const dir = await window.showDirectoryPicker({ id: tomDirectoryPickerId(gameId), mode: "read" });
  await saveDirectoryHandle(dir, gameId);
  return dir;
}

export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle, gameId?: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(handle, handleKey(gameId));
  });
  db.close();
}

export async function loadDirectoryHandle(gameId?: string): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDb();
    const handle = await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const req = store.get(handleKey(gameId));
      req.onsuccess = () => {
        const found = (req.result as FileSystemDirectoryHandle | undefined) ?? null;
        if (found || !gameId || gameId !== "pokemon-tcg") {
          resolve(found);
          return;
        }
        const legacy = store.get(HANDLE_KEY);
        legacy.onsuccess = () => resolve((legacy.result as FileSystemDirectoryHandle | undefined) ?? null);
        legacy.onerror = () => resolve(null);
      };
      req.onerror = () => reject(req.error);
    });
    db.close();
    return handle;
  } catch {
    return null;
  }
}

export async function clearDirectoryHandle(gameId?: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).delete(handleKey(gameId));
      tx.objectStore(STORE).delete(pickKey(gameId));
    });
    db.close();
  } catch {
    /* ignore */
  }
}

export async function saveReportPick(dir: string | null, gameId?: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    if (dir == null) tx.objectStore(STORE).delete(pickKey(gameId));
    else tx.objectStore(STORE).put(dir, pickKey(gameId));
  });
  db.close();
}

export async function loadReportPick(gameId?: string): Promise<string | null> {
  try {
    const db = await openDb();
    const dir = await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(pickKey(gameId));
      req.onsuccess = () => resolve(typeof req.result === "string" ? req.result : null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return dir;
  } catch {
    return null;
  }
}

function handleKey(gameId?: string): string {
  return gameId ? `${HANDLE_KEY}:${gameId}` : HANDLE_KEY;
}

function pickKey(gameId?: string): string {
  return gameId ? `${PICK_KEY}:${gameId}` : PICK_KEY;
}

export async function ensureDirectoryRead(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const dir = handle as FsDir;
  if (typeof dir.queryPermission === "function") {
    const status = await dir.queryPermission({ mode: "read" });
    if (status === "granted") return true;
    if (status === "denied") return false;
  }
  if (typeof dir.requestPermission === "function") {
    return (await dir.requestPermission({ mode: "read" })) === "granted";
  }
  return true;
}

export async function queryDirectoryRead(handle: FileSystemDirectoryHandle): Promise<PermissionState> {
  const dir = handle as FsDir;
  if (typeof dir.queryPermission !== "function") return "granted";
  try {
    return await dir.queryPermission({ mode: "read" });
  } catch {
    return "prompt";
  }
}

export async function listTomHtmlFiles(root: FileSystemDirectoryHandle): Promise<TomWatchFile[]> {
  const found: (TomWatchFile & { handle: FsFile })[] = [];
  await walk(root, "", 0, found);
  return found.map(({ handle: _h, ...rest }) => rest);
}

export async function readTomReportSet(
  root: FileSystemDirectoryHandle,
  opts?: { preferDir?: string | null; preferName?: string; preferKind?: "tcg" | "vg" },
): Promise<{ files: TomWatchRead[]; fingerprint: string; sets: TomWatchSet[] }> {
  const found: (TomWatchFile & { handle: FsFile })[] = [];
  const tdfs: (TomWatchFile & { handle: FsFile })[] = [];
  await walk(root, "", 0, found, tdfs);
  const listed = found.map(({ handle: _h, ...rest }) => rest);
  const sets = listTomReportSets(listed);
  const { tomHeadingsFromHtml, detectTomGameKind } = await import("@/lib/tom-reports");
  for (const set of sets) {
    const sample =
      set.files.find((f) => /pairing/i.test(f.name)) ??
      set.files.find((f) => /standing/i.test(f.name)) ??
      set.files.find((f) => /roster/i.test(f.name)) ??
      set.files[0];
    if (!sample) continue;
    const row = found.find((f) => f.path === sample.path);
    if (!row) continue;
    try {
      const html = await (await row.handle.getFile()).text();
      const heads = tomHeadingsFromHtml(html);
      set.eventName = heads.eventName;
      set.roundLabel = heads.roundLabel;
      set.gameKind = detectTomGameKind(`${heads.eventName}\n${html}`);
    } catch {
      /* keep empty labels */
    }
  }
  for (const tdf of tdfs) {
    try {
      const xml = await (await tdf.handle.getFile()).text();
      const kind = detectTomGameKind(xml);
      if (kind === "unknown") continue;
      const name = xml.match(/<name>([^<]*)<\/name>/i)?.[1]?.trim().toLowerCase() ?? "";
      const dir = reportDirOf(tdf.path);
      const hit =
        (name && sets.find((s) => s.eventName.trim().toLowerCase() === name)) ||
        sets.find((s) => s.dir === dir) ||
        sets.find((s) => s.dir === "" && dir === "");
      if (hit && (hit.gameKind === "unknown" || hit.gameKind === kind)) hit.gameKind = kind;
    } catch {
      /* ignore tdf */
    }
  }
  const chosen = chooseTomReportSet(sets, opts);
  const picked = chosen?.files ?? [];
  const files: TomWatchRead[] = [];
  for (const file of picked) {
    const row = found.find((f) => f.path === file.path);
    if (!row) continue;
    const blob = await row.handle.getFile();
    files.push({
      path: row.path,
      name: row.name,
      lastModified: blob.lastModified,
      size: blob.size,
      html: await blob.text(),
    });
  }
  return { files, fingerprint: fingerprintTomReports(files), sets };
}

export function tomWatchIntervalMs(): number {
  return POLL_MS;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function walk(
  dir: FileSystemDirectoryHandle,
  prefix: string,
  depth: number,
  out: (TomWatchFile & { handle: FsFile })[],
  tdfs: (TomWatchFile & { handle: FsFile })[] = [],
): Promise<void> {
  const entries = await iterateDir(dir as FsDir);
  for (const handle of entries) {
    if (handle.kind === "file") {
      const name = handle.name;
      if (/\.tdf$/i.test(name)) {
        const file = await (handle as FsFile).getFile();
        if (file.size <= MAX_BYTES) {
          tdfs.push({
            path: prefix + name,
            name,
            lastModified: file.lastModified,
            size: file.size,
            handle: handle as FsFile,
          });
        }
        continue;
      }
      if (!/\.html?$/i.test(name)) continue;
      if (!/roster|pairing|standing/i.test(name) && depth > 0) continue;
      const file = await (handle as FsFile).getFile();
      if (file.size > MAX_BYTES) continue;
      out.push({
        path: prefix + name,
        name,
        lastModified: file.lastModified,
        size: file.size,
        handle: handle as FsFile,
      });
      continue;
    }
    if (handle.kind === "directory" && depth < MAX_DEPTH) {
      const skip = /^(app|jre|runtime|node_modules|\.git)$/i.test(handle.name);
      if (skip) continue;
      await walk(handle as FileSystemDirectoryHandle, `${prefix}${handle.name}/`, depth + 1, out, tdfs);
    }
  }
}

async function iterateDir(dir: FsDir): Promise<FileSystemHandle[]> {
  const out: FileSystemHandle[] = [];
  if (typeof dir.values === "function") {
    for await (const handle of dir.values()) out.push(handle);
    return out;
  }
  if (typeof dir.entries === "function") {
    for await (const [, handle] of dir.entries()) out.push(handle);
    return out;
  }
  return out;
}
