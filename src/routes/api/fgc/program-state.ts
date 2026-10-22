import { createFileRoute } from "@tanstack/react-router";
import { EMPTY_FGC, type FgcState } from "@/lib/fgc-types";

const noStore = { "cache-control": "no-store, no-cache, must-revalidate" };

export const Route = createFileRoute("/api/fgc/program-state")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { loadFgcState, programState } = await import("@/lib/fgc-program-state");
        const preview = new URL(request.url).searchParams.get("preview") === "1";
        return Response.json(programState(await loadFgcState(), preview), { headers: noStore });
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