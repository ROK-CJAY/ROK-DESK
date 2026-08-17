import { createFileRoute } from "@tanstack/react-router";

const noStore = {
  "cache-control": "no-store, no-cache, must-revalidate",
};

const BASE = "https://api.riftcodex.com";

export const Route = createFileRoute("/api/rift-cards")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const params = new URL(request.url).searchParams;
        const id = params.get("id")?.trim();
        const q = params.get("q")?.trim() ?? "";
        const target = id
          ? `${BASE}/cards/${encodeURIComponent(id)}`
          : q
            ? `${BASE}/cards/name?fuzzy=${encodeURIComponent(q)}&size=24`
            : null;
        if (!target) {
          return Response.json({ error: "Missing query" }, { status: 400, headers: noStore });
        }
        const res = await fetch(target, {
          cache: "no-store",
          headers: { accept: "application/json", "user-agent": "ROK-Desk/0.3" },
        });
        const body = await res.text();
        return new Response(body, {
          status: res.status,
          headers: { ...noStore, "content-type": "application/json" },
        });
      },
    },
  },
});
