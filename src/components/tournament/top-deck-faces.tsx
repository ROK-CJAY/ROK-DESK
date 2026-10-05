import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Field } from "@/components/desk/field";
import { overlayPath, overlayWindowName } from "@/components/desk/sources";
import { topDeckEntrants } from "@/components/overlays/top-decks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RemoteArt } from "@/components/ui/remote-art";
import { catalogForGame, searchCatalogCards, type LookupCard, type LookupCatalog } from "@/lib/card-lookup";
import type { DeckCard } from "@/lib/decklist";
import { clampTopDeckCount, deskLaneOf, emptyTopDeckSlot, type TopDeckSlot } from "@/lib/desk-types";
import { useDeskStore } from "@/lib/desk-store";
import { isVgcTitle, type GameId } from "@/lib/games";
import { cn } from "@/lib/cn";
import { useTournamentStore } from "@/lib/tournament-store";
import { viewTournament, type TournamentState } from "@/lib/tournament-types";

export function TopDecksPanel({ follow = "tournament" }: { follow?: "tournament" | "desk" }) {
  const tournament = useTournamentStore((s) => s.tournament);
  const desk = useDeskStore((s) => s.desk);
  const patchGameLane = useDeskStore((s) => s.patchGameLane);
  const gameId: GameId = follow === "desk" ? desk.gameId : tournament.gameId;
  const lane = deskLaneOf(desk, gameId, 1);
  const catalog = catalogForGame(gameId);
  if (isVgcTitle(gameId) || !catalog) return null;
  const viewed = viewTournament(tournament, gameId);

  return (
    <section className={cn("rounded-xl border border-border bg-surface p-4", follow === "desk" && "order-4 lg:col-span-3")}>
      <div className="grid gap-3">
        <div>
          <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Top deck cards</p>
          <p className="mt-1 text-xs text-muted">
            Saved on this game. Type the name, the deck, and search both cards. A blank name or deck uses this game’s standings.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="How many decks" className="w-36">
            <Input
              type="number"
              min={1}
              max={16}
              value={lane.topDeckCount}
              onChange={(e) => patchGameLane(gameId, { topDeckCount: clampTopDeckCount(e.target.value) })}
            />
          </Field>
          <Button variant="secondary" size="sm" asChild>
            <a href={overlayPath(gameId, "top-decks")} target={overlayWindowName(gameId, "top-decks")} rel="noreferrer">
              Open top decks
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(`${window.location.origin}${overlayPath(gameId, "top-decks")}`);
            }}
          >
            Copy URL
          </Button>
        </div>
        <TopDeckFaces
          gameId={gameId}
          tournament={viewed}
          count={lane.topDeckCount}
          slots={lane.topDeckSlots}
          catalog={catalog}
          formatName={viewed.formatName}
          wide={follow === "desk"}
        />
      </div>
    </section>
  );
}

export function TopDeckFaces({
  gameId,
  tournament,
  count,
  slots,
  catalog,
  formatName,
  wide = false,
}: {
  gameId: GameId;
  tournament: TournamentState;
  count: number;
  slots: TopDeckSlot[];
  catalog: LookupCatalog;
  formatName: string;
  wide?: boolean;
}) {
  const patchGameLane = useDeskStore((s) => s.patchGameLane);
  const players = topDeckEntrants(tournament, count);
  const shown = Math.min(16, Math.max(1, count || 8));

  const write = (index: number, next: TopDeckSlot) => {
    const live = useDeskStore.getState().desk;
    const lane = deskLaneOf(live, gameId, 1);
    const current = lane.topDeckSlots.slice(0, 16);
    while (current.length <= index) current.push(emptyTopDeckSlot());
    current[index] = next;
    patchGameLane(gameId, { topDeckSlots: current });
  };

  const setName = (index: number, name: string) => {
    const current = deskLaneOf(useDeskStore.getState().desk, gameId, 1).topDeckSlots[index] ?? emptyTopDeckSlot();
    write(index, { ...current, name });
  };

  const setDeck = (index: number, deck: string) => {
    const current = deskLaneOf(useDeskStore.getState().desk, gameId, 1).topDeckSlots[index] ?? emptyTopDeckSlot();
    write(index, { ...current, deck });
  };

  const setFace = (index: number, side: 0 | 1, card: DeckCard | null) => {
    const current = deskLaneOf(useDeskStore.getState().desk, gameId, 1).topDeckSlots[index] ?? emptyTopDeckSlot();
    const faces: [DeckCard | null, DeckCard | null] = [current.faces[0], current.faces[1]];
    faces[side] = card;
    write(index, { ...current, faces });
  };

  return (
    <div className={cn("grid gap-2", wide && "lg:grid-cols-2")}>
      <p className={cn("text-xs text-muted", wide && "lg:col-span-2")}>
        Name, deck, and both cards stay open for this game. A blank name or deck uses this game’s standings.
      </p>
      {Array.from({ length: shown }, (_, index) => {
        const slot = slots[index] ?? emptyTopDeckSlot();
        const player = players[index];
        const name = slot.name || player?.name || "";
        const deck = slot.deck || player?.deck || "";
        return (
          <div key={index} className="grid gap-1.5 rounded-lg bg-surface-2 p-2">
            <Input
              value={name}
              placeholder={`Player ${index + 1}`}
              onChange={(e) => setName(index, e.target.value)}
              aria-label={`Player ${index + 1} name`}
            />
            <Input
              value={deck}
              placeholder="Deck name"
              onChange={(e) => setDeck(index, e.target.value)}
              aria-label={`Player ${index + 1} deck`}
            />
            <div className="grid gap-1.5 sm:grid-cols-2">
              <FaceSlot catalog={catalog} formatName={formatName} card={slot.faces[0]} onChange={(card) => setFace(index, 0, card)} />
              <FaceSlot catalog={catalog} formatName={formatName} card={slot.faces[1]} onChange={(card) => setFace(index, 1, card)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FaceSlot({
  catalog,
  formatName,
  card,
  onChange,
}: {
  catalog: LookupCatalog;
  formatName: string;
  card: DeckCard | null;
  onChange: (card: DeckCard | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<LookupCard[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setStatus("idle");
      return;
    }
    let cancel = false;
    setStatus("loading");
    const timer = window.setTimeout(() => {
      void searchCatalogCards(catalog, q, { liveOnly: true, formatName })
        .then((rows) => {
          if (cancel) return;
          setHits(rows.filter((row) => row.name.trim()).slice(0, 6));
          setStatus("idle");
        })
        .catch(() => {
          if (!cancel) setStatus("error");
        });
    }, 260);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [query, catalog, formatName]);

  const pick = (hit: LookupCard) => {
    onChange({
      id: hit.id,
      name: hit.name,
      set: hit.set ?? "",
      number: hit.number ?? "",
      image: hit.image ?? "",
      type: hit.type ?? "",
      qty: 1,
      ...(hit.hp ? { hp: hit.hp } : {}),
    });
    setQuery("");
    setHits([]);
  };

  return (
    <div className="grid gap-1">
      {card ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1">
          <RemoteArt image={card.image} id={card.id} size="low" alt="" className="h-10 w-7 shrink-0 rounded-sm object-cover" />
          <p className="min-w-0 flex-1 truncate text-xs">{card.name}</p>
          <button type="button" className="text-muted hover:text-fg" aria-label={`Clear ${card.name}`} onClick={() => onChange(null)}>
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={card ? "Replace card" : "Search card"}
        autoComplete="off"
      />
      {status === "loading" ? <p className="text-[0.65rem] text-muted">Searching…</p> : null}
      {status === "error" ? <p className="text-[0.65rem] text-live">Search failed. Try again.</p> : null}
      {hits.length ? (
        <ul className="grid max-h-40 gap-0.5 overflow-auto rounded-md border border-border bg-surface p-1">
          {hits.map((hit) => (
            <li key={hit.id}>
              <button type="button" className="flex w-full items-center gap-2 rounded px-1 py-1 text-left hover:bg-surface-2" onClick={() => pick(hit)}>
                <RemoteArt image={hit.image} id={hit.id} size="low" alt="" className="h-8 w-6 shrink-0 rounded-sm object-cover" />
                <span className="min-w-0 truncate text-xs">{hit.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
