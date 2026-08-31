import { createFileRoute } from "@tanstack/react-router";
import { catalogStatus, loadCatalog, startCatalogSync } from "@/lib/ptcg-catalog";

const noStore = {
  "cache-control": "no-store, no-cache, must-revalidate",
};

export const Route = createFileRoute("/api/ptcg-catalog")({
  server: {
    handlers: {
      GET: async () => {
        await loadCatalog();
        return Response.json(catalogStatus(), { headers: noStore });
      },
      POST: async () => {
        const status = startCatalogSync();
        return Response.json(status, { status: status.status === "running" ? 202 : 200, headers: noStore });
      },
    },
  },
});
