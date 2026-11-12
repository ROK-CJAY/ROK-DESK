import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import ts from "typescript";
import { autoBindsTablets, fromThisPc, isLoopbackPeer, mayBindTablets } from "../src/lib/startgg-guard.ts";

const SITE = "https://rok-desk.vercel.app";

test("host login endpoints only answer this PC", () => {
  assert.equal(fromThisPc("http://127.0.0.1:8080/api/startgg-oauth?op=session", "127.0.0.1"), true);
  assert.equal(fromThisPc("http://127.0.0.1:8080/api/startgg-oauth?op=session", "::ffff:127.0.0.1"), true);
  assert.equal(fromThisPc("http://192.168.1.20:8080/api/startgg-oauth?op=session", "192.168.1.31"), false);
  // A LAN client faking "Host: 127.0.0.1" is still refused by its socket address.
  assert.equal(fromThisPc("http://127.0.0.1:8080/api/startgg-oauth?op=session", "192.168.1.31"), false);
  assert.equal(isLoopbackPeer(undefined), null);
});

test("strike tablets: host binds automatically, a client only explicitly", () => {
  assert.equal(mayBindTablets("http://127.0.0.1:8080/api/startgg", "127.0.0.1", undefined), true);
  assert.equal(mayBindTablets("http://192.168.1.20:8080/api/startgg", "192.168.1.31", undefined), false);
  assert.equal(mayBindTablets("http://192.168.1.20:8080/api/startgg", "192.168.1.31", "yes"), false);
  assert.equal(mayBindTablets("http://192.168.1.20:8080/api/startgg", "192.168.1.31", true), true);
  assert.equal(autoBindsTablets({ hostname: "127.0.0.1", origin: "http://127.0.0.1:8080" }, "host", SITE), true);
  assert.equal(autoBindsTablets({ hostname: "192.168.1.20", origin: "http://192.168.1.20:8080" }, "client", SITE), false);
  assert.equal(autoBindsTablets({ hostname: "192.168.1.20", origin: "http://192.168.1.20:8080" }, "web", SITE), false);
  assert.equal(autoBindsTablets({ hostname: "rok-desk.vercel.app", origin: SITE }, "web", SITE), true);
});

function tsFunction(file, name) {
  const source = fs.readFileSync(new URL(file, import.meta.url), "utf8");
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const node = tree.statements.find((item) => ts.isFunctionDeclaration(item) && item.name?.text === name);
  return ts.transpileModule(node.getText(tree).replace(/^export /, ""), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
}

test("website accepts the client's loopback return address, not a LAN host", () => {
  const safeOAuthReturn = new Function("PUBLIC_SIGNUP_ORIGIN", `${tsFunction("../src/lib/startgg-oauth.ts", "safeOAuthReturn")}; return safeOAuthReturn;`)(SITE);
  const site = `${SITE}/api/startgg-oauth?op=start`;
  const loop = "http://127.0.0.1:53111/api/startgg-oauth?op=land&k=abc";
  assert.equal(safeOAuthReturn(loop, site), loop, "query (one-time code) is kept");
  assert.equal(safeOAuthReturn("http://192.168.1.20:8080/api/startgg-oauth?op=land", site), null);
  assert.equal(safeOAuthReturn("http://127.0.0.1:53111/evil", site), null);
});

const to = fs.readFileSync(new URL("../src/components/fgc/fgc-to.tsx", import.meta.url), "utf8");
const oauthRoute = fs.readFileSync(new URL("../src/routes/api/startgg-oauth.ts", import.meta.url), "utf8");
const apiRoute = fs.readFileSync(new URL("../src/routes/api/startgg.ts", import.meta.url), "utf8");

test("only the host window polls the host's login", () => {
  const poll = to.slice(to.indexOf("op=session") - 600, to.indexOf("op=session"));
  assert.match(poll, /if \(mode !== "host" && !loopbackPage\) return;/);
});

test("client login uses this PC's loopback listener and the website readiness check", () => {
  assert.match(to, /mode === "client" && bridge\.startggLogin/);
  assert.match(to, /rokDesktop\(\) \|\| loopbackPage \? PUBLIC_SIGNUP_ORIGIN/);
});

test("server guards: session/logout loopback-only, tablets bind guarded", () => {
  for (const op of ['op === "session"', 'op === "logout"', 'op === "complete"']) {
    const at = oauthRoute.indexOf(op);
    assert.ok(at > 0, op);
    assert.match(oauthRoute.slice(at, at + 260), /if \(!loopback\(request\)\)/, op);
  }
  for (const action of ['"bind-live"', '"unbind-live"']) {
    const at = apiRoute.indexOf(`body.action === ${action}`);
    assert.match(apiRoute.slice(at, at + 200), /mayBindTablets\(request\.url, peerIp\(\), body\.explicit\)/, action);
  }
});
