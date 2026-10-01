import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { LookupCatalog } from "@/lib/card-lookup";

type CatalogInfo = {
  status: "idle" | "running" | "ok" | "error";
  phase?: string;
  progress?: number | null;
  count: number;
  updatedAt: number | null;
  error?: string;
};

const BLURB: Record<LookupCatalog, string> = {
  ptcg: "Optional backup. Search always tries the live card API first and only uses this copy if that call fails.",
  mtg: "Save Scryfall’s Oracle list on this machine so lookup works when Scryfall flakes.",
  swu: "Save the SWU-DB card list on this machine so lookup works offline.",
  ygo: "Save the YGOPRODeck card list on this machine so lookup works when the API flakes.",
  op: "Save the One Piece card list and text on this machine so lookup works offline.",
  rift: "Save the Riftcodex card list on this machine so lookup works offline.",
  lorcana: "Save the Lorcast card list on this machine so lookup works offline.",
};

export function PtcgCatalogButton({ compact = false, catalog = "ptcg" }: { compact?: boolean; catalog?: LookupCatalog }) {
  const [info, setInfo] = useState<CatalogInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const endpoint = catalog === "ptcg" ? "/api/ptcg-catalog" : `/api/tcg-catalog?game=${catalog}`;

  const refresh = async () => {
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      if (!res.ok) return;
      setInfo((await res.json()) as CatalogInfo);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    void refresh();
  }, [endpoint]);

  useEffect(() => {
    if (info?.status !== "running") return;
    const timer = window.setInterval(() => void refresh(), 800);
    return () => window.clearInterval(timer);
  }, [info?.status, endpoint]);

  const run = async () => {
    setBusy(true);
    try {
      const res = await fetch(endpoint, { method: "POST" });
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
  const percent = typeof info?.progress === "number" ? Math.max(0, Math.min(100, Math.round(info.progress))) : null;
  const label = running
    ? percent != null
      ? `Updating ${percent}%`
      : "Updating catalog…"
    : info?.count
      ? "Update catalog"
      : "Download catalog";
  const detail = running
    ? info?.phase || "Downloading the card database…"
    : info?.status === "error"
      ? info.error || "Catalog update failed. Try again."
      : info?.count
        ? catalog === "ptcg"
          ? `${info.count.toLocaleString()} cards saved${when ? ` · ${when}` : ""}. Lookup can try this first, or only if the live API fails.`
          : `${info.count.toLocaleString()} cards on this machine${when ? ` · ${when}` : ""}. Searches use this copy.`
        : BLURB[catalog];

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Button type="button" size="sm" variant={info?.count ? "secondary" : "default"} disabled={running} onClick={() => void run()} title={info?.phase}>
        {label}
      </Button>
      {running ? <CatalogBar progress={percent} /> : null}
      {compact ? (
        running ? <p className="text-[0.65rem] leading-snug text-muted">{detail}</p> : null
      ) : (
        <p className="text-[0.7rem] leading-snug text-muted">{detail}</p>
      )}
    </div>
  );
}

export const CatalogDownloadButton = PtcgCatalogButton;

function CatalogBar({ progress }: { progress: number | null }) {
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress ?? undefined}
    >
      <div
        className={progress == null ? "h-full w-2/5 animate-pulse rounded-full bg-ok" : "h-full rounded-full bg-ok transition-[width] duration-300"}
        style={progress == null ? undefined : { width: `${Math.max(progress, 2)}%` }}
      />
    </div>
  );
}
