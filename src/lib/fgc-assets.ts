import type { FgcCharacter, FgcLibrary } from "@/lib/fgc-types";

export type AssetPack = {
  name: string;
  description?: string;
  version?: string;
  credits?: string;
  size?: number;
};

export type CatalogGame = {
  code: string;
  name: string;
  packs: AssetPack[];
};

const TSH_CATALOG = "https://raw.githubusercontent.com/joaorb64/StreamHelperAssets/main/assets.json";

export function catalogUrl(base: string): string {
  const root = base.trim().replace(/\/$/, "");
  return root ? `${root}/catalog.json` : TSH_CATALOG;
}

export async function loadCatalog(base: string): Promise<CatalogGame[]> {
  const res = await fetch(catalogUrl(base));
  if (!res.ok) throw new Error("Could not load the asset catalog");
  const body = (await res.json()) as Record<string, { name?: string; assets?: Record<string, { name?: string; description?: string; version?: string; credits?: string; files?: Record<string, { size?: number }> }> }>;
  return Object.entries(body)
    .map(([code, game]) => ({
      code,
      name: game.name || code,
      packs: Object.entries(game.assets ?? {}).map(([id, pack]) => ({
        name: pack.name || id,
        description: pack.description,
        version: pack.version,
        credits: pack.credits,
        size: Object.values(pack.files ?? {}).reduce((sum, file) => sum + (file.size ?? 0), 0),
      })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const TSH_SITE = "https://cdn.jsdelivr.net/gh/joaorb64/StreamHelperAssets@main";

export function previewUrl(base: string, game: string, code: string, skin: number): string {
  const root = base.trim().replace(/\/$/, "");
  const host = root || TSH_SITE;
  return `${host}/games/${game}/website/${code}_${skin}.png`;
}

export function stageIconUrl(base: string, game: string, code: string): string {
  const root = base.trim().replace(/\/$/, "");
  const host = root || TSH_SITE;
  return `${host}/games/${game}/stage_icon/stage_2_${code}.png`;
}

const localSkins = new Map<string, string>();
const localStages = new Map<string, string>();

function assetDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("rok-fgc-assets", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("files")) db.createObjectStore("files");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function skinKey(game: string, code: string, skin: number): string {
  return `skin:${game}:${code}:${skin}`;
}

export function stageKey(game: string, code: string): string {
  return `stage:${game}:${code}`;
}

export function localSkin(game: string, code: string, skin: number): string | null {
  return localSkins.get(skinKey(game, code, skin)) ?? null;
}

export function localStage(game: string, code: string): string | null {
  return localStages.get(stageKey(game, code)) ?? null;
}

export function resolvePreview(base: string, game: string, code: string, skin: number): string {
  return localSkin(game, code, skin) ?? previewUrl(base, game, code, skin);
}

export function resolveStage(base: string, game: string, code: string): string {
  return localStage(game, code) ?? stageIconUrl(base, game, code);
}

export async function hydrateLocalAssets() {
  const db = await assetDb();
  const rows = await new Promise<{ key: string; blob: Blob }[]>((resolve, reject) => {
    const rows: { key: string; blob: Blob }[] = [];
    const request = db.transaction("files").objectStore("files").openCursor();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(rows);
        return;
      }
      rows.push({ key: String(cursor.key), blob: cursor.value as Blob });
      cursor.continue();
    };
  });
  for (const row of rows) {
    const url = URL.createObjectURL(row.blob);
    if (row.key.startsWith("skin:")) localSkins.set(row.key, url);
    if (row.key.startsWith("stage:")) localStages.set(row.key, url);
  }
}

export function parseAssetName(filename: string): { key: string; name: string; index: number } {
  const base = filename.replace(/\.[^.]+$/, "");
  const numbered = base.match(/^(.*?)[_-](\d+)$/);
  const name = (numbered ? numbered[1] : base).replace(/[_-]+/g, " ").trim();
  return {
    key: name.toLowerCase().replace(/[^a-z0-9]/g, ""),
    name,
    index: numbered ? Number(numbered[2]) : 0,
  };
}

export async function saveUploadedPack(
  library: FgcLibrary,
  files: File[],
  kind: "skin" | "stage",
): Promise<{ library: FgcLibrary; matched: string[]; unmatched: string[] }> {
  const db = await assetDb();
  const matched: string[] = [];
  const unmatched: string[] = [];
  const characters = [...library.characters];
  const stages = [...library.stages];
  for (const file of files) {
    const parsed = parseAssetName(file.name);
    if (!parsed.key) {
      unmatched.push(file.name);
      continue;
    }
    if (kind === "skin") {
      const found = characters.find((item) => item.name.toLowerCase().replace(/[^a-z0-9]/g, "") === parsed.key || item.code.toLowerCase().replace(/[^a-z0-9]/g, "") === parsed.key);
      const character = found ?? { name: parsed.name.replace(/\b\w/g, (letter) => letter.toUpperCase()), code: parsed.name.replace(/\s+/g, ""), skins: 1 };
      if (!found) characters.push(character);
      character.skins = Math.max(character.skins, parsed.index + 1);
      const key = skinKey(library.code, character.code, parsed.index);
      await putFile(db, key, file);
      localSkins.set(key, URL.createObjectURL(file));
      matched.push(`${file.name} → ${character.name} skin ${parsed.index}`);
    } else {
      const found = stages.find((item) => item.name.toLowerCase().replace(/[^a-z0-9]/g, "") === parsed.key || item.code.toLowerCase().replace(/[^a-z0-9]/g, "") === parsed.key);
      const stage = found ?? { name: parsed.name.replace(/\b\w/g, (letter) => letter.toUpperCase()), code: parsed.name.replace(/\s+/g, "") };
      if (!found) stages.push(stage);
      const key = stageKey(library.code, stage.code);
      await putFile(db, key, file);
      localStages.set(key, URL.createObjectURL(file));
      matched.push(`${file.name} → ${stage.name}`);
    }
  }
  return { library: { ...library, characters, stages, pack: library.pack || "Uploaded" }, matched, unmatched };
}

function putFile(db: IDBDatabase, key: string, file: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = db.transaction("files", "readwrite").objectStore("files").put(file, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export function cachedThumb(url: string): string | null {
  return thumbCache.get(url) ?? null;
}

export async function loadThumb(url: string): Promise<string> {
  const cached = thumbCache.get(url);
  if (cached) return cached;
  const image = await loadImage(url);
  const height = 96;
  const width = Math.max(1, Math.round((image.width / image.height) * height));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(image, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.8));
  const thumb = blob ? URL.createObjectURL(blob) : url;
  thumbCache.set(url, thumb);
  return thumb;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("preview failed"));
    image.src = url;
  });
}

export async function installLibrary(base: string, game: CatalogGame, pack: AssetPack): Promise<FgcLibrary> {
  const root = base.trim().replace(/\/$/, "");
  const configUrl = root
    ? `${root}/games/${game.code}/library.json`
    : `https://raw.githubusercontent.com/joaorb64/StreamHelperAssets/main/games/${game.code}/base_files/config.json`;
  const res = await fetch(configUrl);
  if (!res.ok) throw new Error("That pack has no character library yet");
  const body = (await res.json()) as {
    characters?: FgcCharacter[];
    stages?: { name: string; code: string }[];
    character_to_codename?: Record<string, { codename?: string }>;
    stage_to_codename?: Record<string, { codename?: string } | string>;
  };
  const characters = body.characters?.length
    ? body.characters
    : Object.entries(body.character_to_codename ?? {}).map(([name, value]) => ({
        name,
        code: value.codename || name,
        skins: 8,
      }));
  const stages = body.stages?.length
    ? body.stages
    : Object.entries(body.stage_to_codename ?? {}).map(([name, value]) => ({
        name,
        code: typeof value === "string" ? value : value.codename || name,
      }));
  return {
    game: game.name,
    code: game.code,
    pack: pack.name,
    version: pack.version || "",
    characters,
    stages,
  };
}
