import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import readline from "node:readline";
import { createGunzip } from "node:zlib";
import type { LookupCard } from "@/lib/card-lookup";

export const TCG_CATALOG_GAMES = ["mtg", "swu", "ygo", "op", "rift", "lorcana"] as const;
export type TcgCatalogGame = (typeof TCG_CATALOG_GAMES)[number];

export type TcgCatalogStatus = {
  status: "idle" | "running" | "ok" | "error";
  game: TcgCatalogGame;
  phase?: string;
  progress?: number | null;
  count: number;
  updatedAt: number | null;
  error?: string;
};

type StoredCard = LookupCard & { legal?: string; printed?: boolean };

type CatalogFile = {
  updatedAt: number;
  count: number;
  cards: StoredCard[];
};

const UA = "ROK-Desk/1.0 (judge tablet)";

const g = globalThis as typeof globalThis & {
  __tcgCatJobs__?: Map<string, TcgCatalogStatus>;
  __tcgCatMem__?: Map<string, CatalogFile>;
  __tcgCatSync__?: Map<string, Promise<void>>;
  __tcgCatLoad__?: Map<string, Promise<CatalogFile | null>>;
};

function jobs() {
  return (g.__tcgCatJobs__ ??= new Map());
}
function memory() {
  return (g.__tcgCatMem__ ??= new Map());
}
function syncs() {
  return (g.__tcgCatSync__ ??= new Map());
}
function loads() {
  return (g.__tcgCatLoad__ ??= new Map());
}

export function isTcgCatalogGame(value: string | null | undefined): value is TcgCatalogGame {
  return TCG_CATALOG_GAMES.includes(value as TcgCatalogGame);
}

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

function catalogPath(game: TcgCatalogGame) {
  return path.join(catalogRoots()[0] ?? path.join(process.cwd(), "data"), `${game}-catalog.json`);
}

function catalogFiles(game: TcgCatalogGame) {
  return catalogRoots().map((root) => path.join(root, `${game}-catalog.json`));
}

export function catalogStatus(game: TcgCatalogGame): TcgCatalogStatus {
  const job = jobs().get(game);
  if (job?.status === "running") return job;
  const mem = memory().get(game);
  if (mem) return { status: "ok", game, count: mem.count, updatedAt: mem.updatedAt, progress: 100 };
  return { status: "idle", game, count: 0, updatedAt: null };
}

export async function loadCatalog(game: TcgCatalogGame): Promise<CatalogFile | null> {
  const mem = memory().get(game);
  if (mem) return mem;
  const pending = loads().get(game);
  if (pending) return pending;
  const job = (async () => {
    for (const file of catalogFiles(game)) {
      try {
        const parsed = JSON.parse(await readFile(file, "utf8")) as CatalogFile;
        if (!parsed?.cards?.length) continue;
        memory().set(game, parsed);
        return parsed;
      } catch {
        /* next folder */
      }
    }
    return null;
  })();
  loads().set(game, job);
  try {
    return await job;
  } finally {
    if (!memory().get(game)) loads().delete(game);
  }
}

export function startCatalogSync(game: TcgCatalogGame): TcgCatalogStatus {
  if (syncs().get(game)) return catalogStatus(game);
  const setPhase = (phase: string, progress: number | null, count = memory().get(game)?.count ?? 0) => {
    jobs().set(game, {
      status: "running",
      game,
      phase,
      progress,
      count,
      updatedAt: memory().get(game)?.updatedAt ?? null,
    });
  };
  setPhase("Starting download…", 0);
  const run = runSync(game, setPhase)
    .catch((error) => {
      jobs().set(game, {
        status: "error",
        game,
        count: memory().get(game)?.count ?? 0,
        updatedAt: memory().get(game)?.updatedAt ?? null,
        error: error instanceof Error ? error.message : "Download failed",
      });
    })
    .finally(() => {
      syncs().delete(game);
    });
  syncs().set(game, run);
  return catalogStatus(game);
}

async function runSync(
  game: TcgCatalogGame,
  setPhase: (phase: string, progress: number | null, count?: number) => void,
) {
  const cards =
    game === "mtg"
      ? await downloadMtg(setPhase)
      : game === "swu"
        ? await downloadSwu(setPhase)
        : game === "ygo"
          ? await downloadYgo(setPhase)
          : game === "op"
            ? await downloadOp(setPhase)
            : game === "rift"
              ? await downloadRift(setPhase)
              : await downloadLorcana(setPhase);
  if (!cards.length) throw new Error("Catalog came back empty");
  setPhase("Saving catalog…", 98, cards.length);
  const file = catalogPath(game);
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  const catalog: CatalogFile = { updatedAt: Date.now(), count: cards.length, cards };
  await writeFile(tmp, JSON.stringify(catalog));
  await rename(tmp, file);
  memory().set(game, catalog);
  jobs().set(game, { status: "ok", game, phase: "Ready", progress: 100, count: cards.length, updatedAt: catalog.updatedAt });
}

export async function searchLocalCatalog(
  game: TcgCatalogGame,
  query: string,
  legal: string | null,
): Promise<LookupCard[] | null> {
  const catalog = await loadCatalog(game);
  if (!catalog) return null;
  const needle = fold(query);
  if (needle.length < 2) return [];
  const exact: StoredCard[] = [];
  const starts: StoredCard[] = [];
  const rest: StoredCard[] = [];
  for (const card of catalog.cards) {
    if (legal && !cardMatchesLegal(card, game, legal)) continue;
    const name = fold(card.name);
    const blob = fold(`${card.name} ${card.set ?? ""} ${card.number ?? ""}`);
    if (!blob.includes(needle) && !name.includes(needle)) continue;
    if (name === needle) exact.push(card);
    else if (name.startsWith(needle)) starts.push(card);
    else rest.push(card);
  }
  return [...exact, ...starts, ...rest].slice(0, 40).map(publicCard);
}

export async function localCatalogCard(game: TcgCatalogGame, id: string): Promise<LookupCard | null | undefined> {
  const catalog = await loadCatalog(game);
  if (!catalog) return undefined;
  const key = id.trim().toLowerCase();
  const hit = catalog.cards.find((card) => card.id.toLowerCase() === key);
  return hit ? publicCard(hit) : null;
}

function publicCard(card: StoredCard): LookupCard {
  const { legal: _legal, printed: _printed, ...rest } = card;
  return rest;
}

function cardMatchesLegal(card: StoredCard, game: TcgCatalogGame, legal: string): boolean {
  if (game === "ygo") {
    if (legal === "tcg") return card.printed !== false;
    return true;
  }
  if (game !== "mtg") return true;
  return (card.legal ?? "").split(" ").includes(legal);
}

function fold(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { accept: "application/json", "user-agent": UA } });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

async function mapPool<T>(items: T[], limit: number, fn: (item: T, index: number) => Promise<void>) {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      await fn(items[index]!, index);
    }
  });
  await Promise.all(workers);
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
      finish(new Error("Download timed out"));
    }, timeoutMs + 1000);
    child.on("error", () => finish(new Error("Download failed")));
    child.on("close", (code) => {
      clearTimeout(killer);
      if (code === 0) finish();
      else finish(new Error("Download failed"));
    });
  });
}

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

async function downloadMtg(setPhase: (phase: string, progress: number | null, count?: number) => void): Promise<StoredCard[]> {
  setPhase("Finding Scryfall bulk file…", 1);
  const index = (await fetchJson("https://api.scryfall.com/bulk-data")) as {
    data?: { type?: string; jsonl_download_uri?: string; compressed_size?: number }[];
  };
  const bulk = index.data?.find((row) => row.type === "oracle_cards");
  const url = bulk?.jsonl_download_uri;
  if (!url) throw new Error("Scryfall bulk file is missing");
  const total = bulk.compressed_size ?? 0;
  const scratch = await mkdtempSafe();
  const gz = path.join(scratch, "oracle.jsonl.gz");
  try {
    setPhase("Downloading Oracle cards…", 2);
    await curlToFile(url, gz, 180000, (received) => {
      const progress = total > 0 ? Math.min(68, Math.round((received / total) * 68)) : null;
      setPhase(`Downloading Oracle cards ${formatBytes(received)}${total ? ` / ${formatBytes(total)}` : ""}`, progress);
    });
    setPhase("Reading Oracle cards…", 70);
    const cards: StoredCard[] = [];
    const input = createReadStream(gz).pipe(createGunzip());
    const lines = readline.createInterface({ input, crlfDelay: Infinity });
    for await (const line of lines) {
      if (!line.trim()) continue;
      const row = JSON.parse(line) as Record<string, unknown>;
      const card = slimMtg(row);
      if (card) cards.push(card);
      if (cards.length % 1500 === 0) setPhase(`Reading Oracle cards (${cards.length.toLocaleString()})`, 70 + Math.min(24, Math.round(cards.length / 1800)), cards.length);
    }
    return cards;
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

function slimMtg(row: Record<string, unknown>): StoredCard | null {
  const name = String(row.name ?? "").trim();
  if (!name) return null;
  if (row.lang && row.lang !== "en") return null;
  const faces = Array.isArray(row.card_faces) ? row.card_faces.filter(isRecord) : [];
  const face = faces[0];
  const images = isRecord(row.image_uris) ? row.image_uris : face && isRecord(face.image_uris) ? face.image_uris : null;
  const legalities = isRecord(row.legalities) ? row.legalities : {};
  const legal = Object.entries(legalities)
    .filter(([, value]) => value === "legal" || value === "restricted")
    .map(([key]) => key)
    .join(" ");
  const text = faces.length
    ? faces.map((f) => [f.name, f.oracle_text].filter(Boolean).join(" — ")).join("\n\n")
    : row.oracle_text
      ? String(row.oracle_text)
      : undefined;
  return {
    id: String(row.id ?? name),
    name,
    set: row.set_name ? String(row.set_name) : undefined,
    number: row.collector_number != null ? String(row.collector_number) : undefined,
    image: images?.normal ? String(images.normal) : images?.large ? String(images.large) : images?.small ? String(images.small) : undefined,
    type: row.type_line ? String(row.type_line) : face?.type_line ? String(face.type_line) : undefined,
    text,
    mana: row.mana_cost ? String(row.mana_cost) : face?.mana_cost ? String(face.mana_cost) : undefined,
    rarity: row.rarity ? String(row.rarity) : undefined,
    colors: Array.isArray(row.color_identity)
      ? row.color_identity.map(String).filter((c) => /^[WUBRG]$/i.test(c)).map((c) => c.toUpperCase())
      : undefined,
    legal,
  };
}

async function downloadSwu(setPhase: (phase: string, progress: number | null, count?: number) => void): Promise<StoredCard[]> {
  setPhase("Downloading SWU-DB…", 8);
  const data = (await fetchJson("https://api.swu-db.com/cards/search?q=*")) as { data?: Record<string, unknown>[] };
  const rows = data.data ?? [];
  setPhase(`Reading ${rows.length.toLocaleString()} cards…`, 80, rows.length);
  return rows.flatMap((row) => {
    const card = slimSwu(row);
    return card ? [card] : [];
  });
}

function slimSwu(item: Record<string, unknown>): StoredCard | null {
  const name = String(item.Name ?? "").trim();
  if (!name) return null;
  const set = item.Set != null ? String(item.Set) : undefined;
  const number = item.Number != null ? String(item.Number) : undefined;
  const aspects = Array.isArray(item.Aspects) ? item.Aspects.map(String).join(" / ") : item.Aspects ? String(item.Aspects) : "";
  return {
    id: set && number ? `${set}-${number}` : String(item.cid ?? name),
    name,
    set,
    number,
    image: item.FrontArt ? String(item.FrontArt) : undefined,
    type: [item.Type, aspects].filter(Boolean).map(String).join(" · ") || undefined,
    text: [item.FrontText, item.BackText].filter(Boolean).map(String).join("\n\n") || undefined,
    hp: item.HP != null && String(item.HP) ? String(item.HP) : undefined,
    mana: item.Cost != null && String(item.Cost) ? String(item.Cost) : undefined,
    rarity: item.Rarity ? String(item.Rarity) : undefined,
    category: item.Type ? String(item.Type) : undefined,
  };
}

async function downloadYgo(setPhase: (phase: string, progress: number | null, count?: number) => void): Promise<StoredCard[]> {
  const page = 250;
  let offset = 0;
  let total = 0;
  const cards: StoredCard[] = [];
  while (true) {
    setPhase(total ? `Downloading Yu-Gi-Oh! ${cards.length.toLocaleString()} / ${total.toLocaleString()}` : "Downloading Yu-Gi-Oh!…", total ? Math.round((cards.length / total) * 92) : 2, cards.length);
    const data = (await fetchJson(`https://db.ygoprodeck.com/api/v7/cardinfo.php?num=${page}&offset=${offset}`)) as {
      data?: Record<string, unknown>[];
      meta?: { total_rows?: number };
    };
    const rows = data.data ?? [];
    if (!rows.length) break;
    total = data.meta?.total_rows ?? total;
    for (const row of rows) {
      const card = slimYgo(row);
      if (card) cards.push(card);
    }
    offset += rows.length;
    if (rows.length < page) break;
  }
  return cards;
}

function slimYgo(item: Record<string, unknown>): StoredCard | null {
  const name = String(item.name ?? "").trim();
  if (!name) return null;
  const images = Array.isArray(item.card_images) ? item.card_images.filter(isRecord) : [];
  const art = images[0];
  const atk = item.atk != null ? String(item.atk) : "";
  const def = item.def != null ? String(item.def) : "";
  const level = item.level != null ? `Lv ${item.level}` : item.linkval != null ? `Link ${item.linkval}` : "";
  const stats = [item.attribute, item.race, level, atk || def ? `${atk}/${def}` : ""].filter(Boolean).join(" · ");
  const sets = Array.isArray(item.card_sets) ? item.card_sets : [];
  return {
    id: String(item.id ?? name),
    name,
    set: item.archetype ? String(item.archetype) : undefined,
    image: art?.image_url ? String(art.image_url) : art?.image_url_small ? String(art.image_url_small) : undefined,
    type: item.type ? String(item.type) : undefined,
    text: item.desc ? String(item.desc) : undefined,
    rarity: stats || undefined,
    category: item.type ? String(item.type) : undefined,
    printed: sets.length > 0,
  };
}

async function downloadOp(setPhase: (phase: string, progress: number | null, count?: number) => void): Promise<StoredCard[]> {
  setPhase("Downloading One Piece index…", 2);
  const index = (await fetchJson(
    "https://raw.githubusercontent.com/buhbbl/punk-records/main/english/index/cards_by_id.json",
  )) as Record<string, Record<string, unknown>>;
  const rows = Object.values(index);
  const cards: StoredCard[] = new Array(rows.length);
  let done = 0;
  setPhase(`Downloading One Piece text 0/${rows.length}`, 4, 0);
  await mapPool(rows, 8, async (row, indexNo) => {
    const id = String(row.card_id ?? row.id ?? "");
    const pack = row.pack_id ? String(row.pack_id) : "";
    let detail: Record<string, unknown> = row;
    if (id && pack) {
      try {
        const extra = (await fetchJson(
          `https://raw.githubusercontent.com/buhbbl/punk-records/main/english/cards/${encodeURIComponent(pack)}/${encodeURIComponent(id)}.json`,
        )) as Record<string, unknown>;
        detail = { ...row, ...extra };
      } catch {
        detail = row;
      }
    }
    const card = slimOp(detail);
    if (card) cards[indexNo] = card;
    done += 1;
    if (done % 25 === 0 || done === rows.length) {
      setPhase(`Downloading One Piece ${done}/${rows.length}`, Math.round((done / rows.length) * 94), done);
    }
  });
  return cards.filter(Boolean);
}

function slimOp(item: Record<string, unknown>): StoredCard | null {
  const id = String(item.id ?? item.card_id ?? "");
  const name = String(item.name ?? "").trim();
  if (!name) return null;
  const colors = Array.isArray(item.colors) ? item.colors.map(String).join(" / ") : "";
  const types = Array.isArray(item.types) ? item.types.map(String).join(" / ") : "";
  const image = item.img_full_url
    ? String(item.img_full_url).split("?")[0]
    : item.img_url && String(item.img_url).startsWith("http")
      ? String(item.img_url).split("?")[0]
      : undefined;
  const text = [item.effect ? String(item.effect) : "", item.trigger ? `Trigger: ${item.trigger}` : ""].filter(Boolean).join("\n\n") || undefined;
  const power = item.power != null ? String(item.power) : "";
  const counter = item.counter != null ? String(item.counter) : "";
  return {
    id,
    name,
    set: id.split("-")[0] || (item.pack_id ? String(item.pack_id) : undefined),
    number: id,
    image,
    type: [item.category, colors, types].filter(Boolean).map(String).join(" · ") || undefined,
    text,
    mana: item.cost != null ? String(item.cost) : undefined,
    hp: power || undefined,
    rarity: [item.rarity, power ? `${power} power` : "", counter ? `${counter} counter` : ""].filter(Boolean).map(String).join(" · ") || undefined,
    category: item.category ? String(item.category) : undefined,
  };
}

async function downloadRift(setPhase: (phase: string, progress: number | null, count?: number) => void): Promise<StoredCard[]> {
  const size = 40;
  let page = 1;
  let pages = 1;
  const cards: StoredCard[] = [];
  while (page <= pages) {
    setPhase(pages > 1 ? `Downloading Riftbound page ${page}/${pages}` : "Downloading Riftbound…", pages > 1 ? Math.round(((page - 1) / pages) * 92) : 4, cards.length);
    const data = (await fetchJson(`https://api.riftcodex.com/cards?page=${page}&size=${size}`)) as {
      items?: Record<string, unknown>[];
      pages?: number;
    };
    pages = data.pages ?? pages;
    const items = data.items ?? [];
    if (!items.length) break;
    for (const row of items) {
      const card = slimRift(row);
      if (card) cards.push(card);
    }
    page += 1;
  }
  return cards;
}

function slimRift(item: Record<string, unknown>): StoredCard | null {
  const name = String(item.name ?? "").trim();
  if (!name) return null;
  const classification = isRecord(item.classification) ? item.classification : {};
  const attributes = isRecord(item.attributes) ? item.attributes : {};
  const textBlock = isRecord(item.text) ? item.text : {};
  const set = isRecord(item.set) ? item.set : {};
  const media = isRecord(item.media) ? item.media : {};
  const domains = Array.isArray(classification.domain) ? classification.domain.map(String).join(" / ") : "";
  const energy = attributes.energy != null ? String(attributes.energy) : "";
  const might = attributes.might != null ? String(attributes.might) : "";
  const power = attributes.power != null ? String(attributes.power) : "";
  return {
    id: String(item.id ?? name),
    name,
    set: set.label ? String(set.label) : set.set_id ? String(set.set_id) : undefined,
    number: item.riftbound_id ? String(item.riftbound_id) : item.collector_number != null ? String(item.collector_number) : undefined,
    image: media.image_url ? String(media.image_url) : undefined,
    type: [classification.type, classification.supertype, domains].filter(Boolean).map(String).join(" · ") || undefined,
    text: textBlock.plain ? String(textBlock.plain) : textBlock.rich ? String(textBlock.rich).replace(/<[^>]+>/g, "") : undefined,
    mana: energy || undefined,
    hp: might || undefined,
    rarity: [classification.rarity, energy ? `Energy ${energy}` : "", might ? `Might ${might}` : "", power ? `Power ${power}` : ""]
      .filter(Boolean)
      .map(String)
      .join(" · ") || undefined,
    category: classification.type ? String(classification.type) : undefined,
  };
}

async function downloadLorcana(setPhase: (phase: string, progress: number | null, count?: number) => void): Promise<StoredCard[]> {
  setPhase("Listing Lorcana sets…", 2);
  const sets = (await fetchJson("https://api.lorcast.com/v0/sets")) as { results?: { code?: string; name?: string }[] };
  const rows = sets.results ?? [];
  const cards: StoredCard[] = [];
  for (let i = 0; i < rows.length; i++) {
    const code = rows[i]?.code;
    if (!code) continue;
    setPhase(`Downloading ${rows[i]?.name || code} (${i + 1}/${rows.length})`, Math.round((i / rows.length) * 92), cards.length);
    const data = await fetchJson(`https://api.lorcast.com/v0/sets/${encodeURIComponent(code)}/cards`);
    const list = Array.isArray(data) ? data : isRecord(data) && Array.isArray(data.results) ? data.results : [];
    for (const row of list) {
      if (!isRecord(row)) continue;
      const card = slimLorcana(row);
      if (card) cards.push(card);
    }
  }
  return cards;
}

function slimLorcana(item: Record<string, unknown>): StoredCard | null {
  const images = isRecord(item.image_uris) ? item.image_uris : {};
  const digital = isRecord(images.digital) ? images.digital : images;
  const set = isRecord(item.set) ? item.set : {};
  const types = Array.isArray(item.type) ? item.type.map(String).join(" / ") : item.type ? String(item.type) : "";
  const inks = Array.isArray(item.inks) ? item.inks.map(String).join(" / ") : item.ink ? String(item.ink) : "";
  const version = item.version ? String(item.version) : "";
  const name = String(item.name ?? "").trim();
  if (!name) return null;
  return {
    id: String(item.id ?? name),
    name: version ? `${name} — ${version}` : name,
    set: set.name ? String(set.name) : set.code ? String(set.code) : undefined,
    number: item.collector_number != null ? String(item.collector_number) : undefined,
    image: digital.normal ? String(digital.normal) : digital.large ? String(digital.large) : digital.small ? String(digital.small) : undefined,
    type: [types, inks].filter(Boolean).join(" · ") || undefined,
    text: item.text ? String(item.text) : undefined,
    mana: item.cost != null ? String(item.cost) : undefined,
    hp: item.willpower != null ? String(item.willpower) : undefined,
    rarity: item.rarity ? String(item.rarity) : undefined,
    category: types || undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function mkdtempSafe() {
  const { mkdtemp } = await import("node:fs/promises");
  return mkdtemp(path.join(tmpdir(), "tcg-catalog-"));
}
