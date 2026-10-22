import { createHmac, timingSafeEqual } from "node:crypto";
import { PUBLIC_SIGNUP_ORIGIN } from "@/lib/remote-signup-code";

const SCOPES = "user.identity tournament.manager tournament.reporter";

export type DeskLogin = { accessToken: string; refreshToken: string; expiresAt: number };

let deskLogin: DeskLogin | null = null;

export function saveDeskLogin(login: DeskLogin) {
  deskLogin = login;
}

export function readDeskLogin(): DeskLogin | null {
  return deskLogin;
}

export function clearDeskLogin() {
  deskLogin = null;
}

export function startggOAuthConfigured(): boolean {
  return Boolean(clientId() && clientSecret());
}

function clientId(): string {
  return process.env.STARTGG_CLIENT_ID?.trim() ?? "";
}

function clientSecret(): string {
  return process.env.STARTGG_CLIENT_SECRET?.trim() ?? "";
}

export function startggRedirectUri(requestUrl: string): string {
  const configured = process.env.STARTGG_REDIRECT_URI?.trim();
  if (configured) return configured;
  const origin = new URL(requestUrl).origin;
  const host = origin === PUBLIC_SIGNUP_ORIGIN ? origin : PUBLIC_SIGNUP_ORIGIN;
  return `${host}/api/startgg-oauth/callback`;
}

export function safeOAuthReturn(value: string, requestUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const loopback = url.protocol === "http:" && (url.hostname === "127.0.0.1" || url.hostname === "localhost");
  const own = url.origin === new URL(requestUrl).origin || url.origin === PUBLIC_SIGNUP_ORIGIN;
  if (loopback) {
    if (url.pathname !== "/api/startgg-oauth") return null;
    return url.toString();
  }
  if (!own || url.pathname !== "/fgc/tournament") return null;
  url.search = "";
  url.hash = "";
  return url.toString();
}

function sign(body: string): string {
  return createHmac("sha256", clientSecret()).update(body).digest("base64url");
}

export function signOAuthState(returnTo: string): string {
  const body = Buffer.from(JSON.stringify({ returnTo, exp: Date.now() + 10 * 60 * 1000 })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readOAuthState(state: string): string | null {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { returnTo?: string; exp?: number };
    if (!payload.returnTo || !payload.exp || payload.exp < Date.now()) return null;
    return payload.returnTo;
  } catch {
    return null;
  }
}

export function startggAuthorizeUrl(requestUrl: string, returnTo: string): string {
  const url = new URL("https://start.gg/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId());
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("redirect_uri", startggRedirectUri(requestUrl));
  url.searchParams.set("state", signOAuthState(returnTo));
  return url.toString();
}

type TokenBody = { access_token?: string; refresh_token?: string; expires_in?: number; data?: { access_token?: string; refresh_token?: string; expires_in?: number } };

function tokenFrom(body: TokenBody): DeskLogin {
  const bag = body.data?.access_token ? body.data : body;
  const accessToken = bag.access_token?.trim() ?? "";
  if (!accessToken) throw new Error("start.gg did not return a login.");
  const expiresIn = Number(bag.expires_in) || 3600;
  return { accessToken, refreshToken: bag.refresh_token?.trim() ?? "", expiresAt: Date.now() + expiresIn * 1000 };
}

async function tokenRequest(fields: Record<string, string>, requestUrl: string): Promise<DeskLogin> {
  const res = await fetch("https://api.start.gg/oauth/access_token", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: startggRedirectUri(requestUrl),
      scope: SCOPES,
      ...fields,
    }),
  });
  const text = await res.text();
  let body: TokenBody & { message?: string; error?: string };
  try {
    body = JSON.parse(text) as TokenBody & { message?: string; error?: string };
  } catch {
    throw new Error("start.gg did not accept the login.");
  }
  if (!res.ok) throw new Error(body.message || body.error || "start.gg refused the login.");
  return tokenFrom(body);
}

export function exchangeStartggCode(requestUrl: string, code: string): Promise<DeskLogin> {
  return tokenRequest({ grant_type: "authorization_code", code }, requestUrl);
}

export function refreshStartggLogin(requestUrl: string, refreshToken: string): Promise<DeskLogin> {
  return tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken }, requestUrl);
}

export async function oauthCallbackResponse(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const noStore = { "cache-control": "no-store" };
  const state = readOAuthState(url.searchParams.get("state") || "");
  const code = url.searchParams.get("code") || "";
  if (!state || !code) return Response.json({ error: "start.gg login was cancelled." }, { status: 400, headers: noStore });
  try {
    const login = await exchangeStartggCode(request.url, code);
    return Response.redirect(loginRedirect(state, login));
  } catch (err) {
    const message = err instanceof Error ? err.message : "start.gg login failed";
    return Response.json({ error: message }, { status: 502, headers: noStore });
  }
}
export function loginRedirect(returnTo: string, login: DeskLogin): string {
  const url = new URL(returnTo);
  const hash = new URLSearchParams({
    access_token: login.accessToken,
    refresh_token: login.refreshToken,
    expires_in: String(Math.max(60, Math.round((login.expiresAt - Date.now()) / 1000))),
  });
  url.hash = hash.toString();
  return url.toString();
}

export const OAUTH_LAND_HTML = `<!doctype html>
<meta charset="utf-8">
<title>ROK Desk</title>
<body style="margin:0;background:#111;color:#eee;font-family:sans-serif;display:grid;place-items:center;min-height:100vh">
<p id="m">Signing in…</p>
<script>
const hash = new URLSearchParams(location.hash.slice(1));
const accessToken = hash.get("access_token") || "";
const refreshToken = hash.get("refresh_token") || "";
const expiresIn = Number(hash.get("expires_in") || "0");
const note = document.getElementById("m");
if (!accessToken) note.textContent = "start.gg did not return a login.";
else fetch("/api/startgg-oauth?op=complete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accessToken, refreshToken, expiresIn }) })
  .then(function (res) { if (!res.ok) throw new Error("no"); note.textContent = "Signed in. Go back to ROK Desk."; })
  .catch(function () { note.textContent = "Could not hand the login back to ROK Desk."; });
</script>
</body>`;
