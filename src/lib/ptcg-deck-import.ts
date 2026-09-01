import { clampQty, mergeDecklist, type DeckCard } from "@/lib/decklist";
import { catalogCard, loadCatalog, type PtcgCatalogCard } from "@/lib/ptcg-catalog";
import { catalogIdsForLine, matchDeckLine, nameEquals } from "@/lib/ptcg-deck-match";
import { limitlessCardPng } from "@/lib/card-lookup";
import {
  allowedLimitlessUrl,
  limitlessShareId,
  looksLikeLimitlessPaste,
  parseLimitlessDeckHtml,
  parsePtcgDeckText,
  type ParsedDeckLine,
} from "@/lib/ptcg-deck-parse";

export { allowedLimitlessUrl, looksLikeLimitlessPaste, parseLimitlessDeckHtml, parsePtcgDeckText };
export type { ParsedDeckLine };

export type PtcgDeckImportResult = {
  cards: DeckCard[];
  unmatched: string[];
  count: number;
};

export async function importPtcgDeck(input: { text?: string; url?: string }): Promise<PtcgDeckImportResult> {
  const pasted = (input.url?.trim() || input.text?.trim() || "");
  const url = allowedLimitlessUrl(pasted);
  let source = input.text ?? pasted;
  if (url) source = await fetchLimitlessSource(url);
  const lines = parsePtcgDeckText(source);
  if (!lines.length) {
    throw new Error("No cards found in that list. Paste PTCGL export, Limitless text, or a shared Limitless URL.");
  }
  return resolveDeckLines(lines);
}

export async function resolveDeckLines(lines: ParsedDeckLine[]): Promise<PtcgDeckImportResult> {
  const catalog = await loadCatalog();
  const cards: DeckCard[] = [];
  const unmatched: string[] = [];
  for (const line of lines) {
    const hit = await resolveLine(line, catalog?.cards ?? []);
    if (hit) {
      cards.push(deckCardFromCatalog(hit, line));
      continue;
    }
    unmatched.push(line.raw || `${line.qty} ${line.name} ${line.set} ${line.number}`.trim());
  }
  const merged = mergeDecklist(cards);
  return { cards: merged, unmatched, count: merged.reduce((n, c) => n + c.qty, 0) };
}

async function resolveLine(line: ParsedDeckLine, catalog: PtcgCatalogCard[]): Promise<PtcgCatalogCard | null> {
  const local = catalog.length ? (matchDeckLine(line, catalog) as PtcgCatalogCard | null) : null;
  if (local) return local;
  for (const id of catalogIdsForLine(line)) {
    const card = catalog.find((row) => row.id.toLowerCase() === id.toLowerCase()) ?? (await catalogCard(id));
    if (!card) continue;
    if (line.names.length && !line.names.some((name) => nameEquals(card.name, [name]))) continue;
    return card;
  }
  return fetchRemotePrint(line);
}

async function fetchRemotePrint(line: ParsedDeckLine): Promise<PtcgCatalogCard | null> {
  for (const id of catalogIdsForLine(line)) {
    const card = await tcgdexCard(id);
    if (card) return card;
  }
  if (!line.set || !line.number) return null;
  try {
    const html = await fetchText(`https://limitlesstcg.com/cards/${encodeURIComponent(line.set)}/${encodeURIComponent(line.number)}`, "text/html");
    const title = html.match(/<title>([^<]+)/i)?.[1] ?? "";
    const name = title.split(" - ")[0]?.replace(/– Limitless.*/i, "").trim();
    if (!name || /limitless/i.test(name)) return null;
    return {
      id: `${line.set}-${line.number}`.toLowerCase(),
      name,
      number: line.number,
      supertype: /energy/i.test(name) ? "Energy" : "",
      set: { id: line.set.toLowerCase(), name: line.set },
    };
  } catch {
    return null;
  }
}

async function tcgdexCard(id: string): Promise<PtcgCatalogCard | null> {
  try {
    const raw = await fetchText(`https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(id)}`, "application/json");
    const item = JSON.parse(raw) as Record<string, unknown>;
    const name = String(item.name ?? "").trim();
    if (!name) return null;
    const set = item.set && typeof item.set === "object" ? (item.set as Record<string, unknown>) : {};
    const image = item.image ? String(item.image).replace(/\/+$/, "") : "";
    const number = item.localId != null ? String(item.localId).replace(/^0+/, "") || String(item.localId) : "";
    const setId = set.id ? String(set.id) : undefined;
    const setName = set.name ? String(set.name) : undefined;
    const labeled =
      setId === "mee" && /energy$/i.test(name) && !/^basic\b/i.test(name) ? `Basic ${name}` : name;
    const idValue = String(item.id ?? id);
    const compact = idValue.replace(/-0+(\d)/, "-$1");
    return {
      id: idValue,
      name: labeled,
      number,
      supertype: item.category ? String(item.category) : undefined,
      images: image
        ? { small: `${image}/low.webp`, large: `${image}/high.webp` }
        : { small: `https://images.scrydex.com/pokemon/${compact}/large`, large: `https://images.scrydex.com/pokemon/${compact}/large` },
      set: { id: setId, name: setName },
    };
  } catch {
    return null;
  }
}

function deckCardFromCatalog(card: PtcgCatalogCard, line: ParsedDeckLine): DeckCard {
  const id = card.id;
  const number = line.number || card.number || id.split("-").slice(1).join("-");
  const png = limitlessCardPng(line.set || card.set?.id || id.split("-")[0], number)[0];
  const image = png || card.images?.large || card.images?.small || "";
  return {
    id,
    name: card.name,
    set: card.set?.name || card.set?.id || line.set || "",
    number: card.number ?? line.number ?? "",
    image,
    type: card.supertype ?? "",
    qty: clampQty(line.qty),
  };
}

async function fetchLimitlessSource(url: URL): Promise<string> {
  const shareId = limitlessShareId(url);
  if (shareId) {
    try {
      const api = await fetchText(`https://mew.limitlesstcg.com/dm/share/${shareId}`, "application/json");
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
    } catch {
      // Fall through to the public HTML page.
    }
  }
  const page = await fetchText(url.toString(), "text/html,application/xhtml+xml");
  if (!page) throw new Error("Limitless timed out.");
  return page;
}

async function fetchText(url: string, accept: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept,
        "user-agent": "ROK-Desk/0.2 (deck import)",
      },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`Limitless returned ${res.status}.`);
    const text = await res.text();
    if (text.length > 1_500_000) throw new Error("That page is too large.");
    return text;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw new Error("Limitless timed out.");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
