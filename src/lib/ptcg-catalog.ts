import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
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
    rememberCatalog(catalog);
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

void loadCatalog();
