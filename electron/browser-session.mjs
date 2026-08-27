import { app, session, shell } from "electron";
import fs from "node:fs";
import path from "node:path";

export const DESK_PROFILE_ID = "desk";
const HISTORY_MAX = 400;
const MAX_PROFILES = 8;
const PROFILE_COLORS = ["#e4c56a", "#6ea8ff", "#6bcf8e", "#e07a7a", "#b388ff", "#e09a5a"];

const DEFAULT_BOOKMARKS = [
  { id: "releases", title: "Downloads", url: "https://github.com/ROK-CJAY/ROK-DESK/releases/latest" },
  { id: "donate", title: "Donate", url: "https://www.paypal.com/donate/?hosted_button_id=XM6K2Y4MXJZC4" },
  { id: "feedback", title: "Feedback", url: "https://forms.gle/Re5mt8RXU7qNEN8W9" },
  { id: "scryfall", title: "Scryfall", url: "https://scryfall.com/" },
  { id: "limitless", title: "Limitless", url: "https://play.limitlesstcg.com/" },
  { id: "pokemondb", title: "Pokémon DB", url: "https://pokemondb.net/pokedex/national" },
];

export const DEFAULT_SETTINGS = {
  searchEngine: "google",
  startup: "continue",
  homepage: "",
  lastUrl: "",
  zoom: 1,
};

const DESK_PROFILE = { id: DESK_PROFILE_ID, name: "Desk", color: PROFILE_COLORS[0] };
let migrated = false;

/** Survives uninstall: sibling of the app userData folder, not inside it. */
export function browserDataRoot() {
  const dir = path.join(app.getPath("appData"), "ROK Desk Browser");
  fs.mkdirSync(dir, { recursive: true });
  migrateLegacy(dir);
  return dir;
}

function rootDir() {
  return browserDataRoot();
}

function copyDir(from, to) {
  if (!fs.existsSync(from) || fs.existsSync(to)) return;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true, errorOnExist: false, force: false });
}

function migrateLegacy(dest) {
  if (migrated) return;
  migrated = true;
  const marker = path.join(dest, ".keep");
  try {
    const legacyJson = path.join(app.getPath("userData"), "browser");
    const hasNew = fs.existsSync(path.join(dest, "profiles.json")) || fs.existsSync(path.join(dest, "bookmarks.json"));
    if (fs.existsSync(legacyJson) && !hasNew) {
      fs.cpSync(legacyJson, dest, { recursive: true, force: false });
    }
    const parts = path.join(app.getPath("userData"), "Partitions");
    if (fs.existsSync(parts)) {
      for (const name of fs.readdirSync(parts)) {
        if (name === "rok-browser") copyDir(path.join(parts, name), path.join(dest, "sessions", DESK_PROFILE_ID));
        else if (name.startsWith("rok-browser-")) {
          copyDir(path.join(parts, name), path.join(dest, "sessions", name.slice("rok-browser-".length)));
        }
      }
    }
    fs.writeFileSync(marker, "Browser data is kept here if ROK Desk is uninstalled.\n");
  } catch {
    /* first run / locked files */
  }
}

function sanitizeId(id) {
  const next = String(id || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
  return next || DESK_PROFILE_ID;
}

function partitionFor(id) {
  const safe = sanitizeId(id);
  return safe === DESK_PROFILE_ID ? "persist:rok-browser" : `persist:rok-browser-${safe}`;
}

function sessionDir(id) {
  const dir = path.join(rootDir(), "sessions", sanitizeId(id));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function profileDir(id) {
  const safe = sanitizeId(id);
  if (safe === DESK_PROFILE_ID) return rootDir();
  const dir = path.join(rootDir(), "profiles", safe);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function readFile(dir, file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  } catch {
    return fallback;
  }
}

function writeFile(dir, file, value) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), JSON.stringify(value, null, 2));
}

export function loadRegistry() {
  const raw = readFile(rootDir(), "profiles.json", null);
  const profiles = Array.isArray(raw?.profiles)
    ? raw.profiles.filter((row) => row && typeof row.id === "string" && typeof row.name === "string")
    : [];
  const list = profiles.some((row) => row.id === DESK_PROFILE_ID)
    ? profiles.map((row) => ({
        id: sanitizeId(row.id),
        name: String(row.name).slice(0, 24) || "Profile",
        color: typeof row.color === "string" ? row.color : PROFILE_COLORS[0],
      }))
    : [DESK_PROFILE, ...profiles];
  const activeId =
    typeof raw?.activeId === "string" && list.some((row) => row.id === raw.activeId) ? raw.activeId : DESK_PROFILE_ID;
  const next = { profiles: list, activeId };
  if (!raw) writeFile(rootDir(), "profiles.json", next);
  return next;
}

function saveRegistry(registry) {
  writeFile(rootDir(), "profiles.json", registry);
  return registry;
}

function activeId() {
  return loadRegistry().activeId;
}

function readJson(file, fallback) {
  return readFile(profileDir(activeId()), file, fallback);
}

function writeJson(file, value) {
  writeFile(profileDir(activeId()), file, value);
}

export function loadHistory() {
  const rows = readJson("history.json", []);
  return Array.isArray(rows) ? rows : [];
}

export function loadBookmarks() {
  const rows = readJson("bookmarks.json", null);
  if (Array.isArray(rows)) return rows;
  writeJson("bookmarks.json", DEFAULT_BOOKMARKS);
  return DEFAULT_BOOKMARKS.slice();
}

export function saveBookmarks(rows) {
  writeJson("bookmarks.json", rows);
  return rows;
}

export function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...(readJson("settings.json", {}) || {}) };
}

export function saveSettings(partial) {
  const next = { ...loadSettings(), ...partial };
  writeJson("settings.json", next);
  return next;
}

export function loadTabs() {
  const raw = readJson("tabs.json", null);
  const tabs = Array.isArray(raw?.tabs) ? raw.tabs.filter((row) => row && typeof row.id === "string") : [];
  if (!tabs.length) {
    const blank = { id: "tab-1", url: "", title: "New Tab" };
    return { tabs: [blank], activeId: blank.id };
  }
  const current = tabs.some((tab) => tab.id === raw?.activeId) ? raw.activeId : tabs[0].id;
  return { tabs, activeId: current };
}

export function saveTabs(payload) {
  const tabs = Array.isArray(payload?.tabs) && payload.tabs.length
    ? payload.tabs
    : [{ id: "tab-1", url: "", title: "New Tab" }];
  const current = tabs.some((tab) => tab.id === payload?.activeId) ? payload.activeId : tabs[0].id;
  writeJson("tabs.json", { tabs, activeId: current });
  const open = tabs.find((tab) => tab.id === current);
  if (open?.url) saveSettings({ lastUrl: open.url });
  return { tabs, activeId: current };
}

export function recordHistory(entry) {
  if (!entry?.url || !entry.url.startsWith("http")) return loadHistory();
  const rows = loadHistory().filter((row) => row.url !== entry.url);
  rows.unshift({
    url: entry.url,
    title: entry.title || entry.url,
    at: Date.now(),
  });
  const next = rows.slice(0, HISTORY_MAX);
  writeJson("history.json", next);
  saveSettings({ lastUrl: entry.url });
  return next;
}

export function clearHistory(since = 0) {
  if (!since) {
    writeJson("history.json", []);
    return [];
  }
  const kept = loadHistory().filter((row) => row.at < since);
  writeJson("history.json", kept);
  return kept;
}

export function addBookmark(item) {
  const url = String(item?.url || "");
  if (!url.startsWith("http://") && !url.startsWith("https://")) return loadBookmarks();
  const rows = loadBookmarks().filter((row) => row.url !== url);
  rows.unshift({
    id: `bm-${Date.now()}`,
    title: String(item.title || url).slice(0, 80),
    url,
  });
  return saveBookmarks(rows);
}

export function renameBookmark(url, title) {
  const next = String(title || "").trim().slice(0, 80);
  if (!next) return loadBookmarks();
  return saveBookmarks(
    loadBookmarks().map((row) => (row.url === url ? { ...row, title: next } : row)),
  );
}

export function removeBookmark(url) {
  return saveBookmarks(loadBookmarks().filter((row) => row.url !== url));
}

const sessionCache = new Map();

export function browserSession(id = activeId()) {
  const key = sanitizeId(id);
  const cached = sessionCache.get(key);
  if (cached) return cached;
  const ses = session.fromPath(sessionDir(key));
  sessionCache.set(key, ses);
  return ses;
}

export async function clearBrowserData(opts = {}) {
  const range = opts.range === "hour" ? 60 * 60 * 1000 : opts.range === "day" ? 24 * 60 * 60 * 1000 : 0;
  const since = range ? Date.now() - range : 0;
  const ses = browserSession();
  if (opts.cache) await ses.clearCache();
  if (opts.cookies) {
    await ses.clearStorageData({
      storages: ["cookies", "localstorage", "indexdb", "serviceworkers", "cachestorage"],
    });
  }
  let history = loadHistory();
  if (opts.history) history = clearHistory(since);
  return { ok: true, history };
}

export function downloadsPath() {
  return app.getPath("downloads");
}

const downloadWired = new WeakSet();

export function attachDownloadHandler(id = DESK_PROFILE_ID) {
  const ses = browserSession(id);
  if (downloadWired.has(ses)) return;
  downloadWired.add(ses);
  ses.on("will-download", (_event, item) => {
    const dest = path.join(app.getPath("downloads"), item.getFilename());
    item.setSavePath(dest);
    item.once("done", (_e, state) => {
      if (state === "completed") void shell.showItemInFolder(dest);
    });
  });
}

function sessionPayload() {
  const tabs = loadTabs();
  const registry = loadRegistry();
  return {
    profiles: registry.profiles,
    activeId: registry.activeId,
    bookmarks: loadBookmarks(),
    history: loadHistory(),
    settings: loadSettings(),
    tabs: tabs.tabs,
    activeTabId: tabs.activeId,
  };
}

export function switchProfile(id) {
  const registry = loadRegistry();
  const nextId = registry.profiles.some((row) => row.id === id) ? id : registry.activeId;
  saveRegistry({ ...registry, activeId: nextId });
  attachDownloadHandler(nextId);
  return sessionPayload();
}

export function createProfile(name) {
  const registry = loadRegistry();
  if (registry.profiles.length >= MAX_PROFILES) return sessionPayload();
  const used = new Set(registry.profiles.map((row) => row.color));
  const color = PROFILE_COLORS.find((item) => !used.has(item)) ?? PROFILE_COLORS[registry.profiles.length % PROFILE_COLORS.length];
  const profile = {
    id: `p-${Date.now().toString(36)}`,
    name: String(name || "").trim().slice(0, 24) || `Profile ${registry.profiles.length + 1}`,
    color,
  };
  saveRegistry({ profiles: [...registry.profiles, profile], activeId: profile.id });
  writeFile(profileDir(profile.id), "bookmarks.json", DEFAULT_BOOKMARKS);
  writeFile(profileDir(profile.id), "history.json", []);
  writeFile(profileDir(profile.id), "settings.json", DEFAULT_SETTINGS);
  writeFile(profileDir(profile.id), "tabs.json", { tabs: [{ id: "tab-1", url: "", title: "New Tab" }], activeId: "tab-1" });
  attachDownloadHandler(profile.id);
  return sessionPayload();
}

export function renameProfile(id, name) {
  const registry = loadRegistry();
  const label = String(name || "").trim().slice(0, 24);
  if (!label) return registry;
  const profiles = registry.profiles.map((row) => (row.id === id ? { ...row, name: label } : row));
  return saveRegistry({ ...registry, profiles });
}

export function removeProfile(id) {
  const registry = loadRegistry();
  if (id === DESK_PROFILE_ID) return sessionPayload();
  const profiles = registry.profiles.filter((row) => row.id !== id);
  if (profiles.length === registry.profiles.length) return sessionPayload();
  const dir = profileDir(id);
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  try {
    fs.rmSync(path.join(rootDir(), "sessions", sanitizeId(id)), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  sessionCache.delete(sanitizeId(id));
  const active = registry.activeId === id ? DESK_PROFILE_ID : registry.activeId;
  saveRegistry({ profiles, activeId: active });
  attachDownloadHandler(active);
  return sessionPayload();
}

export function listProfiles() {
  return loadRegistry();
}
