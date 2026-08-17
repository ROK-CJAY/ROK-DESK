import { createFileRoute } from "@tanstack/react-router";

const noStore = {
  "cache-control": "no-store, no-cache, must-revalidate",
};

export const Route = createFileRoute("/api/ygo-cards")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const params = new URL(request.url).searchParams;
        const id = params.get("id")?.trim();
        const q = params.get("q")?.trim() ?? "";
        const format = params.get("format")?.trim();
        const target = new URL("https://db.ygoprodeck.com/api/v7/cardinfo.php");
        if (id) target.searchParams.set("id", id);
        else if (q) target.searchParams.set("fname", q);
        else {
          return Response.json({ error: "Missing query" }, { status: 400, headers: noStore });
        }
        if (format) target.searchParams.set("format", format);
        target.searchParams.set("num", "30");
        target.searchParams.set("offset", "0");
        const res = await fetch(target.toString(), {
          cache: "no-store",
          headers: { "user-agent": "ROK-Desk/1.0 (judge tablet)" },
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
