import { execFile, spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PRINTED_SETS, printedCodesForSet } from "@/lib/ptcg-deck-match";

const ZIP_URL = "https://codeload.github.com/PokemonTCG/pokemon-tcg-data/zip/refs/heads/master";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

export type PtcgCatalogCard = {
  id: string;
  name: string;
  number?: string;
  hp?: string;
  rarity?: string;
  supertype?: string;
  subtypes?: string[];
  types?: string[];
  regulationMark?: string;
  images?: { small?: string; large?: string };
  set?: { id?: string; name?: string; releaseDate?: string };
  attacks?: unknown[];
  abilities?: unknown[];
  rules?: string[];
  flavorText?: string;
  retreatCost?: string[];
  convertedRetreatCost?: number;
};

export type PtcgCatalogStatus = {
  status: "idle" | "running" | "ok" | "error";
  phase?: string;
  /** 0–100 while a sync is running. Null means the bar is indeterminate. */
  progress?: number | null;
  received?: number;
  total?: number;
  count: number;
  updatedAt: number | null;
  error?: string;
  file: string;
};

type CatalogFile = {
  updatedAt: number;
  count: number;
  cards: PtcgCatalogCard[];
};

const g = globalThis as typeof globalThis & {
  __ptcgCatalogJob__?: PtcgCatalogStatus;
  __ptcgCatalogMem__?: CatalogFile | null;
  __ptcgCatalogSync__?: Promise<void>;
  __ptcgCatalogLoad__?: Promise<CatalogFile | null>;
  __ptcgCatalogById__?: Map<string, PtcgCatalogCard>;
};

function catalogRoots(): string[] {
  const roots: string[] = [];
  const add = (value?: string) => {
    const root = value?.trim();
    if (root && !roots.includes(root)) roots.push(root);
  };
  add(typeof process !== "undefined" ? process.env.ROK_DATA_DIR : "");
  add(path.join(process.cwd(), "data"));
  add("/workspace/data");
  return roots;
}

function catalogPath() {
  return path.join(catalogRoots()[0] ?? path.join(process.cwd(), "data"), "ptcg-catalog.json");
}

function catalogFiles(): string[] {
  return catalogRoots().map((root) => path.join(root, "ptcg-catalog.json"));
}

export function catalogStatus(): PtcgCatalogStatus {
  const job = g.__ptcgCatalogJob__;
  if (job?.status === "running") return { ...job, file: catalogPath() };
  const mem = g.__ptcgCatalogMem__;
  if (mem) {
    return { status: "ok", count: mem.count, updatedAt: mem.updatedAt, file: catalogPath() };
  }
  return { status: "idle", count: 0, updatedAt: null, file: catalogPath() };
}

function indexCatalog(catalog: CatalogFile) {
  const map = new Map<string, PtcgCatalogCard>();
  const add = (key: string, card: PtcgCatalogCard) => {
    const id = key.trim().toLowerCase();
    if (id && !map.has(id)) map.set(id, card);
  };
  for (const card of catalog.cards) {
    add(card.id, card);
    const number = String(card.number ?? "").trim();
    if (!number) continue;
    const trimmed = number.replace(/^0+/, "") || number;
    const padded = trimmed.padStart(3, "0");
    for (const code of printedCodesForSet(card.set?.id)) {
      add(`${code}-${number}`, card);
      add(`${code}-${trimmed}`, card);
      add(`${code}-${padded}`, card);
    }
  }
  g.__ptcgCatalogById__ = map;
}

function rememberCatalog(catalog: CatalogFile) {
  g.__ptcgCatalogMem__ = catalog;
  indexCatalog(catalog);
  g.__ptcgCatalogLoad__ = Promise.resolve(catalog);
}

export async function loadCatalog(): Promise<CatalogFile | null> {
  if (g.__ptcgCatalogMem__) {
    if (!g.__ptcgCatalogById__) indexCatalog(g.__ptcgCatalogMem__);
    return g.__ptcgCatalogMem__;
  }
  if (g.__ptcgCatalogLoad__) return g.__ptcgCatalogLoad__;
  g.__ptcgCatalogLoad__ = (async () => {
    for (const file of catalogFiles()) {
      try {
        const raw = await readFile(file, "utf8");
        const parsed = JSON.parse(raw) as CatalogFile;
        if (!parsed || !Array.isArray(parsed.cards) || !parsed.cards.length) continue;
        rememberCatalog(parsed);
        return parsed;
      } catch {
        /* try the next known data folder */
      }
    }
    return null;
  })();
  try {
    return await g.__ptcgCatalogLoad__;
  } finally {
    if (!g.__ptcgCatalogMem__) g.__ptcgCatalogLoad__ = undefined;
  }
}

/** In-memory only — art/search hot paths must not parse the 16MB catalog. */
export function peekCatalogCard(id: string): PtcgCatalogCard | null {
  return cardFromIndex(id);
}

function cardFromIndex(id: string): PtcgCatalogCard | null {
  const index = g.__ptcgCatalogById__;
  if (!index) return null;
  const needle = id.trim().toLowerCase();
  if (!needle) return null;
  const exact = index.get(needle);
  if (exact) return exact;
  const last = needle.lastIndexOf("-");
  if (last < 1) return null;
  const set = needle.slice(0, last);
  const number = needle.slice(last + 1);
  const mapped = PRINTED_SETS[set.toUpperCase()];
  if (!mapped) return null;
  const trimmed = number.replace(/^0+/, "") || number;
  for (const io of mapped) {
    const hit = index.get(`${io.toLowerCase()}-${number}`) ?? index.get(`${io.toLowerCase()}-${trimmed}`);
    if (hit) return hit;
  }
  return null;
}

export async function searchCatalog(query: string, live: boolean): Promise<PtcgCatalogCard[] | null> {
  const catalog = await loadCatalog();
  if (!catalog?.cards.length) return null;
  const needle = foldName(query);
  if (needle.length < 2) return [];
  const parts = needle.split(" ").filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  const setToken = parts.length >= 2 ? parts[parts.length - 2]! : "";
  const looksLikePrint = parts.length >= 2 && /^[a-z0-9]{1,8}$/.test(last) && /^[a-z0-9]{2,8}$/.test(setToken);

  const exact: PtcgCatalogCard[] = [];
  const starts: PtcgCatalogCard[] = [];
  const rest: PtcgCatalogCard[] = [];

  for (const card of catalog.cards) {
    const name = foldName(card.name);
    const number = String(card.number ?? "")
      .replace(/^0+/, "")
      .toLowerCase();
    const setBits = [
      String(card.set?.id ?? ""),
      String(card.set?.name ?? ""),
      ...printedCodesForSet(card.set?.id),
    ].map((value) => foldName(value));
    const printHit =
      looksLikePrint &&
      (number === last.replace(/^0+/, "") || String(card.number ?? "").toLowerCase() === last) &&
      setBits.some((bit) => bit === setToken || bit.startsWith(setToken));
    const nameHit = name.includes(needle);
    if (!nameHit && !printHit) continue;

    const isExact = name === needle || printHit;
    if (live && !isStandardLegal(card)) continue;

    if (isExact) exact.push(card);
    else if (name.startsWith(needle)) starts.push(card);
    else rest.push(card);
  }

  const byDate = (a: PtcgCatalogCard, b: PtcgCatalogCard) => {
    const date = String(b.set?.releaseDate ?? "").localeCompare(String(a.set?.releaseDate ?? ""));
    if (date) return date;
    return a.name.localeCompare(b.name) || String(a.number ?? "").localeCompare(String(b.number ?? ""));
  };
  exact.sort(byDate);
  starts.sort(byDate);
  rest.sort(byDate);
  return [...exact, ...starts, ...rest].slice(0, 40);
}

export function foldName(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export async function catalogCard(id: string): Promise<PtcgCatalogCard | null> {
  await loadCatalog();
  return cardFromIndex(id);
}

export async function resolveCatalogCard(opts: {
  id?: string;
  name?: string;
  number?: string;
  set?: string;
}): Promise<PtcgCatalogCard | null> {
  await loadCatalog();
  if (opts.id) {
    const hit = cardFromIndex(opts.id);
    if (hit && (!opts.name || foldName(hit.name) === foldName(opts.name))) return hit;
  }
  const name = foldName(opts.name ?? "");
  if (!name) return null;
  const number = String(opts.number ?? "").replace(/^0+/, "").toLowerCase();
  const setRaw = opts.set?.trim() ?? "";
  const setKeys = new Set<string>();
  if (setRaw) {
    setKeys.add(setRaw.toLowerCase());
    const upper = setRaw.toUpperCase();
    for (const alias of PRINTED_SETS[upper] ?? []) setKeys.add(alias.toLowerCase());
    for (const [code, aliases] of Object.entries(PRINTED_SETS)) {
      if (code.toLowerCase() === setRaw.toLowerCase() || aliases.some((alias) => alias.toLowerCase() === setRaw.toLowerCase())) {
        setKeys.add(code.toLowerCase());
        aliases.forEach((alias) => setKeys.add(alias.toLowerCase()));
      }
    }
    for (const code of printedCodesForSet(setRaw)) setKeys.add(code.toLowerCase());
  }
  const cards = g.__ptcgCatalogMem__?.cards ?? [];
  let loose: PtcgCatalogCard | null = null;
  for (const card of cards) {
    if (foldName(card.name) !== name) continue;
    const cardNum = String(card.number ?? "").replace(/^0+/, "").toLowerCase();
    if (number && cardNum !== number) continue;
    const setId = (card.set?.id ?? "").toLowerCase();
    const setName = (card.set?.name ?? "").toLowerCase();
    if (!setKeys.size || setKeys.has(setId) || setKeys.has(setName) || (setRaw && setName.includes(setRaw.toLowerCase()))) {
      return card;
    }
    if (!loose) loose = card;
  }
  return loose;
}

/** Paper Standard since 10 Apr 2026: regulation H and later. */
export function isStandardLegal(row: unknown): boolean {
  if (!row || typeof row !== "object") return false;
  const card = row as { regulationMark?: string; supertype?: string };
  const mark = String(card.regulationMark ?? "").trim().toUpperCase();
  if (mark) return mark >= "H" && mark <= "Z";
  return String(card.supertype ?? "") === "Energy";
}

export function startCatalogSync(): PtcgCatalogStatus {
  if (g.__ptcgCatalogSync__) return catalogStatus();
  g.__ptcgCatalogJob__ = {
    status: "running",
    phase: "Starting download…",
    count: g.__ptcgCatalogMem__?.count ?? 0,
    updatedAt: g.__ptcgCatalogMem__?.updatedAt ?? null,
    file: catalogPath(),
  };
  g.__ptcgCatalogSync__ = runSync()
    .catch((error) => {
      g.__ptcgCatalogJob__ = {
        status: "error",
        count: g.__ptcgCatalogMem__?.count ?? 0,
        updatedAt: g.__ptcgCatalogMem__?.updatedAt ?? null,
        error: error instanceof Error ? error.message : "Download failed",
        file: catalogPath(),
      };
    })
    .finally(() => {
      g.__ptcgCatalogSync__ = undefined;
    });
  return catalogStatus();
}

async function runSync() {
  const setPhase = (
    phase: string,
    extra: { count?: number; progress?: number | null; received?: number; total?: number } = {},
  ) => {
    g.__ptcgCatalogJob__ = {
      status: "running",
      phase,
      count: extra.count ?? g.__ptcgCatalogJob__?.count ?? 0,
      progress: extra.progress === undefined ? (g.__ptcgCatalogJob__?.progress ?? null) : extra.progress,
      received: extra.received ?? g.__ptcgCatalogJob__?.received,
      total: extra.total ?? g.__ptcgCatalogJob__?.total,
      updatedAt: g.__ptcgCatalogMem__?.updatedAt ?? null,
      file: catalogPath(),
    };
  };

  setPhase("Listing sets…", { progress: 0 });
  const scratch = await mkdtemp(path.join(tmpdir(), "ptcg-catalog-"));
  try {
    const listed = await listEnglishSets();
    if (listed) {
      await downloadListedSets(scratch, listed, setPhase);
    } else {
      await downloadZipFallback(scratch, setPhase);
    }
    setPhase("Building catalog…", { progress: listed ? 93 : 78 });
    const catalog = await buildFromExtract(scratch, setPhase, listed ? 93 : 78, listed ? 5 : 20);
    setPhase("Saving catalog…", { progress: 98, count: catalog.count });
    const out = catalogPath();
    await mkdir(path.dirname(out), { recursive: true });
    const tmp = `${out}.tmp`;
    await writeFile(tmp, JSON.stringify(catalog));
    await rename(tmp, out);
    rememberCatalog(catalog);
    g.__ptcgCatalogJob__ = {
      status: "ok",
      phase: "Ready",
      progress: 100,
      count: catalog.count,
      updatedAt: catalog.updatedAt,
      file: out,
    };
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

async function buildFromExtract(
  root: string,
  setPhase: (
    phase: string,
    extra?: { count?: number; progress?: number | null; received?: number; total?: number },
  ) => void,
  progressStart = 78,
  progressSpan = 20,
): Promise<CatalogFile> {
  const { readdir } = await import("node:fs/promises");
  const walk = await readdir(root, { withFileTypes: true });
  const base = walk.find((entry) => entry.isDirectory() && entry.name.startsWith("pokemon-tcg-data"))?.name;
  if (!base) throw new Error("Unexpected catalog archive");
  const setRaw = await readFile(path.join(root, base, "sets", "en.json"), "utf8");
  const sets = JSON.parse(setRaw) as { id?: string; name?: string; releaseDate?: string }[];
  const setMap = new Map(sets.map((row) => [String(row.id ?? ""), row]));
  const cardsDir = path.join(root, base, "cards", "en");
  const files = (await readdir(cardsDir)).filter((name) => name.endsWith(".json")).sort();
  const cards: PtcgCatalogCard[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const done = i + 1;
    const progress = progressStart + Math.round((done / files.length) * progressSpan);
    setPhase(`Reading ${file.replace(".json", "")} (${done}/${files.length})`, {
      count: cards.length,
      progress,
    });
    const rows = JSON.parse(await readFile(path.join(cardsDir, file), "utf8")) as Record<string, unknown>[];
    const setId = file.replace(/\.json$/, "");
    const set = setMap.get(setId);
    for (const row of rows) {
      const slim = slimCard(row, set);
      if (slim.id && slim.name) cards.push(slim);
    }
  }
  return { updatedAt: Date.now(), count: cards.length, cards };
}

function slimCard(row: Record<string, unknown>, set?: { id?: string; name?: string; releaseDate?: string }): PtcgCatalogCard {
  const images = row.images && typeof row.images === "object" ? (row.images as { small?: string; large?: string }) : undefined;
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? "").trim(),
    number: row.number != null ? String(row.number) : undefined,
    hp: row.hp != null ? String(row.hp) : undefined,
    rarity: row.rarity ? String(row.rarity) : undefined,
    supertype: row.supertype ? String(row.supertype) : undefined,
    subtypes: Array.isArray(row.subtypes) ? row.subtypes.map(String) : undefined,
    types: Array.isArray(row.types) ? row.types.map(String) : undefined,
    regulationMark: row.regulationMark ? String(row.regulationMark) : undefined,
    images,
    set: set ? { id: set.id, name: set.name, releaseDate: set.releaseDate } : undefined,
    attacks: Array.isArray(row.attacks) ? row.attacks : undefined,
    abilities: Array.isArray(row.abilities) ? row.abilities : undefined,
    rules: Array.isArray(row.rules) ? row.rules.map(String) : undefined,
    flavorText: row.flavorText ? String(row.flavorText) : undefined,
    retreatCost: Array.isArray(row.retreatCost) ? row.retreatCost.map(String) : undefined,
    convertedRetreatCost: typeof row.convertedRetreatCost === "number" ? row.convertedRetreatCost : undefined,
  };
}

type ListedSet = { name: string; download_url: string; size: number };

async function listEnglishSets(): Promise<ListedSet[] | null> {
  try {
    const res = await fetch("https://api.github.com/repos/PokemonTCG/pokemon-tcg-data/contents/cards/en?ref=master", {
      headers: { Accept: "application/vnd.github+json", "User-Agent": UA },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as { name?: string; download_url?: string; size?: number; type?: string }[];
    if (!Array.isArray(rows)) return null;
    const files = rows
      .filter((row) => row.type === "file" && row.name?.endsWith(".json") && row.download_url)
      .map((row) => ({ name: row.name!, download_url: row.download_url!, size: row.size ?? 0 }));
    return files.length ? files : null;
  } catch {
    return null;
  }
}

async function downloadListedSets(
  scratch: string,
  files: ListedSet[],
  setPhase: (
    phase: string,
    extra?: { count?: number; progress?: number | null; received?: number; total?: number },
  ) => void,
) {
  const root = path.join(scratch, "pokemon-tcg-data-master");
  const cardsDir = path.join(root, "cards", "en");
  const setsDir = path.join(root, "sets");
  await mkdir(cardsDir, { recursive: true });
  await mkdir(setsDir, { recursive: true });
  const total = files.reduce((sum, file) => sum + file.size, 0);
  setPhase(`Downloading sets 0/${files.length}`, { progress: 0, received: 0, total });
  await curlToFile(
    "https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/sets/en.json",
    path.join(setsDir, "en.json"),
    60000,
  );
  let done = 0;
  let received = 0;
  await mapPool(files, 6, async (file) => {
    await curlToFile(file.download_url, path.join(cardsDir, file.name), 60000);
    done += 1;
    received += file.size;
    const progress = Math.min(92, Math.round((done / files.length) * 92));
    setPhase(`Downloading sets ${done}/${files.length} · ${formatBytes(received)} / ${formatBytes(total)}`, {
      progress,
      received,
      total,
    });
  });
}

async function downloadZipFallback(
  scratch: string,
  setPhase: (
    phase: string,
    extra?: { count?: number; progress?: number | null; received?: number; total?: number },
  ) => void,
) {
  const zipPath = path.join(scratch, "cards.zip");
  const total = await contentLength(ZIP_URL);
  setPhase("Downloading card database…", { progress: total ? 0 : null, received: 0, total });
  await curlToFile(ZIP_URL, zipPath, 180000, (received) => {
    const progress = total > 0 ? Math.min(70, Math.round((received / total) * 70)) : null;
    const label = total > 0 ? `${formatBytes(received)} / ${formatBytes(total)}` : formatBytes(received);
    setPhase(`Downloading ${label}`, { progress, received, total });
  });
  setPhase("Unpacking sets…", { progress: 74 });
  await unzipTo(zipPath, scratch);
}

async function mapPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

function contentLength(url: string): Promise<number> {
  return new Promise((resolve) => {
    execFile(
      "curl",
      ["-sI", "-L", "--http1.1", "-m", "20", "-A", UA, url],
      { timeout: 25000 },
      (error, stdout) => {
        if (error) {
          resolve(0);
          return;
        }
        const matches = [...String(stdout).matchAll(/content-length:\s*(\d+)/gi)];
        const last = matches.at(-1);
        resolve(last ? Number(last[1]) : 0);
      },
    );
  });
}

function curlToFile(url: string, dest: string, timeoutMs: number, onBytes?: (received: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(
      "curl",
      ["-sS", "-L", "-f", "--http1.1", "-m", String(Math.ceil(timeoutMs / 1000)), "-A", UA, "-o", dest, url],
      { stdio: "ignore" },
    );
    let settled = false;
    const timer = onBytes
      ? setInterval(() => {
          void stat(dest)
            .then((info) => onBytes(info.size))
            .catch(() => undefined);
        }, 400)
      : null;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      if (timer) clearInterval(timer);
      if (error) reject(error);
      else resolve();
    };
    const killer = setTimeout(() => {
      child.kill("SIGTERM");
      finish(new Error("Could not download the card database"));
    }, timeoutMs + 1000);
    child.on("error", () => finish(new Error("Could not download the card database")));
    child.on("close", (code) => {
      clearTimeout(killer);
      if (code === 0) {
        void stat(dest)
          .then((info) => onBytes?.(info.size))
          .catch(() => undefined)
          .finally(() => finish());
        return;
      }
      finish(new Error("Could not download the card database"));
    });
  });
}

function unzipTo(zipPath: string, dest: string) {
  return new Promise<void>((resolve, reject) => {
    execFile("unzip", ["-q", "-o", zipPath, "-d", dest], { timeout: 60000 }, (error) => {
      if (error) reject(new Error("Could not unpack the card database"));
      else resolve();
    });
  });
}

void loadCatalog();
