import type { BrowserBookmark, BrowserHistoryRow, BrowserSettings, ClearDataOpts } from "@/lib/rok-desktop";

const BM_KEY = "rok-browser-bookmarks";
const HIST_KEY = "rok-browser-history";
const SET_KEY = "rok-browser-settings";

export const DEFAULT_BOOKMARKS: BrowserBookmark[] = [
  { id: "releases", title: "Downloads", url: "https://github.com/ROK-CJAY/ROK-DESK/releases/latest" },
  { id: "donate", title: "Donate", url: "https://www.paypal.com/donate/?hosted_button_id=XM6K2Y4MXJZC4" },
  { id: "feedback", title: "Feedback", url: "https://forms.gle/Re5mt8RXU7qNEN8W9" },
  { id: "scryfall", title: "Scryfall", url: "https://scryfall.com/" },
  { id: "limitless", title: "Limitless", url: "https://play.limitlesstcg.com/" },
  { id: "pokemondb", title: "Pokémon DB", url: "https://pokemondb.net/pokedex/national" },
];

export const DEFAULT_SETTINGS: BrowserSettings = {
  searchEngine: "google",
  startup: "newtab",
  homepage: "",
  lastUrl: "",
  zoom: 1,
};

export const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];

export function nextZoom(current: number, dir: "in" | "out" | "reset") {
  if (dir === "reset") return 1;
  let i = 0;
  for (let n = 0; n < ZOOM_STEPS.length; n += 1) {
    if (Math.abs(ZOOM_STEPS[n] - current) < 0.02) {
      i = n;
      break;
    }
    if (ZOOM_STEPS[n] < current) i = n;
  }
  if (dir === "in") return ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, i + 1)];
  return ZOOM_STEPS[Math.max(0, i - 1)];
}

export const SEARCH_ENGINES = [
  { id: "google" as const, label: "Google", url: "https://www.google.com/search?q=%s" },
  { id: "ddg" as const, label: "DuckDuckGo", url: "https://duckduckgo.com/?q=%s" },
  { id: "bing" as const, label: "Bing", url: "https://www.bing.com/search?q=%s" },
];

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function localBookmarks(): BrowserBookmark[] {
  const rows = read<BrowserBookmark[]>(BM_KEY, []);
  if (rows.length) return rows;
  write(BM_KEY, DEFAULT_BOOKMARKS);
  return DEFAULT_BOOKMARKS.slice();
}

export function localHistory(): BrowserHistoryRow[] {
  return read<BrowserHistoryRow[]>(HIST_KEY, []);
}

export function localSettings(): BrowserSettings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<BrowserSettings>>(SET_KEY, {}) };
}

export function localSaveSettings(partial: Partial<BrowserSettings>): BrowserSettings {
  const next = { ...localSettings(), ...partial };
  write(SET_KEY, next);
  return next;
}

export function localRecordHistory(row: BrowserHistoryRow): BrowserHistoryRow[] {
  const next = [row, ...localHistory().filter((item) => item.url !== row.url)].slice(0, 400);
  write(HIST_KEY, next);
  localSaveSettings({ lastUrl: row.url });
  return next;
}

export function localAddBookmark(item: { title: string; url: string }): BrowserBookmark[] {
  const rows = localBookmarks().filter((row) => row.url !== item.url);
  rows.unshift({ id: `bm-${Date.now()}`, title: item.title.slice(0, 80), url: item.url });
  write(BM_KEY, rows);
  return rows;
}

export function localRenameBookmark(url: string, title: string): BrowserBookmark[] {
  const next = title.trim().slice(0, 80);
  if (!next) return localBookmarks();
  const rows = localBookmarks().map((row) => (row.url === url ? { ...row, title: next } : row));
  write(BM_KEY, rows);
  return rows;
}

export function localRemoveBookmark(url: string): BrowserBookmark[] {
  const rows = localBookmarks().filter((row) => row.url !== url);
  write(BM_KEY, rows);
  return rows;
}

export function localClearHistory(since = 0): BrowserHistoryRow[] {
  const next = since ? localHistory().filter((row) => row.at < since) : [];
  write(HIST_KEY, next);
  return next;
}

export function localClearData(opts: ClearDataOpts): BrowserHistoryRow[] {
  const range = opts.range === "hour" ? 60 * 60 * 1000 : opts.range === "day" ? 24 * 60 * 60 * 1000 : 0;
  const since = range ? Date.now() - range : 0;
  if (opts.history) return localClearHistory(since);
  return localHistory();
}

export function searchUrl(engine: BrowserSettings["searchEngine"], query: string) {
  const found = SEARCH_ENGINES.find((row) => row.id === engine) ?? SEARCH_ENGINES[0];
  return found.url.replace("%s", encodeURIComponent(query));
}
