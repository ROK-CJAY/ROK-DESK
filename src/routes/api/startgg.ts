import { createFileRoute } from "@tanstack/react-router";
import { currentStreamSetId, importStartggEvent, searchStartggPlayers, stockIcons, tournamentIcon } from "@/lib/startgg";

export const Route = createFileRoute("/api/startgg")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { url?: string; action?: string; query?: string; game?: string; gameId?: string };
        try {
          body = (await request.json()) as { url?: string; action?: string };
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        if (body.action === "search") {
          const players = await searchStartggPlayers(body.query ?? "");
          return Response.json({ players });
        }
        if (body.action === "icons") {
          const icons = await stockIcons(body.game ?? "", body.gameId);
          return Response.json({ icons });
        }
        const url = body.url?.trim() ?? "";
        if (!url) return Response.json({ error: "Paste a start.gg event link" }, { status: 400 });
        try {
          if (body.action === "stream") {
            const setId = await currentStreamSetId(url);
            return Response.json({ setId });
          }
          if (body.action === "icon") {
            const icon = await tournamentIcon(url);
            return Response.json({ icon });
          }
          const imported = await importStartggEvent(url);
          return Response.json(imported);
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "start.gg import failed" },
            { status: 502 },
          );
        }
      },
    },
  },
});