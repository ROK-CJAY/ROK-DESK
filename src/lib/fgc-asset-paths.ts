/**
 * Tournament Stream Helper (StreamHelperAssets) file layout. Pure, no runtime imports.
 *
 * Every pack folder (website, full, portrait, stage_icon, ...) has its own config.json with a
 * filename prefix / postfix and image_sizes listing the exact codes and skin indexes it ships:
 *   games/<game>/<folder>/<prefix><codename><postfix><skin>.png   (characters)
 *   games/<game>/<folder>/<prefix><codename><postfix>.png         (stages)
 * Only SSBU and SF6 have a "website" folder, and SF6 names files file_<code>_<n>.png, so the old
 * hardcoded website/<code>_<skin>.png came up blank for nearly every game.
 */
export type PackShape = { folder: string; prefix: string; postfix: string };

export const TSH_RAW = "https://raw.githubusercontent.com/joaorb64/StreamHelperAssets/main";
/** Pre-pack-config layout (what 1.5.1 always used). Correct only for SSBU. */
export const LEGACY_SKIN_SHAPE: PackShape = { folder: "website", prefix: "", postfix: "_" };
export const LEGACY_STAGE_SHAPE: PackShape = { folder: "stage_icon", prefix: "stage_2_", postfix: "" };

export type PackConfig = {
  prefix?: string | null;
  postfix?: string | null;
  type?: string[] | null;
  image_sizes?: Record<string, Record<string, unknown>> | null;
  eyesights?: Record<string, Record<string, unknown>> | null;
};

export function packShapeFrom(folder: string, config: PackConfig | null | undefined, kind: "skin" | "stage" = "skin"): PackShape {
  const fallback = kind === "stage" ? LEGACY_STAGE_SHAPE : LEGACY_SKIN_SHAPE;
  return {
    folder,
    prefix: typeof config?.prefix === "string" ? config.prefix : folder === fallback.folder ? fallback.prefix : "",
    postfix: typeof config?.postfix === "string" ? config.postfix : kind === "stage" ? "" : "_",
  };
}

export function isStagePack(folder: string, config?: PackConfig | null): boolean {
  return folder === "stage_icon" || !!config?.type?.includes("stage_icon");
}

/**
 * The skin indexes a pack really has for one character code (sorted), from image_sizes
 * (falls back to eyesights). null when the config does not list per-character data.
 */
export function skinIndexes(config: PackConfig | null | undefined, code: string): number[] | null {
  const table = config?.image_sizes && Object.keys(config.image_sizes).length ? config.image_sizes : config?.eyesights;
  if (!table || !Object.keys(table).length) return null;
  const row = table[code];
  if (!row) return [];
  return Object.keys(row).map(Number).filter((n) => Number.isInteger(n) && n >= 0).sort((a, b) => a - b);
}

const seg = (value: string) => encodeURIComponent(value);

export function skinPath(game: string, shape: PackShape, code: string, skin: number): string {
  return `games/${seg(game)}/${seg(shape.folder)}/${seg(`${shape.prefix}${code}${shape.postfix}${skin}`)}.png`;
}

export function stagePath(game: string, shape: PackShape, code: string): string {
  return `games/${seg(game)}/${seg(shape.folder)}/${seg(`${shape.prefix}${code}${shape.postfix}`)}.png`;
}

/** Image type from the first bytes; null for HTML / text / truncated bodies. */
export function sniffImage(bytes: Uint8Array): "png" | "jpeg" | "webp" | "gif" | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "webp";
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "gif";
  return null;
}

/** A PNG must end with its IEND chunk; a cut-off download does not. */
export function pngComplete(bytes: Uint8Array): boolean {
  if (bytes.length < 20) return false;
  const tail = bytes.subarray(bytes.length - 8);
  return tail[0] === 0x49 && tail[1] === 0x45 && tail[2] === 0x4e && tail[3] === 0x44 && tail[4] === 0xae && tail[5] === 0x42 && tail[6] === 0x60 && tail[7] === 0x82;
}

export type ImageCheck = { ok: true; type: "png" | "jpeg" | "webp" | "gif" } | { ok: false; reason: string; retry: boolean };

export function checkImage(status: number, contentType: string | null, bytes: Uint8Array, expectedLength?: number | null): ImageCheck {
  if (status === 404) return { ok: false, reason: "missing (404)", retry: false };
  if (status === 429 || status >= 500) return { ok: false, reason: `server ${status}`, retry: true };
  if (status < 200 || status >= 300) return { ok: false, reason: `HTTP ${status}`, retry: false };
  if (/text\/html|application\/json/i.test(contentType || "")) return { ok: false, reason: `not an image (${contentType})`, retry: false };
  if (expectedLength && expectedLength > 0 && bytes.length !== expectedLength) return { ok: false, reason: "cut off", retry: true };
  const type = sniffImage(bytes);
  if (!type) return { ok: false, reason: "not an image", retry: false };
  if (type === "png" && !pngComplete(bytes)) return { ok: false, reason: "cut off", retry: true };
  return { ok: true, type };
}

/** games/<game>/<folder>/<file>.<image ext> only, no traversal. Returns the decoded parts. */
export function safeAssetPath(value: string): { game: string; folder: string; file: string } | null {
  let decoded: string[];
  try {
    decoded = value.split("/").map((part) => decodeURIComponent(part));
  } catch {
    return null;
  }
  if (decoded.length !== 4 || decoded[0] !== "games") return null;
  const [, game, folder, file] = decoded;
  const ok = (part: string) => !!part && part !== "." && part !== ".." && !/[\\/\0]/.test(part) && part.length <= 200;
  if (!ok(game) || !ok(folder) || !ok(file)) return null;
  if (!/^[A-Za-z0-9_.-]+$/.test(game) || !/^[A-Za-z0-9_.-]+$/.test(folder)) return null;
  if (!/\.(png|jpe?g|webp|gif)$/i.test(file)) return null;
  return { game, folder, file };
}

/** Retry delay for attempt n (0-based): 0.5 s, 1.5 s, 4.5 s ... */
export function retryDelay(attempt: number): number {
  return 500 * 3 ** attempt;
}
