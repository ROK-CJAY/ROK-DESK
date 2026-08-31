import { useEffect, useState } from "react";
import { Link2, Minus, Plus, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cardImageUrl, searchCatalogCards, type LookupCard, type LookupCatalog } from "@/lib/card-lookup";
import {
  addDeckCard,
  decklistCount,
  removeDeckCard,
  setDeckQty,
  type DeckCard,
} from "@/lib/decklist";
import { cn } from "@/lib/cn";
import { looksLikeLimitlessPaste } from "@/lib/ptcg-deck-parse";

export function DecklistEditor({
  catalog,
  formatName = "",
  value,
  onChange,
  required = false,
}: {
  catalog: LookupCatalog;
  formatName?: string;
  value: DeckCard[];
  onChange: (next: DeckCard[]) => void;
  required?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<LookupCard[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [paste, setPaste] = useState("");
  const [importing, setImporting] = useState(false);
  const [importNote, setImportNote] = useState("");
  const [importErr, setImportErr] = useState("");
  const total = decklistCount(value);
  const ptcg = catalog === "ptcg";

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setStatus("idle");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    const timer = window.setTimeout(() => {
      void searchCatalogCards(catalog, q, { formatName, liveOnly: true })
        .then((rows) => {
          if (cancelled) return;
          setHits(rows.slice(0, 10));
          setStatus("idle");
        })
        .catch(() => {
          if (cancelled) return;
          setStatus("error");
        });
    }, 260);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, catalog, formatName]);

  const add = (card: LookupCard) => {
    onChange(addDeckCard(value, card, 1));
    setQuery("");
    setHits([]);
  };

  const importList = async () => {
    const raw = paste.trim();
    if (!raw) {
      setImportErr("Paste a PTCGL / Limitless list or a public Limitless URL.");
      return;
    }
    setImporting(true);
    setImportErr("");
    setImportNote("");
    try {
      const res = await fetch("/api/ptcg-deck-import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(looksLikeLimitlessPaste(raw) ? { url: raw } : { text: raw }),
      });
      const data = (await res.json()) as { cards?: DeckCard[]; unmatched?: string[]; count?: number; error?: string };
      if (!res.ok) throw new Error(data.error || "Import failed.");
      const cards = Array.isArray(data.cards) ? data.cards : [];
      if (!cards.length && !(data.unmatched?.length)) throw new Error("No cards found in that list.");
      if (cards.length) onChange(cards);
      const missed = data.unmatched?.length ?? 0;
      setImportNote(
        missed
          ? `Imported ${data.count ?? cards.length} cards. ${missed} didn’t match the catalog — search below to fix.`
          : `Imported ${data.count ?? cards.length} cards. Search below if you need to edit.`,
      );
      if (!cards.length && missed) {
        setImportErr(data.unmatched?.slice(0, 6).join(" · ") || "Could not match those cards in the catalog.");
      }
    } catch (err) {
      setImportErr(err instanceof Error ? err.message : "Could not import that list.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase">
          Decklist{required ? " · required" : ""}
        </p>
        <p className="font-mono text-xs tabular-nums text-muted">{total} cards</p>
      </div>
      {ptcg ? (
        <div className="grid gap-2 rounded-lg border border-border bg-surface-2 p-2">
          <p className="text-[0.7rem] text-muted">
            Paste a PTCGL export, Limitless <span className="text-fg">Copy as Text</span>, or a public Limitless deck URL
            (including <span className="text-fg">my.limitlesstcg.com/shared/…</span>).
          </p>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={4}
            placeholder={"4 Charmander PAF 26\nhttps://my.limitlesstcg.com/shared/…"}
            className="min-h-20 w-full resize-y rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-fg placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
          />
          <Button type="button" size="sm" variant="secondary" onClick={() => void importList()} disabled={importing}>
            <Link2 className="size-3.5" />
            {importing ? "Importing…" : "Import list"}
          </Button>
          {importNote ? <p className="text-[0.7rem] text-ok">{importNote}</p> : null}
          {importErr ? <p className="text-[0.7rem] text-live">{importErr}</p> : null}
        </div>
      ) : null}
      <p className="font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase">
        {ptcg ? "ROK Desk builder · backup" : "Search"}
      </p>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a card, then tap to add"
          className="pl-9"
        />
      </div>
      {status === "loading" ? <p className="text-xs text-muted">Searching…</p> : null}
      {status === "error" ? <p className="text-xs text-live">Lookup failed. Try again.</p> : null}
      {hits.length ? (
        <ul className="max-h-48 overflow-auto rounded-lg border border-border bg-surface-2">
          {hits.map((card) => (
            <li key={card.id}>
              <button
                type="button"
                onClick={() => add(card)}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-surface"
              >
                {card.image || card.id ? (
                  <img
                    src={cardImageUrl(card.image, "high", card.id)}
                    alt=""
                    className="h-10 w-7 shrink-0 rounded-sm bg-black/40 object-contain"
                  />
                ) : (
                  <span className="grid h-10 w-7 shrink-0 place-items-center rounded-sm bg-surface text-[0.55rem] text-muted">
                    —
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{card.name}</span>
                  <span className="block truncate text-[0.68rem] text-muted">
                    {[card.set, card.number, card.type].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <Plus className="size-3.5 shrink-0 text-muted" />
              </button>
            </li>
          ))}
        </ul>
      ) : query.trim().length >= 2 && status === "idle" ? (
        <p className="text-xs text-muted">No cards matched.</p>
      ) : null}

      {value.length ? (
        <ul className="grid gap-1">
          {value.map((card) => (
            <li key={card.id} className="flex items-center gap-2 rounded-md bg-surface-2 px-2 py-1.5">
              {card.image || card.id ? (
                <img
                  src={cardImageUrl(card.image, "high", card.id)}
                  alt=""
                  className="h-12 w-8 shrink-0 rounded-sm bg-black/40 object-contain"
                />
              ) : (
                <span className="h-12 w-8 shrink-0 rounded-sm bg-surface" />
              )}
              <p className="min-w-0 flex-1 truncate text-sm">
                {card.name}
                {card.set ? <span className="text-muted"> · {card.set}</span> : null}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0"
                  onClick={() => onChange(setDeckQty(value, card.id, card.qty - 1))}
                  aria-label="Fewer"
                >
                  <Minus className="size-3.5" />
                </Button>
                <Input
                  inputMode="numeric"
                  value={String(card.qty)}
                  onChange={(e) => onChange(setDeckQty(value, card.id, Number(e.target.value.replace(/[^\d]/g, "")) || 1))}
                  className="h-8 w-12 px-1 text-center tabular-nums"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0"
                  onClick={() => onChange(setDeckQty(value, card.id, card.qty + 1))}
                  aria-label="More"
                >
                  <Plus className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0 text-muted"
                  onClick={() => onChange(removeDeckCard(value, card.id))}
                  aria-label="Remove"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className={cn("text-xs", required ? "text-live" : "text-subtle")}>
          {required
            ? ptcg
              ? "Import a list or add at least one card to submit."
              : "Add at least one card to submit."
            : "Search and add cards with a quantity."}
        </p>
      )}
    </div>
  );
}
