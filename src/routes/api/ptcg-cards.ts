import { createFileRoute } from "@tanstack/react-router";
import { catalogCard, isStandardLegal, loadCatalog, resolveCatalogCard, searchCatalog, type PtcgCatalogCard } from "@/lib/ptcg-catalog";
import { matchDeckLines } from "@/lib/ptcg-deck-match";
import {
  allowedLimitlessUrl,
  limitlessShareId,
  parsePtcgDeckText,
} from "@/lib/ptcg-deck-parse";
import { execFile } from "node:child_process";

const noStore = {
  "cache-control": "no-store, no-cache, must-revalidate",
};

const PTCG_IO = "https://api.pokemontcg.io/v2/cards";
const TCGDEX = "https://api.tcgdex.net/v2/en/cards";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const cache = new Map<string, { at: number; body: string }>();
const CACHE_MS = 2 * 60 * 1000;

export const Route = createFileRoute("/api/ptcg-cards")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: { text?: string; url?: string } = {};
        try {
          payload = (await request.json()) as { text?: string; url?: string };
        } catch {
          payload = {};
        }
        const raw = String(payload.url ?? payload.text ?? "").trim();
        if (!raw) {
          return Response.json({ error: "Missing deck text" }, { status: 400, headers: noStore });
        }
        const source = await resolveDeckSource(raw);
        const lines = parsePtcgDeckText(source);
        const catalog = await loadCatalog();
        const matches = catalog?.cards?.length
          ? matchDeckLines(lines, catalog.cards)
          : lines.map((line) => ({ line, card: null }));
        for (const row of matches) {
          if (row.card) continue;
          for (const name of row.line.names) {
            if (name.replace(/\{[^}]+\}/g, "").trim().length < 3) continue;
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
          const card = row.card as PtcgCatalogCard;
          cards.push({
            id: card.id,
            name: card.name,
            set: card.set?.name ?? card.set?.id ?? row.line.set ?? "",
            number: card.number ?? row.line.number ?? "",
            image: card.images?.large ?? card.images?.small ?? "",
            type: card.supertype ?? "",
            qty: row.line.qty,
            ...(card.hp ? { hp: String(card.hp) } : {}),
            ...(Array.isArray(card.rules) && card.rules.length ? { text: card.rules.join("\n") } : {}),
            ...(Array.isArray(card.attacks) && card.attacks.length ? { attacks: card.attacks } : {}),
            ...(Array.isArray(card.abilities) && card.abilities.length ? { abilities: card.abilities } : {}),
          });
        }
        return Response.json({ cards, unmatched, parsed: lines.length }, { headers: noStore });
      },
      GET: async ({ request }) => {
        const params = new URL(request.url).searchParams;
        const id = params.get("id")?.trim() ?? "";
        const q = params.get("q")?.trim() ?? "";
        const name = params.get("name")?.trim() ?? "";
        const number = params.get("number")?.trim() ?? "";
        const set = params.get("set")?.trim() ?? "";
        const live = params.get("live") === "1" || params.get("live") === "true";
        const localOnly = params.get("local") === "1" || params.get("local") === "true";
        if (!id && !q && !name) {
          return Response.json({ error: "Missing query" }, { status: 400, headers: noStore });
        }

        const resolved =
          (id ? await catalogCard(id) : null) ??
          (name || id ? await resolveCatalogCard({ id, name: name || undefined, number, set }) : null);
        if (resolved) return json(JSON.stringify({ data: resolved }), 200);
        if (q) {
          const local = await searchCatalog(q, live);
          if (local) return json(JSON.stringify({ data: local }), 200);
        }
        if (localOnly) return json(JSON.stringify({ data: [] }), 200);

        const cacheKey = id ? `id:${id}` : `q:${live ? "1" : "0"}:${q.toLowerCase()}`;
        const hit = cache.get(cacheKey);
        if (hit && Date.now() - hit.at < CACHE_MS) return json(hit.body, 200);

        const target = id ? `${PTCG_IO}/${encodeURIComponent(id)}` : pokemonTcgIoUrl(q, true);
        const ioBody =
          (await getWithRetries(target, 1, 2000)) ?? (id ? null : await getWithRetries(pokemonTcgIoUrl(q, false), 1, 2000));
        const body = ioBody
          ? live && !id
            ? preferStandard(ioBody)
            : ioBody
          : await tcgdexFallback(id, q, live);
        if (body) {
          cache.set(cacheKey, { at: Date.now(), body });
          return json(body, 200);
        }

        return Response.json({ error: "Card lookup unavailable" }, { status: 502, headers: noStore });
      },
    },
  },
});

async function resolveDeckSource(raw: string): Promise<string> {
  const url = allowedLimitlessUrl(raw);
  if (!url) return raw;
  const shareId = limitlessShareId(url);
  if (shareId) {
    const api = await getWithRetries(`https://mew.limitlesstcg.com/dm/share/${shareId}`, 3);
    if (api) {
      try {
        const parsed = JSON.parse(api) as { message?: { cards?: string } | string };
        const cards =
          typeof parsed.message === "string"
            ? parsed.message
            : parsed.message && typeof parsed.message === "object"
              ? String(parsed.message.cards ?? "")
              : "";
        if (cards.includes("xi:")) return cards;
      } catch {
        if (api.includes("xi:")) return api;
      }
    }
  }
  const page = await getWithRetries(url.toString(), 3);
  return page || raw;
}

function pokemonTcgIoUrl(q: string, newestFirst: boolean): string {
  const safe = q.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim();
  const name = /\s/.test(safe) ? `name:"${safe}"` : `name:${safe}`;
  const url = new URL(PTCG_IO);
  url.searchParams.set("q", name);
  url.searchParams.set("pageSize", "20");
  if (newestFirst) url.searchParams.set("orderBy", "-set.releaseDate");
  return url.toString();
}

function tcgdexUrl(id: string, q: string, live: boolean): string {
  if (id) return `${TCGDEX}/${encodeURIComponent(id)}`;
  const url = new URL(TCGDEX);
  url.searchParams.set("name", q.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim());
  url.searchParams.set("pagination:itemsPerPage", "20");
  if (live) url.searchParams.set("legal.standard", "true");
  return url.toString();
}

async function tcgdexFallback(id: string, q: string, live: boolean): Promise<string | null> {
  const raw = await getWithRetries(tcgdexUrl(id, q, live), 1, 1200);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      const data = parsed.map(toTcgIo).filter((row) => row.name);
      return JSON.stringify({ data });
    }
    if (parsed && typeof parsed === "object" && "name" in parsed) {
      const card = toTcgIo(parsed);
      return card.name ? JSON.stringify({ data: card }) : null;
    }
  } catch {
    return null;
  }
  return null;
}

function toTcgIo(row: unknown): Record<string, unknown> {
  const item = isRecord(row) ? row : {};
  const set = isRecord(item.set) ? item.set : {};
  const image = item.image ? String(item.image).replace(/\/+$/, "") : "";
  const number = item.localId != null ? String(item.localId) : item.number != null ? String(item.number) : undefined;
  const category = item.category ? String(item.category) : item.supertype ? String(item.supertype) : "";
  const stage = item.stage ? String(item.stage) : "";
  const trainerType = item.trainerType ? String(item.trainerType) : "";
  const types = Array.isArray(item.types) ? item.types.map(String) : [];
  const retreat =
    typeof item.retreat === "number"
      ? item.retreat
      : Array.isArray(item.retreatCost)
        ? item.retreatCost.length
        : undefined;
  const attacks = Array.isArray(item.attacks)
    ? item.attacks.flatMap((atk) => {
        if (!isRecord(atk) || !atk.name) return [];
        return [
          {
            name: String(atk.name),
            cost: Array.isArray(atk.cost) ? atk.cost.map(String) : undefined,
            damage: atk.damage != null && String(atk.damage) ? String(atk.damage) : undefined,
            text: atk.effect ? String(atk.effect) : atk.text ? String(atk.text) : undefined,
          },
        ];
      })
    : undefined;
  const abilities = Array.isArray(item.abilities)
    ? item.abilities.flatMap((row) => {
        if (!isRecord(row) || !row.name) return [];
        return [{ name: String(row.name), text: row.effect ? String(row.effect) : row.text ? String(row.text) : undefined }];
      })
    : undefined;
  return {
    id: String(item.id ?? item.name ?? ""),
    name: String(item.name ?? "").trim(),
    number,
    hp: item.hp != null ? String(item.hp) : undefined,
    rarity: item.rarity ? String(item.rarity) : undefined,
    supertype: category,
    subtypes: [stage, trainerType].filter(Boolean),
    types,
    regulationMark: item.regulationMark ? String(item.regulationMark) : undefined,
    images: image ? { small: `${image}/low.webp`, large: `${image}/high.webp` } : undefined,
    set: {
      id: set.id ? String(set.id) : undefined,
      name: set.name ? String(set.name) : undefined,
    },
    attacks,
    abilities,
    rules: item.effect ? [String(item.effect)] : undefined,
    convertedRetreatCost: retreat,
    retreatCost: retreat ? Array.from({ length: retreat }, () => "Colorless") : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

async function getWithRetries(url: string, attempts: number, timeoutMs = 2500): Promise<string | null> {
  for (let i = 0; i < attempts; i++) {
    const body = (await curlGet(url, timeoutMs)) ?? (await fetchGet(url, timeoutMs));
    if (body) return body;
    if (i < attempts - 1) await sleep(120 + i * 80);
  }
  return null;
}

function curlGet(url: string, timeoutMs: number): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(
      "curl",
      [
        "-sS",
        "-L",
        "-f",
        "--http1.1",
        "-m",
        String(Math.max(2, Math.ceil(timeoutMs / 1000))),
        "-A",
        UA,
        "-H",
        "accept: application/json, text/html",
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
        accept: "application/json, text/html",
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
