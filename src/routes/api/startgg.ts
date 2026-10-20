import { createFileRoute } from "@tanstack/react-router";
import { importStartggEvent } from "@/lib/startgg";

export const Route = createFileRoute("/api/startgg")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { token?: string; url?: string };
        try {
          body = (await request.json()) as { token?: string; url?: string };
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const token = body.token?.trim() ?? "";
        const url = body.url?.trim() ?? "";
        if (!token) return Response.json({ error: "Add a start.gg API token" }, { status: 400 });
        if (!url) return Response.json({ error: "Paste a start.gg event link" }, { status: 400 });
        try {
          const imported = await importStartggEvent(token, url);
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
