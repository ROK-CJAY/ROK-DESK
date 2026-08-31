import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

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
};

function catalogPath() {
  const root =
    (typeof process !== "undefined" ? process.env.ROK_DATA_DIR?.trim() : "") ||
    path.join(process.cwd(), "data");
  return path.join(root, "ptcg-catalog.json");
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

export async function loadCatalog(): Promise<CatalogFile | null> {
  if (g.__ptcgCatalogMem__) return g.__ptcgCatalogMem__;
  try {
    const raw = await readFile(catalogPath(), "utf8");
    const parsed = JSON.parse(raw) as CatalogFile;
    if (!parsed || !Array.isArray(parsed.cards)) return null;
    g.__ptcgCatalogMem__ = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export async function searchCatalog(query: string, live: boolean): Promise<PtcgCatalogCard[] | null> {
  const catalog = await loadCatalog();
  if (!catalog?.cards.length) return null;
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];
  const hits: PtcgCatalogCard[] = [];
  for (const card of catalog.cards) {
    if (!card.name.toLowerCase().includes(needle)) continue;
    if (live && !isStandardLegal(card)) continue;
    hits.push(card);
  }
  hits.sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(needle) ? 1 : 0;
    const bStarts = b.name.toLowerCase().startsWith(needle) ? 1 : 0;
    if (aStarts !== bStarts) return bStarts - aStarts;
    const date = String(b.set?.releaseDate ?? "").localeCompare(String(a.set?.releaseDate ?? ""));
    if (date) return date;
    return a.name.localeCompare(b.name);
  });
  return hits.slice(0, 30);
}

export async function catalogCard(id: string): Promise<PtcgCatalogCard | null> {
  const catalog = await loadCatalog();
  if (!catalog) return null;
  return catalog.cards.find((card) => card.id === id) ?? null;
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
  const setPhase = (phase: string, count = g.__ptcgCatalogJob__?.count ?? 0) => {
    g.__ptcgCatalogJob__ = {
      status: "running",
      phase,
      count,
      updatedAt: g.__ptcgCatalogMem__?.updatedAt ?? null,
      file: catalogPath(),
    };
  };

  setPhase("Downloading card database…");
  const scratch = await mkdtemp(path.join(tmpdir(), "ptcg-catalog-"));
  const zipPath = path.join(scratch, "cards.zip");
  try {
    await curlToFile(ZIP_URL, zipPath, 120000);
    setPhase("Unpacking sets…");
    await unzipTo(zipPath, scratch);
    setPhase("Building catalog…");
    const catalog = await buildFromExtract(scratch, setPhase);
    const out = catalogPath();
    await mkdir(path.dirname(out), { recursive: true });
    const tmp = `${out}.tmp`;
    await writeFile(tmp, JSON.stringify(catalog));
    await rename(tmp, out);
    g.__ptcgCatalogMem__ = catalog;
    g.__ptcgCatalogJob__ = {
      status: "ok",
      phase: "Ready",
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
  setPhase: (phase: string, count?: number) => void,
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
    setPhase(`Reading ${file.replace(".json", "")} (${i + 1}/${files.length})`, cards.length);
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

function curlToFile(url: string, dest: string, timeoutMs: number) {
  return new Promise<void>((resolve, reject) => {
    execFile(
      "curl",
      ["-sS", "-L", "-f", "--http1.1", "-m", String(Math.ceil(timeoutMs / 1000)), "-A", UA, "-o", dest, url],
      { timeout: timeoutMs + 1000 },
      (error) => {
        if (error) reject(new Error("Could not download the card database"));
        else resolve();
      },
    );
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
