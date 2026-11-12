import assert from "node:assert/strict";
import { test } from "node:test";
import { refreshViaWebsite, startLoopbackLogin, websiteLoginUrl } from "../electron/startgg-loopback.mjs";

const k = (returnUrl) => new URL(returnUrl).searchParams.get("k");
const post = (port, body, host) =>
  fetch(`http://127.0.0.1:${port}/api/startgg-oauth?op=complete`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(host ? { host } : {}) },
    body: JSON.stringify(body),
  });

test("listens on 127.0.0.1 only, with a return address the website accepts", async () => {
  const login = await startLoopbackLogin();
  const url = new URL(login.returnUrl);
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.pathname, "/api/startgg-oauth");
  assert.equal(url.searchParams.get("op"), "land");
  assert.ok((k(login.returnUrl) || "").length >= 24);
  assert.equal(login.loginUrl, websiteLoginUrl(login.returnUrl));
  assert.ok(login.loginUrl.startsWith("https://rok-desk.vercel.app/api/startgg-oauth?op=start&return="));
  login.close();
  assert.deepEqual(await login.done, { ok: false, reason: "closed" });
});

test("landing page needs the one-time code", async () => {
  const login = await startLoopbackLogin();
  const bad = await fetch(`http://127.0.0.1:${login.port}/api/startgg-oauth?op=land&k=nope`);
  assert.equal(bad.status, 403);
  const good = await fetch(login.returnUrl);
  assert.equal(good.status, 200);
  assert.match(await good.text(), /op=complete/);
  login.close();
  await login.done;
});

test("accepts exactly one login with the right code, then closes", async () => {
  const login = await startLoopbackLogin();
  const code = k(login.returnUrl);
  assert.equal((await post(login.port, { k: "wrong", accessToken: "a" })).status, 403);
  const ok = await post(login.port, { k: code, accessToken: "tok-1", refreshToken: "ref-1", expiresIn: 600 });
  assert.equal(ok.status, 200);
  const result = await login.done;
  assert.equal(result.ok, true);
  assert.equal(result.login.accessToken, "tok-1");
  assert.equal(result.login.refreshToken, "ref-1");
  assert.ok(result.login.expiresAt > Date.now() + 500_000);
  await assert.rejects(post(login.port, { k: code, accessToken: "tok-2" }), "reuse finds the port closed");
});

test("times out and closes", async () => {
  const login = await startLoopbackLogin({ timeoutMs: 50 });
  assert.deepEqual(await login.done, { ok: false, reason: "timeout" });
  await assert.rejects(fetch(login.returnUrl));
});

test("refresh goes through the website and reports failure", async () => {
  const ok = await refreshViaWebsite("r1", { fetcher: async (url, init) => {
    assert.match(String(url), /\/api\/startgg-oauth\?op=refresh$/);
    assert.equal(JSON.parse(init.body).refreshToken, "r1");
    return new Response(JSON.stringify({ accessToken: "new", refreshToken: "r2", expiresAt: 123 }), { status: 200 });
  } });
  assert.deepEqual(ok, { ok: true, login: { accessToken: "new", refreshToken: "r2", expiresAt: 123 } });
  const bad = await refreshViaWebsite("r1", { fetcher: async () => new Response(JSON.stringify({ error: "expired" }), { status: 401 }) });
  assert.deepEqual(bad, { ok: false, error: "expired" });
  assert.equal((await refreshViaWebsite("")).ok, false);
});
