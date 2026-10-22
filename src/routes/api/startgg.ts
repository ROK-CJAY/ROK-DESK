import { createFileRoute } from "@tanstack/react-router";
import { currentStreamSetId, importStartggEvent, searchStartggPlayers, stockIcons, tournamentIcon } from "@/lib/startgg";
import { beginToSet, callToSet, loadToAccount, loadToBoard, reportToSet, stationToSet, streamToSet } from "@/lib/startgg-to";

export const Route = createFileRoute("/api/startgg")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: {
          url?: string;
          action?: string;
          query?: string;
          game?: string;
          gameId?: string;
          token?: string;
          slug?: string;
          setId?: string;
          stationId?: string;
          streamId?: string;
          winnerId?: string;
          score1?: number;
          score2?: number;
        };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const token = body.token?.trim() || undefined;
        try {
          if (body.action === "account") {
            if (!token) return Response.json({ error: "Paste the API token from the start.gg account you run events with." }, { status: 401 });
            return Response.json(await loadToAccount(token));
          }
          if (body.action === "board") {
            if (!token) return Response.json({ error: "Connect the start.gg account first." }, { status: 401 });
            return Response.json(await loadToBoard(token, body.slug?.trim() || ""));
          }
          if (body.action === "call" || body.action === "begin" || body.action === "assign-station" || body.action === "assign-stream" || body.action === "report") {
            if (!token || !body.setId) return Response.json({ error: "Missing set." }, { status: 400 });
            if (body.action === "call") await callToSet(token, body.setId);
            if (body.action === "begin") await beginToSet(token, body.setId);
            if (body.action === "assign-station" && body.stationId) await stationToSet(token, body.setId, body.stationId);
            if (body.action === "assign-stream" && body.streamId) await streamToSet(token, body.setId, body.streamId);
            if (body.action === "report" && body.winnerId) await reportToSet(token, body.setId, body.winnerId, Number(body.score1) || 0, Number(body.score2) || 0);
            return Response.json({ ok: true });
          }
          if (body.action === "search") {
            const players = await searchStartggPlayers(body.query ?? "", token);
            return Response.json({ players });
          }
          if (body.action === "icons") {
            const icons = await stockIcons(body.game ?? "", body.gameId, token);
            return Response.json({ icons });
          }
          const url = body.url?.trim() ?? "";
          if (!url) return Response.json({ error: "Paste a start.gg event link" }, { status: 400 });
          if (body.action === "stream") {
            const setId = await currentStreamSetId(url, token);
            return Response.json({ setId });
          }
          if (body.action === "icon") {
            const icon = await tournamentIcon(url, token);
            return Response.json({ icon });
          }
          const imported = await importStartggEvent(url, token);
          return Response.json(imported);
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "start.gg request failed" },
            { status: 502 },
          );
        }
      },
    },
  },
});