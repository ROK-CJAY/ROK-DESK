import { createFileRoute } from "@tanstack/react-router";
import { importStartggEvent } from "@/lib/startgg";

export const Route = createFileRoute("/api/startgg")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { url?: string };
        try {
          body = (await request.json()) as { url?: string };
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const url = body.url?.trim() ?? "";
        if (!url) return Response.json({ error: "Paste a start.gg event link" }, { status: 400 });
        try {
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
