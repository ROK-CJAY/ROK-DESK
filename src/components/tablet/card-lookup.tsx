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
import {
  CARD_STACK_MAX,
  clearSpotlight,
  emptySpotlight,
  emptySideSpotlight,
  layerSpotlight,
  popSpotlight,
  replaceSpotlight,
  visibleCardStack,
  type SeatId,
} from "@/lib/desk-types";
import { lookupFromDeck, filterDecklist, hasSavedDecklist, type DeckCard } from "@/lib/decklist";
import { addToBench, monFromLookup } from "@/lib/ptcg-board";
import { useDeskStore } from "@/lib/desk-store";
import { useTournamentStore } from "@/lib/tournament-store";
import { liveMatchForSlot } from "@/lib/caster-path";
import { entrantById, matchEntrantIds, type TournamentState } from "@/lib/tournament-types";
import { GuideButton, TabletGuide, useTabletGuide } from "@/components/tablet/tablet-guide";
import { Button } from "@/components/ui/button";
import { RemoteArt } from "@/components/ui/remote-art";
import { PtcgCatalogButton } from "@/components/desk/ptcg-catalog-button";
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
  const cardStack = useDeskStore((s) => s.desk.cardStack);
  const sideSpotlight = useDeskStore((s) => s.desk.sideSpotlight);
  const ptcgBoard = useDeskStore((s) => s.desk.ptcgBoard);
  const p1 = useDeskStore((s) => s.desk.p1);
  const p2 = useDeskStore((s) => s.desk.p2);
  const p3 = useDeskStore((s) => s.desk.p3);
  const p4 = useDeskStore((s) => s.desk.p4);
  const tableSize = useDeskStore((s) => s.desk.tableSize);
  const matchSlot = useDeskStore((s) => s.desk.matchSlot);
  const tournament = useTournamentStore((s) => s.tournament);
  const hydrateTournament = useTournamentStore((s) => s.hydrate);
  const tournamentReady = useTournamentStore((s) => s.ready);
  const hydrate = useDeskStore((s) => s.hydrate);
  const ready = useDeskStore((s) => s.ready);
  const [query, setQuery] = useState("");
  const [liveOnly, setLiveOnly] = useState(true);
  const [scope, setScope] = useState<"match" | "catalog">("catalog");
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
  const matchPlayers = withLiveDecklists(
    [p1, p2, p3, p4].slice(0, Math.max(2, tableSize)),
    tournament,
    matchSlot,
  );
  const hasMatchDeck = hasSavedDecklist(matchPlayers);
  const matchScope = hasMatchDeck && scope === "match";

  useEffect(() => {
    if (!ready) void hydrate();
    if (!tournamentReady) void hydrateTournament();
  }, [ready, hydrate, tournamentReady, hydrateTournament]);

  useEffect(() => {
    setScope(hasMatchDeck ? "match" : "catalog");
  }, [hasMatchDeck, catalog]);

  useEffect(() => {
    if (matchScope) {
      setResults([]);
      setStatus("idle");
      return;
    }
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
          const fromMatch = hasMatchDeck ? [] : matchDeckHits(matchPlayers, q);
          const seen = new Set(fromMatch.map((card) => card.id));
          setResults([...fromMatch, ...rows.filter((card) => !seen.has(card.id))]);
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
  }, [query, liveOnly, mtg, swu, ygo, op, rift, lorcana, legal, ygoFormat, matchScope, hasMatchDeck, p1.decklist, p2.decklist, p3.decklist, p4.decklist, tournament, matchSlot]);

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
      const detail = await fetchLookupCard(card.id);
      if (!detail) return card;
      return {
        ...detail,
        image: card.image || detail.image,
        set: card.set || detail.set,
        number: card.number || detail.number,
      };
    } catch {
      return card;
    }
  };

  const stack = visibleCardStack({ cardSpotlight: spotlight, cardStack });

  const pushToStream = async (card: LookupCard, side?: "p1" | "p2") => {
    const full = catalog === "ptcg" ? await detailOf(card) : card;
    const spotlightCard = {
      visible: true,
      id: full.id,
      name: full.name,
      set: full.set ?? "",
      number: full.number ?? "",
      image: full.image ?? "",
      type: full.type ?? "",
    };
    if (catalog === "mtg") {
      const live = useDeskStore.getState().desk;
      patch(layerSpotlight(live, spotlightCard));
    } else {
      patch({ cardSpotlight: spotlightCard, cardStack: [spotlightCard] });
    }
    if (catalog === "ptcg" && side) {
      const live = useDeskStore.getState().desk.ptcgBoard;
      patch({ ptcgBoard: { ...live, [side]: { ...live[side], spotlight: monFromLookup(full) } } });
    }
    if ((catalog === "ygo" || catalog === "op" || catalog === "lorcana") && side) {
      const live = useDeskStore.getState().desk.sideSpotlight ?? emptySideSpotlight();
      patch({ sideSpotlight: { ...live, [side]: spotlightCard } });
    }
  };

  const replaceStream = async (card: LookupCard) => {
    const full = catalog === "ptcg" ? await detailOf(card) : card;
    patch(
      replaceSpotlight({
        visible: true,
        id: full.id,
        name: full.name,
        set: full.set ?? "",
        number: full.number ?? "",
        image: full.image ?? "",
        type: full.type ?? "",
      }),
    );
  };

  const clearStream = (side?: "p1" | "p2") => {
    if (catalog === "ptcg" && side) {
      const live = useDeskStore.getState().desk.ptcgBoard;
      patch({ ptcgBoard: { ...live, [side]: { ...live[side], spotlight: null } } });
      const other = side === "p1" ? live.p2.spotlight : live.p1.spotlight;
      if (!other) patch(clearSpotlight());
      return;
    }
    if (catalog === "ptcg") {
      const live = useDeskStore.getState().desk.ptcgBoard;
      patch({
        ...clearSpotlight(),
        ptcgBoard: {
          p1: { ...live.p1, spotlight: null },
          p2: { ...live.p2, spotlight: null },
        },
      });
      return;
    }
    if (catalog === "ygo" || catalog === "op" || catalog === "lorcana") {
      if (side) {
        const live = useDeskStore.getState().desk.sideSpotlight ?? emptySideSpotlight();
        const other = side === "p1" ? live.p2 : live.p1;
        patch({
          sideSpotlight: { ...live, [side]: emptySpotlight() },
          ...(other?.visible ? {} : clearSpotlight()),
        });
        return;
      }
      patch({
        ...clearSpotlight(),
        sideSpotlight: emptySideSpotlight(),
      });
      return;
    }
    patch(clearSpotlight());
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
      if (detail) {
        setSelected({
          ...detail,
          image: card.image || detail.image,
          set: card.set || detail.set,
          number: card.number || detail.number,
        });
      }
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
              ? hasMatchDeck
                ? "Submitted lists first. Catalog is backup. Show P1 / Show P2 over the bench."
              : catalog === "ptcg"
                ? "Search a Pokémon, set Active / Bench, then Show P1 or Show P2 over the bench."
                : catalog === "ygo" || catalog === "op" || catalog === "lorcana"
                  ? "Search a card, then Show P1 or Show P2 in that player’s well."
                  : "Search, pick a card, then Show on stream."
              : hasMatchDeck
                ? "Submitted lists for this pairing first, then the catalog. Tap a card for the scan."
              : mtg
              ? "Search a card, Show on stream, then pick the next piece and hit Layer. Each layer sits slightly lower on top."
              : swu
                ? "SWU-DB search. Read the printed text, then Show on stream if you want the art on air."
                : ygo
                  ? "YGOPRODeck search. Read the card text, then Show P1 or Show P2 in that player’s well."
                  : op
                    ? "Official OP card data. Read the text, then Show P1 or Show P2 in that player’s well."
                    : rift
                      ? "Riftcodex search. Read the printed text, then Show on stream if you want the art on air."
                      : lorcana
                        ? "Lorcast search. Read the printed text, then Show P1 or Show P2 in that player’s well."
                        : "Search a card to read it. Show on stream when you want the art on air."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {catalog === "ptcg" ? <PtcgCatalogButton compact /> : null}
          <GuideButton onClick={guide.openGuide} />
          {hasMatchDeck ? (
            <div className="flex rounded-md bg-surface-2 p-0.5">
              <FilterChip active={scope === "match"} onClick={() => setScope("match")}>
                This match
              </FilterChip>
              <FilterChip active={scope === "catalog"} onClick={() => setScope("catalog")}>
                Catalog
              </FilterChip>
            </div>
          ) : null}
          {matchScope || swu || op || rift || lorcana ? null : (
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
            matchScope
              ? "Filter this match’s lists…"
              : mtg
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
      {mtg ? (
        <ComboStrip
          stack={stack}
          onPop={() => patch(popSpotlight(useDeskStore.getState().desk))}
          onClear={() => patch(clearSpotlight())}
        />
      ) : null}
      <MatchDeckStrip
        players={{
          p1: matchPlayers[0] ?? p1,
          p2: matchPlayers[1] ?? p2,
          p3: matchPlayers[2] ?? p3,
          p4: matchPlayers[3] ?? p4,
          tableSize,
        }}
        query={query}
        selectedId={selected?.id}
        compact={compact}
        asResults={hasMatchDeck}
        onPick={(card) => void openCard(lookupFromDeck(card))}
        onShow={
          mtg
            ? (card) => void pushToStream(lookupFromDeck(card))
            : undefined
        }
        layerLabel={stack.length >= CARD_STACK_MAX ? "Full" : stack.length ? "Layer" : "Show"}
        layerDisabled={stack.length >= CARD_STACK_MAX}
      />
      {selected ? (
        <CardDetail
          card={selected}
          ptcg={catalog === "ptcg"}
          splitWells={catalog === "ptcg" || catalog === "ygo" || catalog === "op" || catalog === "lorcana"}
          combo={
            mtg
              ? {
                  count: stack.length,
                  full: stack.length >= CARD_STACK_MAX,
                  onReplace: () => void replaceStream(selected),
                  onPop: () => patch(popSpotlight(useDeskStore.getState().desk)),
                }
              : undefined
          }
          onAir={Boolean(spotlight?.visible && spotlight.id === selected.id)}
          onAirP1={
            ygo || op || lorcana
              ? Boolean(sideSpotlight?.p1.visible && sideSpotlight.p1.id === selected.id)
              : Boolean(ptcgBoard.p1.spotlight && ptcgBoard.p1.spotlight.id === selected.id)
          }
          onAirP2={
            ygo || op || lorcana
              ? Boolean(sideSpotlight?.p2.visible && sideSpotlight.p2.id === selected.id)
              : Boolean(ptcgBoard.p2.spotlight && ptcgBoard.p2.spotlight.id === selected.id)
          }
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
      {matchScope ? null : status === "loading" ? (
        <p className="mt-4 text-sm text-muted">Searching…</p>
      ) : matchScope ? null : status === "error" ? (
        <p className="mt-4 text-sm text-live">Lookup failed. Try again.</p>
      ) : matchScope ? null : results.length > 0 ? (
        <ul className={cn("mt-3 min-h-0 flex-1 space-y-1 overflow-auto", compact && "max-h-72")}>
          {results.map((card) => (
            <li key={card.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void openCard(card)}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 text-left",
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
              {mtg ? (
                <Button
                  type="button"
                  size="sm"
                  variant={stack.length ? "secondary" : "default"}
                  className="mr-1 shrink-0"
                  disabled={stack.length >= CARD_STACK_MAX}
                  onClick={() => void pushToStream(card)}
                >
                  {stack.length >= CARD_STACK_MAX ? "Full" : stack.length ? "Layer" : "Show"}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : matchScope ? null : query.trim().length >= 2 ? (
        <p className="mt-4 text-sm text-muted">No cards matched.</p>
      ) : matchScope ? null : (
        <p className="mt-4 text-sm text-muted">
          {mtg
            ? `Type at least two letters. ${legal ? `${formatName} filters to cards legal in this event.` : "All printings searches the full Scryfall catalog."}`
            : swu
              ? "Type at least two letters. Search hits SWU-DB for Premier printings."
              : ygo
                ? `Type at least two letters. ${ygoFormat ? `${formatName} filters to that banlist when available.` : "All printings searches the full YGOPRODeck catalog."}`
                : op
                  ? "Type at least two letters. Search uses official English OP card data."
                  : rift
                    ? "Type at least two letters. Search hits Riftcodex."
                    : lorcana
                      ? "Type at least two letters. Search hits Lorcast."
                      : "Type at least two letters. Live is current Standard (regulation H+). All printings is every set."}
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

function ComboStrip({
  stack,
  onPop,
  onClear,
}: {
  stack: { id: string; name: string; image?: string }[];
  onPop: () => void;
  onClear: () => void;
}) {
  return (
    <div className="mt-3 rounded-lg border border-border bg-surface-2 p-2">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[0.58rem] tracking-[0.14em] text-muted uppercase">
          {stack.length ? `On stream · ${stack.length}` : "Combo stack"}
        </p>
        {stack.length ? (
          <div className="flex gap-1.5">
            {stack.length > 1 ? (
              <Button type="button" variant="outline" size="sm" onClick={onPop}>
                Pop last
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={onClear}>
              Clear
            </Button>
          </div>
        ) : null}
      </div>
      {stack.length ? (
        <ol className="mt-2 flex items-end gap-1">
          {stack.map((card, index) => (
            <li key={`${card.id}-${index}`} className="min-w-0">
              {card.image || card.id ? (
                <RemoteArt
                  image={card.image}
                  id={card.id}
                  size="low"
                  className={cn("h-16 w-12 rounded-sm object-cover shadow-md", index ? "-ml-2.5" : "")}
                />
              ) : (
                <span className="grid h-16 w-12 place-items-center rounded-sm bg-surface text-[0.6rem] text-muted">
                  {index + 1}
                </span>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-1 text-xs text-muted">
          Show a card, search the next one, then Layer. Up to {CARD_STACK_MAX} cards.
        </p>
      )}
    </div>
  );
}

function MatchDeckStrip({
  players,
  query,
  selectedId,
  onPick,
  onShow,
  layerLabel,
  layerDisabled,
  compact,
  asResults,
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
  onShow?: (card: DeckCard) => void;
  layerLabel?: string;
  layerDisabled?: boolean;
  compact?: boolean;
  asResults?: boolean;
}) {
  const seats = (["p1", "p2", "p3", "p4"] as const).slice(0, Math.max(2, players.tableSize));
  const groups = seats
    .map((seat, i) => {
      const player = players[seat];
      const cards = filterDecklist(player.decklist, query);
      if (!cards.length && !(player.decklist ?? []).length) return null;
      return { seat, label: player.name || `Player ${i + 1}`, cards, total: (player.decklist ?? []).length };
    })
    .filter((row): row is { seat: SeatId; label: string; cards: DeckCard[]; total: number } => Boolean(row));
  if (!groups.length) return null;

  if (asResults) {
    const anyCards = groups.some((group) => group.cards.length);
    return (
      <div className="mt-3">
        <p className="font-mono text-[0.58rem] tracking-[0.14em] text-muted uppercase">This match</p>
        <div className="mt-1.5 max-h-[20rem] space-y-2 overflow-y-auto overscroll-contain">
          {groups.map((group) => (
            <div key={group.seat}>
              <p className="sticky top-0 z-10 truncate bg-surface py-1 text-xs text-muted">
                {group.label}
                <span className="font-mono">
                  {" "}
                  · {group.cards.length}
                  {query.trim() ? ` / ${group.total}` : ""}
                </span>
              </p>
              {group.cards.length ? (
                <ul className="space-y-1">
                  {group.cards.map((card) => (
                    <li key={`${group.seat}-${card.id}`} className="flex h-16 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onPick(card)}
                        className={cn(
                          "flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1.5 text-left",
                          selectedId === card.id ? "bg-accent/15 text-fg" : "hover:bg-surface-2",
                        )}
                      >
                        {card.image || card.id ? (
                          <RemoteArt
                            image={card.image}
                            id={card.id}
                            size="low"
                            className="h-12 w-9 shrink-0 rounded-sm object-cover"
                          />
                        ) : (
                          <span className="grid h-12 w-9 shrink-0 place-items-center rounded-sm bg-surface text-[0.6rem] text-muted">
                            —
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{card.name}</span>
                          <span className="block truncate text-xs text-muted">
                            {[`${card.qty}×`, card.type, card.set, card.number].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                      </button>
                      {onShow ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="mr-1 shrink-0"
                          disabled={layerDisabled}
                          onClick={() => onShow(card)}
                        >
                          {layerLabel ?? "Show"}
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-[0.7rem] text-subtle">No cards in this list match.</p>
              )}
            </div>
          ))}
          {!anyCards ? (
            <p className="text-sm text-muted">Nothing matched. Try Catalog.</p>
          ) : null}
        </div>
      </div>
    );
  }

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

function matchDeckHits(players: { decklist?: DeckCard[] }[], query: string) {
  const seen = new Set<string>();
  const out: LookupCard[] = [];
  for (const player of players) {
    for (const card of filterDecklist(player.decklist, query)) {
      if (seen.has(card.id)) continue;
      seen.add(card.id);
      out.push(lookupFromDeck(card));
    }
  }
  return out;
}

function withLiveDecklists<T extends { name: string; decklist?: DeckCard[] }>(
  players: T[],
  tournament: TournamentState,
  slot: 1 | 2 | 3,
): T[] {
  if (hasSavedDecklist(players)) return players;
  const live = liveMatchForSlot(tournament, slot);
  if (!live) return players;
  const ids = matchEntrantIds(live);
  return players.map((player, i) => {
    const list = ids[i] ? (entrantById(tournament, ids[i])?.decklist ?? []) : [];
    return list.length ? { ...player, decklist: list } : player;
  });
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
  splitWells = false,
  combo,
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
  splitWells?: boolean;
  combo?: { count: number; full: boolean; onReplace: () => void; onPop: () => void };
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
          {splitWells ? (
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
          ) : combo ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={onShow} disabled={combo.full && combo.count > 0}>
                {combo.count === 0 ? "Show on stream" : combo.full ? "Stack full" : "Layer on stream"}
              </Button>
              {combo.count > 0 ? (
                <Button variant="outline" size="sm" onClick={combo.onReplace}>
                  Replace
                </Button>
              ) : null}
              {combo.count > 1 ? (
                <Button variant="outline" size="sm" onClick={combo.onPop}>
                  Pop last
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={onClear} disabled={combo.count === 0}>
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
        {combo && combo.count > 0 ? (
          <p className="mt-1.5 text-xs text-muted">
            {combo.count} on stream. Search the next card and hit Layer — it stacks slightly lower on top.
          </p>
        ) : combo ? (
          <p className="mt-1.5 text-xs text-muted">Show this card, then Layer the next one for a combo.</p>
        ) : null}
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
