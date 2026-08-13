import { createFileRoute } from "@tanstack/react-router";
import { deskSchema } from "@/lib/desk-types";
import { loadDesk, saveDesk } from "@/lib/desk-server";

const noStore = {
  "cache-control": "no-store, no-cache, must-revalidate",
};

export const Route = createFileRoute("/api/desk")({
  server: {
    handlers: {
      GET: async () => {
        const desk = await loadDesk();
        return Response.json(desk, { headers: noStore });
      },
      PUT: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400, headers: noStore });
        }
        const parsed = deskSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid desk state", details: parsed.error.flatten() },
            { status: 400, headers: noStore },
          );
        }
        const desk = await saveDesk(parsed.data);
        return Response.json(desk, { headers: noStore });
      },
    },
  },
});
