import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  cardImageUrl,
  fetchLookupCard,
  searchLookupCards,
  type LookupCard,
} from "@/lib/card-lookup";
import { GuideButton, TabletGuide, useTabletGuide } from "@/components/tablet/tablet-guide";
import { cn } from "@/lib/cn";

export function CardLookup({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [liveOnly, setLiveOnly] = useState(true);
  const [results, setResults] = useState<LookupCard[]>([]);
  const [selected, setSelected] = useState<LookupCard | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const guide = useTabletGuide("cards", false);

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
      void searchLookupCards(q, liveOnly)
        .then((rows) => {
          if (cancelled) return;
          setResults(rows);
          setStatus("idle");
        })
        .catch(() => {
          if (cancelled) return;
          setStatus("error");
        });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, liveOnly]);

  const openCard = async (card: LookupCard) => {
    setSelected(card);
    try {
      const detail = await fetchLookupCard(card.id);
      if (detail) setSelected(detail);
    } catch {
      /* keep list row */
    }
  };

  return (
    <section className={cn("flex min-h-0 flex-col rounded-xl border border-border bg-surface", compact ? "p-3" : "p-4")}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-mono text-[0.65rem] tracking-[0.2em] text-muted uppercase">Card lookup</p>
          <p className="text-sm text-muted">Pokémon TCG Live data via TCGdex. Search for a ruling.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <GuideButton onClick={guide.openGuide} />
          <div className="flex rounded-md bg-surface-2 p-0.5">
            <FilterChip active={liveOnly} onClick={() => setLiveOnly(true)}>
              Live
            </FilterChip>
            <FilterChip active={!liveOnly} onClick={() => setLiveOnly(false)}>
              All sets
            </FilterChip>
          </div>
        </div>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Pikachu, Iono, Boss’s Orders…"
          className="pl-9"
        />
      </div>
      {status === "loading" ? (
        <p className="mt-4 text-sm text-muted">Searching…</p>
      ) : status === "error" ? (
        <p className="mt-4 text-sm text-live">Lookup failed. Try again.</p>
      ) : results.length > 0 ? (
        <ul className="mt-3 min-h-0 flex-1 space-y-1 overflow-auto">
          {results.map((card) => (
            <li key={card.id}>
              <button
                type="button"
                onClick={() => void openCard(card)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left",
                  selected?.id === card.id ? "bg-accent/15 text-fg" : "hover:bg-surface-2",
                )}
              >
                {card.image ? (
                  <img src={cardImageUrl(card.image, "low")} alt="" className="h-12 w-9 shrink-0 rounded-sm object-cover" />
                ) : (
                  <span className="grid h-12 w-9 shrink-0 place-items-center rounded-sm bg-surface text-[0.6rem] text-muted">
                    —
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{card.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {[card.set, card.number].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : query.trim().length >= 2 ? (
        <p className="mt-4 text-sm text-muted">No cards matched.</p>
      ) : (
        <p className="mt-4 text-sm text-muted">Type at least two letters. Live is Standard-legal TCG Live cards.</p>
      )}

      {selected ? <CardDetail card={selected} /> : null}
      <TabletGuide kind="cards" open={guide.open} onClose={guide.close} />
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("rounded px-2.5 py-1 text-xs font-medium", active ? "bg-surface text-fg" : "text-muted")}
    >
      {children}
    </button>
  );
}

function CardDetail({ card }: { card: LookupCard }) {
  return (
    <article className="mt-3 grid gap-3 rounded-lg bg-surface-2 p-3 sm:grid-cols-[8.5rem_1fr]">
      {card.image ? (
        <img src={cardImageUrl(card.image)} alt="" className="mx-auto w-32 rounded-md" />
      ) : (
        <div className="grid h-40 place-items-center rounded-md bg-surface text-xs text-muted">No art</div>
      )}
      <div className="min-w-0">
        <h3 className="font-display text-xl font-semibold uppercase">{card.name}</h3>
        <p className="text-xs text-muted">
          {[card.set, card.number, card.rarity, card.stage || card.trainerType || card.category, card.type, card.hp ? `${card.hp} HP` : ""]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {card.abilities?.map((ability) => (
          <p key={ability.name} className="mt-2 text-sm leading-relaxed">
            <span className="text-muted">Ability · </span>
            <span className="font-medium">{ability.name}. </span>
            {ability.text}
          </p>
        ))}
        {card.attacks?.map((attack) => (
          <p key={attack.name} className="mt-2 text-sm leading-relaxed">
            <span className="font-medium">{attack.name}</span>
            {attack.cost?.length ? <span className="text-muted"> · {attack.cost.join(" ")}</span> : null}
            {attack.damage ? <span className="tabular-nums"> · {attack.damage}</span> : null}
            {attack.text ? <span className="mt-0.5 block text-muted">{attack.text}</span> : null}
          </p>
        ))}
        {card.text ? <p className="mt-2 text-sm leading-relaxed text-fg">{card.text}</p> : null}
      </div>
    </article>
  );
}
