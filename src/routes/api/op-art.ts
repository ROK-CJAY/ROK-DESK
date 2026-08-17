import { createFileRoute } from "@tanstack/react-router";

const noStore = {
  "cache-control": "public, max-age=86400",
};

function artUrls(id: string) {
  const set = id.split("-")[0] ?? "";
  return [
    `https://en.onepiece-cardgame.com/images/cardlist/card/${id}.png`,
    `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/${set}/${id}_EN.webp`,
    `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/${set}/${id}_p1_EN.webp`,
  ];
}

export const Route = createFileRoute("/api/op-art")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
        if (!id) return new Response("Missing id", { status: 400 });
        for (const url of artUrls(id)) {
          const res = await fetch(url, {
            headers: { "user-agent": "ROK-Desk/1.0", accept: "image/*" },
            redirect: "follow",
          });
          if (!res.ok) continue;
          const type = res.headers.get("content-type") ?? "image/png";
          if (!type.startsWith("image/")) continue;
          return new Response(res.body, {
            headers: { ...noStore, "content-type": type },
          });
        }
        return new Response("Art not found", { status: 404 });
      },
    },
  },
});
