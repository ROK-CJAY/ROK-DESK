const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("rokDesk", {
  desktop: true,
  browserAttach: (bounds) => ipcRenderer.send("rok:browser-attach", bounds),
  browserDetach: () => ipcRenderer.send("rok:browser-detach"),
  browserLoad: (url) => ipcRenderer.send("rok:browser-load", url),
  browserBack: () => ipcRenderer.send("rok:browser-back"),
  browserForward: () => ipcRenderer.send("rok:browser-forward"),
  browserReload: () => ipcRenderer.send("rok:browser-reload"),
  browserPrint: () => ipcRenderer.send("rok:browser-print"),
  browserZoom: (factor) => ipcRenderer.invoke("rok:browser-zoom", factor),
  newWindow: () => ipcRenderer.invoke("rok:browser-new-window"),
  historyList: () => ipcRenderer.invoke("rok:browser-history"),
  bookmarksList: () => ipcRenderer.invoke("rok:browser-bookmarks"),
  bookmarkAdd: (item) => ipcRenderer.invoke("rok:browser-bookmark-add", item),
  bookmarkRemove: (url) => ipcRenderer.invoke("rok:browser-bookmark-remove", url),
  bookmarkRename: (url, title) => ipcRenderer.invoke("rok:browser-bookmark-rename", { url, title }),
  historyClear: () => ipcRenderer.invoke("rok:browser-history-clear"),
  clearData: (opts) => ipcRenderer.invoke("rok:browser-clear-data", opts),
  settings: () => ipcRenderer.invoke("rok:browser-settings"),
  saveSettings: (partial) => ipcRenderer.invoke("rok:browser-settings-save", partial),
  downloadsPath: () => ipcRenderer.invoke("rok:browser-downloads-path"),
  openDownloads: () => ipcRenderer.invoke("rok:browser-open-downloads"),
  onBrowserUrl: (cb) => {
    const listener = (_event, next) => cb(next);
    ipcRenderer.on("rok:browser-url", listener);
    return () => ipcRenderer.removeListener("rok:browser-url", listener);
  },
  onBrowserTitle: (cb) => {
    const listener = (_event, next) => cb(next);
    ipcRenderer.on("rok:browser-title", listener);
    return () => ipcRenderer.removeListener("rok:browser-title", listener);
  },
  onBrowserHistory: (cb) => {
    const listener = (_event, next) => cb(next);
    ipcRenderer.on("rok:browser-history", listener);
    return () => ipcRenderer.removeListener("rok:browser-history", listener);
  },
});
