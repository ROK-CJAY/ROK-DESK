import { createFileRoute } from "@tanstack/react-router";
import { loadFgcState, programState, saveFgcState } from "@/lib/fgc-program-state";
import { EMPTY_FGC, type FgcState } from "@/lib/fgc-types";

const noStore = { "cache-control": "no-store, no-cache, must-revalidate" };

export const Route = createFileRoute("/api/fgc/program-state")({
  server: {
    handlers: {
      GET: async () => Response.json(programState(await loadFgcState()), { headers: noStore }),
      PUT: async ({ request }) => {
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
