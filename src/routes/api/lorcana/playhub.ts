import { createFileRoute } from "@tanstack/react-router";
import { loadPlayHubEvent } from "@/lib/playhub";

const noStore = { "cache-control": "no-store" };

export const Route = createFileRoute("/api/lorcana/playhub")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const event = new URL(request.url).searchParams.get("event") ?? "";
        try {
          return Response.json(await loadPlayHubEvent(event), { headers: noStore });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Could not reach Play Hub.";
          return Response.json({ error: message }, { status: 400, headers: noStore });
        }
      },
    },
  },
});
