import { createFileRoute } from "@tanstack/react-router";
import { EMPTY_FGC, type FgcState } from "@/lib/fgc-types";

const noStore = { "cache-control": "no-store, no-cache, must-revalidate" };

export const Route = createFileRoute("/api/fgc/program-state")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { loadFgcState, programState } = await import("@/lib/fgc-program-state");
        const url = new URL(request.url);
        const saved = await loadFgcState();
        if (url.searchParams.get("raw") === "1") return Response.json(saved, { headers: noStore });
        const preview = url.searchParams.get("preview") === "1";
        return Response.json(programState(saved, preview, url.searchParams.get("lane"), url.searchParams.get("board")), { headers: noStore });
      },
      PUT: async ({ request }) => {
        const { saveFgcState } = await import("@/lib/fgc-program-state");
        let body: FgcState;
        try {
          body = { ...EMPTY_FGC, ...(await request.json() as FgcState) };
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400, headers: noStore });
        }
        await saveFgcState(body);
        return Response.json({ ok: true }, { headers: noStore });
      },
    },
  },
});