import { app, session, shell } from "electron";
import fs from "node:fs";
import path from "node:path";

export const BROWSER_PARTITION = "persist:rok-browser";
const HISTORY_MAX = 400;

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
  startup: "newtab",
  homepage: "",
  lastUrl: "",
  zoom: 1,
};

function dataDir() {
  const dir = path.join(app.getPath("userData"), "browser");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir(), file), "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.writeFileSync(path.join(dataDir(), file), JSON.stringify(value, null, 2));
}

export function loadHistory() {
  const rows = readJson("history.json", []);
  return Array.isArray(rows) ? rows : [];
}

export function loadBookmarks() {
  const rows = readJson("bookmarks.json", null);
  if (Array.isArray(rows) && rows.length) return rows;
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

export function browserSession() {
  return session.fromPartition(BROWSER_PARTITION);
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

export function attachDownloadHandler() {
  const ses = browserSession();
  ses.on("will-download", (_event, item) => {
    const dest = path.join(app.getPath("downloads"), item.getFilename());
    item.setSavePath(dest);
    item.once("done", (_e, state) => {
      if (state === "completed") void shell.showItemInFolder(dest);
    });
  });
}
