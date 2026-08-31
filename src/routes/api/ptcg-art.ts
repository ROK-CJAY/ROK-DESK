import { createFileRoute } from "@tanstack/react-router";
import { ptcgArtSources } from "@/lib/card-lookup";

const cache = {
  "cache-control": "public, max-age=86400",
};

export const Route = createFileRoute("/api/ptcg-art")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id")?.trim() ?? "";
        const image = url.searchParams.get("image")?.trim() ?? "";
        const size = url.searchParams.get("size") === "low" ? "low" : "high";
        if (!id && !image) return new Response("Missing id", { status: 400 });
        const sources = ptcgArtSources(image || undefined, size, id || undefined);
        for (const src of sources) {
          if (src.startsWith("/")) continue;
          try {
            const res = await fetch(src, {
              headers: {
                "user-agent": "Mozilla/5.0 ROK-Desk",
                accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
              },
              redirect: "follow",
              signal: AbortSignal.timeout(2500),
            });
            if (!res.ok) continue;
            const type = res.headers.get("content-type") ?? "";
            if (!type.startsWith("image/")) continue;
            return new Response(res.body, {
              headers: { ...cache, "content-type": type.split(";")[0] },
            });
          } catch {
            /* try next CDN */
          }
        }
        return new Response("Art not found", { status: 404 });
      },
    },
  },
});
