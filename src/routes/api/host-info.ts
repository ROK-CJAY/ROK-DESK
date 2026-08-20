import { createFileRoute } from "@tanstack/react-router";
import os from "node:os";

const noStore = {
  "cache-control": "no-store, no-cache, must-revalidate",
};

function listenPort() {
  const raw = process.env.NITRO_PORT || process.env.PORT || "8080";
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 8080;
}

function lanIPv4() {
  const out: string[] = [];
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      const family = String(addr.family);
      if ((family === "IPv4" || family === "4") && !addr.internal) out.push(addr.address);
    }
  }
  return [...new Set(out)];
}

export const Route = createFileRoute("/api/host-info")({
  server: {
    handlers: {
      GET: async () => {
        const port = listenPort();
        const lan = lanIPv4().map((ip) => `http://${ip}:${port}`);
        return Response.json(
          {
            port,
            local: `http://127.0.0.1:${port}`,
            lan,
          },
          { headers: noStore },
        );
      },
    },
  },
});
