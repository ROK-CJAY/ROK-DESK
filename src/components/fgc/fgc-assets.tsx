import { useEffect, useMemo, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { installLibrary, loadCatalog, type CatalogGame } from "@/lib/fgc-assets";
import { useFgcStore } from "@/lib/fgc-store";

export function FgcAssetsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const assetBase = useFgcStore((s) => s.fgc.assetBase);
  const library = useFgcStore((s) => s.fgc.library);
  const setLibrary = useFgcStore((s) => s.setLibrary);
  const [games, setGames] = useState<CatalogGame[]>([]);
  const [query, setQuery] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    void loadCatalog(assetBase)
      .then(setGames)
      .catch((err) => setError(err instanceof Error ? err.message : "Catalog failed"));
  }, [assetBase, open]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? games.filter((game) => game.name.toLowerCase().includes(needle)) : games;
  }, [games, query]);
  const selected = games.find((game) => game.code === code) ?? null;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="flex max-h-[88dvh] w-full max-w-3xl flex-col rounded-xl border border-border bg-surface" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Download assets</p>
            <p className="font-display text-xl font-semibold uppercase">Game libraries</p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close"><X className="size-4" /></Button>
        </div>
        <div className="grid gap-3 border-b border-border px-4 py-3 sm:grid-cols-[1fr_16rem]">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type a game" />
          <select value={code} onChange={(e) => setCode(e.target.value)} className="h-10 rounded-md border border-border bg-surface-2 px-3 text-sm">
            <option value="">Select a game</option>
            {shown.map((game) => (
              <option key={game.code} value={game.code}>{game.name}</option>
            ))}
          </select>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {error ? <p className="text-sm text-live">{error}</p> : null}
          {library ? <p className="mb-3 text-xs text-muted">Installed: {library.game} · {library.pack} · {library.characters.length} characters</p> : null}
          {selected ? (
            <ul className="divide-y divide-border">
              {selected.packs.map((pack) => (
                <li key={pack.name} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{pack.name}</p>
                    <p className="truncate text-xs text-muted">{pack.description || "Asset library"} · {pack.version}</p>
                  </div>
                  <Button
                    size="sm"
                    disabled={busy === pack.name}
                    onClick={() => {
                      setBusy(pack.name);
                      void installLibrary(assetBase, selected, pack)
                        .then((next) => {
                          setLibrary(next);
                          setBusy("");
                        })
                        .catch((err) => {
                          setError(err instanceof Error ? err.message : "Download failed");
                          setBusy("");
                        });
                    }}
                  >
                    <Download className="size-4" />
                    {busy === pack.name ? "Loading" : "Download"}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted">Pick a game to see its libraries.</p>
          )}
        </div>
      </div>
    </div>
  );
}
