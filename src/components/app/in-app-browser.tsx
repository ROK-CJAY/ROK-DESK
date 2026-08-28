import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, ExternalLink, Globe, Minus, MoreVertical, Plus, RotateCw, Star, Trash2, X } from "lucide-react";
import { AppChrome } from "@/components/app/app-chrome";
import { Field, NativeSelect } from "@/components/desk/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  applyBundle,
  DESK_PROFILE,
  DESK_PROFILE_ID,
  localAddBookmark,
  localBundle,
  localClearData,
  localCreateProfile,
  localProfiles,
  localRecordHistory,
  localRemoveBookmark,
  localRemoveProfile,
  localRenameBookmark,
  localRenameProfile,
  localSaveSettings,
  localSaveTabs,
  localSettings,
  localSnapshot,
  localSwitchProfile,
  makeTab,
  MAX_PROFILES,
  nextZoom,
  pullRemoteBundle,
  pushRemoteBundle,
  searchUrl,
  SEARCH_ENGINES,
  type BrowserTab,
} from "@/lib/browser-memory";
import {
  rokDesktop,
  type BrowserBookmark,
  type BrowserHistoryRow,
  type BrowserProfile,
  type BrowserSessionPayload,
  type BrowserSettings,
  type ClearDataOpts,
} from "@/lib/rok-desktop";
import { cn } from "@/lib/cn";

function normalizeUrl(raw: string, engine: BrowserSettings["searchEngine"]): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) && !trimmed.includes(".") && !trimmed.includes("/")) {
    return searchUrl(engine, trimmed);
  }
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function hostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function InAppBrowser() {
  const desktop = typeof window !== "undefined" ? rokDesktop() : null;
  const [draft, setDraft] = useState("");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("Browser");
  const [bookmarks, setBookmarks] = useState<BrowserBookmark[]>([]);
  const [history, setHistory] = useState<BrowserHistoryRow[]>([]);
  const [settings, setSettings] = useState<BrowserSettings>(localSettings());
  const [panel, setPanel] = useState<"history" | "settings" | "bookmarks" | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; mark: BrowserBookmark } | null>(null);
  const [rename, setRename] = useState<{ url: string; title: string } | null>(null);
  const [downloads, setDownloads] = useState("");
  const [dataPath, setDataPath] = useState("");
  const [tabs, setTabs] = useState<BrowserTab[]>(() => [makeTab({ id: "tab-1" })]);
  const [activeId, setActiveId] = useState("tab-1");
  const [profiles, setProfiles] = useState<BrowserProfile[]>(() => localProfiles().profiles);
  const [profileId, setProfileId] = useState(() => localProfiles().activeId);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState("");
  const [profileRename, setProfileRename] = useState<{ id: string; name: string } | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const readyRef = useRef(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef(activeId);
  activeRef.current = activeId;
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const sessionRef = useRef({ bookmarks, history, settings, tabs, activeId });
  sessionRef.current = { bookmarks, history, settings, tabs, activeId };
  const [clear, setClear] = useState<Required<Pick<ClearDataOpts, "history" | "cookies" | "cache">> & { range: "hour" | "day" | "all" }>({
    range: "all",
    history: true,
    cookies: true,
    cache: true,
  });
  const frameRef = useRef<HTMLDivElement | null>(null);

  const starred = useMemo(() => bookmarks.some((row) => row.url === url), [bookmarks, url]);
  const suggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    if (q.length < 2) return history.slice(0, 8);
    return history.filter((row) => row.url.toLowerCase().includes(q) || row.title.toLowerCase().includes(q)).slice(0, 8);
  }, [draft, history]);

  const syncBounds = useCallback(() => {
    if (!desktop || !frameRef.current || panel === "settings") return;
    const rect = frameRef.current.getBoundingClientRect();
    desktop.browserAttach({
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    });
  }, [desktop, panel]);

  const persistSettings = useCallback(
    async (partial: Partial<BrowserSettings>) => {
      const next = desktop ? await desktop.saveSettings(partial) : localSaveSettings(partial);
      setSettings(next);
      return next;
    },
    [desktop],
  );

  const go = useCallback(
    (next: string, pageTitle?: string) => {
      const resolved = normalizeUrl(next, settings.searchEngine);
      if (!resolved) return;
      setUrl(resolved);
      setDraft(resolved);
      setTitle(pageTitle || hostLabel(resolved));
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeRef.current ? { ...tab, url: resolved, title: pageTitle || hostLabel(resolved) } : tab,
        ),
      );
      setPanel(null);
      setMenu(null);
      if (desktop) {
        desktop.browserLoad(resolved);
        requestAnimationFrame(syncBounds);
      } else {
        window.open(resolved, "rok-desk-browser");
        setHistory(localRecordHistory({ url: resolved, title: pageTitle || hostLabel(resolved), at: Date.now() }));
      }
      void persistSettings({ lastUrl: resolved });
    },
    [desktop, panel, persistSettings, settings.searchEngine, syncBounds],
  );

  useEffect(() => {
    let cancelled = false;
    const openActive = (
      store: { tabs: BrowserTab[]; activeId: string },
      startup: BrowserSettings["startup"],
      homepage: string,
    ) => {
      const goTo = new URLSearchParams(window.location.search).get("go");
      if (goTo) {
        go(goTo);
        return;
      }
      const tabsNow = store.tabs.length ? store.tabs : [makeTab({ id: "tab-1" })];
      if (startup === "homepage" && homepage) {
        go(homepage);
        return;
      }
      if (startup === "newtab") {
        const blank = makeTab();
        const kept = tabsNow.filter((tab) => tab.url);
        const next = [...kept, blank];
        setTabs(next);
        setActiveId(blank.id);
        setUrl("");
        setDraft("");
        setTitle("New Tab");
        return;
      }
      const current = tabsNow.find((tab) => tab.id === store.activeId) ?? tabsNow[0]!;
      setTabs(tabsNow);
      setActiveId(current.id);
      if (current.url) {
        setUrl(current.url);
        setDraft(current.url);
        setTitle(current.title || hostLabel(current.url));
        if (desktop) {
          desktop.browserLoad(current.url);
          requestAnimationFrame(syncBounds);
        }
      }
    };

    if (desktop) {
      void Promise.all([
        desktop.bookmarksList(),
        desktop.historyList(),
        desktop.settings(),
        desktop.tabsList(),
        desktop.downloadsPath(),
        desktop.profilesList(),
        desktop.browserDataPath(),
      ]).then(([marks, hist, next, tabStore, pathName, registry, stored]) => {
        if (cancelled) return;
        setBookmarks(marks);
        setHistory(hist);
        setSettings(next);
        setDownloads(pathName);
        setDataPath(stored);
        setProfiles(registry.profiles);
        setProfileId(registry.activeId);
        openActive(tabStore, next.startup, next.homepage);
        readyRef.current = true;
      });
      const offUrl = desktop.onBrowserUrl((next) => {
        setUrl(next);
        setDraft(next);
        setTabs((prev) => prev.map((tab) => (tab.id === activeRef.current ? { ...tab, url: next } : tab)));
      });
      const offTitle = desktop.onBrowserTitle((next) => {
        if (next) {
          setTitle(next);
          setTabs((prev) => prev.map((tab) => (tab.id === activeRef.current ? { ...tab, title: next } : tab)));
        }
      });
      const offHist = desktop.onBrowserHistory(setHistory);
      return () => {
        cancelled = true;
        offUrl();
        offTitle();
        offHist();
        desktop.browserDetach();
      };
    }

    const local = localSnapshot();
    const registry = localProfiles();
    setProfiles(registry.profiles);
    setProfileId(registry.activeId);
    setBookmarks(local.bookmarks);
    setHistory(local.history);
    setSettings(local.settings);
    openActive({ tabs: local.tabs, activeId: local.activeId }, local.settings.startup, local.settings.homepage);
    void pullRemoteBundle().then((remote) => {
      if (cancelled || !remote) {
        readyRef.current = true;
        return;
      }
      const current = localBundle();
      if (remote.updatedAt >= current.updatedAt) {
        applyBundle(remote);
        const snap = remote.byId[remote.activeId] ?? remote.byId[DESK_PROFILE_ID];
        if (snap) {
          setProfiles(remote.profiles);
          setProfileId(remote.activeId);
          setBookmarks(snap.bookmarks);
          setHistory(snap.history);
          setSettings(snap.settings);
          openActive({ tabs: snap.tabs, activeId: snap.activeId }, snap.settings.startup, snap.settings.homepage);
        }
      }
      readyRef.current = true;
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start once
  }, [desktop]);

  useEffect(() => {
    if (!readyRef.current) return;
    localSaveTabs(tabs, activeId);
    if (desktop) void desktop.tabsSave({ tabs, activeId });
  }, [tabs, activeId, desktop]);

  useEffect(() => {
    if (!readyRef.current) return;
    const handle = window.setTimeout(() => {
      void pushRemoteBundle();
    }, 400);
    return () => window.clearTimeout(handle);
  }, [bookmarks, history, settings, tabs, activeId, profiles, profileId]);

  useEffect(() => {
    return () => {
      const snap = sessionRef.current;
      localSaveTabs(snap.tabs, snap.activeId);
      void pushRemoteBundle();
    };
  }, []);

  useEffect(() => {
    if (!desktop) return undefined;
    if (panel === "settings") {
      desktop.browserDetach();
      return undefined;
    }
    if (!url) return undefined;
    syncBounds();
    const onResize = () => syncBounds();
    window.addEventListener("resize", onResize);
    const ro =
      frameRef.current && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(onResize)
        : null;
    if (ro && frameRef.current) ro.observe(frameRef.current);
    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  }, [desktop, url, panel, syncBounds]);

  useEffect(() => {
    if (!menu && !moreOpen && !profileOpen) return undefined;
    const close = (event: Event) => {
      if (moreRef.current?.contains(event.target as Node)) return;
      if (profileMenuRef.current?.contains(event.target as Node)) return;
      setMenu(null);
      setMoreOpen(false);
      setProfileOpen(false);
    };
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [menu, moreOpen, profileOpen]);

  const toggleStar = async () => {
    if (!url) return;
    if (starred) {
      setBookmarks(desktop ? await desktop.bookmarkRemove(url) : localRemoveBookmark(url));
    } else {
      setBookmarks(desktop ? await desktop.bookmarkAdd({ title, url }) : localAddBookmark({ title, url }));
    }
  };

  const applyRename = async () => {
    if (!rename) return;
    setBookmarks(
      desktop ? await desktop.bookmarkRename(rename.url, rename.title) : localRenameBookmark(rename.url, rename.title),
    );
    setRename(null);
  };

  const runClear = async () => {
    if (desktop) {
      const result = await desktop.clearData(clear);
      if (result.history) setHistory(result.history);
    } else {
      setHistory(localClearData(clear));
    }
  };

  const showNewTab = () => {
    const tab = makeTab();
    setTabs((prev) => [...prev, tab]);
    setActiveId(tab.id);
    setUrl("");
    setDraft("");
    setTitle("New Tab");
    setPanel(null);
    setMoreOpen(false);
    desktop?.browserDetach();
  };

  const selectTab = (id: string) => {
    const tab = tabs.find((row) => row.id === id);
    if (!tab) return;
    setActiveId(id);
    setPanel(null);
    if (!tab.url) {
      setUrl("");
      setDraft("");
      setTitle("New Tab");
      desktop?.browserDetach();
      return;
    }
    setUrl(tab.url);
    setDraft(tab.url);
    setTitle(tab.title);
    if (desktop) {
      desktop.browserLoad(tab.url);
      requestAnimationFrame(syncBounds);
    }
  };

  const closeTab = (id: string) => {
    const remaining = tabs.filter((tab) => tab.id !== id);
    const next = remaining.length ? remaining : [makeTab()];
    const activate = id === activeId ? next[next.length - 1] : next.find((tab) => tab.id === activeId) ?? next[0];
    setTabs(next);
    setActiveId(activate.id);
    if (!activate.url) {
      setUrl("");
      setDraft("");
      setTitle("New Tab");
      desktop?.browserDetach();
      return;
    }
    setUrl(activate.url);
    setDraft(activate.url);
    setTitle(activate.title);
    if (desktop) {
      desktop.browserLoad(activate.url);
      requestAnimationFrame(syncBounds);
    }
  };

  const adoptSession = (payload: BrowserSessionPayload) => {
    setProfiles(payload.profiles);
    setProfileId(payload.activeId);
    setBookmarks(payload.bookmarks);
    setHistory(payload.history);
    setSettings(payload.settings);
    const store = { tabs: payload.tabs, activeId: payload.activeTabId };
    const current = store.tabs.find((tab) => tab.id === store.activeId) ?? store.tabs[0];
    setTabs(store.tabs.length ? store.tabs : [makeTab({ id: "tab-1" })]);
    setActiveId(current?.id ?? "tab-1");
    if (current?.url) {
      setUrl(current.url);
      setDraft(current.url);
      setTitle(current.title || hostLabel(current.url));
      if (desktop) {
        desktop.browserLoad(current.url);
        requestAnimationFrame(syncBounds);
      }
    } else {
      setUrl("");
      setDraft("");
      setTitle("New Tab");
      desktop?.browserDetach();
    }
    setProfileOpen(false);
    setPanel(null);
  };

  const changeProfile = async (id: string) => {
    if (id === profileId) {
      setProfileOpen(false);
      return;
    }
    localSaveTabs(tabs, activeId);
    if (desktop) {
      adoptSession(await desktop.profileSwitch(id));
      return;
    }
    const next = localSwitchProfile(id);
    const snap = next.snap;
    adoptSession({
      profiles: next.profiles,
      activeId: next.activeId,
      bookmarks: snap.bookmarks,
      history: snap.history,
      settings: snap.settings,
      tabs: snap.tabs,
      activeTabId: snap.activeId,
    });
    void pushRemoteBundle();
  };

  const addProfile = async () => {
    const name = profileDraft.trim() || `Profile ${profiles.length + 1}`;
    setProfileDraft("");
    localSaveTabs(tabs, activeId);
    if (desktop) {
      adoptSession(await desktop.profileCreate(name));
      return;
    }
    const next = localCreateProfile(name);
    const switched = localSwitchProfile(next.activeId);
    const snap = switched.snap;
    adoptSession({
      profiles: switched.profiles,
      activeId: switched.activeId,
      bookmarks: snap.bookmarks,
      history: snap.history,
      settings: snap.settings,
      tabs: snap.tabs,
      activeTabId: snap.activeId,
    });
    void pushRemoteBundle();
  };

  const deleteProfile = async (id: string) => {
    if (id === DESK_PROFILE_ID) return;
    localSaveTabs(tabs, activeId);
    if (desktop) {
      adoptSession(await desktop.profileRemove(id));
      return;
    }
    const next = localRemoveProfile(id);
    const switched = localSwitchProfile(next.activeId);
    const snap = switched.snap;
    adoptSession({
      profiles: next.profiles,
      activeId: next.activeId,
      bookmarks: snap.bookmarks,
      history: snap.history,
      settings: snap.settings,
      tabs: snap.tabs,
      activeTabId: snap.activeId,
    });
    void pushRemoteBundle();
  };

  const saveProfileName = async () => {
    if (!profileRename) return;
    if (desktop) {
      const registry = await desktop.profileRename(profileRename.id, profileRename.name);
      setProfiles(registry.profiles);
    } else {
      const registry = localRenameProfile(profileRename.id, profileRename.name);
      setProfiles(registry.profiles);
      void pushRemoteBundle();
    }
    setProfileRename(null);
  };

  const openNewWindow = () => {
    setMoreOpen(false);
    if (desktop) void desktop.newWindow();
    else window.open("/browser", "_blank", "noopener,width=1440,height=900");
  };

  const printPage = () => {
    setMoreOpen(false);
    if (desktop) desktop.browserPrint();
    else if (url) {
      const popup = window.open(url, "rok-desk-browser");
      popup?.addEventListener("load", () => popup.print());
      if (popup?.document.readyState === "complete") popup.print();
    } else {
      window.print();
    }
  };

  const applyZoom = async (dir: "in" | "out" | "reset") => {
    const next = nextZoom(settings.zoom || 1, dir);
    const applied = desktop ? await desktop.browserZoom(next) : next;
    setSettings((prev) => ({ ...prev, zoom: applied }));
    void persistSettings({ zoom: applied });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key === "=" || event.key === "+") {
        event.preventDefault();
        void applyZoom("in");
      } else if (event.key === "-") {
        event.preventDefault();
        void applyZoom("out");
      } else if (event.key === "0") {
        event.preventDefault();
        void applyZoom("reset");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktop, settings.zoom]);

  const activeProfile = profiles.find((row) => row.id === profileId) ?? DESK_PROFILE;

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <AppChrome view="browser" eyebrow={panel === "settings" ? "Settings" : title === "Browser" || title === "New Tab" ? "Browser" : title} />
      <div className="flex items-end gap-1 overflow-x-auto bg-surface-2 px-2 pt-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => selectTab(tab.id)}
            className={cn(
              "flex max-w-[14rem] min-w-[8rem] items-center gap-1 rounded-t-lg border border-b-0 px-2 py-1.5 text-left text-xs",
              tab.id === activeId ? "border-border bg-surface text-fg" : "border-transparent bg-transparent text-muted hover:bg-surface/60",
            )}
          >
            <span className="min-w-0 flex-1 truncate">{tab.title}</span>
            <span
              role="button"
              tabIndex={0}
              className="rounded p-0.5 hover:bg-surface-2"
              onClick={(event) => {
                event.stopPropagation();
                closeTab(tab.id);
              }}
            >
              <X className="size-3" />
            </span>
          </button>
        ))}
        <button type="button" className="mb-1 rounded-md p-1.5 text-muted hover:bg-surface hover:text-fg" onClick={showNewTab} aria-label="New tab">
          <Plus className="size-3.5" />
        </button>
        <div className="relative mb-1 ml-auto" ref={profileMenuRef}>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-surface"
            onClick={(event) => {
              event.stopPropagation();
              setProfileOpen((open) => !open);
              setMoreOpen(false);
            }}
            aria-label="Browser profile"
            aria-expanded={profileOpen}
          >
            <span
              className="grid size-5 shrink-0 place-items-center rounded-full text-[0.65rem] font-semibold text-black"
              style={{ background: activeProfile.color }}
            >
              {activeProfile.name.trim().charAt(0).toUpperCase() || "D"}
            </span>
            <span className="max-w-[7rem] truncate">{activeProfile.name}</span>
            <ChevronDown className="size-3.5 text-muted" />
          </button>
          {profileOpen ? (
            <div className="absolute right-0 z-50 mt-1 w-64 rounded-md border border-border bg-surface py-1 shadow-lg">
              <p className="font-mono px-3 py-1.5 text-[0.6rem] tracking-[0.16em] text-muted uppercase">Profiles</p>
              {profiles.map((row) => (
                <div key={row.id} className="flex items-center gap-1 px-1">
                  <button
                    type="button"
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-2",
                      row.id === profileId && "bg-surface-2",
                    )}
                    onClick={() => void changeProfile(row.id)}
                  >
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: row.color }} />
                    <span className="min-w-0 truncate">{row.name}</span>
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-muted hover:text-fg"
                    aria-label={`Rename ${row.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setProfileRename({ id: row.id, name: row.name });
                      setProfileOpen(false);
                    }}
                  >
                    <MoreVertical className="size-3.5" />
                  </button>
                  {row.id !== DESK_PROFILE_ID ? (
                    <button
                      type="button"
                      className="rounded p-1 text-muted hover:text-[#e05a5a]"
                      aria-label={`Remove ${row.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        void deleteProfile(row.id);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  ) : null}
                </div>
              ))}
              {profiles.length < MAX_PROFILES ? (
                <form
                  className="mt-1 flex gap-1 border-t border-border px-2 py-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void addProfile();
                  }}
                >
                  <Input
                    value={profileDraft}
                    onChange={(e) => setProfileDraft(e.target.value)}
                    placeholder="New profile name"
                    className="h-8 text-sm"
                  />
                  <Button type="submit" size="sm">Add</Button>
                </form>
              ) : (
                <p className="px-3 py-2 text-[0.7rem] text-muted">Maximum {MAX_PROFILES} profiles.</p>
              )}
              <p className="px-3 pb-2 text-[0.65rem] leading-relaxed text-subtle">
                {desktop ? "Each profile has its own logins, cookies, bookmarks, and tabs." : "Bookmarks, history, and tabs are separate per profile. Logins stay shared in the web preview."}
              </p>
            </div>
          ) : null}
        </div>
      </div>
      <div className="border-b border-border bg-surface px-4 py-2">
        <form
          className="mx-auto flex max-w-[1600px] items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            go(draft);
          }}
        >
          <Button type="button" variant="outline" size="icon" className="size-8" disabled={!desktop || !url} onClick={() => desktop?.browserBack()} aria-label="Back">
            <ArrowLeft className="size-3.5" />
          </Button>
          <Button type="button" variant="outline" size="icon" className="size-8" disabled={!desktop || !url} onClick={() => desktop?.browserForward()} aria-label="Forward">
            <ArrowRight className="size-3.5" />
          </Button>
          <Button type="button" variant="outline" size="icon" className="size-8" disabled={!url} onClick={() => (desktop ? desktop.browserReload() : go(url))} aria-label="Reload">
            <RotateCw className="size-3.5" />
          </Button>
          <div className="relative min-w-0 flex-1">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Search Google or type a URL"
              className="font-mono pr-10 text-sm"
              list="rok-browser-history"
            />
            <datalist id="rok-browser-history">
              {suggestions.map((row) => (
                <option key={row.url} value={row.url}>
                  {row.title}
                </option>
              ))}
            </datalist>
            <button
              type="button"
              className={cn("absolute top-1/2 right-2 -translate-y-1/2 rounded p-1", starred ? "text-[#e4c56a]" : "text-muted hover:text-fg")}
              disabled={!url}
              onClick={() => void toggleStar()}
              aria-label={starred ? "Remove bookmark" : "Bookmark this page"}
            >
              <Star className="size-4" fill={starred ? "currentColor" : "none"} />
            </button>
          </div>
          <div className="relative" ref={moreRef}>
            <Button
              type="button"
              variant={moreOpen ? "secondary" : "outline"}
              size="icon"
              className="size-8"
              aria-label="More"
              onClick={() => setMoreOpen((open) => !open)}
            >
              <MoreVertical className="size-3.5" />
            </Button>
            {moreOpen ? (
              <div className="absolute right-0 z-50 mt-1 w-52 rounded-md border border-border bg-surface py-1 shadow-lg">
                <button type="button" className="block w-full px-3 py-1.5 text-left text-sm hover:bg-surface-2" onClick={showNewTab}>New tab</button>
                <button type="button" className="block w-full px-3 py-1.5 text-left text-sm hover:bg-surface-2" onClick={openNewWindow}>New window</button>
                <div className="my-1 border-t border-border" />
                <div className="flex items-center justify-between gap-2 px-3 py-1.5" onClick={(event) => event.stopPropagation()}>
                  <span className="text-sm">Zoom</span>
                  <div className="flex items-center gap-1">
                    <button type="button" className="rounded p-1 hover:bg-surface-2" aria-label="Zoom out" onClick={() => void applyZoom("out")}>
                      <Minus className="size-3.5" />
                    </button>
                    <button type="button" className="min-w-12 rounded px-1 text-center font-mono text-xs tabular-nums hover:bg-surface-2" onClick={() => void applyZoom("reset")}>
                      {Math.round((settings.zoom || 1) * 100)}%
                    </button>
                    <button type="button" className="rounded p-1 hover:bg-surface-2" aria-label="Zoom in" onClick={() => void applyZoom("in")}>
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </div>
                <div className="my-1 border-t border-border" />
                <button type="button" className="block w-full px-3 py-1.5 text-left text-sm hover:bg-surface-2" onClick={() => { setPanel((p) => (p === "bookmarks" ? null : "bookmarks")); setMoreOpen(false); }}>Bookmarks</button>
                <button type="button" className="block w-full px-3 py-1.5 text-left text-sm hover:bg-surface-2" onClick={() => { setPanel((p) => (p === "history" ? null : "history")); setMoreOpen(false); }}>History</button>
                <button type="button" className="block w-full px-3 py-1.5 text-left text-sm hover:bg-surface-2" onClick={() => { setMoreOpen(false); if (desktop) void desktop.openDownloads(); }}>Downloads</button>
                <button type="button" className="block w-full px-3 py-1.5 text-left text-sm hover:bg-surface-2" onClick={printPage}>Print…</button>
                <div className="my-1 border-t border-border" />
                <button type="button" className="block w-full px-3 py-1.5 text-left text-sm hover:bg-surface-2" onClick={() => { setPanel((p) => (p === "settings" ? null : "settings")); setMoreOpen(false); }}>Settings</button>
              </div>
            ) : null}
          </div>
        </form>
        <div className="mx-auto mt-2 flex max-w-[1600px] flex-wrap gap-1.5">
          {bookmarks.map((mark) => (
            <Button
              key={mark.id}
              type="button"
              variant={url === mark.url ? "secondary" : "ghost"}
              size="sm"
              onClick={() => go(mark.url, mark.title)}
              onContextMenu={(event) => {
                event.preventDefault();
                setMenu({ x: event.clientX, y: event.clientY, mark });
              }}
            >
              {mark.title}
            </Button>
          ))}
        </div>
      </div>

      {menu ? (
        <div
          className="fixed z-50 min-w-40 rounded-md border border-border bg-surface py-1 shadow-lg"
          style={{ left: menu.x, top: menu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-sm hover:bg-surface-2"
            onClick={() => {
              setRename({ url: menu.mark.url, title: menu.mark.title });
              setMenu(null);
            }}
          >
            Rename
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-sm text-[#e05a5a] hover:bg-surface-2"
            onClick={() => {
              void (async () => {
                setBookmarks(desktop ? await desktop.bookmarkRemove(menu.mark.url) : localRemoveBookmark(menu.mark.url));
                setMenu(null);
              })();
            }}
          >
            Remove
          </button>
        </div>
      ) : null}

      {rename ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <form
            className="w-full max-w-sm rounded-xl border border-border bg-surface p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void applyRename();
            }}
          >
            <p className="font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase">Rename bookmark</p>
            <Input className="mt-3" value={rename.title} onChange={(e) => setRename({ ...rename, title: e.target.value })} autoFocus />
            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setRename(null)}>Cancel</Button>
              <Button type="submit" size="sm">Save</Button>
            </div>
          </form>
        </div>
      ) : null}

      {profileRename ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <form
            className="w-full max-w-sm rounded-xl border border-border bg-surface p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveProfileName();
            }}
          >
            <p className="font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase">Rename profile</p>
            <Input className="mt-3" value={profileRename.name} onChange={(e) => setProfileRename({ ...profileRename, name: e.target.value })} autoFocus />
            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setProfileRename(null)}>Cancel</Button>
              <Button type="submit" size="sm">Save</Button>
            </div>
          </form>
        </div>
      ) : null}

      {panel === "history" ? (
        <div className="border-b border-border bg-surface-2 px-4 py-3">
          <div className="mx-auto max-w-[1600px]">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase">History</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPanel(null)} aria-label="Close history">
                <X className="size-3.5" />
                Done
              </Button>
            </div>
            <ul className="mt-2 max-h-56 overflow-auto">
              {history.length ? (
                history.map((row) => (
                  <li key={`${row.at}-${row.url}`}>
                    <button type="button" className="flex w-full items-baseline gap-3 rounded-md px-2 py-1.5 text-left hover:bg-surface" onClick={() => go(row.url, row.title)}>
                      <span className="font-mono w-16 shrink-0 text-[0.65rem] text-subtle">
                        {new Date(row.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="min-w-0 truncate text-sm">{row.title}</span>
                      <span className="min-w-0 truncate font-mono text-[0.65rem] text-muted">{row.url}</span>
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-2 py-6 text-center text-sm text-muted">No history yet.</li>
              )}
            </ul>
          </div>
        </div>
      ) : null}

      {panel === "bookmarks" ? (
        <div className="border-b border-border bg-surface-2 px-4 py-3">
          <div className="mx-auto max-w-[1600px]">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase">Bookmarks</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPanel(null)} aria-label="Close bookmarks">
                <X className="size-3.5" />
                Done
              </Button>
            </div>
            <ul className="mt-2 max-h-56 overflow-auto">
              {bookmarks.length ? (
                bookmarks.map((mark) => (
                  <li key={mark.id} className="flex items-center gap-2">
                    <button type="button" className="min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface" onClick={() => go(mark.url, mark.title)}>
                      {mark.title}
                      <span className="ml-2 font-mono text-[0.65rem] text-muted">{mark.url}</span>
                    </button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setRename({ url: mark.url, title: mark.title })}>Rename</Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        void (async () => {
                          setBookmarks(desktop ? await desktop.bookmarkRemove(mark.url) : localRemoveBookmark(mark.url));
                        })();
                      }}
                    >
                      Remove
                    </Button>
                  </li>
                ))
              ) : (
                <li className="px-2 py-6 text-center text-sm text-muted">No bookmarks yet. Star a page to add one.</li>
              )}
            </ul>
          </div>
        </div>
      ) : null}

      <div ref={frameRef} className="relative min-h-0 flex-1 overflow-auto bg-surface-2">
        {panel === "settings" ? (
          <div className="mx-auto max-w-2xl px-4 py-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-3xl font-semibold uppercase">Settings</h1>
                <p className="mt-1 text-sm text-muted">Same kinds of controls as Chrome — for this desk browser only.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setPanel(null)}>
                <X className="size-3.5" />
                Done
              </Button>
            </div>

            <section className="mt-8 rounded-xl border border-border bg-surface p-4">
              <p className="font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase">Profiles</p>
              <p className="mt-1 text-sm text-muted">
                {desktop
                  ? "Like Chrome: each profile keeps its own cookies, logins, bookmarks, and tabs. Desk is the default."
                  : "Separate bookmarks, history, and tabs per profile. Full login isolation needs the desktop app."}
              </p>
              <p className="mt-2 text-sm">
                Current: <span className="font-medium">{profiles.find((row) => row.id === profileId)?.name ?? "Desk"}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {profiles.map((row) => (
                  <Button
                    key={row.id}
                    type="button"
                    size="sm"
                    variant={row.id === profileId ? "secondary" : "outline"}
                    onClick={() => void changeProfile(row.id)}
                  >
                    <span className="mr-1.5 inline-block size-2 rounded-full" style={{ background: row.color }} />
                    {row.name}
                  </Button>
                ))}
              </div>
            </section>

            <section className="mt-4 rounded-xl border border-border bg-surface p-4">
              <p className="font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase">Appearance</p>
              <p className="mt-1 text-sm text-muted">Page zoom</p>
              <div className="mt-3 flex items-center gap-2">
                <Button type="button" variant="outline" size="icon" className="size-8" onClick={() => void applyZoom("out")} aria-label="Zoom out">
                  <Minus className="size-3.5" />
                </Button>
                <button type="button" className="min-w-16 font-mono text-sm tabular-nums" onClick={() => void applyZoom("reset")}>
                  {Math.round((settings.zoom || 1) * 100)}%
                </button>
                <Button type="button" variant="outline" size="icon" className="size-8" onClick={() => void applyZoom("in")} aria-label="Zoom in">
                  <Plus className="size-3.5" />
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted">Ctrl / ⌘ with +, −, or 0 also works.</p>
            </section>

            <section className="mt-4 rounded-xl border border-border bg-surface p-4">
              <p className="font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase">Privacy and security</p>
              <p className="mt-1 text-sm text-muted">Clear browsing data</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Field label="Time range">
                  <NativeSelect value={clear.range} onChange={(e) => setClear((c) => ({ ...c, range: e.target.value as typeof c.range }))}>
                    <option value="hour">Last hour</option>
                    <option value="day">Last 24 hours</option>
                    <option value="all">All time</option>
                  </NativeSelect>
                </Field>
              </div>
              <label className="mt-3 flex items-center justify-between gap-3 text-sm">
                Browsing history
                <Switch checked={clear.history} onCheckedChange={(v) => setClear((c) => ({ ...c, history: v }))} />
              </label>
              <label className="mt-2 flex items-center justify-between gap-3 text-sm">
                Cookies and other site data
                <Switch checked={clear.cookies} onCheckedChange={(v) => setClear((c) => ({ ...c, cookies: v }))} />
              </label>
              <label className="mt-2 flex items-center justify-between gap-3 text-sm">
                Cached images and files
                <Switch checked={clear.cache} onCheckedChange={(v) => setClear((c) => ({ ...c, cache: v }))} />
              </label>
              <Button className="mt-4" variant="outline" onClick={() => void runClear()}>
                Clear data
              </Button>
            </section>

            <section className="mt-4 rounded-xl border border-border bg-surface p-4">
              <p className="font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase">Search engine</p>
              <Field label="Search engine used in the address bar" className="mt-3">
                <NativeSelect
                  value={settings.searchEngine}
                  onChange={(e) => void persistSettings({ searchEngine: e.target.value as BrowserSettings["searchEngine"] })}
                >
                  {SEARCH_ENGINES.map((engine) => (
                    <option key={engine.id} value={engine.id}>{engine.label}</option>
                  ))}
                </NativeSelect>
              </Field>
            </section>

            <section className="mt-4 rounded-xl border border-border bg-surface p-4">
              <p className="font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase">On startup</p>
              <div className="mt-3 grid gap-2">
                {([
                  ["newtab", "Open the new tab page"],
                  ["continue", "Continue where you left off"],
                  ["homepage", "Open a specific page"],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-sm",
                      settings.startup === id ? "border-accent bg-accent/10" : "border-border hover:bg-surface-2",
                    )}
                    onClick={() => void persistSettings({ startup: id })}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {settings.startup === "homepage" ? (
                <Field label="Homepage" className="mt-3">
                  <Input
                    value={settings.homepage}
                    placeholder="https://"
                    onChange={(e) => setSettings((s) => ({ ...s, homepage: e.target.value }))}
                    onBlur={() => void persistSettings({ homepage: settings.homepage })}
                  />
                </Field>
              ) : null}
            </section>

            <section className="mt-4 rounded-xl border border-border bg-surface p-4">
              <p className="font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase">Printing</p>
              <p className="mt-1 text-sm text-muted">Print the current page with the system dialog.</p>
              <Button className="mt-3" variant="outline" size="sm" onClick={printPage} disabled={!url && !desktop}>
                Print…
              </Button>
            </section>

            <section className="mt-4 rounded-xl border border-border bg-surface p-4">
              <p className="font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase">Downloads</p>
              <p className="mt-2 font-mono text-xs text-muted">{downloads || "Your Downloads folder (desktop app)"}</p>
              {desktop ? (
                <Button className="mt-3" variant="outline" size="sm" onClick={() => void desktop.openDownloads()}>
                  Open downloads
                </Button>
              ) : null}
            </section>

            <section className="mt-4 rounded-xl border border-border bg-surface p-4">
              <p className="font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase">Saved data</p>
              <p className="mt-1 text-sm text-muted">
                Profiles, bookmarks, history, cookies, and logins live outside the app install. Uninstalling ROK Desk
                does not delete this folder. Reinstall and it comes back.
              </p>
              <p className="mt-2 font-mono text-xs break-all text-muted">
                {dataPath || "Desktop app: AppData / ROK Desk Browser"}
              </p>
              {desktop ? (
                <Button className="mt-3" variant="outline" size="sm" onClick={() => void desktop.openBrowserData()}>
                  Open data folder
                </Button>
              ) : null}
            </section>
          </div>
        ) : url ? (
          desktop ? (
            <div className="absolute inset-0" />
          ) : (
            <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-16 text-center">
              <Globe className="size-10 text-muted" />
              <h1 className="font-display mt-4 text-3xl font-semibold uppercase">{hostLabel(url)}</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                This preview opens pages in a separate Chromium tab. Bookmarks, history, and
                settings still save. The Windows app keeps cookies and cache in its own browser
                window.
              </p>
              <Button className="mt-5" asChild>
                <a href={url} target="rok-desk-browser" rel="noreferrer">
                  <ExternalLink className="size-3.5" />
                  Open {hostLabel(url)}
                </a>
              </Button>
            </div>
          )
        ) : (
          <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-16 text-center">
            <Globe className="size-10 text-muted" />
            <h1 className="font-display mt-4 text-3xl font-semibold uppercase">New tab</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Search or type a URL. Star a page to bookmark it. Right-click a bookmark to rename
              or remove. Gear opens settings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
