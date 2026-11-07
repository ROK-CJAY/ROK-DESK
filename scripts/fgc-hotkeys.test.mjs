import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createFgcHotkeys, fgcAccelerator, trustedFgcSender } from "../electron/fgc-hotkeys.mjs";

function fixture() {
  const bindings = new Map();
  const removed = [];
  const delivered = [];
  const owner = { valid: true };
  const controller = createFgcHotkeys({
    globalShortcut: {
      register(key, callback) { if (bindings.has(key)) return false; bindings.set(key, callback); return true; },
      unregister(key) { removed.push(key); bindings.delete(key); },
    },
    trusted: (candidate) => candidate.valid,
    deliver: (candidate, payload) => delivered.push([candidate, payload]),
  });
  const configure = (overrides = {}, candidate = owner) => controller.configure(candidate, {
    token: "session-1", enabled: true, keys: { p1Up: "Ctrl+F1" }, ...overrides,
  });
  return { controller, owner, bindings, removed, delivered, configure };
}

test("Ctrl+F1 and supported saved keys normalize to Electron accelerators", () => {
  assert.equal(fgcAccelerator("Ctrl+F1"), "CommandOrControl+F1");
  assert.equal(fgcAccelerator("Shift+Ctrl+f4"), fgcAccelerator("ctrl+shift+F4"));
  assert.equal(fgcAccelerator("Alt+ArrowLeft"), "Alt+Left");
  for (const key of ["Ctrl++", "Ctrl+Ctrl+F1", "Bad+F1", "Ctrl+F25", "Ctrl+constructor", "constructor+F1", null, {}]) assert.equal(fgcAccelerator(key), null);
});

test("registered background callback delivers one allowlisted action", () => {
  const f = fixture();
  assert.deepEqual(f.configure(), { registered: ["p1Up"], errors: [] });
  f.bindings.get("CommandOrControl+F1")();
  assert.deepEqual(f.delivered, [[f.owner, { action: "p1Up", token: "session-1" }]]);
});

test("reassignment removes old registration and stale callbacks are inert", () => {
  const f = fixture(); f.configure();
  const old = f.bindings.get("CommandOrControl+F1");
  f.configure({ token: "session-2", keys: { p1Up: "Ctrl+F5" } });
  assert.equal(f.bindings.has("CommandOrControl+F1"), false);
  old(); assert.equal(f.delivered.length, 0);
  f.bindings.get("CommandOrControl+F5")(); assert.equal(f.delivered.length, 1);
});

test("disabled/Settings-suspended config unregisters then resumes", () => {
  const f = fixture(); f.configure();
  f.configure({ token: "settings", enabled: false }); assert.equal(f.bindings.size, 0);
  f.configure({ token: "resumed" }); assert.equal(f.bindings.size, 1);
});

test("conflicts and duplicates are reported without removing unrelated shortcuts", () => {
  const f = fixture();
  const external = () => {};
  f.bindings.set("CommandOrControl+F1", external);
  const status = f.configure({ keys: { p1Up: "Ctrl+F1", p2Up: "Ctrl+F3", reset: "ctrl+f3" } });
  assert.equal(status.errors.length, 2);
  assert.deepEqual(status.registered, ["p2Up"]);
  f.controller.clear();
  assert.deepEqual([...f.bindings.entries()], [["CommandOrControl+F1", external]]);
});

test("registration exceptions are visible and remaining shortcuts still register", () => {
  const f = createFgcHotkeys({ trusted: () => true, deliver() {}, globalShortcut: {
    register(key) { if (key.endsWith("F1")) throw new Error("unsupported"); return true; }, unregister() {},
  } });
  const result = f.configure({}, { token: "one", enabled: true, keys: { p1Up: "Ctrl+F1", p2Up: "Ctrl+F3" } });
  assert.equal(result.errors.length, 1); assert.deepEqual(result.registered, ["p2Up"]);
});

test("malformed configs and unknown actions never replace working registrations", () => {
  const f = fixture(); f.configure();
  for (const payload of [null, {}, { token: "one", enabled: true, keys: { execute: "Ctrl+F1" } }, { token: "one", enabled: true, keys: [] }]) {
    assert.equal(f.controller.configure(f.owner, payload).errors.length, 1);
    assert.equal(f.bindings.size, 1);
  }
  const bad = f.configure({ keys: { p1Up: "Bad+F1" } }); assert.equal(bad.errors.length, 1);
});

test("only one Production owner dispatches; stale cleanup cannot release new session", () => {
  const f = fixture(); f.configure();
  assert.equal(f.configure({}, { valid: true }).errors.length, 1);
  f.configure({ token: "session-2" });
  f.controller.release(f.owner, "session-1"); assert.equal(f.bindings.size, 1);
  f.controller.release(f.owner, "session-2"); assert.equal(f.bindings.size, 0);
});

test("navigation/crash trust loss prevents dispatch and lifecycle release clears owned keys", () => {
  const f = fixture(); f.configure(); const callback = f.bindings.get("CommandOrControl+F1");
  f.owner.valid = false; callback(); assert.equal(f.delivered.length, 0);
  f.controller.release(f.owner); assert.equal(f.bindings.size, 0);
  assert.equal(f.configure().errors.length, 1);
});

test("IPC trust requires a tracked, live Production main frame at exact Desk origin", () => {
  let url = "http://127.0.0.1:8080/fgc/production";
  const sender = { mainFrame: {}, isDestroyed: () => false, getURL: () => url };
  const event = { sender, senderFrame: sender.mainFrame };
  const windows = new Set([sender]);
  const trusted = () => trustedFgcSender(event, windows, "http://127.0.0.1:8080");
  assert.equal(trusted(), true);
  event.senderFrame = {}; assert.equal(trusted(), false); event.senderFrame = sender.mainFrame;
  for (url of ["http://evil.test/fgc/production", "http://127.0.0.1:8080/browser", "http://127.0.0.1:8080/fgc/overlay/hud", "file:///fgc/production"]) assert.equal(trusted(), false);
  url = "http://127.0.0.1:8080/fgc/production/"; assert.equal(trusted(), true);
  windows.clear(); assert.equal(trusted(), false);
});

// Execute the actual renderer effect in a minimal mocked host: no browser, no real Desk data.
// Extract via the TS AST so these tests exercise the shipped effect, not a copied action switch.
const appSource = fs.readFileSync(new URL("../src/components/fgc/fgc-app.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("fgc-app.tsx", appSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let effect;
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(ast) === "useEffect" && node.getText(ast).includes("configureFgcHotkeys")) effect = node.getText(ast);
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(effect, "native hotkey effect must be wired into FgcDesk");
function tsFunction(file, name) {
  const source = fs.readFileSync(new URL(file, import.meta.url), "utf8");
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const node = tree.statements.find((item) => ts.isFunctionDeclaration(item) && item.name?.text === name);
  return node.getText(tree).replace(/^export /, "");
}
const effectJS = ts.transpileModule([
  tsFunction("../src/lib/fgc-settings.ts", "hotkeyEvent"),
  tsFunction("../src/lib/fgc-lanes.ts", "setForBoard"), effect,
].join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
function renderer({ native = true, settingsOpen = false, enabled = true, legacy = false, secureContext = true } = {}) {
  let onKey, onNative, cleanup, config, released, issue = "", picker = false;
  const state = {
    fgc: { settings: { hotkeys: enabled, keys: { p1Up: "Ctrl+F1", p1Down: "Ctrl+F2" } }, activeBoardId: "main", boards: [{ id: "main", setId: "a" }, { id: "side", setId: "b" }], sets: [{ id: "a", score1: 0, score2: 0 }, { id: "b", score1: 2, score2: 0 }] },
    patchSet(id, patch) { Object.assign(state.fgc.sets.find((set) => set.id === id), patch); }, resetScore() {}, swapTeams() {}, loadStandings() {},
  };
  const bridge = native ? {
    configureFgcHotkeys(payload) { config = payload; return Promise.resolve({ errors: [] }); },
    releaseFgcHotkeys(token) { released = token; return Promise.resolve(); },
    onFgcHotkey(callback) { onNative = callback; return () => { onNative = null; }; },
  } : legacy ? {} : null;
  const context = {
    crypto: secureContext ? { randomUUID: () => "test-token" } : {}, fgc: state.fgc, settingsOpen,
    rokDesktop: () => bridge, useFgcStore: { getState: () => state },
    setPicker: (value) => { picker = value; }, setHotkeyError: (value) => { issue = value; },
    useEffect(callback) { cleanup = callback(); },
    document: { querySelector: () => settingsOpen ? {} : null },
    window: { addEventListener(_name, callback) { onKey = callback; }, removeEventListener() { onKey = null; } },
  };
  vm.runInNewContext(effectJS, context);
  const key = (target = { tagName: "INPUT" }) => onKey?.({ key: "F1", code: "F1", ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, target, preventDefault() {} });
  const fire = (action = "p1Up", token = config?.token || "test-token") => onNative?.({ action, token });
  return { state, key, fire, cleanup: () => cleanup(), config: () => config, released: () => released, issue: () => issue, picker: () => picker };
}

test("native desktop focused DOM key plus global callback increments exactly once", () => {
  const r = renderer(); r.key(); assert.equal(r.state.fgc.sets[0].score1, 0);
  r.fire(); assert.equal(r.state.fgc.sets[0].score1, 1);
});

test("background callback updates the latest selected board, not a captured set", () => {
  const r = renderer(); r.state.fgc.activeBoardId = "side"; r.fire();
  assert.equal(r.state.fgc.sets[0].score1, 0); assert.equal(r.state.fgc.sets[1].score1, 3);
});

test("Settings suspension and disabled hotkeys block native/DOM scoring", () => {
  for (const options of [{ settingsOpen: true }, { enabled: false }]) {
    const r = renderer(options); assert.equal(r.config().enabled, false);
    r.key(); r.fire(); assert.equal(r.state.fgc.sets[0].score1, 0);
  }
});

test("stale native messages and callbacks after unmount cannot score", () => {
  const r = renderer(); r.fire("p1Up", "old-token"); assert.equal(r.state.fgc.sets[0].score1, 0);
  r.cleanup(); assert.equal(r.released(), "test-token"); r.fire(); assert.equal(r.state.fgc.sets[0].score1, 0);
});

test("web and old desktop focused-input Ctrl+F1 continue to work", () => {
  for (const legacy of [false, true]) {
    const r = renderer({ native: false, legacy }); r.key(); assert.equal(r.state.fgc.sets[0].score1, 1);
    if (legacy) assert.match(r.issue(), /updated desktop app/);
  }
});

test("no loaded set is safe; decrement floors at zero", () => {
  const r = renderer(); r.fire("p1Down"); assert.equal(r.state.fgc.sets[0].score1, 0);
  r.state.fgc.boards[0].setId = "missing"; assert.doesNotThrow(() => r.fire());
});

 test("LAN HTTP origins without randomUUID support retain native and browser hotkeys", () => {
  const native = renderer({ secureContext: false });
  assert.match(native.config().token, /^fgc-/); native.fire();
  assert.equal(native.state.fgc.sets[0].score1, 1);
  const web = renderer({ native: false, secureContext: false }); web.key();
  assert.equal(web.state.fgc.sets[0].score1, 1);
});
