import { useEffect, useSyncExternalStore } from "react";
import type { FgcAssetPack, FgcCharacter, FgcLibrary } from "@/lib/fgc-types";
import { startggAuthBody } from "@/lib/startgg-link";

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

export const ASSET_HOST = "https://assets.rokdesk.app";

export function assetRoot(base: string): string {
  return base.trim().replace(/\/$/, "") || ASSET_HOST;
}

export function catalogUrl(base: string): string {
  return `${assetRoot(base)}/catalog.json`;
}

export async function loadCatalog(base: string): Promise<CatalogGame[]> {
  const res = await fetch(catalogUrl(base));
  if (!res.ok) throw new Error(`Could not load the asset catalog from ${catalogUrl(base)}`);
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

export function previewUrl(base: string, game: string, code: string, skin: number): string {
  return `${assetRoot(base)}/games/${game}/website/${code}_${skin}.png`;
}

export function stageIconUrl(base: string, game: string, code: string): string {
  return `${assetRoot(base)}/games/${game}/stage_icon/stage_2_${code}.png`;
}

const titleImages = new Map<string, string>();
const localSkins = new Map<string, string>();
const localStages = new Map<string, string>();
const localPacks = new Map<string, string>();
let titleVersion = 0;
const titleListeners = new Set<() => void>();

function bumpTitleImages() {
  titleVersion += 1;
  titleListeners.forEach((listener) => listener());
}

export function subscribeTitleImages(listener: () => void) {
  titleListeners.add(listener);
  return () => titleListeners.delete(listener);
}

export function titleImageVersion() {
  return titleVersion;
}

export function titleImageObjectUrl(key: string) {
  return titleImages.get(key) ?? "";
}

export async function saveTitleImage(key: string, blob: Blob) {
  const db = await assetDb();
  await putFile(db, key, blob);
  const previous = titleImages.get(key);
  if (previous) URL.revokeObjectURL(previous);
  titleImages.set(key, URL.createObjectURL(blob));
  bumpTitleImages();
}

export type InstalledFont = { id: string; family: string; label: string; weight: number };

let installedFonts: InstalledFont[] = [];

export function fontChoices() {
  return installedFonts;
}

function tableRange(buffer: ArrayBuffer, tag: string) {
  if (buffer.byteLength < 12) return null;
  const view = new DataView(buffer);
  const count = view.getUint16(4);
  for (let index = 0; index < count; index += 1) {
    const record = 12 + index * 16;
    if (record + 16 > buffer.byteLength) return null;
    const name = String.fromCharCode(view.getUint8(record), view.getUint8(record + 1), view.getUint8(record + 2), view.getUint8(record + 3));
    if (name !== tag) continue;
    return { offset: view.getUint32(record + 8), length: view.getUint32(record + 12) };
  }
  return null;
}

function readName(view: DataView, start: number, length: number, platform: number) {
  let text = "";
  if (platform === 0 || platform === 3) {
    for (let index = 0; index + 1 < length; index += 2) text += String.fromCharCode(view.getUint16(start + index));
  } else {
    for (let index = 0; index < length; index += 1) text += String.fromCharCode(view.getUint8(start + index));
  }
  return text.replace(/\0/g, "").trim();
}

function fontInfo(buffer: ArrayBuffer, fallback: string) {
  const names = new Map<number, string>();
  try {
    const table = tableRange(buffer, "name");
    const view = new DataView(buffer);
    if (table && table.offset + 6 < buffer.byteLength) {
      const count = view.getUint16(table.offset + 2);
      const stringOffset = view.getUint16(table.offset + 4);
      for (let index = 0; index < count; index += 1) {
        const record = table.offset + 6 + index * 12;
        if (record + 12 > buffer.byteLength) break;
        const nameId = view.getUint16(record + 6);
        if (names.has(nameId) || ![1, 4, 6, 16].includes(nameId)) continue;
        const length = view.getUint16(record + 8);
        const offset = view.getUint16(record + 10);
        const start = table.offset + stringOffset + offset;
        if (start + length > buffer.byteLength) continue;
        const text = readName(view, start, length, view.getUint16(record));
        if (text) names.set(nameId, text);
      }
    }
  } catch {
    // A font the browser can still load keeps the file name.
  }
  const family = names.get(16) || names.get(1) || fallback;
  const label = names.get(4) || family;
  const postscript = names.get(6) || "";
  let weight = 400;
  const hint = `${label} ${postscript}`;
  if (/black|heavy/i.test(hint)) weight = 900;
  else if (/semibold|semi-bold|demibold/i.test(hint)) weight = 600;
  else if (/bold/i.test(hint)) weight = 700;
  else if (/medium/i.test(hint)) weight = 500;
  else if (/light/i.test(hint)) weight = 300;
  else if (/thin/i.test(hint)) weight = 200;
  try {
    const os2 = tableRange(buffer, "OS/2");
    if (os2 && os2.offset + 6 < buffer.byteLength) {
      const value = new DataView(buffer).getUint16(os2.offset + 4);
      if (value >= 1 && value <= 1000) weight = value;
    }
  } catch {
    // The name is enough when the weight table is missing.
  }
  return { family, label, postscript, weight };
}

async function activateFont(id: string, blob: Blob) {
  if (typeof document === "undefined" || typeof FontFace === "undefined") return null;
  const buffer = await blob.arrayBuffer();
  const fallback = id.replace(/^font:/, "").replace(/-/g, " ");
  const info = fontInfo(buffer, fallback);
  const families = [...new Set([info.family, info.postscript].filter(Boolean))];
  for (const family of families) {
    const face = new FontFace(family, buffer, { weight: String(info.weight) });
    await face.load();
    document.fonts.add(face);
  }
  return { id, family: info.family, label: info.label, weight: info.weight };
}

export async function saveFontFile(file: File) {
  const buffer = await file.arrayBuffer();
  const fallback = file.name.replace(/\.[^.]+$/, "").trim() || "Font";
  const info = fontInfo(buffer, fallback);
  const id = `font:${info.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "font"}`;
  const db = await assetDb();
  await putFile(db, id, new Blob([buffer]));
  const face = await activateFont(id, new Blob([buffer]));
  if (face) {
    installedFonts = [...installedFonts.filter((item) => item.id !== face.id), face].sort((a, b) => a.label.localeCompare(b.label));
    bumpTitleImages();
  }
  return face;
}

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

export function packKey(game: string, pack: string, code: string, skin: number | null): string {
  return `pack:${game}:${pack}:${code}:${skin ?? ""}`;
}

export function localPack(game: string, pack: string, code: string, skin: number | null): string | null {
  if (pack === "website" && skin != null) return localSkin(game, code, skin);
  if (pack === "stage_icon" && skin == null) return localStage(game, code);
  return localPacks.get(packKey(game, pack, code, skin)) ?? null;
}

export function packFileUrl(base: string, game: string, pack: FgcAssetPack, code: string, skin: number | null): string {
  const skinPart = skin == null ? "" : pack.pad > 0 ? String(skin).padStart(pack.pad, "0") : String(skin);
  return `${assetRoot(base)}/games/${game}/${pack.id}/${pack.prefix}${code}${pack.postfix}${skinPart}.${pack.ext}`;
}

export function resolvePack(base: string, game: string, pack: FgcAssetPack, code: string, skin: number | null): string {
  return localPack(game, pack.id, code, skin) ?? packFileUrl(base, game, pack, code, skin);
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
  const loaded: InstalledFont[] = [];
  for (const row of rows) {
    if (row.key.startsWith("skin:")) localSkins.set(row.key, URL.createObjectURL(row.blob));
    if (row.key.startsWith("stage:")) localStages.set(row.key, URL.createObjectURL(row.blob));
    if (row.key.startsWith("pack:")) localPacks.set(row.key, URL.createObjectURL(row.blob));
    if (row.key.startsWith("title:") && !titleImages.has(row.key)) titleImages.set(row.key, URL.createObjectURL(row.blob));
    if (row.key.startsWith("font:")) {
      try {
        const face = await activateFont(row.key, row.blob);
        if (face) loaded.push(face);
      } catch {
        // Skip a file the browser cannot use as a font.
      }
    }
  }
  if (loaded.length) {
    const ids = new Set(loaded.map((face) => face.id));
    installedFonts = [...installedFonts.filter((item) => !ids.has(item.id)), ...loaded].sort((a, b) => a.label.localeCompare(b.label));
  }
  bumpTitleImages();
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

const thumbCache = new Map<string, string>();

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

export async function stockIconsFor(game: string, gameId?: string): Promise<Record<string, string>> {
  const res = await fetch("/api/startgg", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "icons", game, gameId, ...startggAuthBody() }),
  });
  if (!res.ok) return {};
  const body = (await res.json()) as { icons?: Record<string, string> };
  return body.icons ?? {};
}

export function withIcons(characters: FgcCharacter[], icons: Record<string, string>): FgcCharacter[] {
  const key = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const keyed = Object.fromEntries(Object.entries(icons).map(([name, url]) => [key(name), url]));
  return characters.map((character) => ({
    ...character,
    icon: keyed[key(character.name)] || character.icon,
  }));
}

export type AssetProgress = { done: number; total: number; saved: number };

const RENDER_PACKS = ["website", "full", "portrait", "vs_renders", "mural_art", "webm", "stage_icon", "variant_icon"];

type PackConfig = {
  prefix?: string;
  postfix?: string;
  uncropped_edge?: string[];
  eyesights?: Record<string, Record<string, unknown>>;
};

async function fileExists(url: string): Promise<boolean> {
  try {
    const head = await fetch(url, { method: "HEAD" });
    if (head.ok) return true;
    if (head.status !== 405 && head.status !== 501) return false;
    const get = await fetch(url);
    return get.ok;
  } catch {
    return false;
  }
}

async function loadPack(root: string, game: string, id: string, sample: string, skinned: boolean): Promise<FgcAssetPack | null> {
  const res = await fetch(`${root}/games/${game}/${id}/config.json`);
  if (!res.ok) return null;
  const config = (await res.json()) as PackConfig;
  const prefix = config.prefix ?? "";
  const postfix = config.postfix ?? "";
  const exts = id === "webm" ? ["webm"] : ["png", "webp"];
  const pads = skinned ? [0, 2] : [0];
  for (const ext of exts) {
    for (const pad of pads) {
      const trial: FgcAssetPack = { id, prefix, postfix, pad, ext, uncropped: config.uncropped_edge };
      const url = packFileUrl(root, game, trial, sample, skinned ? 0 : null);
      if (await fileExists(url)) return trial;
    }
  }
  return { id, prefix, postfix, pad: skinned ? 0 : 0, ext: exts[0], uncropped: config.uncropped_edge };
}

function skinCount(character: FgcCharacter, config: PackConfig | null): number {
  const eyes = config?.eyesights?.[character.code];
  const fromEyes = eyes ? Math.max(0, ...Object.keys(eyes).map(Number).filter((n) => !Number.isNaN(n))) + 1 : 0;
  return Math.max(1, Math.min(16, Math.max(character.skins || 1, fromEyes)));
}

async function downloadPictures(
  base: string,
  game: string,
  characters: FgcCharacter[],
  stages: { code: string }[],
  onProgress?: (progress: AssetProgress) => void,
): Promise<FgcAssetPack[]> {
  const sample = characters[0]?.code || stages[0]?.code || "";
  const found = (await Promise.all(RENDER_PACKS.map((id) => loadPack(base, game, id, sample, id !== "stage_icon" && id !== "variant_icon")))).filter((pack): pack is FgcAssetPack => !!pack);
  const packs = found.length ? found : [
    { id: "website", prefix: "", postfix: "_", pad: 0, ext: "png" },
    { id: "stage_icon", prefix: "stage_2_", postfix: "", pad: 0, ext: "png" },
  ];
  const jobs: { url: string; key: string; kind: "skin" | "stage" | "pack" }[] = [];
  for (const pack of packs) {
    if (pack.id === "stage_icon" || pack.id === "variant_icon") {
      for (const stage of stages) {
        if (localStage(game, stage.code) && pack.id === "stage_icon") continue;
        jobs.push({
          url: packFileUrl(base, game, pack, stage.code, null),
          key: pack.id === "stage_icon" ? stageKey(game, stage.code) : packKey(game, pack.id, stage.code, null),
          kind: pack.id === "stage_icon" ? "stage" : "pack",
        });
      }
      continue;
    }
    for (const character of characters) {
      const count = skinCount(character, null);
      for (let skin = 0; skin < count; skin += 1) {
        if (pack.id === "website" && localSkin(game, character.code, skin)) continue;
        if (pack.id !== "website" && localPack(game, pack.id, character.code, skin)) continue;
        jobs.push({
          url: packFileUrl(base, game, pack, character.code, skin),
          key: pack.id === "website" ? skinKey(game, character.code, skin) : packKey(game, pack.id, character.code, skin),
          kind: pack.id === "website" ? "skin" : "pack",
        });
      }
    }
  }
  const db = await assetDb();
  let done = 0;
  let saved = 0;
  const total = jobs.length;
  onProgress?.({ done, total, saved });
  const queue = [...jobs];
  const worker = async () => {
    for (;;) {
      const job = queue.shift();
      if (!job) return;
      try {
        const res = await fetch(job.url);
        if (res.ok) {
          const blob = await res.blob();
          if (blob.size > 32) {
            await putFile(db, job.key, blob);
            const objectUrl = URL.createObjectURL(blob);
            if (job.kind === "skin") localSkins.set(job.key, objectUrl);
            else if (job.kind === "stage") localStages.set(job.key, objectUrl);
            else localPacks.set(job.key, objectUrl);
            saved += 1;
          }
        }
      } catch {
        // A missing file is skipped. The rest of the pack still saves.
      }
      done += 1;
      if (done === total || done % 8 === 0) onProgress?.({ done, total, saved });
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, Math.max(1, jobs.length)) }, () => worker()));
  onProgress?.({ done, total, saved });
  return packs;
}

export async function installLibrary(
  base: string,
  game: CatalogGame,
  pack: AssetPack,
  onProgress?: (progress: AssetProgress) => void,
): Promise<FgcLibrary> {
  const root = assetRoot(base);
  const configUrl = `${root}/games/${game.code}/library.json`;
  const res = await fetch(configUrl);
  if (!res.ok) throw new Error(`No library for ${game.name} at ${configUrl}`);
  const body = (await res.json()) as {
    smashgg_game_id?: string | number;
    characters?: FgcCharacter[];
    stages?: { name: string; code: string }[];
    character_to_codename?: Record<string, { codename?: string; skins?: number }>;
    stage_to_codename?: Record<string, { codename?: string } | string>;
  };
  const characters = body.characters?.length
    ? body.characters
    : Object.entries(body.character_to_codename ?? {}).map(([name, value]) => ({
        name,
        code: value.codename || name,
        skins: value.skins || 8,
      }));
  const stages = body.stages?.length
    ? body.stages
    : Object.entries(body.stage_to_codename ?? {}).map(([name, value]) => ({
        name,
        code: typeof value === "string" ? value : value.codename || name,
      }));
  const packs = await downloadPictures(root, game.code, characters, stages, onProgress);
  const icons = await stockIconsFor(game.name, body.smashgg_game_id ? String(body.smashgg_game_id) : undefined);
  return {
    game: game.name,
    code: game.code,
    pack: pack.name,
    version: pack.version || "",
    startggGameId: body.smashgg_game_id ? String(body.smashgg_game_id) : undefined,
    characters: withIcons(characters, icons),
    stages,
    packs,
  };
}

export function useTitleImages() {
  useSyncExternalStore(subscribeTitleImages, titleImageVersion, () => 0);
  useEffect(() => {
    void hydrateLocalAssets();
  }, []);
}
