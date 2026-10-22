import { createFileRoute } from "@tanstack/react-router";

const noStore = { "cache-control": "no-store, no-cache, must-revalidate", "content-type": "text/html; charset=utf-8" };

export const Route = createFileRoute("/api/fgc/tsh-layout")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { readTshLayout, renderTshDocument } = await import("@/lib/tsh-document");
        const file = new URL(request.url).searchParams.get("path") || "";
        const html = await readTshLayout(file);
        if (!html) return new Response("Layout not found", { status: 404, headers: noStore });
        const origin = new URL(request.url).origin;
        const dir = file.includes("/") ? file.slice(0, file.lastIndexOf("/") + 1) : "";
        return new Response(renderTshDocument(html, `${origin}/tsh/layout/${dir}`), { headers: noStore });
      },
    },
  },
});