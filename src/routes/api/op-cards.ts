import { createFileRoute } from "@tanstack/react-router";

const noStore = {
  "cache-control": "no-store, no-cache, must-revalidate",
};
const INDEX_NAME = "https://raw.githubusercontent.com/buhbbl/punk-records/main/english/index/by_name.json";
const INDEX_ID = "https://raw.githubusercontent.com/buhbbl/punk-records/main/english/index/cards_by_id.json";
const CARD_BASE = "https://raw.githubusercontent.com/buhbbl/punk-records/main/english/cards";

type NameIndex = Record<string, string[]>;
type CardIndex = Record<string, Record<string, unknown>>;

let nameIndex: NameIndex | null = null;
let cardIndex: CardIndex | null = null;

async function loadIndexes() {
  if (nameIndex && cardIndex) return;
  const [namesRes, cardsRes] = await Promise.all([
    fetch(INDEX_NAME, { cache: "force-cache" }),
    fetch(INDEX_ID, { cache: "force-cache" }),
  ]);
  if (!namesRes.ok || !cardsRes.ok) throw new Error("OP index failed");
  nameIndex = (await namesRes.json()) as NameIndex;
  cardIndex = (await cardsRes.json()) as CardIndex;
}

function isParallel(id: string) {
  return /_(p|r)\d+$/i.test(id);
}

export const Route = createFileRoute("/api/op-cards")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const params = new URL(request.url).searchParams;
        const q = params.get("q")?.trim() ?? "";
        const id = params.get("id")?.trim() ?? "";
        try {
          await loadIndexes();
        } catch {
          return Response.json({ error: "Index unavailable" }, { status: 502, headers: noStore });
        }
        if (id) {
          const meta = cardIndex?.[id];
          const pack = meta?.pack_id ? String(meta.pack_id) : "";
          if (!pack) return Response.json({ error: "Unknown card" }, { status: 404, headers: noStore });
          const res = await fetch(`${CARD_BASE}/${encodeURIComponent(pack)}/${encodeURIComponent(id)}.json`, {
            cache: "force-cache",
          });
          if (!res.ok) {
            return Response.json({ data: meta ?? null }, { headers: noStore });
          }
          const detail = (await res.json()) as Record<string, unknown>;
          return Response.json({ data: { ...meta, ...detail } }, { headers: noStore });
        }
        if (q.length < 2) {
          return Response.json({ error: "Missing query" }, { status: 400, headers: noStore });
        }
        const needle = q.toLowerCase();
        const ids: string[] = [];
        const seen = new Set<string>();
        for (const [name, rows] of Object.entries(nameIndex ?? {})) {
          if (!name.includes(needle)) continue;
          for (const cardId of rows) {
            if (isParallel(cardId) || seen.has(cardId)) continue;
            seen.add(cardId);
            ids.push(cardId);
            if (ids.length >= 30) break;
          }
          if (ids.length >= 30) break;
        }
        const data = await Promise.all(
          ids.map(async (cardId) => {
            const meta = cardIndex?.[cardId];
            if (!meta) return null;
            const pack = meta.pack_id ? String(meta.pack_id) : "";
            if (!pack) return meta;
            try {
              const res = await fetch(`${CARD_BASE}/${encodeURIComponent(pack)}/${encodeURIComponent(cardId)}.json`, {
                cache: "force-cache",
              });
              if (!res.ok) return meta;
              const detail = (await res.json()) as Record<string, unknown>;
              return { ...meta, ...detail };
            } catch {
              return meta;
            }
          }),
        );
        return Response.json({ data: data.filter(Boolean) }, { headers: noStore });
      },
    },
  },
});
