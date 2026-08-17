import { createFileRoute } from "@tanstack/react-router";
import { loadTournament } from "@/lib/tournament-server";
import { exportFileBase, tournamentExportZip } from "@/lib/tournament-export";

const noStore = {
  "cache-control": "no-store, no-cache, must-revalidate",
};

export const Route = createFileRoute("/api/tournament/export")({
  server: {
    handlers: {
      GET: async () => {
        const tournament = await loadTournament();
        const { filename, blob } = tournamentExportZip(tournament);
        return new Response(blob, {
          headers: {
            ...noStore,
            "content-type": "application/zip",
            "content-disposition": `attachment; filename="${filename}"`,
            "x-export-name": exportFileBase(tournament),
          },
        });
      },
    },
  },
});
