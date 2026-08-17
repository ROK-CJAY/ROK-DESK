import { createFileRoute } from "@tanstack/react-router";

const noStore = {
  "cache-control": "no-store, no-cache, must-revalidate",
};

export const Route = createFileRoute("/api/swu-cards")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const params = new URL(request.url).searchParams;
        const set = params.get("set")?.trim();
        const number = params.get("number")?.trim();
        const q = params.get("q")?.trim() ?? "";
        const target =
          set && number
            ? `https://api.swu-db.com/cards/${encodeURIComponent(set)}/${encodeURIComponent(number)}`
            : q
              ? `https://api.swu-db.com/cards/search?q=${encodeURIComponent(q)}`
              : null;
        if (!target) {
          return Response.json({ error: "Missing query" }, { status: 400, headers: noStore });
        }
        const res = await fetch(target, { cache: "no-store" });
        const body = await res.text();
        return new Response(body, {
          status: res.status,
          headers: { ...noStore, "content-type": "application/json" },
        });
      },
    },
  },
});
