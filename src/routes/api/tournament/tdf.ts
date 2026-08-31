import { createFileRoute } from "@tanstack/react-router";
import { loadTournament } from "@/lib/tournament-server";
import { buildTomTdf } from "@/lib/tom-tdf";

const noStore = {
  "cache-control": "no-store, no-cache, must-revalidate",
};

export const Route = createFileRoute("/api/tournament/tdf")({
  server: {
    handlers: {
      GET: async () => {
        const tournament = await loadTournament();
        const { xml, filename } = buildTomTdf(tournament);
        return new Response(xml, {
          headers: {
            ...noStore,
            "content-type": "application/xml;charset=utf-8",
            "content-disposition": `attachment; filename="${filename}"`,
          },
        });
      },
    },
  },
});
