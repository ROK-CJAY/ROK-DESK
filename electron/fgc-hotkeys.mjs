// Only this controller's shortcuts are owned/released; never unregisterAll().
export const FGC_HOTKEY_ACTIONS = ["loadSet", "p1Up", "p1Down", "p2Up", "p2Down", "reset", "swap", "refresh"];

export function fgcAccelerator(combo) {
  if (typeof combo !== "string" || combo.length > 80) return null;
  const parts = combo.split("+").map((part) => part.trim());
  if (!parts.length || parts.some((part) => !part)) return null;
  const key = parts.pop();
  const modifiers = [];
  for (const part of parts) {
    const modifier = { ctrl: "CommandOrControl", alt: "Alt", shift: "Shift", meta: "Super" }[part.toLowerCase()];
    if (typeof modifier !== "string" || modifiers.includes(modifier)) return null;
    modifiers.push(modifier);
  }
  const named = {
    space: "Space", enter: "Return", escape: "Escape", tab: "Tab", backspace: "Backspace",
    delete: "Delete", insert: "Insert", home: "Home", end: "End", pageup: "PageUp", pagedown: "PageDown",
    arrowup: "Up", arrowdown: "Down", arrowleft: "Left", arrowright: "Right",
  };
  const normalized = /^(?:[a-z0-9]|F(?:[1-9]|1[0-9]|2[0-4]))$/i.test(key) ? key.toUpperCase() : named[key.toLowerCase()];
  if (typeof normalized !== "string") return null;
  // Canonical order also catches duplicate combos with reordered modifiers.
  modifiers.sort();
  return [...modifiers, normalized].join("+");
}

export const FGC_HOTKEY_LABELS = {
  loadSet: "Load set", p1Up: "Team 1 score up", p1Down: "Team 1 score down", p2Up: "Team 2 score up",
  p2Down: "Team 2 score down", reset: "Reset scores", swap: "Swap teams", refresh: "Refresh standings",
};

const HOOK_KEY_NAMES = { Return: "Enter", Up: "ArrowUp", Down: "ArrowDown", Left: "ArrowLeft", Right: "ArrowRight" };

/** Map a canonical accelerator to a uiohook chord ({ keycode, ctrl, alt, shift, meta }) or null. */
export function fgcHookChord(accelerator, UiohookKey) {
  if (typeof accelerator !== "string" || !UiohookKey) return null;
  const parts = accelerator.split("+");
  const key = parts.pop();
  const keycode = UiohookKey[HOOK_KEY_NAMES[key] ?? key];
  if (typeof keycode !== "number") return null;
  return {
    keycode,
    ctrl: parts.includes("CommandOrControl"), alt: parts.includes("Alt"),
    shift: parts.includes("Shift"), meta: parts.includes("Super"),
  };
}

export function trustedFgcSender(event, windows, origin) {
  const sender = event.sender;
  if (!windows.has(sender) || sender.isDestroyed() || event.senderFrame !== sender.mainFrame) return false;
  try {
    const url = new URL(sender.getURL());
    return url.origin === new URL(origin).origin && url.pathname.replace(/\/$/, "") === "/fgc/production";
  } catch { return false; }
}

// loadHook (Windows only) returns { uIOhook, UiohookKey }. The hook only listens (WH_KEYBOARD_LL, like
// TournamentStreamHelper's pynput listener) and is used solely for chords the OS refused to register.
// Nothing about keystrokes is stored or logged; only configured chords are compared.
export function createFgcHotkeys({ globalShortcut, trusted, deliver, loadHook = null }) {
  let current = null;
  const owned = new Set();
  let hook = null; // { uIOhook, UiohookKey } once loaded
  let hookLoadError = null;
  let hookRunning = false;
  let hookChords = []; // [{ chord, action, session }]
  const held = new Set();
  const onKeyDown = (event) => {
    const keycode = event?.keycode;
    if (typeof keycode !== "number") return;
    if (held.has(keycode)) return; // auto-repeat while held
    held.add(keycode);
    for (const { chord, action, session } of hookChords) {
      if (chord.keycode !== keycode || chord.ctrl !== !!event.ctrlKey || chord.alt !== !!event.altKey
        || chord.shift !== !!event.shiftKey || chord.meta !== !!event.metaKey) continue;
      if (current === session && session.enabled && trusted(session.owner)) deliver(session.owner, { action, token: session.token });
      return;
    }
  };
  const MODIFIER_NAMES = ["Ctrl", "CtrlRight", "Alt", "AltRight", "Shift", "ShiftRight", "Meta", "MetaRight"];
  const onKeyUp = (event) => {
    const keycode = event?.keycode;
    if (typeof keycode !== "number") return;
    held.delete(keycode);
    // A key-up can be missed (lock screen, UAC, focus moving to an elevated window). Releasing a
    // modifier ends any chord, so forget every held key; the next fresh chord press fires once.
    if (MODIFIER_NAMES.some((name) => hook?.UiohookKey?.[name] === keycode)) held.clear();
  };
  function stopHook() {
    hookChords = [];
    held.clear();
    if (!hook || !hookRunning) return;
    hookRunning = false;
    hook.uIOhook.off("keydown", onKeyDown);
    hook.uIOhook.off("keyup", onKeyUp);
    try { hook.uIOhook.stop(); } catch { /* already stopped */ }
  }
  function ensureHook() {
    if (!loadHook) return null;
    if (!hook && !hookLoadError) {
      try {
        const loaded = loadHook();
        if (!loaded?.uIOhook || !loaded?.UiohookKey) throw new Error("missing");
        hook = loaded;
      } catch { hookLoadError = true; }
    }
    return hook;
  }
  function startHook() {
    if (hookRunning) return true;
    try {
      hook.uIOhook.on("keydown", onKeyDown);
      hook.uIOhook.on("keyup", onKeyUp);
      hook.uIOhook.start();
      hookRunning = true;
      return true;
    } catch {
      hook.uIOhook.off("keydown", onKeyDown);
      hook.uIOhook.off("keyup", onKeyUp);
      return false;
    }
  }
  function clear() {
    current = null;
    stopHook();
    for (const accelerator of owned) globalShortcut.unregister(accelerator);
    owned.clear();
  }
  function release(owner, token) {
    if (current?.owner === owner && (token === undefined || current.token === token)) clear();
  }
  function configure(owner, payload) {
    if (!trusted(owner)) return { errors: ["Only the FGC Production desk can register shortcuts."] };
    if (!payload || typeof payload !== "object" || typeof payload.token !== "string" || !/^[\w-]{1,80}$/.test(payload.token)
      || typeof payload.enabled !== "boolean" || !payload.keys || typeof payload.keys !== "object" || Array.isArray(payload.keys)
      || Object.keys(payload.keys).some((key) => !FGC_HOTKEY_ACTIONS.includes(key))) {
      return { errors: ["Invalid hotkey configuration."] };
    }
    if (current && current.owner !== owner) {
      if (trusted(current.owner)) return { errors: ["Global hotkeys are already controlled by another FGC Production window. Close that desk, then reopen Production here."] };
      clear();
    }
    clear();
    const session = { owner, token: payload.token, enabled: payload.enabled };
    current = session;
    const errors = [];
    const registered = [];
    const fallback = [];
    const refused = [];
    const seen = new Set();
    if (payload.enabled) for (const action of FGC_HOTKEY_ACTIONS) {
      const combo = payload.keys[action];
      if (combo === "" || combo === undefined) continue;
      const accelerator = fgcAccelerator(combo);
      if (!accelerator) { errors.push(`${action}: unsupported shortcut (${String(combo).slice(0, 80)}).`); continue; }
      if (seen.has(accelerator)) { errors.push(`${action}: duplicate shortcut (${combo}).`); continue; }
      seen.add(accelerator);
      try {
        const ok = globalShortcut.register(accelerator, () => {
          if (current === session && trusted(owner)) deliver(owner, { action, token: session.token });
        });
        if (ok) { owned.add(accelerator); registered.push(action); }
        else refused.push({ action, combo, accelerator });
      } catch { errors.push(`${FGC_HOTKEY_LABELS[action]}: could not register ${combo}.`); }
    }
    const refusedText = ({ action, combo }) => `${FGC_HOTKEY_LABELS[action]}: the operating system refused ${combo}; another running program may already have registered it as a system-wide shortcut.`;
    if (refused.length) {
      const loaded = ensureHook();
      const chords = loaded ? refused.map((item) => ({ ...item, chord: fgcHookChord(item.accelerator, loaded.UiohookKey) })) : [];
      if (!loadHook) for (const item of refused) errors.push(`${refusedText(item)} Pick a different key in Settings or free it in that program.`);
      else if (!loaded) for (const item of refused) errors.push(`${refusedText(item)} The background keyboard fallback is not installed in this build, so this key will not work. Pick a different key in Settings.`);
      else {
        const usable = chords.filter((item) => item.chord);
        for (const item of chords) if (!item.chord) errors.push(`${refusedText(item)} The keyboard fallback cannot watch this key. Pick a different key in Settings.`);
        if (usable.length && startHook()) {
          hookChords = usable.map(({ chord, action }) => ({ chord, action, session }));
          for (const item of usable) fallback.push(item.action);
        } else for (const item of usable) errors.push(`${refusedText(item)} The background keyboard fallback could not start, so this key will not work. Restart Desk or pick a different key in Settings.`);
      }
    }
    const notices = fallback.length
      ? [`${fallback.map((action) => FGC_HOTKEY_LABELS[action]).join(", ")}: the operating system refused to register ${fallback.length > 1 ? "these keys" : "this key"}, so Desk is listening with a keyboard fallback. The key press also reaches the focused app.`]
      : [];
    return { registered, fallback, errors, notices };
  }
  return { configure, release, clear };
}
