import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { PtcgDeckListPrint } from "@/components/tournament/ptcg-deck-list-print";
import { Button } from "@/components/ui/button";
import { isPtcgTitle } from "@/lib/games";
import { useTournamentStore } from "@/lib/tournament-store";

export const Route = createFileRoute("/print/deck-list")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : undefined,
    all: search.all === "1" || search.all === true,
  }),
  component: DeckListPrintPage,
});

function DeckListPrintPage() {
  const { id, all } = Route.useSearch();
  const ready = useTournamentStore((s) => s.ready);
  const hydrate = useTournamentStore((s) => s.hydrate);
  const t = useTournamentStore((s) => s.tournament);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const players = useMemo(() => {
    const list = t.entrants.slice().sort((a, b) => a.seed - b.seed);
    if (all) return list;
    if (id) return list.filter((p) => p.id === id);
    return list.slice(0, 1);
  }, [t.entrants, id, all]);

  if (!ready) {
    return <div className="grid min-h-dvh place-items-center bg-white text-neutral-500">Loading deck list…</div>;
  }

  if (!isPtcgTitle(t.gameId)) {
    return <div className="grid min-h-dvh place-items-center bg-white text-neutral-700">Deck lists are for PTCG events.</div>;
  }

  if (players.length === 0) {
    return <div className="grid min-h-dvh place-items-center bg-white text-neutral-700">No player on this list.</div>;
  }

  return (
    <div className="min-h-dvh bg-neutral-200 py-4">
      <div className="no-print mx-auto mb-4 flex max-w-[8.5in] flex-wrap items-center justify-between gap-2 px-4">
        <p className="text-sm text-neutral-700">
          {players.length === 1 ? players[0]!.name : `${players.length} players`} · Play! Pokémon 8.5×11 deck list
        </p>
        <Button onClick={() => window.print()}>Print / Save PDF</Button>
      </div>
      <PtcgDeckListPrint tournament={t} players={players} />
    </div>
  );
}
