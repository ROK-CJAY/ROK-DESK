import { createFileRoute } from "@tanstack/react-router";
import {
  catalogStatus,
  isTcgCatalogGame,
  loadCatalog,
  localCatalogCard,
  searchLocalCatalog,
  startCatalogSync,
} from "@/lib/tcg-catalogs";

const noStore = {
  "cache-control": "no-store, no-cache, must-revalidate",
};

export const Route = createFileRoute("/api/tcg-catalog")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const params = new URL(request.url).searchParams;
        const game = params.get("game");
        if (!isTcgCatalogGame(game)) {
          return Response.json({ error: "Unknown catalog" }, { status: 400, headers: noStore });
        }
        const q = params.get("q")?.trim() ?? "";
        const id = params.get("id")?.trim() ?? "";
        if (q || id) {
          if (catalogStatus(game).status !== "running") await loadCatalog(game);
          if (id && !q) {
            const card = await localCatalogCard(game, id);
            return Response.json({ local: card !== undefined, card: card ?? null }, { headers: noStore });
          }
          const cards = await searchLocalCatalog(game, q, params.get("legal"));
          return Response.json({ local: cards !== null, cards: cards ?? [] }, { headers: noStore });
        }
        if (catalogStatus(game).status !== "running") await loadCatalog(game);
        return Response.json(catalogStatus(game), { headers: noStore });
      },
      POST: async ({ request }) => {
        const game = new URL(request.url).searchParams.get("game");
        if (!isTcgCatalogGame(game)) {
          return Response.json({ error: "Unknown catalog" }, { status: 400, headers: noStore });
        }
        const status = startCatalogSync(game);
        return Response.json(status, { status: status.status === "running" ? 202 : 200, headers: noStore });
      },
    },
  },
});
