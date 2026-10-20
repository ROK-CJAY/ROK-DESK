import { createFileRoute } from "@tanstack/react-router";
import { currentStreamSetId, importStartggEvent } from "@/lib/startgg";

export const Route = createFileRoute("/api/startgg")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { url?: string; action?: string };
        try {
          body = (await request.json()) as { url?: string; action?: string };
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const url = body.url?.trim() ?? "";
        if (!url) return Response.json({ error: "Paste a start.gg event link" }, { status: 400 });
        try {
          if (body.action === "stream") {
            const setId = await currentStreamSetId(url);
            return Response.json({ setId });
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