export type BrowserBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BrowserBookmark = {
  id: string;
  title: string;
  url: string;
};

export type BrowserHistoryRow = {
  url: string;
  title: string;
  at: number;
};

export type BrowserSettings = {
  searchEngine: "google" | "ddg" | "bing";
  startup: "newtab" | "continue" | "homepage";
  homepage: string;
  lastUrl: string;
  zoom: number;
};

export type BrowserProfile = {
  id: string;
  name: string;
  color: string;
};

export type BrowserTabState = { id: string; url: string; title: string };

export type BrowserSessionPayload = {
  profiles: BrowserProfile[];
  activeId: string;
  bookmarks: BrowserBookmark[];
  history: BrowserHistoryRow[];
  settings: BrowserSettings;
  tabs: BrowserTabState[];
  activeTabId: string;
};

export type ClearDataOpts = {
  range?: "hour" | "day" | "all";
  history?: boolean;
  cookies?: boolean;
  cache?: boolean;
};

export type RokDeskBridge = {
  desktop: true;
  browserAttach: (bounds: BrowserBounds) => void;
  browserDetach: () => void;
  browserLoad: (url: string) => void;
  browserBack: () => void;
  browserForward: () => void;
  browserReload: () => void;
  browserPrint: () => void;
  browserZoom: (factor: number) => Promise<number>;
  newWindow: (url?: string) => Promise<boolean>;
  historyList: () => Promise<BrowserHistoryRow[]>;
  bookmarksList: () => Promise<BrowserBookmark[]>;
  bookmarkAdd: (item: { title: string; url: string }) => Promise<BrowserBookmark[]>;
  bookmarkRemove: (url: string) => Promise<BrowserBookmark[]>;
  bookmarkRename: (url: string, title: string) => Promise<BrowserBookmark[]>;
  historyClear: () => Promise<BrowserHistoryRow[]>;
  clearData: (opts: ClearDataOpts) => Promise<{ ok: boolean; history?: BrowserHistoryRow[] }>;
  settings: () => Promise<BrowserSettings>;
  saveSettings: (partial: Partial<BrowserSettings>) => Promise<BrowserSettings>;
  tabsList: () => Promise<{ tabs: BrowserTabState[]; activeId: string }>;
  tabsSave: (payload: { tabs: BrowserTabState[]; activeId: string }) => Promise<{ tabs: BrowserTabState[]; activeId: string }>;
  profilesList: () => Promise<{ profiles: BrowserProfile[]; activeId: string }>;
  profileCreate: (name: string) => Promise<BrowserSessionPayload>;
  profileRename: (id: string, name: string) => Promise<{ profiles: BrowserProfile[]; activeId: string }>;
  profileRemove: (id: string) => Promise<BrowserSessionPayload>;
  profileSwitch: (id: string) => Promise<BrowserSessionPayload>;
  downloadsPath: () => Promise<string>;
  openDownloads: () => Promise<boolean>;
  browserDataPath: () => Promise<string>;
  openBrowserData: () => Promise<boolean>;
  onBrowserUrl: (cb: (url: string) => void) => () => void;
  onBrowserTitle: (cb: (title: string) => void) => () => void;
  onBrowserHistory: (cb: (rows: BrowserHistoryRow[]) => void) => () => void;
};

export function rokDesktop(): RokDeskBridge | null {
  if (typeof window === "undefined") return null;
  return window.rokDesk ?? null;
}

declare global {
  interface Window {
    rokDesk?: RokDeskBridge;
  }
}
