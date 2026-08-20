import { createFileRoute } from "@tanstack/react-router";
import { deskLaneOf, deskSchema, mergeDeskLane, parseMatchSlot } from "@/lib/desk-types";
import { gameIdFromSlug } from "@/lib/games";
import { loadDesk, saveDesk } from "@/lib/desk-server";

const noStore = {
  "cache-control": "no-store, no-cache, must-revalidate",
};

export const Route = createFileRoute("/api/desk")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const live = await loadDesk();
        const url = new URL(request.url);
        const wanted = url.searchParams.get("game");
        if (!wanted) return Response.json(live, { headers: noStore });
        const gameId = gameIdFromSlug(wanted);
        if (!gameId) {
          return Response.json({ error: "Unknown game" }, { status: 404, headers: noStore });
        }
        const slot = parseMatchSlot(url.searchParams.get("slot"));
        return Response.json(deskLaneOf(live, gameId, slot), { headers: noStore });
      },
      PUT: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400, headers: noStore });
        }
        const parsed = deskSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid desk state", details: parsed.error.flatten() },
            { status: 400, headers: noStore },
          );
        }
        const url = new URL(request.url);
        const wanted = url.searchParams.get("game");
        const gameId = wanted ? gameIdFromSlug(wanted) : null;
        if (wanted && !gameId) {
          return Response.json({ error: "Unknown game" }, { status: 404, headers: noStore });
        }
        if (gameId) {
          const slot = parseMatchSlot(url.searchParams.get("slot") ?? parsed.data.matchSlot);
          const live = await loadDesk();
          const desk = await saveDesk(mergeDeskLane(live, gameId, parsed.data, slot));
          return Response.json(deskLaneOf(desk, gameId, slot), { headers: noStore });
        }
        const desk = await saveDesk(parsed.data);
        return Response.json(desk, { headers: noStore });
      },
    },
  },
});
