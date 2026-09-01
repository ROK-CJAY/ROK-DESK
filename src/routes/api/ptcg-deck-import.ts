import { createFileRoute } from "@tanstack/react-router";
import { hydrateDeckCards, importPtcgDeck } from "@/lib/ptcg-deck-import";
import { deckCardsKeepOrder } from "@/lib/decklist";

const noStore = {
  "cache-control": "no-store, no-cache, must-revalidate",
};

export const Route = createFileRoute("/api/ptcg-deck-import")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { text?: string; url?: string; cards?: unknown[] } = {};
        try {
          body = (await request.json()) as { text?: string; url?: string; cards?: unknown[] };
        } catch {
          return Response.json({ error: "Send JSON with text or url." }, { status: 400, headers: noStore });
        }
        if (Array.isArray(body.cards)) {
          const incoming = deckCardsKeepOrder(body.cards);
          const cards = await hydrateDeckCards(incoming);
          return Response.json({ cards, count: cards.reduce((n, c) => n + c.qty, 0) }, { headers: noStore });
        }
        const text = typeof body.text === "string" ? body.text.slice(0, 80_000) : "";
        const url = typeof body.url === "string" ? body.url.slice(0, 500) : "";
        if (!text.trim() && !url.trim()) {
          return Response.json({ error: "Paste a list or a Limitless URL." }, { status: 400, headers: noStore });
        }
        try {
          const result = await importPtcgDeck({ text, url });
          return Response.json(result, { headers: noStore });
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "Could not import that list." },
            { status: 422, headers: noStore },
          );
        }
      },
    },
  },
});
