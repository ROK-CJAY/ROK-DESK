import { clampQty, mergeDecklist, printedNamesMatch, type DeckCard } from "@/lib/decklist";
import { catalogCard, loadCatalog, resolveCatalogCard, type PtcgCatalogCard } from "@/lib/ptcg-catalog";
import { catalogIdsForLine, matchDeckLine, nameEquals, printedSetCode } from "@/lib/ptcg-deck-match";
import { limitlessCardPng } from "@/lib/card-lookup";
import {
  allowedLimitlessUrl,
  decodeHtml,
  limitlessShareId,
  looksLikeLimitlessPaste,
  parseLimitlessCardPage,
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
  const resolved = await Promise.all(lines.map((line) => resolveLine(line, catalog?.cards ?? [])));
  resolved.forEach((hit, i) => {
    const line = lines[i]!;
    if (hit) {
      cards.push(deckCardFromCatalog(hit, line));
      return;
    }
    unmatched.push(line.raw || `${line.qty} ${line.name} ${line.set} ${line.number}`.trim());
  });
  const merged = mergeDecklist(cards);
  return { cards: merged, unmatched, count: merged.reduce((n, c) => n + c.qty, 0) };
}

/** Fill HP / attacks / trainer text / art on an already-saved list from the local catalog. */
export async function hydrateDeckCards(cards: DeckCard[]): Promise<DeckCard[]> {
  if (!cards.length) return cards;
  const catalog = await loadCatalog();
  const rows = catalog?.cards ?? [];
  const next = await Promise.all(cards.map((card) => hydrateSavedCard(card, rows)));
  return next;
}

async function hydrateSavedCard(card: DeckCard, rows: PtcgCatalogCard[]): Promise<DeckCard> {
  const printed = printedSetCode(card.set, card.id) || card.set;
  const line: ParsedDeckLine = {
    qty: card.qty,
    name: card.name,
    set: printed,
    number: card.number,
    names: card.name ? [card.name] : [],
    raw: `${card.qty} ${card.name} ${printed} ${card.number}`.trim(),
  };
  const hitRaw =
    (card.id ? await catalogCard(card.id) : null) ??
    (matchDeckLine(line, rows) as PtcgCatalogCard | null) ??
    (await resolveCatalogCard({
      id: card.id,
      name: card.name,
      number: card.number,
      set: printed || card.set,
    }));
  const hit =
    hitRaw && card.name && hitRaw.name && !printedNamesMatch(card.name, hitRaw.name)
      ? await resolveCatalogCard({
          name: card.name,
          number: card.number,
          set: printed || card.set,
        })
      : hitRaw;
  if (hit && card.name && hit.name && !printedNamesMatch(card.name, hit.name)) return card;
  if (!hit) return card;
  const rich = deckCardFromCatalog(hit, line);
  return {
    ...rich,
    qty: card.qty,
    set: printed || rich.set || card.set,
    image: rich.image || card.image,
    hp: rich.hp || card.hp,
    text: rich.text || card.text,
    attacks: rich.attacks?.length ? rich.attacks : card.attacks,
    abilities: rich.abilities?.length ? rich.abilities : card.abilities,
  };
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
  if (line.set && line.number) {
    const fromPage = await limitlessCard(line);
    if (fromPage) return fromPage;
  }
  for (const id of catalogIdsForLine(line).slice(0, 2)) {
    const card = await tcgdexCard(id);
    if (card) return card;
  }
  return null;
}

async function limitlessCard(line: ParsedDeckLine): Promise<PtcgCatalogCard | null> {
  try {
    const html = await fetchText(
      `https://limitlesstcg.com/cards/${encodeURIComponent(line.set)}/${encodeURIComponent(line.number)}`,
      "text/html",
      4000,
    );
    const parsed = parseLimitlessCardPage(html);
    const title = decodeHtml(html.match(/<title>([^<]+)/i)?.[1] ?? "");
    const name = parsed?.name || title.split(" - ")[0]?.replace(/– Limitless.*/i, "").trim();
    if (!name || /limitless/i.test(name)) return null;
    const energy = /energy/i.test(name) || parsed?.supertype === "Energy";
    return {
      id: `${line.set}-${line.number}`.toLowerCase(),
      name,
      number: line.number,
      supertype: energy ? "Energy" : parsed?.supertype || "",
      regulationMark: parsed?.regulation || undefined,
      set: { id: line.set.toLowerCase(), name: line.set },
    };
  } catch {
    return null;
  }
}

async function tcgdexCard(id: string): Promise<PtcgCatalogCard | null> {
  try {
    const raw = await fetchText(`https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(id)}`, "application/json", 2500);
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
    const regulation = String(item.regulationMark ?? item.regulation ?? "").trim().toUpperCase().slice(0, 1);
    return {
      id: idValue,
      name: labeled,
      number,
      hp: item.hp != null ? String(item.hp) : undefined,
      supertype: item.category ? String(item.category) : undefined,
      regulationMark: regulation || undefined,
      images: image
        ? { small: `${image}/low.webp`, large: `${image}/high.webp` }
        : { small: `https://images.scrydex.com/pokemon/${compact}/large`, large: `https://images.scrydex.com/pokemon/${compact}/large` },
      set: { id: setId, name: setName },
      attacks: Array.isArray(item.attacks) ? item.attacks : undefined,
      abilities: Array.isArray(item.abilities) ? item.abilities : undefined,
      rules: item.effect ? [String(item.effect)] : undefined,
    };
  } catch {
    return null;
  }
}

function deckCardFromCatalog(card: PtcgCatalogCard, line: ParsedDeckLine): DeckCard {
  const id = card.id;
  const number = line.number || card.number || id.split("-").slice(1).join("-");
  const png = limitlessCardPng(line.set || card.set?.id || id.split("-")[0], number)[0];
  const image = card.images?.large || card.images?.small || png || "";
  const printed = printedSetCode(line.set || card.set?.name, id) || line.set || card.set?.id || "";
  const attacks = Array.isArray(card.attacks)
    ? card.attacks.flatMap((row) => {
        if (!row || typeof row !== "object" || !("name" in row)) return [];
        const atk = row as Record<string, unknown>;
        const name = String(atk.name ?? "").trim();
        if (!name) return [];
        return [
          {
            name,
            cost: Array.isArray(atk.cost) ? atk.cost.map(String) : undefined,
            damage: atk.damage != null && String(atk.damage) ? String(atk.damage) : undefined,
            text: atk.text ? String(atk.text) : atk.effect ? String(atk.effect) : undefined,
          },
        ];
      })
    : undefined;
  const abilities = Array.isArray(card.abilities)
    ? card.abilities.flatMap((row) => {
        if (!row || typeof row !== "object" || !("name" in row)) return [];
        const ab = row as Record<string, unknown>;
        const name = String(ab.name ?? "").trim();
        if (!name) return [];
        return [{ name, text: ab.text ? String(ab.text) : ab.effect ? String(ab.effect) : undefined }];
      })
    : undefined;
  const text = Array.isArray(card.rules) && card.rules.length ? card.rules.join("\n") : undefined;
  const types = (card.types ?? []).filter(Boolean);
  const subtypes = (card.subtypes ?? []).filter(Boolean);
  const type = [...types, ...subtypes].join(" / ") || card.supertype || "";
  return {
    id,
    name: decodeHtml(card.name),
    set: printed,
    number: card.number ?? line.number ?? "",
    image,
    type,
    qty: clampQty(line.qty),
    ...(card.regulationMark ? { regulation: card.regulationMark.trim().toUpperCase().slice(0, 1) } : {}),
    ...(card.hp ? { hp: String(card.hp) } : {}),
    ...(text ? { text } : {}),
    ...(attacks?.length ? { attacks } : {}),
    ...(abilities?.length ? { abilities } : {}),
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

async function fetchText(url: string, accept: string, timeoutMs = 8000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
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
