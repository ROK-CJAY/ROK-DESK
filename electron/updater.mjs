import { app, BrowserWindow, ipcMain, shell } from "electron";
import { createRequire } from "node:module";

const UPDATE_OWNER = "ROK-CJAY";
const UPDATE_REPO = "ROK-DESK";
const RELEASES_URL = `https://github.com/${UPDATE_OWNER}/${UPDATE_REPO}/releases`;

function normalizeVersion(raw) {
  return String(raw || "")
    .trim()
    .replace(/^v/i, "");
}

function parseVersion(raw) {
  const s = normalizeVersion(raw);
  const m = s.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]), pre: m[4] ?? "" };
}

function compareVersion(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left && !right) return 0;
  if (!left) return -1;
  if (!right) return 1;
  if (left.major !== right.major) return left.major - right.major;
  if (left.minor !== right.minor) return left.minor - right.minor;
  if (left.patch !== right.patch) return left.patch - right.patch;
  if (!left.pre && !right.pre) return 0;
  if (!left.pre) return 1;
  if (!right.pre) return -1;
  return left.pre < right.pre ? -1 : left.pre > right.pre ? 1 : 0;
}

function currentVersion() {
  return normalizeVersion(app.getVersion());
}

function isNsisWindows() {
  return process.platform === "win32" && app.isPackaged && !process.env.PORTABLE_EXECUTABLE_DIR;
}

function broadcast(payload) {
  lastStatus = payload;
  for (const win of BrowserWindow.getAllWindows()) {
    try {
      win.webContents.send("rok:update-status", payload);
    } catch {
      /* ignore */
    }
  }
}

/** @type {import('src/lib/app-update').AppUpdateStatus} */
let lastStatus = { status: "idle", current: "" };
/** @type {import('electron-updater').AppUpdater | null} */
let autoUpdater = null;
let downloaded = false;

function loadAutoUpdater() {
  if (!isNsisWindows()) return null;
  try {
    const require = createRequire(import.meta.url);
    const mod = require("electron-updater");
    return mod.autoUpdater ?? null;
  } catch {
    return null;
  }
}

async function fetchGithubStatus() {
  const current = currentVersion();
  try {
    const res = await fetch(
      `https://api.github.com/repos/${UPDATE_OWNER}/${UPDATE_REPO}/releases?per_page=15`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "ROK-Desk",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    if (!res.ok) {
      return { status: "error", current, url: RELEASES_URL, message: `GitHub ${res.status}` };
    }
    const rows = await res.json();
    const release = Array.isArray(rows) ? rows.find((row) => row && !row.draft && row.tag_name) : null;
    const latest = release ? normalizeVersion(release.tag_name) : "";
    if (!latest) {
      return { status: "error", current, url: RELEASES_URL, message: "No GitHub release found." };
    }
    if (compareVersion(latest, current) <= 0) {
      return { status: "current", current, latest, url: release.html_url || RELEASES_URL };
    }
    return {
      status: "available",
      current,
      latest,
      url: release.html_url || RELEASES_URL,
      notes: String(release.body || "").trim().slice(0, 480),
      canInstall: Boolean(autoUpdater),
    };
  } catch (err) {
    return {
      status: "error",
      current,
      url: RELEASES_URL,
      message: err instanceof Error ? err.message : "Update check failed.",
    };
  }
}

async function checkForUpdates() {
  const current = currentVersion();
  broadcast({ status: "checking", current, canInstall: Boolean(autoUpdater) });
  if (autoUpdater) {
    try {
      const result = await autoUpdater.checkForUpdates();
      const latest = result?.updateInfo?.version;
      if (latest && compareVersion(latest, current) > 0) {
        const payload = {
          status: downloaded ? "ready" : "available",
          current,
          latest: normalizeVersion(latest),
          url: RELEASES_URL,
          notes: String(result.updateInfo.releaseNotes || "").slice(0, 480),
          canInstall: true,
        };
        broadcast(payload);
        return payload;
      }
    } catch {
      /* fall through to GitHub */
    }
  }
  const payload = await fetchGithubStatus();
  payload.canInstall = Boolean(autoUpdater) && payload.status === "available";
  broadcast(payload);
  return payload;
}

async function downloadUpdate() {
  if (!autoUpdater) {
    const payload = lastStatus.status === "available" ? lastStatus : await fetchGithubStatus();
    if (payload.url) void shell.openExternal(payload.url);
    return payload;
  }
  try {
    broadcast({ ...lastStatus, status: "downloading", percent: 0, canInstall: true });
    await autoUpdater.downloadUpdate();
    return lastStatus;
  } catch (err) {
    const payload = {
      status: "error",
      current: currentVersion(),
      url: lastStatus.url || RELEASES_URL,
      message: err instanceof Error ? err.message : "Download failed.",
    };
    broadcast(payload);
    return payload;
  }
}

function installUpdate() {
  if (!autoUpdater || !downloaded) {
    if (lastStatus.url) void shell.openExternal(lastStatus.url);
    return lastStatus;
  }
  autoUpdater.quitAndInstall(false, true);
  return lastStatus;
}

function openReleasePage() {
  const url = lastStatus.url || RELEASES_URL;
  void shell.openExternal(url);
  return true;
}

export function initUpdater() {
  lastStatus = { status: "idle", current: currentVersion() };
  autoUpdater = loadAutoUpdater();
  if (autoUpdater) {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = true;
    autoUpdater.logger = null;
    autoUpdater.on("download-progress", (progress) => {
      const percent = Math.round(Number(progress?.percent) || 0);
      broadcast({
        ...lastStatus,
        status: "downloading",
        percent,
        canInstall: true,
      });
    });
    autoUpdater.on("update-downloaded", (info) => {
      downloaded = true;
      broadcast({
        status: "ready",
        current: currentVersion(),
        latest: normalizeVersion(info?.version || lastStatus.latest || ""),
        url: lastStatus.url || RELEASES_URL,
        canInstall: true,
      });
    });
    autoUpdater.on("error", (err) => {
      broadcast({
        status: "error",
        current: currentVersion(),
        url: RELEASES_URL,
        message: err instanceof Error ? err.message : "Updater error.",
        canInstall: false,
      });
    });
  }

  ipcMain.handle("rok:update-status", () => lastStatus);
  ipcMain.handle("rok:update-check", () => checkForUpdates());
  ipcMain.handle("rok:update-download", () => downloadUpdate());
  ipcMain.handle("rok:update-install", () => installUpdate());
  ipcMain.handle("rok:update-open", () => openReleasePage());

  if (app.isPackaged) {
    setTimeout(() => {
      void checkForUpdates();
    }, 4000);
  }
}
