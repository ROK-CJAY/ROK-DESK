import { clampQty, mergeDecklist, type DeckCard } from "@/lib/decklist";
import { loadCatalog, type PtcgCatalogCard } from "@/lib/ptcg-catalog";
import { matchDeckLine } from "@/lib/ptcg-deck-match";
import {
  allowedLimitlessUrl,
  limitlessShareId,
  parseLimitlessDeckHtml,
  parsePtcgDeckText,
  type ParsedDeckLine,
} from "@/lib/ptcg-deck-parse";

export { allowedLimitlessUrl, parseLimitlessDeckHtml, parsePtcgDeckText };
export type { ParsedDeckLine };

export type PtcgDeckImportResult = {
  cards: DeckCard[];
  unmatched: string[];
  count: number;
};

export async function importPtcgDeck(input: { text?: string; url?: string }): Promise<PtcgDeckImportResult> {
  const urlRaw = input.url?.trim() || (input.text?.trim().match(/^https?:\/\/\S+$/i) ? input.text.trim() : "");
  let source = input.text ?? "";
  if (urlRaw) {
    const url = allowedLimitlessUrl(urlRaw);
    if (!url) throw new Error("Only public Limitless deck URLs can be fetched.");
    source = await fetchLimitlessSource(url);
  }
  const lines = parsePtcgDeckText(source);
  if (!lines.length) throw new Error("No cards found in that list. Paste PTCGL export, Limitless text, or a shared Limitless URL.");
  return resolveDeckLines(lines);
}

export async function resolveDeckLines(lines: ParsedDeckLine[]): Promise<PtcgDeckImportResult> {
  const catalog = await loadCatalog();
  const cards: DeckCard[] = [];
  const unmatched: string[] = [];
  for (const line of lines) {
    const hit = catalog ? (matchDeckLine(line, catalog.cards) as PtcgCatalogCard | null) : null;
    if (hit) {
      cards.push(deckCardFromCatalog(hit, line.qty));
      continue;
    }
    unmatched.push(line.raw);
  }
  const merged = mergeDecklist(cards);
  return { cards: merged, unmatched, count: merged.reduce((n, c) => n + c.qty, 0) };
}

function deckCardFromCatalog(card: PtcgCatalogCard, qty: number): DeckCard {
  return {
    id: card.id,
    name: card.name,
    set: card.set?.name || card.set?.id || "",
    number: card.number ?? "",
    image: card.images?.large || card.images?.small || "",
    type: card.supertype ?? "",
    qty: clampQty(qty),
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
