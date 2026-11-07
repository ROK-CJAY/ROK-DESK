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

export function trustedFgcSender(event, windows, origin) {
  const sender = event.sender;
  if (!windows.has(sender) || sender.isDestroyed() || event.senderFrame !== sender.mainFrame) return false;
  try {
    const url = new URL(sender.getURL());
    return url.origin === new URL(origin).origin && url.pathname.replace(/\/$/, "") === "/fgc/production";
  } catch { return false; }
}

export function createFgcHotkeys({ globalShortcut, trusted, deliver }) {
  let current = null;
  const owned = new Set();
  function clear() {
    current = null;
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
        else errors.push(`${action}: ${combo} is unavailable or in use by another application.`);
      } catch { errors.push(`${action}: could not register ${combo}.`); }
    }
    return { registered, errors };
  }
  return { configure, release, clear };
}
