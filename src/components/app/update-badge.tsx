import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  fetchGithubUpdate,
  UPDATE_RELEASES_URL,
  type AppUpdateStatus,
} from "@/lib/app-update";
import { APP_CHANNEL, APP_VERSION, APP_VERSION_LABEL } from "@/lib/version";
import { rokDesktop } from "@/lib/rok-desktop";
import { cn } from "@/lib/cn";

const CURRENT = `${APP_VERSION}-${APP_CHANNEL}`;
const IDLE: AppUpdateStatus = { status: "idle", current: CURRENT };

export function UpdateBadge() {
  const [state, setState] = useState<AppUpdateStatus>(IDLE);
  const desktop = typeof window !== "undefined" ? rokDesktop() : null;

  useEffect(() => {
    let alive = true;
    const apply = (next: AppUpdateStatus) => {
      if (alive) setState(next);
    };
    if (desktop?.onUpdateStatus) {
      const off = desktop.onUpdateStatus(apply);
      void desktop.updateStatus?.().then((next) => next && apply(next));
      void desktop.checkForUpdates?.().then((next) => next && apply(next));
      return () => {
        alive = false;
        off();
      };
    }
    void fetchGithubUpdate(CURRENT)
      .then(apply)
      .catch(() => {
        if (alive) apply({ ...IDLE, status: "error", message: "Could not reach GitHub.", url: UPDATE_RELEASES_URL });
      });
    return () => {
      alive = false;
    };
  }, [desktop]);

  const hasUpdate = state.status === "available" || state.status === "downloading" || state.status === "ready";
  const checking = state.status === "checking";

  const check = () => {
    setState((prev) => ({ ...prev, status: "checking" }));
    if (desktop?.checkForUpdates) {
      void desktop.checkForUpdates().then(setState);
      return;
    }
    void fetchGithubUpdate(CURRENT).then(setState);
  };

  const primary = () => {
    if (desktop?.installUpdate && state.status === "ready") {
      void desktop.installUpdate();
      return;
    }
    if (desktop?.downloadUpdate && state.canInstall && state.status === "available") {
      void desktop.downloadUpdate();
      return;
    }
    if (desktop?.openRelease) {
      void desktop.openRelease();
      return;
    }
    window.open(state.url || UPDATE_RELEASES_URL, "_blank", "noreferrer");
  };

  const actionLabel =
    state.status === "ready"
      ? "Restart to update"
      : state.status === "downloading"
        ? `Downloading ${state.percent ?? 0}%`
        : state.canInstall
          ? "Download update"
          : "Open release";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-left hover:bg-surface-2"
          title="Check for updates"
        >
          <span className="font-mono text-[0.62rem] font-medium tracking-[0.12em] text-muted">
            {APP_VERSION_LABEL}
          </span>
          {hasUpdate ? (
            <span className="rounded-full bg-accent/20 px-1.5 py-px font-mono text-[0.55rem] font-semibold tracking-[0.12em] text-accent uppercase">
              Update
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <p className="font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase">Desktop updates</p>
        <p className="mt-1 text-sm text-fg">
          This PC is {APP_VERSION_LABEL}
          {state.latest ? `. Latest on GitHub is v${state.latest}.` : "."}
        </p>
        {state.status === "current" ? (
          <p className="mt-1 text-xs text-muted">You are on the newest tagged build.</p>
        ) : null}
        {state.status === "error" && state.message ? (
          <p className="mt-1 text-xs text-muted">{state.message}</p>
        ) : null}
        {state.notes ? (
          <p className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap text-xs text-muted">{state.notes}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={primary} disabled={state.status === "downloading"}>
            <Download className="size-3.5" />
            {actionLabel}
          </Button>
          <Button size="sm" variant="outline" onClick={check} disabled={checking}>
            <RefreshCw className={cn("size-3.5", checking && "animate-spin")} />
            Check
          </Button>
        </div>
        {state.canInstall ? (
          <p className="mt-2 text-[0.65rem] text-subtle">Windows installer can apply this in-app. Portable builds open the release page.</p>
        ) : (
          <p className="mt-2 text-[0.65rem] text-subtle">
            Releases: ROK-CJAY/ROK-DESK. Uninstall keeps event data in the ROK Desk AppData folder.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
