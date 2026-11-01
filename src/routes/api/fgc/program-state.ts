import { createFileRoute } from "@tanstack/react-router";
import { resolveLane, setForBoard } from "@/lib/fgc-lanes";
import { sourceValue } from "@/lib/fgc-titles";
import { EMPTY_FGC, type FgcState } from "@/lib/fgc-types";

const noStore = { "cache-control": "no-store, no-cache, must-revalidate" };

export const Route = createFileRoute("/api/fgc/program-state")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { loadFgcState, programState } = await import("@/lib/fgc-program-state");
        const url = new URL(request.url);
        const saved = await loadFgcState();
        const field = url.searchParams.get("field");
        if (field) {
          const fgc = resolveLane(saved, url.searchParams.get("lane"));
          const value = sourceValue(fgc, setForBoard(fgc, url.searchParams.get("board")), field);
          if (value == null) {
            return new Response("Unknown source", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", ...noStore } });
          }
          const text = value.startsWith("/") ? new URL(value, request.url).origin + value : value;
          return new Response(text, { headers: { "content-type": "text/plain; charset=utf-8", ...noStore } });
        }
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