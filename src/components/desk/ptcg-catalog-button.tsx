import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type CatalogInfo = {
  status: "idle" | "running" | "ok" | "error";
  phase?: string;
  count: number;
  updatedAt: number | null;
  error?: string;
};

export function PtcgCatalogButton({ compact = false }: { compact?: boolean }) {
  const [info, setInfo] = useState<CatalogInfo | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const res = await fetch("/api/ptcg-catalog", { cache: "no-store" });
      if (!res.ok) return;
      setInfo((await res.json()) as CatalogInfo);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (info?.status !== "running") return;
    const timer = window.setInterval(() => void refresh(), 800);
    return () => window.clearInterval(timer);
  }, [info?.status]);

  const run = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/ptcg-catalog", { method: "POST" });
      if (res.ok || res.status === 202) setInfo((await res.json()) as CatalogInfo);
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  const running = info?.status === "running" || busy;
  const when = info?.updatedAt
    ? new Date(info.updatedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null;
  const label = running ? "Updating catalog…" : info?.count ? "Update catalog" : "Download catalog";

  if (compact) {
    return (
      <Button type="button" size="sm" variant={info?.count ? "secondary" : "default"} disabled={running} onClick={() => void run()} title={info?.phase}>
        {label}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" size="sm" variant={info?.count ? "secondary" : "default"} disabled={running} onClick={() => void run()}>
        {label}
      </Button>
      <p className="text-[0.7rem] leading-snug text-muted">
        {running
          ? info?.phase || "Downloading the Pokémon TCG database…"
          : info?.status === "error"
            ? info.error || "Catalog update failed. Try again."
            : info?.count
              ? `${info.count.toLocaleString()} cards on this machine${when ? ` · ${when}` : ""}. Searches use this copy.`
              : "Save every English card on this machine so lookup works even when the live API flakes."}
      </p>
    </div>
  );
}
