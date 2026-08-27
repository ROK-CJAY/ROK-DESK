import { useEffect } from "react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  const importFail = /Failed to fetch dynamically imported module/i.test(error.message ?? "");

  useEffect(() => {
    if (!importFail || typeof window === "undefined") return;
    const key = "rok-chunk-reload";
    if (sessionStorage.getItem(key) === window.location.pathname) return;
    sessionStorage.setItem(key, window.location.pathname);
    window.location.reload();
  }, [importFail]);

  return (
    <main
      className={
        "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center " +
        "bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50"
      }
    >
      <span className="text-red-500" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm break-words text-zinc-500 dark:text-zinc-400">
        {importFail
          ? "The page didn’t finish loading. Reload and it should come back."
          : error.message || "An unexpected error occurred. Try reloading the page."}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-2 rounded-md border border-zinc-600 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
      >
        Reload
      </button>
    </main>
  );
}