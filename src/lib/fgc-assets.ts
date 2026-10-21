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

export async function installLibrary(base: string, game: CatalogGame, pack: AssetPack): Promise<FgcLibrary> {
  const root = base.trim().replace(/\/$/, "");
  const configUrl = root
    ? `${root}/games/${game.code}/library.json`
    : `https://raw.githubusercontent.com/joaorb64/StreamHelperAssets/main/games/${game.code}/base_files/config.json`;
  const res = await fetch(configUrl);
  if (!res.ok) throw new Error("That pack has no character library yet");
  const body = (await res.json()) as {
    characters?: FgcCharacter[];
    stages?: string[];
    character_to_codename?: Record<string, { codename?: string }>;
    stage_to_codename?: Record<string, unknown>;
  };
  const characters = body.characters?.length
    ? body.characters
    : Object.entries(body.character_to_codename ?? {}).map(([name, value]) => ({
        name,
        code: value.codename || name,
        skins: 8,
      }));
  const stages = body.stages ?? Object.keys(body.stage_to_codename ?? {});
  return {
    game: game.name,
    code: game.code,
    pack: pack.name,
    version: pack.version || "",
    characters,
    stages,
  };
}
