import { createFileRoute } from "@tanstack/react-router";
import { catalogCard, isStandardLegal, loadCatalog, searchCatalog } from "@/lib/ptcg-catalog";
import { matchDeckLines } from "@/lib/ptcg-deck-match";
import { parsePtcgDeckText } from "@/lib/ptcg-deck-parse";
import { execFile } from "node:child_process";

const noStore = {
  "cache-control": "no-store, no-cache, must-revalidate",
};

const PTCG_IO = "https://api.pokemontcg.io/v2/cards";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const cache = new Map<string, { at: number; body: string }>();
const CACHE_MS = 2 * 60 * 1000;

export const Route = createFileRoute("/api/ptcg-cards")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: { text?: string } = {};
        try {
          payload = (await request.json()) as { text?: string };
        } catch {
          payload = {};
        }
        const text = String(payload.text ?? "").trim();
        if (!text) {
          return Response.json({ error: "Missing deck text" }, { status: 400, headers: noStore });
        }
        const lines = parsePtcgDeckText(text);
        const catalog = await loadCatalog();
        const matches = catalog?.cards?.length
          ? matchDeckLines(lines, catalog.cards)
          : lines.map((line) => ({ line, card: null }));
        for (const row of matches) {
          if (row.card) continue;
          for (const name of row.line.names) {
            const hits = (await searchCatalog(name, false)) ?? [];
            const picked = matchDeckLines([row.line], hits)[0]?.card;
            if (picked) {
              row.card = picked;
              break;
            }
          }
        }
        const cards = [];
        const unmatched = [];
        for (const row of matches) {
          if (!row.card) {
            unmatched.push({
              qty: row.line.qty,
              name: row.line.name,
              set: row.line.set ?? "",
              number: row.line.number ?? "",
            });
            continue;
          }
          cards.push({
            id: row.card.id,
            name: row.card.name,
            set: row.card.set?.id ?? row.line.set ?? "",
            number: row.card.number ?? row.line.number ?? "",
            image: row.card.images?.large ?? row.card.images?.small ?? "",
            type: row.card.supertype ?? "",
            qty: row.line.qty,
          });
        }
        return Response.json({ cards, unmatched, parsed: lines.length }, { headers: noStore });
      },
      GET: async ({ request }) => {
        const params = new URL(request.url).searchParams;
        const id = params.get("id")?.trim() ?? "";
        const q = params.get("q")?.trim() ?? "";
        const live = params.get("live") === "1" || params.get("live") === "true";
        if (!id && !q) {
          return Response.json({ error: "Missing query" }, { status: 400, headers: noStore });
        }

        if (id) {
          const local = await catalogCard(id);
          if (local) return json(JSON.stringify({ data: local }), 200);
        } else {
          const local = await searchCatalog(q, live);
          if (local) return json(JSON.stringify({ data: local }), 200);
        }

        const cacheKey = id ? `id:${id}` : `q:${live ? "1" : "0"}:${q.toLowerCase()}`;
        const hit = cache.get(cacheKey);
        if (hit && Date.now() - hit.at < CACHE_MS) return json(hit.body, 200);

        const target = id ? `${PTCG_IO}/${encodeURIComponent(id)}` : pokemonTcgIoUrl(q, true);
        const body =
          (await getWithRetries(target, 6)) ??
          (id ? null : await getWithRetries(pokemonTcgIoUrl(q, false), 4));
        if (body) {
          const out = live && !id ? preferStandard(body) : body;
          cache.set(cacheKey, { at: Date.now(), body: out });
          return json(out, 200);
        }

        return Response.json({ error: "Card lookup unavailable" }, { status: 502, headers: noStore });
      },
    },
  },
});

function pokemonTcgIoUrl(q: string, newestFirst: boolean): string {
  const safe = q.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim();
  const name = /\s/.test(safe) ? `name:"${safe}"` : `name:${safe}`;
  const url = new URL(PTCG_IO);
  url.searchParams.set("q", name);
  url.searchParams.set("pageSize", "20");
  if (newestFirst) url.searchParams.set("orderBy", "-set.releaseDate");
  return url.toString();
}

function preferStandard(body: string): string {
  return filterStandard(body);
}

function filterStandard(body: string): string {
  try {
    const parsed = JSON.parse(body) as { data?: unknown };
    if (!Array.isArray(parsed.data)) return body;
    parsed.data = parsed.data.filter((row) => isStandardLegal(row));
    return JSON.stringify(parsed);
  } catch {
    return body;
  }
}

async function getWithRetries(url: string, attempts: number): Promise<string | null> {
  for (let i = 0; i < attempts; i++) {
    const body = (await curlGet(url, 4000)) ?? (await fetchGet(url, 4000));
    if (body) return body;
    if (i < attempts - 1) await sleep(160 + i * 140);
  }
  return null;
}

function curlGet(url: string, timeoutMs: number): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(
      "curl",
      [
        "-sS",
        "-f",
        "--http1.1",
        "-m",
        String(Math.max(2, Math.ceil(timeoutMs / 1000))),
        "-A",
        UA,
        "-H",
        "accept: application/json",
        "-H",
        "accept-language: en-US,en;q=0.9",
        url,
      ],
      { timeout: timeoutMs + 500, maxBuffer: 8 * 1024 * 1024 },
      (error, stdout) => {
        const body = stdout?.toString() ?? "";
        if (error || !body.trim()) resolve(null);
        else resolve(body);
      },
    );
  });
}

async function fetchGet(url: string, timeoutMs: number): Promise<string | null> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "accept-language": "en-US,en;q=0.9",
        "user-agent": UA,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await res.text();
    if (!res.ok || !body.trim()) return null;
    return body;
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function json(body: string, status: number) {
  return new Response(body, {
    status,
    headers: { ...noStore, "content-type": "application/json" },
  });
}
