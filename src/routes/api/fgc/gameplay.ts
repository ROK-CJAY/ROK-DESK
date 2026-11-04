import { createFileRoute } from "@tanstack/react-router";

const noStore = { "cache-control": "no-store, no-cache, must-revalidate" };

/** Scoreboard ROK data: the live FGC set for ?lane=&board=, in the fields the page reads. */
export const Route = createFileRoute("/api/fgc/gameplay")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { loadFgcState, gameplayState } = await import("@/lib/fgc-program-state");
        const url = new URL(request.url);
        const saved = await loadFgcState();
        return Response.json(gameplayState(saved, url.searchParams.get("lane"), url.searchParams.get("board")), { headers: noStore });
      },
    },
  },
});
