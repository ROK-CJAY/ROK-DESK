import { createFileRoute } from "@tanstack/react-router";
import { ptcgArtSources } from "@/lib/card-lookup";
import { catalogCard } from "@/lib/ptcg-catalog";

const cache = {
  "cache-control": "public, max-age=86400",
};
const noStore = {
  "cache-control": "no-store",
};
const BATCH = 6;
const TIMEOUT_MS = 900;
const MEM_MS = 24 * 60 * 60 * 1000;
const IO_PLACEHOLDER = 186316;

const g = globalThis as typeof globalThis & {
  __ptcgArtMem__?: Map<string, { bytes: ArrayBuffer; type: string; at: number }>;
};

function artMem() {
  return (g.__ptcgArtMem__ ??= new Map());
}

export const Route = createFileRoute("/api/ptcg-art")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id")?.trim() ?? "";
        const image = url.searchParams.get("image")?.trim() ?? "";
        const size = url.searchParams.get("size") === "low" ? "low" : "high";
        if (!id && !image) return new Response("Missing id", { status: 400, headers: noStore });
        const key = `v8|${id}|${size}|${image}`;
        const cached = artMem().get(key);
        if (cached && Date.now() - cached.at < MEM_MS) {
          return new Response(cached.bytes, { headers: { ...cache, "content-type": cached.type } });
        }
        const sources = await artSources(id, image, size);
        const hit = await firstImage(sources);
        if (!hit) return new Response("Art not found", { status: 404, headers: noStore });
        artMem().set(key, { ...hit, at: Date.now() });
        return new Response(hit.bytes, {
          headers: { ...cache, "content-type": hit.type },
        });
      },
    },
  },
});

async function artSources(id: string, image: string, size: "low" | "high"): Promise<string[]> {
  const out: string[] = [];
  const add = (src?: string) => {
    const url = src?.trim();
    if (url && !url.startsWith("/") && !out.includes(url)) out.push(url);
  };
  if (id) {
    try {
      const pics = (await catalogCard(id))?.images;
      if (pics) add(size === "low" ? pics.small || pics.large : pics.large || pics.small);
    } catch {
      /* catalog miss is fine */
    }
  }
  for (const src of ptcgArtSources(image || undefined, size, id || undefined)) add(src);
  return out;
}

async function firstImage(sources: string[]): Promise<{ bytes: ArrayBuffer; type: string } | null> {
  if (!sources.length) return null;
  const priority = Math.min(4, sources.length);
  for (let i = 0; i < priority; i++) {
    try {
      return await fetchImage(sources[i]!);
    } catch {
      /* next priority source */
    }
  }
  const rest = sources.slice(priority);
  for (let i = 0; i < rest.length; i += BATCH) {
    const batch = rest.slice(i, i + BATCH).map((src) => fetchImage(src));
    const hit = await Promise.any(batch).catch(() => null);
    if (hit) return hit;
  }
  return null;
}

async function fetchImage(src: string): Promise<{ bytes: ArrayBuffer; type: string }> {
  const headers: Record<string, string> = {
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    accept: "image/png,image/jpeg,image/webp,image/*;q=0.8,*/*;q=0.1",
    "accept-language": "en-US,en;q=0.9",
  };
  if (/limitlesstcg/i.test(src)) headers.referer = "https://limitlesstcg.com/";
  const res = await fetch(src, {
    headers,
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error("bad status");
  const bytes = await res.arrayBuffer();
  if (bytes.byteLength === IO_PLACEHOLDER) throw new Error("placeholder");
  const type = sniffImage(new Uint8Array(bytes));
  if (!type) throw new Error("not an image");
  if (type === "image/webp" && bytes.byteLength < 30000) throw new Error("stub");
  return { bytes, type };
}

function sniffImage(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}
