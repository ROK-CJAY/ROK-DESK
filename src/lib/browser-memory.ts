import type { BrowserBookmark, BrowserHistoryRow, BrowserProfile, BrowserSettings, ClearDataOpts } from "@/lib/rok-desktop";

const BM_KEY = "rok-browser-bookmarks";
const HIST_KEY = "rok-browser-history";
const SET_KEY = "rok-browser-settings";
const TABS_KEY = "rok-browser-tabs";
const SNAP_AT_KEY = "rok-browser-updated-at";
const PROFILES_KEY = "rok-browser-profiles";

export const DESK_PROFILE_ID = "desk";
export const PROFILE_COLORS = ["#e4c56a", "#6ea8ff", "#6bcf8e", "#e07a7a", "#b388ff", "#e09a5a"] as const;
export const DESK_PROFILE: BrowserProfile = { id: DESK_PROFILE_ID, name: "Desk", color: PROFILE_COLORS[0] };
export const MAX_PROFILES = 8;

export type BrowserTab = { id: string; url: string; title: string };

export type BrowserSnapshot = {
  bookmarks: BrowserBookmark[];
  history: BrowserHistoryRow[];
  settings: BrowserSettings;
  tabs: BrowserTab[];
  activeId: string;
  updatedAt: number;
};

export type BrowserBundle = {
  profiles: BrowserProfile[];
  activeId: string;
  byId: Record<string, BrowserSnapshot>;
  updatedAt: number;
};

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
  startup: "continue",
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

export function makeTab(partial: Partial<BrowserTab> = {}): BrowserTab {
  return {
    id: partial.id || `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    url: partial.url ?? "",
    title: partial.title || (partial.url ? hostOf(partial.url) : "New Tab"),
  };
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url || "New Tab";
  }
}

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

function removeKey(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function isProfile(row: unknown): row is BrowserProfile {
  if (!row || typeof row !== "object") return false;
  const item = row as BrowserProfile;
  return typeof item.id === "string" && typeof item.name === "string" && typeof item.color === "string";
}

export function localProfiles(): { profiles: BrowserProfile[]; activeId: string } {
  const raw = read<{ profiles?: unknown; activeId?: unknown }>(PROFILES_KEY, {});
  const profiles = Array.isArray(raw.profiles) ? raw.profiles.filter(isProfile) : [];
  const list = profiles.some((row) => row.id === DESK_PROFILE_ID) ? profiles : [DESK_PROFILE, ...profiles];
  const activeId =
    typeof raw.activeId === "string" && list.some((row) => row.id === raw.activeId) ? raw.activeId : DESK_PROFILE_ID;
  if (!raw.profiles) write(PROFILES_KEY, { profiles: list, activeId });
  return { profiles: list, activeId };
}

function writeProfiles(profiles: BrowserProfile[], activeId: string) {
  const id = profiles.some((row) => row.id === activeId) ? activeId : DESK_PROFILE_ID;
  write(PROFILES_KEY, { profiles, activeId: id });
}

function scoped(base: string, profileId?: string) {
  const id = profileId ?? localProfiles().activeId;
  return id === DESK_PROFILE_ID ? base : `${base}:${id}`;
}

function asBookmarks(raw: unknown): BrowserBookmark[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw.filter(isBookmark);
  if (typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)) {
    return (raw as { items: unknown[] }).items.filter(isBookmark);
  }
  return null;
}

function isBookmark(row: unknown): row is BrowserBookmark {
  if (!row || typeof row !== "object") return false;
  const item = row as BrowserBookmark;
  return typeof item.id === "string" && typeof item.title === "string" && typeof item.url === "string";
}

function isTab(row: unknown): row is BrowserTab {
  if (!row || typeof row !== "object") return false;
  const item = row as BrowserTab;
  return typeof item.id === "string" && typeof item.url === "string" && typeof item.title === "string";
}

function isHistory(row: unknown): row is BrowserHistoryRow {
  if (!row || typeof row !== "object") return false;
  const item = row as BrowserHistoryRow;
  return typeof item.url === "string" && typeof item.title === "string" && typeof item.at === "number";
}

export function localBookmarks(profileId?: string): BrowserBookmark[] {
  const rows = asBookmarks(read<unknown>(scoped(BM_KEY, profileId), null));
  if (rows) return rows;
  write(scoped(BM_KEY, profileId), { items: DEFAULT_BOOKMARKS });
  return DEFAULT_BOOKMARKS.slice();
}

function writeBookmarks(rows: BrowserBookmark[], profileId?: string) {
  write(scoped(BM_KEY, profileId), { items: rows });
}

export function localHistory(profileId?: string): BrowserHistoryRow[] {
  const rows = read<unknown>(scoped(HIST_KEY, profileId), []);
  return Array.isArray(rows) ? rows.filter(isHistory) : [];
}

export function localSettings(profileId?: string): BrowserSettings {
  const incoming = read<Partial<BrowserSettings>>(scoped(SET_KEY, profileId), {});
  return {
    ...DEFAULT_SETTINGS,
    ...incoming,
    startup:
      incoming.startup === "newtab" || incoming.startup === "homepage" || incoming.startup === "continue"
        ? incoming.startup
        : DEFAULT_SETTINGS.startup,
  };
}

export function localSaveSettings(partial: Partial<BrowserSettings>, profileId?: string): BrowserSettings {
  const next = { ...localSettings(profileId), ...partial };
  write(scoped(SET_KEY, profileId), next);
  return next;
}

export function localTabs(profileId?: string): { tabs: BrowserTab[]; activeId: string } {
  const raw = read<{ tabs?: unknown; activeId?: unknown }>(scoped(TABS_KEY, profileId), {});
  const tabs = Array.isArray(raw.tabs) ? raw.tabs.filter(isTab) : [];
  if (!tabs.length) {
    const blank = makeTab({ id: "tab-1" });
    return { tabs: [blank], activeId: blank.id };
  }
  const activeId = typeof raw.activeId === "string" && tabs.some((tab) => tab.id === raw.activeId) ? raw.activeId : tabs[0]!.id;
  return { tabs, activeId };
}

export function localSaveTabs(tabs: BrowserTab[], activeId: string, profileId?: string) {
  const next = tabs.length ? tabs : [makeTab({ id: "tab-1" })];
  const id = next.some((tab) => tab.id === activeId) ? activeId : next[0]!.id;
  write(scoped(TABS_KEY, profileId), { tabs: next, activeId: id });
  const current = next.find((tab) => tab.id === id);
  if (current?.url) localSaveSettings({ lastUrl: current.url }, profileId);
}

export function localRecordHistory(row: BrowserHistoryRow, profileId?: string): BrowserHistoryRow[] {
  const next = [row, ...localHistory(profileId).filter((item) => item.url !== row.url)].slice(0, 400);
  write(scoped(HIST_KEY, profileId), next);
  localSaveSettings({ lastUrl: row.url }, profileId);
  return next;
}

export function localAddBookmark(item: { title: string; url: string }, profileId?: string): BrowserBookmark[] {
  const rows = localBookmarks(profileId).filter((row) => row.url !== item.url);
  rows.unshift({ id: `bm-${Date.now()}`, title: item.title.slice(0, 80), url: item.url });
  writeBookmarks(rows, profileId);
  return rows;
}

export function localRenameBookmark(url: string, title: string, profileId?: string): BrowserBookmark[] {
  const next = title.trim().slice(0, 80);
  if (!next) return localBookmarks(profileId);
  const rows = localBookmarks(profileId).map((row) => (row.url === url ? { ...row, title: next } : row));
  writeBookmarks(rows, profileId);
  return rows;
}

export function localRemoveBookmark(url: string, profileId?: string): BrowserBookmark[] {
  const rows = localBookmarks(profileId).filter((row) => row.url !== url);
  writeBookmarks(rows, profileId);
  return rows;
}

export function localClearHistory(since = 0, profileId?: string): BrowserHistoryRow[] {
  const next = since ? localHistory(profileId).filter((row) => row.at < since) : [];
  write(scoped(HIST_KEY, profileId), next);
  return next;
}

export function localClearData(opts: ClearDataOpts, profileId?: string): BrowserHistoryRow[] {
  const range = opts.range === "hour" ? 60 * 60 * 1000 : opts.range === "day" ? 24 * 60 * 60 * 1000 : 0;
  const since = range ? Date.now() - range : 0;
  if (opts.history) return localClearHistory(since, profileId);
  return localHistory(profileId);
}

export function searchUrl(engine: BrowserSettings["searchEngine"], query: string) {
  const found = SEARCH_ENGINES.find((row) => row.id === engine) ?? SEARCH_ENGINES[0];
  return found.url.replace("%s", encodeURIComponent(query));
}

export function snapshotFor(profileId?: string): BrowserSnapshot {
  const id = profileId ?? localProfiles().activeId;
  const { tabs, activeId } = localTabs(id);
  return {
    bookmarks: localBookmarks(id),
    history: localHistory(id),
    settings: localSettings(id),
    tabs,
    activeId,
    updatedAt: read<number>(scoped(SNAP_AT_KEY, id), 0) || 0,
  };
}

export function localSnapshot(): BrowserSnapshot {
  return snapshotFor();
}

export function applySnapshot(snap: BrowserSnapshot, profileId?: string) {
  const id = profileId ?? localProfiles().activeId;
  writeBookmarks(snap.bookmarks, id);
  write(scoped(HIST_KEY, id), snap.history);
  write(scoped(SET_KEY, id), snap.settings);
  localSaveTabs(snap.tabs, snap.activeId, id);
  write(scoped(SNAP_AT_KEY, id), snap.updatedAt);
}

export function parseBrowserSnapshot(raw: unknown): BrowserSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const incoming = raw as Record<string, unknown>;
  if (incoming.byId && typeof incoming.byId === "object") return null;
  const bookmarks = asBookmarks(incoming.bookmarks) ?? DEFAULT_BOOKMARKS.slice();
  const history = Array.isArray(incoming.history) ? incoming.history.filter(isHistory) : [];
  const settingsRaw = incoming.settings && typeof incoming.settings === "object" ? (incoming.settings as Partial<BrowserSettings>) : {};
  const tabs = Array.isArray(incoming.tabs) ? incoming.tabs.filter(isTab) : [];
  const fallback = tabs.length ? tabs : [makeTab({ id: "tab-1" })];
  const activeId =
    typeof incoming.activeId === "string" && fallback.some((tab) => tab.id === incoming.activeId)
      ? incoming.activeId
      : fallback[0]!.id;
  return {
    bookmarks,
    history,
    settings: { ...DEFAULT_SETTINGS, ...settingsRaw },
    tabs: fallback,
    activeId,
    updatedAt: typeof incoming.updatedAt === "number" ? incoming.updatedAt : 0,
  };
}

function parseProfileList(raw: unknown): BrowserProfile[] {
  if (!Array.isArray(raw)) return [DESK_PROFILE];
  const rows = raw.filter(isProfile);
  return rows.some((row) => row.id === DESK_PROFILE_ID) ? rows : [DESK_PROFILE, ...rows];
}

export function parseBrowserBundle(raw: unknown): BrowserBundle | null {
  if (!raw || typeof raw !== "object") return null;
  const incoming = raw as Record<string, unknown>;
  if (incoming.byId && typeof incoming.byId === "object") {
    const profiles = parseProfileList(incoming.profiles);
    const byId: Record<string, BrowserSnapshot> = {};
    for (const [id, value] of Object.entries(incoming.byId as Record<string, unknown>)) {
      const snap = parseBrowserSnapshot(value);
      if (snap) byId[id] = snap;
    }
    if (!byId[DESK_PROFILE_ID]) byId[DESK_PROFILE_ID] = emptyProfileSnapshot();
    const activeId =
      typeof incoming.activeId === "string" && profiles.some((row) => row.id === incoming.activeId)
        ? incoming.activeId
        : DESK_PROFILE_ID;
    return {
      profiles,
      activeId,
      byId,
      updatedAt: typeof incoming.updatedAt === "number" ? incoming.updatedAt : 0,
    };
  }
  const snap = parseBrowserSnapshot(raw);
  if (!snap) return null;
  return {
    profiles: [DESK_PROFILE],
    activeId: DESK_PROFILE_ID,
    byId: { [DESK_PROFILE_ID]: snap },
    updatedAt: snap.updatedAt,
  };
}

export function emptyProfileSnapshot(): BrowserSnapshot {
  return {
    bookmarks: DEFAULT_BOOKMARKS.slice(),
    history: [],
    settings: { ...DEFAULT_SETTINGS },
    tabs: [{ id: "tab-1", url: "", title: "New Tab" }],
    activeId: "tab-1",
    updatedAt: 0,
  };
}

export function localBundle(): BrowserBundle {
  const { profiles, activeId } = localProfiles();
  const byId: Record<string, BrowserSnapshot> = {};
  for (const profile of profiles) byId[profile.id] = snapshotFor(profile.id);
  return {
    profiles,
    activeId,
    byId,
    updatedAt: Math.max(0, ...Object.values(byId).map((row) => row.updatedAt)),
  };
}

export function applyBundle(bundle: BrowserBundle) {
  writeProfiles(bundle.profiles, bundle.activeId);
  for (const profile of bundle.profiles) {
    const snap = bundle.byId[profile.id];
    if (snap) applySnapshot(snap, profile.id);
  }
}

function nextColor(existing: BrowserProfile[]) {
  const used = new Set(existing.map((row) => row.color));
  return PROFILE_COLORS.find((color) => !used.has(color)) ?? PROFILE_COLORS[existing.length % PROFILE_COLORS.length]!;
}

export function localCreateProfile(name: string): { profiles: BrowserProfile[]; activeId: string } {
  const { profiles, activeId } = localProfiles();
  if (profiles.length >= MAX_PROFILES) return { profiles, activeId };
  const label = name.trim().slice(0, 24) || `Profile ${profiles.length + 1}`;
  const profile: BrowserProfile = {
    id: `p-${Date.now().toString(36)}`,
    name: label,
    color: nextColor(profiles),
  };
  applySnapshot(emptyProfileSnapshot(), profile.id);
  const next = [...profiles, profile];
  writeProfiles(next, profile.id);
  return { profiles: next, activeId: profile.id };
}

export function localRenameProfile(id: string, name: string): { profiles: BrowserProfile[]; activeId: string } {
  const state = localProfiles();
  const label = name.trim().slice(0, 24);
  if (!label) return state;
  const profiles = state.profiles.map((row) => (row.id === id ? { ...row, name: label } : row));
  writeProfiles(profiles, state.activeId);
  return { profiles, activeId: state.activeId };
}

export function localRemoveProfile(id: string): { profiles: BrowserProfile[]; activeId: string } {
  const state = localProfiles();
  if (id === DESK_PROFILE_ID) return state;
  const profiles = state.profiles.filter((row) => row.id !== id);
  if (profiles.length === state.profiles.length) return state;
  removeKey(scoped(BM_KEY, id));
  removeKey(scoped(HIST_KEY, id));
  removeKey(scoped(SET_KEY, id));
  removeKey(scoped(TABS_KEY, id));
  removeKey(scoped(SNAP_AT_KEY, id));
  const activeId = state.activeId === id ? DESK_PROFILE_ID : state.activeId;
  writeProfiles(profiles, activeId);
  return { profiles, activeId };
}

export function localSwitchProfile(id: string): { profiles: BrowserProfile[]; activeId: string; snap: BrowserSnapshot } {
  const state = localProfiles();
  const activeId = state.profiles.some((row) => row.id === id) ? id : state.activeId;
  writeProfiles(state.profiles, activeId);
  return { profiles: state.profiles, activeId, snap: snapshotFor(activeId) };
}

export async function pullRemoteBundle(): Promise<BrowserBundle | null> {
  try {
    const res = await fetch("/api/browser", { cache: "no-store" });
    if (!res.ok) return null;
    return parseBrowserBundle(await res.json());
  } catch {
    return null;
  }
}

export async function pushRemoteBundle(bundle?: BrowserBundle): Promise<void> {
  const payload = bundle ?? localBundle();
  payload.updatedAt = Date.now();
  write(scoped(SNAP_AT_KEY), payload.updatedAt);
  try {
    await fetch("/api/browser", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    /* offline */
  }
}

/** @deprecated use pullRemoteBundle */
export async function pullRemoteSnapshot(): Promise<BrowserSnapshot | null> {
  const bundle = await pullRemoteBundle();
  if (!bundle) return null;
  return bundle.byId[bundle.activeId] ?? null;
}

/** @deprecated use pushRemoteBundle */
export async function pushRemoteSnapshot(snap: BrowserSnapshot): Promise<void> {
  applySnapshot(snap);
  await pushRemoteBundle();
}
