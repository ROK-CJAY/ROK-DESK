/**
 * Deployed-app (Nitro) half of the platform PWA chrome. Auto-registered as
 * global h3 middleware because vite.config.ts sets `serverDir: "./server"` —
 * without that option Nitro v3 never scans this directory.
 *
 * - `?install=1&platform=ios` on a document path → the Home Screen tutorial,
 *   bundled into the server build via `?raw` (the public/ directory is CDN
 *   static output on Vercel and not readable from the function).
 * - `/__grok/manifest.webmanifest` → per-app-named manifest (kept out of
 *   public/ so this dynamic response is the only one).
 * - Other HTML documents → stream-inject PWA + OG head tags at `</head>`.
 *   OG identity is baked via `virtual:grok-og-identity` at `vite build`
 *   (this function cannot read `src/lib/og/site.json` or `public/og.jpg`).
 *   This must be a middleware transforming `next()`: h3 discards the `response`
 *   runtime hook's return value, and `render:html` does not exist in Nitro v3.
 */
import installPageTemplate from "../../scripts/install-page.html?raw";
import { grokOgIdentity } from "virtual:grok-og-identity";
import {
  acceptsHtml,
  createHeadInjector,
  isDocumentPath,
  isInstallQuery,
  renderInstallPageHtml,
  renderWebManifest,
} from "../../scripts/grok-pwa-shared.mjs";

interface GrokPwaEvent {
  url: URL;
  req: { method: string; headers: Headers };
}

function requestHost(event: GrokPwaEvent): string {
  return (
    event.req.headers.get("x-forwarded-host") ?? event.req.headers.get("host") ?? event.url.host
  );
}

function injectHeadStreaming(response: Response, host: string): Response {
  const injector = createHeadInjector({
    host,
    site: grokOgIdentity.site,
  });
  const transformed = response.body!.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        for (const out of injector.push(chunk)) controller.enqueue(out);
      },
      flush(controller) {
        for (const out of injector.flush()) controller.enqueue(out);
      },
    }),
  );
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(transformed, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function publicHostBlocked(path: string): boolean {
  if (process.env.ROK_PUBLIC_HOST !== "1") return false;
  if (path === "/join" || path.startsWith("/join/")) return false;
  if (path === "/api/remote-signup") return false;
  if (path.startsWith("/api/ptcg-") || path === "/api/tcg-catalog") return false;
  if (/^\/api\/(swu-cards|ygo-cards|op-cards|op-art|rift-cards|lorcana-cards)$/.test(path)) return false;
  if (path.startsWith("/__grok/") || path.startsWith("/brand/") || path.startsWith("/assets/")) return false;
  if (/\.[a-z0-9]{2,8}$/i.test(path)) return false;
  return true;
}

const signupCors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, x-rok-signup-secret",
  "access-control-max-age": "86400",
  "cache-control": "no-store",
};

export default async function grokPwaMiddleware(
  event: GrokPwaEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const path = event.url.pathname;
  const method = (event.req.method ?? "GET").toUpperCase();

  if (path === "/api/remote-signup" && method === "OPTIONS") {
    return new Response(null, { status: 204, headers: signupCors });
  }

  if (publicHostBlocked(path)) {
    if (path.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "Not available on the public sign-up host." }), {
        status: 404,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      });
    }
    return Response.redirect(new URL("/join", event.url), 302);
  }

  if (method !== "GET") return next();

  const urlWithQuery = path + event.url.search;

  if (path === "/__grok/manifest.webmanifest" || path === "/__grok/manifest.json") {
    return new Response(renderWebManifest(requestHost(event)), {
      headers: {
        "content-type": "application/manifest+json; charset=utf-8",
        "cache-control": "no-cache",
      },
    });
  }

  if (
    isInstallQuery(urlWithQuery) &&
    isDocumentPath(path) &&
    acceptsHtml(event.req.headers.get("accept"))
  ) {
    const html = renderInstallPageHtml(installPageTemplate, {
      host: requestHost(event),
      url: urlWithQuery,
    });
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-cache",
      },
    });
  }

  if (!isDocumentPath(path)) return next();

  const result = await next();
  if (
    result instanceof Response &&
    result.body &&
    String(result.headers.get("content-type") ?? "").includes("text/html") &&
    !result.headers.get("content-encoding")
  ) {
    return injectHeadStreaming(result, requestHost(event));
  }
  return result;
}
