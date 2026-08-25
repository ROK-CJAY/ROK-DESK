import { useEffect, useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cardImageUrl, searchCommanderCards, type LookupCard } from "@/lib/card-lookup";
import { cn } from "@/lib/cn";

export function CommanderSearchField({
  value,
  onChange,
  placeholder = "Search commander",
  className,
}: {
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const listId = useId();
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<LookupCard[]>([]);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setStatus("idle");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    const timer = window.setTimeout(() => {
      void searchCommanderCards(q)
        .then((rows) => {
          if (cancelled) return;
          setResults(rows.slice(0, 12));
          setStatus("idle");
          setOpen(true);
        })
        .catch(() => {
          if (cancelled) return;
          setStatus("error");
        });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const pick = (name: string) => {
    onChange(name);
    setQuery(name);
    setOpen(false);
  };

  return (
    <Popover open={open && (results.length > 0 || status !== "idle")} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="w-full min-w-0">
          <Input
            value={query}
            placeholder={placeholder}
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            className={className}
            onFocus={() => {
              if (results.length) setOpen(true);
            }}
            onChange={(e) => {
              const next = e.target.value;
              setQuery(next);
              onChange(next);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              if (e.key === "Enter" && results[0]) {
                e.preventDefault();
                pick(results[0].name);
              }
            }}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="w-[min(22rem,calc(100vw-2rem))] p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {status === "loading" && !results.length ? (
          <p className="px-2 py-1.5 text-xs text-muted">Searching Scryfall…</p>
        ) : status === "error" ? (
          <p className="px-2 py-1.5 text-xs text-muted">Couldn’t reach Scryfall. Type the name instead.</p>
        ) : (
          <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto">
            {results.map((card) => (
              <li key={card.id}>
                <button
                  type="button"
                  role="option"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-2",
                    card.name === value && "bg-surface-2",
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(card.name)}
                >
                  {card.image ? (
                    <img
                      src={cardImageUrl(card.image, "low")}
                      alt=""
                      className="size-8 shrink-0 rounded-sm object-cover"
                    />
                  ) : (
                    <span className="size-8 shrink-0 rounded-sm bg-surface-2" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{card.name}</span>
                    {card.type ? <span className="block truncate text-[0.68rem] text-muted">{card.type}</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
