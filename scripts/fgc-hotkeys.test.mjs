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
  assert.deepEqual(f.configure(), { registered: ["p1Up"], fallback: [], errors: [], notices: [] });
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
    setPicker: (value) => { picker = value; }, setHotkeyError: (value) => { issue = value; }, setHotkeyNotice: () => {},
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

// ---- Windows keyboard-hook fallback (mocked uiohook) ----
import { EventEmitter } from "node:events";
import { fgcHookChord, FGC_HOTKEY_LABELS } from "../electron/fgc-hotkeys.mjs";

const KEYS = { Ctrl: 29, CtrlRight: 3613, F1: 59, F2: 60, F3: 61, F4: 62, F5: 63, A: 30 };
function hookFixture({ taken = ["CommandOrControl+F1", "CommandOrControl+F3"], loadHook, startThrows = false } = {}) {
  const bindings = new Map(taken.map((key) => [key, () => {}]));
  const delivered = [];
  const hook = new EventEmitter();
  hook.starts = 0; hook.stops = 0;
  hook.start = () => { if (startThrows) throw new Error("hook failed"); hook.starts++; };
  hook.stop = () => { hook.stops++; };
  let loads = 0;
  const owner = { valid: true };
  const controller = createFgcHotkeys({
    globalShortcut: {
      register(key, cb) { if (bindings.has(key)) return false; bindings.set(key, cb); return true; },
      unregister(key) { bindings.delete(key); },
    },
    trusted: (c) => c.valid,
    deliver: (c, payload) => delivered.push(payload),
    loadHook: loadHook === undefined ? () => { loads++; return { uIOhook: hook, UiohookKey: KEYS }; } : loadHook,
  });
  const configure = (o = {}, c = owner) => controller.configure(c, { token: "s1", enabled: true, keys: { p1Up: "Ctrl+F1", p1Down: "Ctrl+F2", p2Up: "Ctrl+F3", p2Down: "Ctrl+F4" }, ...o });
  const press = (keycode, mods = { ctrlKey: true }) => { hook.emit("keydown", { keycode, ...mods }); };
  const release = (keycode) => hook.emit("keyup", { keycode });
  return { controller, hook, bindings, delivered, owner, configure, press, release, loads: () => loads };
}

test("hook chords map default Ctrl+F1/F3 and reject unknown keys", () => {
  assert.deepEqual(fgcHookChord("CommandOrControl+F1", KEYS), { keycode: 59, ctrl: true, alt: false, shift: false, meta: false });
  assert.deepEqual(fgcHookChord("Alt+Shift+A", KEYS), { keycode: 30, ctrl: false, alt: true, shift: true, meta: false });
  assert.equal(fgcHookChord("CommandOrControl+Home", KEYS), null);
  assert.equal(fgcHookChord("CommandOrControl+F1", null), null);
});

test("refused Ctrl+F1/F3 fall back to the hook; others stay native", () => {
  const f = hookFixture();
  const status = f.configure();
  assert.deepEqual(status.registered, ["p1Down", "p2Down"]);
  assert.deepEqual(status.fallback, ["p1Up", "p2Up"]);
  assert.deepEqual(status.errors, []);
  assert.match(status.notices[0], /^Team 1 score up, Team 2 score up: the operating system refused to register these keys, so Desk is listening with a keyboard fallback\. The key press also reaches the focused app\.$/);
  assert.doesNotMatch(status.notices[0], /another program/);
  assert.equal(f.hook.starts, 1);
  f.press(KEYS.F1); f.release(KEYS.F1); f.press(KEYS.F3);
  assert.deepEqual(f.delivered.map((d) => d.action), ["p1Up", "p2Up"]);
});

test("hook requires exact modifiers and ignores natively-owned keys (no double fire)", () => {
  const f = hookFixture();
  f.configure();
  f.press(KEYS.F1, {}); f.release(KEYS.F1);
  f.press(KEYS.F1, { ctrlKey: true, shiftKey: true }); f.release(KEYS.F1);
  f.press(KEYS.F2); f.release(KEYS.F2); // native owns Ctrl+F2: hook must not deliver
  assert.equal(f.delivered.length, 0);
  f.bindings.get("CommandOrControl+F2")();
  assert.deepEqual(f.delivered.map((d) => d.action), ["p1Down"]);
});

test("auto-repeat while held delivers once until keyup", () => {
  const f = hookFixture(); f.configure();
  f.press(KEYS.F1); f.press(KEYS.F1); f.press(KEYS.F1);
  assert.equal(f.delivered.length, 1);
  f.release(KEYS.F1); f.press(KEYS.F1);
  assert.equal(f.delivered.length, 2);
});

test("hook is not loaded when every key registers natively", () => {
  const f = hookFixture({ taken: [] });
  const status = f.configure();
  assert.deepEqual(status.fallback, []); assert.equal(f.loads(), 0); assert.equal(f.hook.starts, 0);
});

test("settings suspension, release and reconfigure stop the hook and drop stale sessions", () => {
  const f = hookFixture(); f.configure();
  f.configure({ token: "settings", enabled: false });
  assert.equal(f.hook.stops, 1); assert.equal(f.hook.listenerCount("keydown"), 0);
  f.press(KEYS.F1); assert.equal(f.delivered.length, 0);
  f.configure({ token: "s2" });
  assert.equal(f.hook.listenerCount("keydown"), 1);
  f.press(KEYS.F1); assert.deepEqual(f.delivered, [{ action: "p1Up", token: "s2" }]);
  f.controller.release(f.owner, "stale-token"); assert.equal(f.hook.listenerCount("keydown"), 1);
  f.controller.release(f.owner, "s2");
  assert.equal(f.hook.listenerCount("keydown"), 0); assert.equal(f.hook.listenerCount("keyup"), 0);
  assert.deepEqual([...f.bindings.keys()].sort(), ["CommandOrControl+F1", "CommandOrControl+F3"]); // external untouched
});

test("rapid resyncs keep exactly one listener and the latest token", () => {
  const f = hookFixture();
  for (let i = 0; i < 5; i++) f.configure({ token: `t${i}` });
  assert.equal(f.hook.listenerCount("keydown"), 1);
  f.press(KEYS.F3); assert.deepEqual(f.delivered, [{ action: "p2Up", token: "t4" }]);
});

test("untrusted/navigated owner gets nothing from the hook", () => {
  const f = hookFixture(); f.configure();
  f.owner.valid = false; f.press(KEYS.F1);
  assert.equal(f.delivered.length, 0);
});

test("missing optional module reports truthfully and does not throw", () => {
  const f = hookFixture({ loadHook: () => { throw new Error("Cannot find module"); } });
  const status = f.configure();
  assert.deepEqual(status.fallback, []); assert.deepEqual(status.registered, ["p1Down", "p2Down"]);
  assert.equal(status.errors.length, 2); assert.match(status.errors[0], /^Team 1 score up: .*fallback is not installed/);
});

test("hook start failure reports truthfully and leaves no listeners", () => {
  const f = hookFixture({ startThrows: true });
  const status = f.configure();
  assert.deepEqual(status.fallback, []); assert.equal(status.errors.length, 2);
  assert.match(status.errors[0], /could not start/); assert.equal(f.hook.listenerCount("keydown"), 0);
});

test("non-Windows (no loadHook) keeps the plain refusal and never hooks", () => {
  const f = hookFixture({ loadHook: null });
  const status = f.configure();
  assert.equal(status.errors.length, 2); assert.match(status.errors[0], /operating system refused Ctrl\+F1/);
  assert.doesNotMatch(status.errors[0], /Windows/); assert.deepEqual(status.fallback, []);
  assert.equal(FGC_HOTKEY_LABELS.p2Up, "Team 2 score up");
});

test("missed key-up is recovered on modifier release without repeat or double firing", () => {
  const f = hookFixture(); f.configure();
  f.press(KEYS.F1); // fires
  // F1 key-up missed (e.g. lock screen/UAC); Ctrl released
  f.release(KEYS.Ctrl);
  f.press(KEYS.F1); f.press(KEYS.F1); // fresh chord fires once; held repeat suppressed
  assert.deepEqual(f.delivered.map((d) => d.action), ["p1Up", "p1Up"]);
  f.release(KEYS.F1); f.press(KEYS.F1);
  assert.equal(f.delivered.length, 3);
});
