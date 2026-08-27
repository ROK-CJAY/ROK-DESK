import { createFileRoute } from "@tanstack/react-router";
import { parseBrowserBundle } from "@/lib/browser-memory";
import { loadBrowser, saveBrowser } from "@/lib/browser-server";

const noStore = {
  "cache-control": "no-store, no-cache, must-revalidate",
};

export const Route = createFileRoute("/api/browser")({
  server: {
    handlers: {
      GET: async () => {
        const snapshot = await loadBrowser();
        return Response.json(snapshot, { headers: noStore });
      },
      PUT: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400, headers: noStore });
        }
        const parsed = parseBrowserBundle(body);
        if (!parsed) {
          return Response.json({ error: "Invalid browser state" }, { status: 400, headers: noStore });
        }
        const snapshot = await saveBrowser(parsed);
        return Response.json(snapshot, { headers: noStore });
      },
    },
  },
});
