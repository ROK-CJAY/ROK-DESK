/**
 * One-time loopback receiver for a client PC's start.gg login.
 *
 * A client desk loads its pages from the host (http://<host-ip>:8080), and the ROK Desk website
 * only sends a login back to 127.0.0.1 / localhost. So the client's own main process listens on
 * 127.0.0.1:<random port> for exactly one login, then hands the tokens to the client window by
 * IPC. The tokens never touch the host.
 *
 * - Only 127.0.0.1, random port, random one-time code in the return address (?k=...).
 * - GET  /api/startgg-oauth?op=land&k=<code>  serves the landing page.
 * - POST /api/startgg-oauth?op=complete       { k, accessToken, refreshToken, expiresIn }.
 * - Closes after one accepted login, a wrong code is just refused, and everything closes after 5 minutes.
 * - Tokens are never logged.
 */
import http from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";

export const STARTGG_SITE = "https://rok-desk.vercel.app";
export const LOGIN_PATH = "/api/startgg-oauth";
const MAX_BODY = 16 * 1024;

export const LOOPBACK_LAND_HTML = `<!doctype html>
<meta charset="utf-8">
<title>ROK Desk</title>
<body style="margin:0;background:#111;color:#eee;font-family:sans-serif;display:grid;place-items:center;min-height:100vh">
<p id="m">Signing in…</p>
<script>
const hash = new URLSearchParams(location.hash.slice(1));
const k = new URLSearchParams(location.search).get("k") || "";
const accessToken = hash.get("access_token") || "";
const refreshToken = hash.get("refresh_token") || "";
const expiresIn = Number(hash.get("expires_in") || "0");
history.replaceState(null, "", location.pathname);
const note = document.getElementById("m");
if (!accessToken) note.textContent = "start.gg did not return a login.";
else fetch("${LOGIN_PATH}?op=complete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ k, accessToken, refreshToken, expiresIn }) })
  .then(function (res) { if (!res.ok) throw new Error("no"); note.textContent = "Signed in. Go back to ROK Desk."; })
  .catch(function () { note.textContent = "Could not hand the login back to ROK Desk. Press Log in again."; });
</script>
</body>`;

function same(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

function send(res, status, body, type = "application/json") {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store", "referrer-policy": "no-referrer", "x-content-type-options": "nosniff" });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
}

/** The website login address for a loopback return URL. */
export function websiteLoginUrl(returnUrl, site = STARTGG_SITE) {
  return `${site}${LOGIN_PATH}?op=start&return=${encodeURIComponent(returnUrl)}`;
}

/**
 * Start one loopback login. Resolves once listening with { port, returnUrl, loginUrl, done, close }.
 * `done` resolves { ok: true, login } once, or { ok: false, reason } on timeout / close.
 */
export function startLoopbackLogin({ timeoutMs = 5 * 60 * 1000, site = STARTGG_SITE } = {}) {
  const code = randomBytes(24).toString("base64url");
  let finished = false;
  let resolveDone;
  const done = new Promise((resolve) => { resolveDone = resolve; });
  const server = http.createServer((req, res) => {
    let url;
    try {
      url = new URL(req.url || "/", "http://127.0.0.1");
    } catch {
      send(res, 400, { error: "Bad request" });
      return;
    }
    if (finished || url.pathname !== LOGIN_PATH) {
      send(res, 404, { error: "Not found" });
      return;
    }
    const op = url.searchParams.get("op") || "";
    if (req.method === "GET" && op === "land") {
      if (!same(url.searchParams.get("k") || "", code)) {
        send(res, 403, { error: "Not allowed." });
        return;
      }
      send(res, 200, LOOPBACK_LAND_HTML, "text/html; charset=utf-8");
      return;
    }
    if (req.method === "POST" && op === "complete") {
      const host = String(req.headers.host || "");
      if (!/^127\.0\.0\.1:\d+$/.test(host)) {
        send(res, 403, { error: "Not allowed." });
        return;
      }
      let size = 0;
      const chunks = [];
      req.on("data", (chunk) => {
        size += chunk.length;
        if (size > MAX_BODY) req.destroy();
        else chunks.push(chunk);
      });
      req.on("end", () => {
        let body;
        try {
          body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        } catch {
          send(res, 400, { error: "Invalid JSON" });
          return;
        }
        if (finished || !same(body?.k || "", code)) {
          send(res, 403, { error: "Not allowed." });
          return;
        }
        const accessToken = typeof body.accessToken === "string" ? body.accessToken.trim() : "";
        if (!accessToken) {
          send(res, 400, { error: "Missing login." });
          return;
        }
        const expiresIn = Math.max(60, Number(body.expiresIn) || 3600);
        const login = {
          accessToken,
          refreshToken: typeof body.refreshToken === "string" ? body.refreshToken.trim() : "",
          expiresAt: Date.now() + expiresIn * 1000,
        };
        send(res, 200, { ok: true });
        finish({ ok: true, login });
      });
      return;
    }
    send(res, 405, { error: "Not allowed." });
  });
  let timer = null;
  function finish(result) {
    if (finished) return;
    finished = true;
    if (timer) clearTimeout(timer);
    server.close();
    server.closeAllConnections?.();
    resolveDone(result);
  }
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      timer = setTimeout(() => finish({ ok: false, reason: "timeout" }), timeoutMs);
      timer.unref?.();
      const returnUrl = `http://127.0.0.1:${port}${LOGIN_PATH}?op=land&k=${code}`;
      resolve({
        port,
        returnUrl,
        loginUrl: websiteLoginUrl(returnUrl, site),
        done,
        close: () => finish({ ok: false, reason: "closed" }),
      });
    });
  });
}

/** Refresh a login through the website (it holds the start.gg app secret). */
export async function refreshViaWebsite(refreshToken, { site = STARTGG_SITE, fetcher = fetch } = {}) {
  const token = String(refreshToken || "").trim();
  if (!token) return { ok: false, error: "No refresh token." };
  try {
    const res = await fetcher(`${site}${LOGIN_PATH}?op=refresh`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ refreshToken: token }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || typeof body?.accessToken !== "string" || !body.accessToken) {
      return { ok: false, error: typeof body?.error === "string" ? body.error : "start.gg did not refresh the login." };
    }
    return {
      ok: true,
      login: {
        accessToken: body.accessToken,
        refreshToken: typeof body.refreshToken === "string" && body.refreshToken ? body.refreshToken : token,
        expiresAt: Number(body.expiresAt) || Date.now() + 3600_000,
      },
    };
  } catch {
    return { ok: false, error: "Could not reach the ROK Desk website." };
  }
}
