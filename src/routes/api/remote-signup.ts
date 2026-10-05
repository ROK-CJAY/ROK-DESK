import { createFileRoute } from "@tanstack/react-router";
import {
  closeRemoteEvent,
  listRemoteSignups,
  openRemoteEvent,
  readRemoteEvent,
  signupPullAuthorized,
  submitRemoteSignup,
} from "@/lib/remote-signup";

const noStore = {
  "cache-control": "no-store, no-cache, must-revalidate",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, x-rok-signup-secret",
  "access-control-max-age": "86400",
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: noStore });
}

export const Route = createFileRoute("/api/remote-signup")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: noStore }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code") ?? "";
        if (signupPullAuthorized(request.headers.get("x-rok-signup-secret"))) {
          const listed = await listRemoteSignups(code);
          if ("error" in listed) return json({ error: listed.error }, 404);
          return json(listed);
        }
        const event = await readRemoteEvent(code);
        if (!event) return json({ error: "That sign-up code is not open." }, 404);
        return json({ event });
      },
      POST: async ({ request }) => {
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }
        const action = String(body.action ?? "submit");
        const secretOk = signupPullAuthorized(request.headers.get("x-rok-signup-secret"));
        if (action === "open" || action === "close") {
          if (!secretOk) return json({ error: "Desk secret was rejected." }, 401);
          if (action === "close") {
            const closed = await closeRemoteEvent(String(body.code ?? ""));
            if ("error" in closed) return json(closed, 400);
            return json(closed);
          }
          const opened = await openRemoteEvent({
            code: String(body.code ?? ""),
            gameId: String(body.gameId ?? ""),
            title: String(body.title ?? ""),
            formatName: String(body.formatName ?? ""),
            requireDecklist: Boolean(body.requireDecklist),
            bestOf: Number(body.bestOf ?? 3),
            bracketType: String(body.bracketType ?? "swiss"),
          });
          if ("error" in opened) return json(opened, 400);
          return json({ event: opened });
        }
        const saved = await submitRemoteSignup(String(body.code ?? ""), body);
        if ("error" in saved) return json({ error: saved.error }, saved.status);
        return json(saved);
      },
    },
  },
});
