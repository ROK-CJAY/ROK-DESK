import { app, BrowserWindow, shell } from "electron";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import fs from "node:fs";
import net from "node:net";
import { mkdir } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PORT = 8080;

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

async function createWindow(port) {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "ROK Desk",
    backgroundColor: "#0b0d12",
    autoHideMenuBar: true,
    webPreferences: {
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

  await win.loadURL(`http://127.0.0.1:${port}/`);
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
    const port = await pickPort(DEFAULT_PORT);
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
