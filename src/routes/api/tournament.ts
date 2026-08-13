import { createFileRoute } from "@tanstack/react-router";
import { tournamentSchema } from "@/lib/tournament-types";
import { loadTournament, saveTournament } from "@/lib/tournament-server";

const noStore = {
  "cache-control": "no-store, no-cache, must-revalidate",
};

export const Route = createFileRoute("/api/tournament")({
  server: {
    handlers: {
      GET: async () => {
        const tournament = await loadTournament();
        return Response.json(tournament, { headers: noStore });
      },
      PUT: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400, headers: noStore });
        }
        const parsed = tournamentSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid tournament", details: parsed.error.flatten() },
            { status: 400, headers: noStore },
          );
        }
        const tournament = await saveTournament(parsed.data);
        return Response.json(tournament, { headers: noStore });
      },
    },
  },
});
