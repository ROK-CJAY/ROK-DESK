import { app, BrowserView, BrowserWindow, ipcMain, shell } from "electron";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import fs from "node:fs";
import net from "node:net";
import { mkdir } from "node:fs/promises";
import {
  addBookmark,
  attachDownloadHandler,
  browserSession,
  clearBrowserData,
  clearHistory,
  downloadsPath,
  loadBookmarks,
  loadHistory,
  loadSettings,
  recordHistory,
  removeBookmark,
  renameBookmark,
  saveSettings,
} from "./browser-session.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PORT = 8080;
let servingPort = DEFAULT_PORT;

function isPackaged() {
  return app.isPackaged;
}

function outputRoot() {
  if (isPackaged()) return path.join(process.resourcesPath, "output");
  return path.join(__dirname, "..", ".output");
}

function serverEntry() {
  return path.join(outputRoot(), "server", "index.mjs");
}

function pickPort(start) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      const srv = net.createServer();
      srv.once("error", (err) => {
        if (err && err.code === "EADDRINUSE") tryPort(port + 1);
        else reject(err);
      });
      srv.once("listening", () => {
        srv.close(() => resolve(port));
      });
      srv.listen(port, "0.0.0.0");
    };
    tryPort(start);
  });
}

async function waitForHttp(url, attempts = 80) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status > 0) return;
    } catch {
      // still booting
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`ROK Desk did not start at ${url}`);
}

async function startServer(port) {
  const entry = serverEntry();
  if (!fs.existsSync(entry)) {
    throw new Error(
      `Server bundle missing at ${entry}. Build with npm run build:desktop first.`,
    );
  }
  const dataDir = path.join(app.getPath("userData"), "pgdata");
  await mkdir(dataDir, { recursive: true });
  process.env.ROK_DATA_DIR = dataDir;
  process.env.HOST = "0.0.0.0";
  process.env.PORT = String(port);
  process.env.NITRO_HOST = "0.0.0.0";
  process.env.NITRO_PORT = String(port);
  delete process.env.DATABASE_URL;
  process.chdir(outputRoot());
  await import(pathToFileURL(entry).href);
}

function openExternal(url) {
  if (!url.startsWith("http://") && !url.startsWith("https://")) return;
  if (url.startsWith("http://127.0.0.1") || url.startsWith("http://localhost")) return;
  void shell.openExternal(url);
}

function clampBounds(bounds) {
  const x = Math.max(0, Math.round(Number(bounds?.x) || 0));
  const y = Math.max(0, Math.round(Number(bounds?.y) || 0));
  const width = Math.max(1, Math.round(Number(bounds?.width) || 1));
  const height = Math.max(1, Math.round(Number(bounds?.height) || 1));
  return { x, y, width, height };
}

function guestBack(contents) {
  try {
    if (contents.navigationHistory?.canGoBack()) {
      contents.navigationHistory.goBack();
      return;
    }
  } catch {
    /* older electron */
  }
  if (typeof contents.canGoBack === "function" && contents.canGoBack()) contents.goBack();
}

function guestForward(contents) {
  try {
    if (contents.navigationHistory?.canGoForward()) {
      contents.navigationHistory.goForward();
      return;
    }
  } catch {
    /* older electron */
  }
  if (typeof contents.canGoForward === "function" && contents.canGoForward()) contents.goForward();
}

/** @type {WeakMap<import('electron').WebContents, import('electron').BrowserView>} */
const guests = new WeakMap();

function wireBrowserView(win) {
  let view = null;

  const ensureView = () => {
    if (view) return view;
    view = new BrowserView({
      webPreferences: {
        session: browserSession(),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    view.setBackgroundColor("#0b0d12");
    view.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith("http://") || url.startsWith("https://")) {
        void view.webContents.loadURL(url);
      }
      return { action: "deny" };
    });
    const sendUrl = (_event, url) => {
      if (url) win.webContents.send("rok:browser-url", url);
    };
    view.webContents.on("did-navigate", sendUrl);
    view.webContents.on("did-navigate-in-page", sendUrl);
    view.webContents.on("page-title-updated", (_event, title) => {
      win.webContents.send("rok:browser-title", title);
      try {
        const current = view.webContents.getURL();
        recordHistory({ url: current, title });
        win.webContents.send("rok:browser-history", loadHistory());
      } catch {
        /* ignore */
      }
    });
    try {
      view.webContents.setZoomFactor(loadSettings().zoom || 1);
    } catch {
      /* ignore */
    }
    guests.set(win.webContents, view);
    return view;
  };

  const fromThisWindow = (event) => event.sender === win.webContents;

  const onAttach = (event, bounds) => {
    if (!fromThisWindow(event)) return;
    const guest = ensureView();
    win.setBrowserView(guest);
    guest.setBounds(clampBounds(bounds));
    guest.setAutoResize({ width: true, height: true });
  };
  const onDetach = (event) => {
    if (!fromThisWindow(event)) return;
    if (view) win.removeBrowserView(view);
  };
  const onLoad = (event, url) => {
    if (!fromThisWindow(event)) return;
    if (typeof url !== "string" || (!url.startsWith("http://") && !url.startsWith("https://"))) return;
    const guest = ensureView();
    win.setBrowserView(guest);
    void guest.webContents.loadURL(url);
  };
  const onBack = (event) => {
    if (!fromThisWindow(event) || !view) return;
    guestBack(view.webContents);
  };
  const onForward = (event) => {
    if (!fromThisWindow(event) || !view) return;
    guestForward(view.webContents);
  };
  const onReload = (event) => {
    if (!fromThisWindow(event) || !view) return;
    view.webContents.reload();
  };
  const onPrint = (event) => {
    if (!fromThisWindow(event) || !view) return;
    view.webContents.print({ silent: false, printBackground: true });
  };

  ipcMain.on("rok:browser-attach", onAttach);
  ipcMain.on("rok:browser-detach", onDetach);
  ipcMain.on("rok:browser-load", onLoad);
  ipcMain.on("rok:browser-back", onBack);
  ipcMain.on("rok:browser-forward", onForward);
  ipcMain.on("rok:browser-reload", onReload);
  ipcMain.on("rok:browser-print", onPrint);

  win.on("closed", () => {
    ipcMain.removeListener("rok:browser-attach", onAttach);
    ipcMain.removeListener("rok:browser-detach", onDetach);
    ipcMain.removeListener("rok:browser-load", onLoad);
    ipcMain.removeListener("rok:browser-back", onBack);
    ipcMain.removeListener("rok:browser-forward", onForward);
    ipcMain.removeListener("rok:browser-reload", onReload);
    ipcMain.removeListener("rok:browser-print", onPrint);
    view = null;
  });
}

async function createWindow(port, route = "/") {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: route === "/browser" ? "ROK Browser" : "ROK Desk",
    backgroundColor: "#0b0d12",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://127.0.0.1") || url.startsWith("http://localhost")) {
      return { action: "allow" };
    }
    openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith("http://127.0.0.1") || url.startsWith("http://localhost")) return;
    event.preventDefault();
    openExternal(url);
  });

  wireBrowserView(win);
  const pathName = route.startsWith("/") ? route : `/${route}`;
  await win.loadURL(`http://127.0.0.1:${port}${pathName}`);
}

app.setName("ROK Desk");

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(async () => {
    attachDownloadHandler();
    ipcMain.handle("rok:browser-history", () => loadHistory());
    ipcMain.handle("rok:browser-bookmarks", () => loadBookmarks());
    ipcMain.handle("rok:browser-bookmark-add", (_e, item) => addBookmark(item));
    ipcMain.handle("rok:browser-bookmark-remove", (_e, url) => removeBookmark(url));
    ipcMain.handle("rok:browser-bookmark-rename", (_e, payload) =>
      renameBookmark(payload?.url, payload?.title),
    );
    ipcMain.handle("rok:browser-history-clear", () => clearHistory());
    ipcMain.handle("rok:browser-clear-data", (_e, opts) => clearBrowserData(opts || {}));
    ipcMain.handle("rok:browser-settings", () => loadSettings());
    ipcMain.handle("rok:browser-settings-save", (_e, partial) => saveSettings(partial || {}));
    ipcMain.handle("rok:browser-downloads-path", () => downloadsPath());
    ipcMain.handle("rok:browser-open-downloads", () => {
      void shell.openPath(downloadsPath());
      return true;
    });
    ipcMain.handle("rok:browser-new-window", async () => {
      await createWindow(servingPort, "/browser");
      return true;
    });
    ipcMain.handle("rok:browser-zoom", (event, factor) => {
      const view = guests.get(event.sender);
      const next = Math.min(5, Math.max(0.25, Number(factor) || 1));
      if (view) view.webContents.setZoomFactor(next);
      saveSettings({ zoom: next });
      return next;
    });
    const port = await pickPort(DEFAULT_PORT);
    servingPort = port;
    await startServer(port);
    await waitForHttp(`http://127.0.0.1:${port}/`);
    await createWindow(port);
  }).catch((err) => {
    console.error(err);
    app.quit();
  });

  app.on("window-all-closed", () => {
    app.quit();
  });
}
