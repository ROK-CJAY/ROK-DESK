import { createFileRoute } from "@tanstack/react-router";
import { PUBLIC_SIGNUP_ORIGIN } from "@/lib/remote-signup-code";
import {
  OAUTH_LAND_HTML,
  clearDeskLogin,
  oauthCallbackResponse,
  readDeskLogin,
  refreshStartggLogin,
  safeOAuthReturn,
  saveDeskLogin,
  startggAuthorizeUrl,
  startggOAuthConfigured,
} from "@/lib/startgg-oauth";

const noStore = { "cache-control": "no-store" };

function loopback(request: Request): boolean {
  const host = new URL(request.url).hostname;
  return host === "127.0.0.1" || host === "localhost";
}

export const Route = createFileRoute("/api/startgg-oauth")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const op = url.searchParams.get("op") || "";
        if (op === "ready") {
          return Response.json({ ready: startggOAuthConfigured() }, { headers: { ...noStore, "access-control-allow-origin": "*" } });
        }
        if (op === "land") return new Response(OAUTH_LAND_HTML, { headers: { "content-type": "text/html; charset=utf-8", ...noStore } });
        if (op === "session") {
          const login = readDeskLogin();
          return Response.json(login ?? { accessToken: "" }, { headers: noStore });
        }
        if (op === "start") {
          if (!startggOAuthConfigured()) {
            if (url.origin === PUBLIC_SIGNUP_ORIGIN) {
              return Response.json({ error: "Add STARTGG_CLIENT_ID and STARTGG_CLIENT_SECRET on the ROK Desk host." }, { status: 503, headers: noStore });
            }
            return Response.redirect(`${PUBLIC_SIGNUP_ORIGIN}/api/startgg-oauth?${url.searchParams.toString()}`);
          }
          const returnTo = safeOAuthReturn(url.searchParams.get("return") || "", request.url);
          if (!returnTo) return Response.json({ error: "That return address is not allowed." }, { status: 400, headers: noStore });
          return Response.redirect(startggAuthorizeUrl(request.url, returnTo));
        }
        if (op === "callback") return oauthCallbackResponse(request);
        return Response.json({ error: "Unknown login step." }, { status: 404, headers: noStore });
      },
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const op = url.searchParams.get("op") || "";
        let body: { accessToken?: string; refreshToken?: string; expiresIn?: number };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400, headers: noStore });
        }
        if (op === "complete") {
          if (!loopback(request)) return Response.json({ error: "Not allowed." }, { status: 403, headers: noStore });
          const accessToken = body.accessToken?.trim() ?? "";
          if (!accessToken) return Response.json({ error: "Missing login." }, { status: 400, headers: noStore });
          const expiresIn = Number(body.expiresIn) || 3600;
          saveDeskLogin({ accessToken, refreshToken: body.refreshToken?.trim() ?? "", expiresAt: Date.now() + expiresIn * 1000 });
          return Response.json({ ok: true }, { headers: noStore });
        }
        if (op === "refresh") {
          if (!startggOAuthConfigured()) {
            return Response.json({ error: "start.gg login is not set up on this host." }, { status: 503, headers: noStore });
          }
          try {
            const login = await refreshStartggLogin(request.url, body.refreshToken?.trim() ?? "");
            return Response.json(login, { headers: noStore });
          } catch (err) {
            return Response.json({ error: err instanceof Error ? err.message : "Could not refresh the login." }, { status: 401, headers: noStore });
          }
        }
        if (op === "logout") {
          clearDeskLogin();
          return Response.json({ ok: true }, { headers: noStore });
        }
        return Response.json({ error: "Unknown login step." }, { status: 404, headers: noStore });
      },
    },
  },
});
