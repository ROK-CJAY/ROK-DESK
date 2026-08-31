import { useEffect, useState } from "react";
import { Minus, Plus, Search, Trash2 } from "lucide-react";
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
  const [importStatus, setImportStatus] = useState<"idle" | "loading" | "error">("idle");
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const total = decklistCount(value);
  const canPaste = catalog === "ptcg";

  const importPaste = async () => {
    const text = paste.trim();
    if (!text || !canPaste) return;
    setImportStatus("loading");
    setUnmatched([]);
    try {
      const res = await fetch("/api/ptcg-cards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const body = (await res.json()) as {
        cards?: DeckCard[];
        unmatched?: { name?: string; qty?: number; set?: string; number?: string }[];
        error?: string;
      };
      if (!res.ok) throw new Error(body.error || "Import failed");
      let next = value;
      for (const card of body.cards ?? []) {
        next = addDeckCard(next, card, card.qty);
      }
      onChange(next);
      setUnmatched(
        (body.unmatched ?? []).map((row) =>
          [row.qty, row.name, row.set, row.number].filter(Boolean).join(" "),
        ),
      );
      setImportStatus("idle");
    } catch {
      setImportStatus("error");
    }
  };

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

  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase">
          Decklist{required ? " · required" : ""}
        </p>
        <p className="font-mono text-xs tabular-nums text-muted">{total} cards</p>
      </div>
      {canPaste ? (
        <div className="grid gap-2 rounded-lg border border-border bg-surface-2 p-2">
          <p className="font-mono text-[0.62rem] tracking-[0.14em] text-muted uppercase">
            Limitless / PTCGL paste
          </p>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={5}
            placeholder={"3 Basic {P} Energy MEE 5\n4 Telepathic {P} Energy POR 88"}
            className="min-h-24 w-full resize-y rounded-md border border-border bg-surface px-2 py-1.5 font-mono text-xs"
          />
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" disabled={!paste.trim() || importStatus === "loading"} onClick={() => void importPaste()}>
              {importStatus === "loading" ? "Importing…" : "Import list"}
            </Button>
            {importStatus === "error" ? <p className="text-xs text-live">Import failed. Try again.</p> : null}
          </div>
          {unmatched.length ? (
            <p className="text-xs text-live">Could not match: {unmatched.join(" · ")}</p>
          ) : null}
        </div>
      ) : null}
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
                  <img src={cardImageUrl(card.image, "low", card.id)} alt="" className="h-10 w-7 shrink-0 rounded-sm object-cover" />
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
                <img src={cardImageUrl(card.image, "low", card.id)} alt="" className="h-9 w-6 shrink-0 rounded-sm object-cover" />
              ) : (
                <span className="size-6 shrink-0 rounded-sm bg-surface" />
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
          {required ? "Add at least one card to submit." : "Search and add cards with a quantity."}
        </p>
      )}
    </div>
  );
}
