/**
 * The public host is the sign-up sheet only. Overlays, the desk, and the
 * show stay on the installed app. This runs when ROK_PUBLIC_HOST=1.
 */
interface PublicHostEvent {
  url: URL;
  req: { method: string };
}

const CARD_APIS = new Set([
  "/api/remote-signup",
  "/api/ptcg-cards",
  "/api/ptcg-art",
  "/api/ptcg-deck-import",
  "/api/ptcg-catalog",
  "/api/swu-cards",
  "/api/ygo-cards",
  "/api/op-cards",
  "/api/op-art",
  "/api/rift-cards",
  "/api/lorcana-cards",
  "/api/tcg-catalog",
]);

function signupPath(pathname: string): boolean {
  if (pathname === "/join" || pathname.startsWith("/join/")) return true;
  if (CARD_APIS.has(pathname)) return true;
  if (pathname === "/api/startgg-oauth" || pathname.startsWith("/api/startgg-oauth/")) return true;
  if (pathname.startsWith("/brand/") || pathname.startsWith("/assets/") || pathname.startsWith("/fonts/") || pathname.startsWith("/__grok/")) return true;
  return /\.(?:js|css|map|png|jpe?g|webp|svg|gif|ico|woff2?|ttf|otf|webmanifest)$/i.test(pathname);
}

const HOME = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ROK sign-up</title>
</head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0c0e;color:#f4f1ea;font:16px/1.4 system-ui,sans-serif">
  <main style="max-width:28rem;padding:24px;text-align:center">
    <p style="margin:0;font-size:28px;font-weight:700;letter-spacing:.04em;text-transform:uppercase">ROK sign-up</p>
    <p style="margin:12px 0 0;color:#b7b1a6">Open the link from the store. This address is only for event sign-up.</p>
  </main>
</body>
</html>`;

export default function publicHostOnly(event: PublicHostEvent, next: () => unknown): unknown {
  if (process.env.ROK_PUBLIC_HOST !== "1") return next();
  const path = event.url.pathname || "/";
  if (path === "/") {
    return new Response(HOME, {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  }
  if (signupPath(path)) return next();
  return new Response("Not found.", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
