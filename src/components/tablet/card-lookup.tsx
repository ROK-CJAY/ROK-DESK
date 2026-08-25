import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  fetchLookupCard,
  fetchScryfallCard,
  fetchSwuCard,
  fetchYgoCard,
  fetchOpCard,
  fetchRiftCard,
  fetchLorcanaCard,
  scryfallLegalFor,
  searchLookupCards,
  searchScryfallCards,
  searchSwuCards,
  searchYgoCards,
  searchOpCards,
  searchRiftCards,
  searchLorcanaCards,
  ygoFormatFor,
  type LookupCard,
} from "@/lib/card-lookup";
import { emptySpotlight, type SeatId } from "@/lib/desk-types";
import { lookupFromDeck, type DeckCard } from "@/lib/decklist";
import { addToBench, monFromLookup } from "@/lib/ptcg-board";
import { useDeskStore } from "@/lib/desk-store";
import { GuideButton, TabletGuide, useTabletGuide } from "@/components/tablet/tablet-guide";
import { Button } from "@/components/ui/button";
import { RemoteArt } from "@/components/ui/remote-art";
import { cn } from "@/lib/cn";

export function CardLookup({
  compact = false,
  catalog = "ptcg",
  formatName = "",
}: {
  compact?: boolean;
  catalog?: "ptcg" | "mtg" | "swu" | "ygo" | "op" | "rift" | "lorcana";
  formatName?: string;
}) {
  const patch = useDeskStore((s) => s.patch);
  const spotlight = useDeskStore((s) => s.desk.cardSpotlight);
  const ptcgBoard = useDeskStore((s) => s.desk.ptcgBoard);
  const p1 = useDeskStore((s) => s.desk.p1);
  const p2 = useDeskStore((s) => s.desk.p2);
  const p3 = useDeskStore((s) => s.desk.p3);
  const p4 = useDeskStore((s) => s.desk.p4);
  const tableSize = useDeskStore((s) => s.desk.tableSize);
  const hydrate = useDeskStore((s) => s.hydrate);
  const ready = useDeskStore((s) => s.ready);
  const [query, setQuery] = useState("");
  const [liveOnly, setLiveOnly] = useState(true);
  const [results, setResults] = useState<LookupCard[]>([]);
  const [selected, setSelected] = useState<LookupCard | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const guide = useTabletGuide(
    catalog === "mtg"
      ? "mtg-cards"
      : catalog === "swu"
        ? "swu-cards"
        : catalog === "ygo"
          ? "ygo-cards"
          : catalog === "op"
            ? "op-cards"
            : catalog === "rift"
              ? "rift-cards"
              : catalog === "lorcana"
                ? "lorcana-cards"
                : "cards",
    false,
  );
  const legal = catalog === "mtg" ? scryfallLegalFor(formatName) : null;
  const ygoFormat = catalog === "ygo" ? ygoFormatFor(formatName) : null;
  const mtg = catalog === "mtg";
  const swu = catalog === "swu";
  const ygo = catalog === "ygo";
  const op = catalog === "op";
  const rift = catalog === "rift";
  const lorcana = catalog === "lorcana";

  useEffect(() => {
    if (!ready) void hydrate();
  }, [ready, hydrate]);

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
      const run = mtg
        ? searchScryfallCards(q, legal, !liveOnly)
        : swu
          ? searchSwuCards(q)
          : ygo
            ? searchYgoCards(q, liveOnly ? ygoFormat : null)
            : op
              ? searchOpCards(q)
              : rift
                ? searchRiftCards(q)
                : lorcana
                  ? searchLorcanaCards(q)
                  : searchLookupCards(q, liveOnly);
      void run
        .then((rows) => {
          if (cancelled) return;
          setResults(rows);
          setStatus("idle");
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
  }, [query, liveOnly, mtg, swu, ygo, op, rift, lorcana, legal, ygoFormat]);

  useEffect(() => {
    setQuery("");
    setResults([]);
    setSelected(null);
    setStatus("idle");
    setLiveOnly(true);
  }, [catalog]);

  const detailOf = async (card: LookupCard) => {
    if ((card.attacks && card.attacks.length) || (card.abilities && card.abilities.length) || card.hp) return card;
    try {
      return (await fetchLookupCard(card.id)) ?? card;
    } catch {
      return card;
    }
  };

  const pushToStream = async (card: LookupCard, side?: "p1" | "p2") => {
    const full = catalog === "ptcg" ? await detailOf(card) : card;
    const mon = monFromLookup(full);
    patch({
      cardSpotlight: {
        visible: true,
        id: full.id,
        name: full.name,
        set: full.set ?? "",
        number: full.number ?? "",
        image: full.image ?? "",
        type: full.type ?? "",
      },
    });
    if (catalog === "ptcg" && side) {
      const live = useDeskStore.getState().desk.ptcgBoard;
      patch({ ptcgBoard: { ...live, [side]: { ...live[side], spotlight: mon } } });
    }
  };

  const clearStream = (side?: "p1" | "p2") => {
    if (catalog === "ptcg" && side) {
      const live = useDeskStore.getState().desk.ptcgBoard;
      patch({ ptcgBoard: { ...live, [side]: { ...live[side], spotlight: null } } });
      const other = side === "p1" ? live.p2.spotlight : live.p1.spotlight;
      if (!other) patch({ cardSpotlight: emptySpotlight() });
      return;
    }
    if (catalog === "ptcg") {
      const live = useDeskStore.getState().desk.ptcgBoard;
      patch({
        cardSpotlight: emptySpotlight(),
        ptcgBoard: {
          p1: { ...live.p1, spotlight: null },
          p2: { ...live.p2, spotlight: null },
        },
      });
      return;
    }
    patch({ cardSpotlight: emptySpotlight() });
  };

  const setActive = async (card: LookupCard, side: "p1" | "p2") => {
    const full = await detailOf(card);
    const live = useDeskStore.getState().desk.ptcgBoard;
    patch({ ptcgBoard: { ...live, [side]: { ...live[side], active: monFromLookup(full) } } });
  };

  const setBench = async (card: LookupCard, side: "p1" | "p2") => {
    const full = await detailOf(card);
    const live = useDeskStore.getState().desk.ptcgBoard;
    patch({ ptcgBoard: { ...live, [side]: addToBench(live[side], monFromLookup(full)) } });
  };

  const openCard = async (card: LookupCard) => {
    setSelected(card);
    try {
      const detail = mtg
        ? await fetchScryfallCard(card.id)
        : swu
          ? await fetchSwuCard(card.id)
          : ygo
            ? await fetchYgoCard(card.id)
            : op
              ? await fetchOpCard(card.id)
              : rift
                ? await fetchRiftCard(card.id)
                : lorcana
                  ? await fetchLorcanaCard(card.id)
                  : await fetchLookupCard(card.id);
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
          <p className="text-sm text-muted">
            {compact
              ? catalog === "ptcg"
                ? "Search a Pokémon, set Active / Bench, then Show P1 or Show P2 over the bench."
                : "Search, pick a card, then Show on stream."
              : mtg
              ? "Scryfall search. Read the oracle text, then Show on stream if you want the art on air."
              : swu
                ? "SWU-DB search. Read the printed text, then Show on stream if you want the art on air."
                : ygo
                  ? "YGOPRODeck search. Read the card text, then Show on stream if you want the art on air."
                  : op
                    ? "Official OP card data. Read the text, then Show on stream if you want the art on air."
                    : rift
                      ? "Riftcodex search. Read the printed text, then Show on stream if you want the art on air."
                      : lorcana
                        ? "Lorcast search. Read the printed text, then Show on stream if you want the art on air."
                        : "Search a card to read it. Show on stream when you want the art on air."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <GuideButton onClick={guide.openGuide} />
          {swu || op || rift || lorcana ? null : (
          <div className="flex rounded-md bg-surface-2 p-0.5">
            <FilterChip active={liveOnly} onClick={() => setLiveOnly(true)}>
              {mtg && legal ? formatName : ygo && ygoFormat ? formatName : "Live"}
            </FilterChip>
            <FilterChip active={!liveOnly} onClick={() => setLiveOnly(false)}>
              All printings
            </FilterChip>
          </div>
          )}
        </div>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            mtg
              ? "Search Sol Ring, Swords to Plowshares…"
              : swu
                ? "Search Vader, Force Throw, Superlaser…"
                : ygo
                  ? "Search Ash Blossom, Infinite Impermanence…"
                  : op
                    ? "Search Nami, Luffy, Zoro…"
                    : rift
                      ? "Search Jinx, Volibear, Hidden Blade…"
                      : lorcana
                        ? "Search Elsa, Be Prepared, Maui…"
                        : "Search Pikachu, Iono, Boss’s Orders…"
          }
          className="pl-9"
        />
      </div>
      <MatchDeckStrip
        players={{ p1, p2, p3, p4, tableSize }}
        query={query}
        selectedId={selected?.id}
        onPick={(card) => void openCard(lookupFromDeck(card))}
      />
      {selected ? (
        <CardDetail
          card={selected}
          ptcg={catalog === "ptcg"}
          onAir={Boolean(spotlight?.visible && spotlight.id === selected.id)}
          onAirP1={Boolean(ptcgBoard.p1.spotlight && ptcgBoard.p1.spotlight.id === selected.id)}
          onAirP2={Boolean(ptcgBoard.p2.spotlight && ptcgBoard.p2.spotlight.id === selected.id)}
          onShow={() => void pushToStream(selected)}
          onShowP1={() => void pushToStream(selected, "p1")}
          onShowP2={() => void pushToStream(selected, "p2")}
          onClear={() => clearStream()}
          onClearP1={() => clearStream("p1")}
          onClearP2={() => clearStream("p2")}
          onActiveP1={() => void setActive(selected, "p1")}
          onActiveP2={() => void setActive(selected, "p2")}
          onBenchP1={() => void setBench(selected, "p1")}
          onBenchP2={() => void setBench(selected, "p2")}
        />
      ) : null}
      {status === "loading" ? (
        <p className="mt-4 text-sm text-muted">Searching…</p>
      ) : status === "error" ? (
        <p className="mt-4 text-sm text-live">Lookup failed. Try again.</p>
      ) : results.length > 0 ? (
        <ul className={cn("mt-3 min-h-0 flex-1 space-y-1 overflow-auto", compact && "max-h-72")}>
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
                {card.image || card.id ? (
                  <RemoteArt image={card.image} id={card.id} size="low" className="h-12 w-9 shrink-0 rounded-sm object-cover" />
                ) : (
                  <span className="grid h-12 w-9 shrink-0 place-items-center rounded-sm bg-surface text-[0.6rem] text-muted">
                    —
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{card.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {[card.type, card.mana ? `Cost ${card.mana}` : "", card.number].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : query.trim().length >= 2 ? (
        <p className="mt-4 text-sm text-muted">No cards matched.</p>
      ) : (
        <p className="mt-4 text-sm text-muted">
          {mtg
            ? `Type at least two letters. ${legal ? `${formatName} filters to cards legal in this event.` : "All printings searches the full Scryfall catalog."}`
            : swu
              ? "Type at least two letters. Search hits SWU-DB for Premier printings."
              : ygo
                ? `Type at least two letters. ${ygoFormat ? `${formatName} filters to that banlist when available.` : "All printings searches the full YGOPRODeck catalog."}`
                : op
                  ? "Type at least two letters. Search uses official English OP card data."
                  : "Type at least two letters. Live is Standard-legal TCG Live cards."}
        </p>
      )}

      <TabletGuide
        kind={
          catalog === "mtg"
            ? "mtg-cards"
            : catalog === "swu"
              ? "swu-cards"
              : catalog === "ygo"
                ? "ygo-cards"
                : catalog === "op"
                  ? "op-cards"
                  : "cards"
        }
        open={guide.open}
        onClose={guide.close}
      />
    </section>
  );
}

function MatchDeckStrip({
  players,
  query,
  selectedId,
  onPick,
}: {
  players: {
    p1: { name: string; decklist?: DeckCard[] };
    p2: { name: string; decklist?: DeckCard[] };
    p3: { name: string; decklist?: DeckCard[] };
    p4: { name: string; decklist?: DeckCard[] };
    tableSize: number;
  };
  query: string;
  selectedId?: string;
  onPick: (card: DeckCard) => void;
}) {
  const q = query.trim().toLowerCase();
  const seats = (["p1", "p2", "p3", "p4"] as const).slice(0, Math.max(2, players.tableSize));
  const groups = seats
    .map((seat, i) => {
      const player = players[seat];
      const cards = (player.decklist ?? []).filter((card) =>
        q.length < 1
          ? true
          : card.name.toLowerCase().includes(q) || card.set.toLowerCase().includes(q) || card.number.toLowerCase().includes(q),
      );
      if (!cards.length && !(player.decklist ?? []).length) return null;
      return { seat, label: player.name || `Player ${i + 1}`, cards };
    })
    .filter((row): row is { seat: SeatId; label: string; cards: DeckCard[] } => Boolean(row));
  if (!groups.length) return null;

  return (
    <div className="mt-3 rounded-lg border border-border/70 bg-surface-2/50 p-2">
      <p className="font-mono text-[0.58rem] tracking-[0.14em] text-muted uppercase">Saved decklists</p>
      <div className="mt-1.5 grid gap-2">
        {groups.map((group) => (
          <div key={group.seat}>
            <p className="truncate text-xs text-muted">
              {group.label}
              <span className="font-mono"> · {group.cards.length}</span>
            </p>
            {group.cards.length ? (
              <ul className="mt-1 flex flex-wrap gap-1">
                {group.cards.slice(0, 24).map((card) => (
                  <li key={`${group.seat}-${card.id}`}>
                    <button
                      type="button"
                      onClick={() => onPick(card)}
                      className={cn(
                        "rounded-md px-2 py-1 text-left text-xs",
                        selectedId === card.id ? "bg-accent/20 text-fg" : "bg-surface hover:bg-surface-2",
                      )}
                      title={`${card.qty}× ${card.name}`}
                    >
                      <span className="font-mono tabular-nums">{card.qty}×</span> {card.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[0.7rem] text-subtle">No cards match this search.</p>
            )}
          </div>
        ))}
      </div>
    </div>
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

function CardDetail({
  card,
  ptcg = false,
  onAir,
  onAirP1,
  onAirP2,
  onShow,
  onShowP1,
  onShowP2,
  onClear,
  onClearP1,
  onClearP2,
  onActiveP1,
  onActiveP2,
  onBenchP1,
  onBenchP2,
}: {
  card: LookupCard;
  ptcg?: boolean;
  onAir: boolean;
  onAirP1?: boolean;
  onAirP2?: boolean;
  onShow: () => void;
  onShowP1?: () => void;
  onShowP2?: () => void;
  onClear: () => void;
  onClearP1?: () => void;
  onClearP2?: () => void;
  onActiveP1?: () => void;
  onActiveP2?: () => void;
  onBenchP1?: () => void;
  onBenchP2?: () => void;
}) {
  return (
    <article className="mt-3 grid gap-3 rounded-lg bg-surface-2 p-3 sm:grid-cols-[8.5rem_1fr]">
      {card.image || card.id ? (
        <RemoteArt image={card.image} id={card.id} className="mx-auto w-32 rounded-md object-contain" />
      ) : (
        <div className="grid h-40 place-items-center rounded-md bg-surface text-xs text-muted">No art</div>
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-xl font-semibold uppercase">{card.name}</h3>
            <p className="text-xs text-muted">
              {[card.mana, card.set, card.number, card.rarity, card.stage || card.trainerType || card.category, card.type, card.hp ? `${card.hp} HP` : ""]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          {ptcg ? (
            <div className="flex flex-wrap gap-2">
              <Button variant={onAirP1 ? "live" : "default"} size="sm" type="button" onClick={onShowP1}>
                {onAirP1 ? "P1 on stream" : "Show P1"}
              </Button>
              <Button variant={onAirP2 ? "live" : "default"} size="sm" type="button" onClick={onShowP2}>
                {onAirP2 ? "P2 on stream" : "Show P2"}
              </Button>
              <Button variant="outline" size="sm" onClick={onClear} disabled={!onAirP1 && !onAirP2}>
                Clear
              </Button>
            </div>
          ) : (
          <div className="flex flex-wrap gap-2">
            {onAir ? (
              <Button variant="live" size="sm" type="button" aria-live="polite">
                On stream
              </Button>
            ) : (
              <Button size="sm" onClick={onShow}>
                Show on stream
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onClear} disabled={!onAir}>
              Clear
            </Button>
          </div>
          )}
        </div>
        {ptcg ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button type="button" variant="outline" size="sm" onClick={onActiveP1}>P1 active</Button>
            <Button type="button" variant="outline" size="sm" onClick={onBenchP1}>P1 bench</Button>
            <Button type="button" variant="outline" size="sm" onClick={onActiveP2}>P2 active</Button>
            <Button type="button" variant="outline" size="sm" onClick={onBenchP2}>P2 bench</Button>
          </div>
        ) : null}
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
        {card.text ? <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-fg">{card.text}</p> : null}
      </div>
    </article>
  );
}
