import { createFileRoute } from "@tanstack/react-router";
import { isPtcgTitle, isVgcTitle } from "@/lib/games";
import { officialPlayPdf } from "@/lib/play-pokemon-pdf";
import { loadTournament } from "@/lib/tournament-server";

const noStore = {
  "cache-control": "no-store, no-cache, must-revalidate",
};

export const Route = createFileRoute("/api/tournament/official-pdf")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const kind = url.searchParams.get("kind") === "team" ? "team" : "deck";
          const id = url.searchParams.get("id")?.trim() ?? "";
          const all = url.searchParams.get("all") === "1";
          const tournament = await loadTournament();
          if (kind === "deck" && !isPtcgTitle(tournament.gameId)) {
            return Response.json({ error: "Official deck lists are for PTCG events." }, { status: 400, headers: noStore });
          }
          if (kind === "team" && !isVgcTitle(tournament.gameId)) {
            return Response.json({ error: "Official team lists are for VGC events." }, { status: 400, headers: noStore });
          }
          const roster = tournament.entrants.slice().sort((a, b) => a.seed - b.seed);
          const players = all ? roster : id ? roster.filter((p) => p.id === id) : roster.slice(0, 1);
          if (!players.length) {
            return Response.json({ error: "No player on this list." }, { status: 404, headers: noStore });
          }
          const { bytes, filename } = await officialPlayPdf(tournament, kind, players, request);
          const body = Uint8Array.from(bytes);
          return new Response(body, {
            headers: {
              ...noStore,
              "content-type": "application/pdf",
              "content-length": String(body.byteLength),
              "content-disposition": `inline; filename="${filename.replace(/["\r\n]/g, "")}"`,
            },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Could not fill that PDF.";
          return Response.json({ error: message }, { status: 500, headers: noStore });
        }
      },
    },
  },
});
