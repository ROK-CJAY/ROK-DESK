import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, ListFilter, Radio, RefreshCw, X } from "lucide-react";
import { FgcAssetsDialog } from "@/components/fgc/fgc-assets";
import { AppChrome } from "@/components/app/app-chrome";
import { Field } from "@/components/desk/field";
import { FgcScoreboard } from "@/components/fgc/fgc-scoreboard";
import { FgcCommentary, FgcTournamentInfo, FgcBracket } from "@/components/fgc/fgc-panels";
import { FgcDesigner } from "@/components/fgc/fgc-designer";
import { FgcOverlay } from "@/components/fgc/fgc-overlays";
import { ScaleFrame } from "@/components/overlays/scale-frame";
import { FgcRulesetEditor } from "@/components/fgc/fgc-ruleset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { blankSet, playerLabel, streamSetOf, type FgcSet } from "@/lib/fgc-types";
import { useFgcStore } from "@/lib/fgc-store";
import { FGC_OVERLAYS, overlayHref } from "@/lib/fgc-titles";
import { cn } from "@/lib/cn";

function stateLabel(state: FgcSet["state"]) {
  if (state === "live") return "Live";
  if (state === "done") return "Done";
  return "Queued";
}

function SetPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fgc = useFgcStore((s) => s.fgc);
  const selectSet = useFgcStore((s) => s.selectSet);
  const [filter, setFilter] = useState("");
  const [completed, setCompleted] = useState(false);
  const [pairs, setPairs] = useState(false);
  const [picked, setPicked] = useState(fgc.streamSetId ?? "");

  const sets = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return fgc.sets
      .filter((set) => {
        if (!completed && set.state === "done") return false;
        if (pairs && (!set.p1?.tag || !set.p2?.tag)) return false;
        if (!needle) return true;
        const text = [set.phase, set.group, set.round, set.identifier, set.streamName, set.station, playerLabel(set.p1), playerLabel(set.p2)].join(" ").toLowerCase();
        return text.includes(needle);
      })
      .sort((a, b) => Number(b.queued) - Number(a.queued));
  }, [completed, fgc.sets, filter, pairs]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="flex h-[80dvh] w-full max-w-6xl flex-col rounded-xl border border-border bg-surface" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-medium">Select a set</p>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close"><X className="size-4" /></Button>
        </div>
        <div className="grid gap-2 border-b border-border px-4 py-3">
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter..." autoFocus />
          <div className="flex flex-wrap gap-6 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={completed} onChange={(e) => setCompleted(e.target.checked)} /> Show completed sets</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={pairs} onChange={(e) => setPairs(e.target.checked)} /> Show complete pairs</label>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-surface-2 text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Stream</th>
                <th className="px-3 py-2 font-medium">Channel</th>
                <th className="px-3 py-2 font-medium">Station</th>
                <th className="px-3 py-2 font-medium">Phase</th>
                <th className="px-3 py-2 font-medium">Match</th>
                <th className="px-3 py-2 font-medium">Player 1</th>
                <th className="px-3 py-2 font-medium">Player 2</th>
              </tr>
            </thead>
            <tbody>
              {sets.map((set) => (
                <tr key={set.id} className={cn("cursor-pointer border-b border-border hover:bg-surface-2", picked === set.id && "bg-surface-2")} onClick={() => setPicked(set.id)} onDoubleClick={() => { selectSet(set.id); onClose(); }}>
                  <td className="px-3 py-2">{set.queued ? "Queued" : ""}</td>
                  <td className="px-3 py-2">{set.streamName || "—"}</td>
                  <td className="px-3 py-2 text-muted">{set.station || set.identifier || "—"}</td>
                  <td className="px-3 py-2">{set.phase || "—"}</td>
                  <td className="px-3 py-2">{[set.round, set.group].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="px-3 py-2">{playerLabel(set.p1)}</td>
                  <td className="px-3 py-2">{playerLabel(set.p2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border p-3">
          <Button className="w-full" onClick={() => { if (picked) selectSet(picked); onClose(); }}>OK</Button>
        </div>
      </div>
    </div>
  );
}

function TshFrame({ path }: { path: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const fit = () => setScale(Math.max(0.1, node.clientWidth / 1920));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={frame} className="relative h-full w-full overflow-hidden bg-black">
      <iframe
        title={path}
        src={`/tsh/layout/${path}?preview=1`}
        sandbox="allow-scripts allow-same-origin"
        className="absolute top-0 left-0 border-0 bg-black"
        style={{ width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: "top left" }}
      />
    </div>
  );
}

export function FgcApp() {
  const hydrate = useFgcStore((s) => s.hydrate);
  const fgc = useFgcStore((s) => s.fgc);
  const importing = useFgcStore((s) => s.importing);
  const error = useFgcStore((s) => s.error);
  const patch = useFgcStore((s) => s.patch);
  const importEvent = useFgcStore((s) => s.importEvent);
  const loadStreamSet = useFgcStore((s) => s.loadStreamSet);
  const clearImport = useFgcStore((s) => s.clearImport);
  const [picker, setPicker] = useState(false);
  const [assets, setAssets] = useState(false);
  const [tab, setTab] = useState<"scoreboard" | "commentary" | "info" | "bracket" | "ruleset" | "overlays">("scoreboard");
  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [tshLayouts, setTshLayouts] = useState<{ path: string; name: string; group: string }[]>([]);
  const savedTitle = fgc.titles.find((item) => item.id === fgc.activeTitleId) ?? null;
  const overlay = FGC_OVERLAYS.find((item) => item.id === fgc.overlay) ?? FGC_OVERLAYS[0];
  const tsh = tshLayouts.find((item) => item.path === fgc.tshLayout) ?? null;
  const shown = fgc.tshLayout
    ? { name: tsh?.name || "TSH layout", note: "Official Tournament Stream Helper layout. It follows the live set." }
    : fgc.overlay === "custom" && savedTitle
      ? { ...overlay, name: savedTitle.name, note: `Saved in ${savedTitle.group || "Custom"}.` }
      : overlay;
  const href = fgc.tshLayout ? `/tsh/layout/${fgc.tshLayout}` : overlayHref(fgc.overlay, fgc.overlay === "custom" ? fgc.activeTitleId : null);
  const overlayValue = fgc.tshLayout ? `tsh:${fgc.tshLayout}` : fgc.overlay === "custom" && savedTitle ? `title:${savedTitle.id}` : fgc.overlay;
  const pageUrl = `${origin}${href}`;
  const copyLink = (path: string) => {
    void navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopied(path);
    window.setTimeout(() => setCopied(null), 1200);
  };
  const browserSources = [
    ...FGC_OVERLAYS.map((item) => ({ key: item.id, name: item.name, group: item.group, path: overlayHref(item.id) })),
    ...fgc.titles.filter((item) => item.group).map((item) => ({ key: item.id, name: item.name, group: item.group, path: overlayHref("custom", item.id) })),
    ...tshLayouts.map((item) => ({ key: item.path, name: item.name, group: item.group, path: `/tsh/layout/${item.path}` })),
  ];

  useEffect(() => {
    hydrate();
    setOrigin(window.location.origin);
    void fetch("/tsh/manifest.json").then((res) => res.json()).then((rows) => {
      if (Array.isArray(rows)) setTshLayouts(rows);
    }).catch(() => undefined);
  }, [hydrate]);

  const live = streamSetOf(fgc) ?? fgc.sets[0] ?? blankSet();

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <AppChrome view="fgc" />
      <main className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4">
        <section className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4">
          <Field label="Set tournament" className="min-w-[18rem] flex-1">
            <Input
              value={fgc.url}
              onChange={(e) => patch({ url: e.target.value })}
              placeholder="https://www.start.gg/tournament/…/event/…"
            />
          </Field>
          <Button onClick={() => void importEvent()} disabled={importing || !fgc.url}>
            <RefreshCw className={cn("size-4", importing && "animate-spin")} />
            {importing ? "Importing" : "Import"}
          </Button>
          <Button variant="secondary" onClick={() => setPicker(true)}>
            <ListFilter className="size-4" />
            Select set
          </Button>
          <Button variant="outline" onClick={() => setAssets(true)}>Download assets</Button>
          <Button variant="outline" onClick={() => clearImport()}>Clear import</Button>
          <Button variant="outline" onClick={() => void loadStreamSet()} disabled={!fgc.url}>
            Stream set
          </Button>
          <Field label={`Overlay${fgc.event?.game ? ` · ${fgc.event.game}` : ""}`}>
            <select
              value={overlayValue}
              onChange={(e) => {
                const value = e.target.value;
                if (value.startsWith("tsh:")) patch({ tshLayout: value.slice(4) });
                else if (value.startsWith("title:")) patch({ tshLayout: null, overlay: "custom", activeTitleId: value.slice(6) });
                else patch({ tshLayout: null, overlay: value as typeof overlay.id });
              }}
              className="h-10 rounded-md border border-border bg-surface-2 px-2 text-sm"
            >
              {[...new Set(FGC_OVERLAYS.map((item) => item.group))].map((group) => (
                <optgroup key={group} label={group}>
                  {FGC_OVERLAYS.filter((item) => item.group === group).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  {fgc.titles.filter((item) => (item.group || "Custom") === group).map((item) => <option key={item.id} value={`title:${item.id}`}>{item.name}</option>)}
                  {tshLayouts.filter((item) => item.group === group).map((item) => <option key={item.path} value={`tsh:${item.path}`}>{item.name}</option>)}
                </optgroup>
              ))}
            </select>
          </Field>
          <a href={href} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface-2 px-3 text-sm">
            <Radio className="size-4" />
            Open
          </a>
          <Button variant="outline" onClick={() => copyLink(href)}>
            {copied === href ? "Copied" : "Copy link"}
          </Button>
          {fgc.event ? (
            <a href={fgc.event.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
              {fgc.event.game} · {fgc.sets.length} sets <ExternalLink className="size-3" />
            </a>
          ) : null}
          {error ? <p className="w-full text-sm text-live">{error}</p> : null}
        </section>

        <nav className="flex w-fit rounded-lg border border-border bg-surface p-0.5">
          {(
            [
              ["scoreboard", "Scoreboard"],
              ["commentary", "Commentary"],
              ["info", "Tournament info"],
              ["bracket", "Bracket"],
              ["ruleset", "Ruleset"],
              ["overlays", "Overlays"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={cn("rounded-md px-3 py-1.5 text-xs font-medium", tab === id ? "bg-surface-2 text-fg" : "text-muted")}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === "scoreboard" ? <FgcScoreboard set={live} /> : null}
        {tab === "commentary" ? <FgcCommentary /> : null}
        {tab === "info" ? <FgcTournamentInfo /> : null}
        {tab === "bracket" ? <FgcBracket /> : null}
        {tab === "ruleset" ? <FgcRulesetEditor /> : null}
        {tab === "overlays" ? (
          <section className="grid gap-4 rounded-xl border border-border bg-surface p-4">
            <div>
              <p className="font-medium">{shown.name}</p>
              <p className="text-sm text-muted">{shown.note} {fgc.event?.game ? `Live data is the ${fgc.event.game} set.` : "Import a game or enter a set by hand."}</p>
            </div>
            <div className="aspect-video overflow-hidden rounded-lg border border-border bg-black">
              {fgc.tshLayout ? (
                <TshFrame path={fgc.tshLayout} />
              ) : (
                <ScaleFrame>
                  <FgcOverlay source={overlay.id} titleId={overlay.id === "custom" ? savedTitle?.id ?? "" : ""} />
                </ScaleFrame>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="min-w-0 flex-1 truncate font-mono text-xs text-muted">{pageUrl}</p>
              <Button size="sm" variant="outline" onClick={() => copyLink(href)}>{copied === href ? "Copied" : "Copy browser source"}</Button>
              <a href={href} target="_blank" rel="noreferrer" className="text-xs underline-offset-2 hover:underline">Open</a>
            </div>
            <p className="text-xs text-muted">OBS and vMix: browser source, 1920 × 1080, transparent background. Paste the link above.</p>
            <details className="rounded-lg bg-surface-2 px-3 py-2">
              <summary className="cursor-pointer text-sm">Browser sources</summary>
              <ul className="mt-2 space-y-1">
                {browserSources.map((item) => (
                  <li key={item.key} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted">{item.group} · {item.name}</span>
                    <button type="button" className="underline-offset-2 hover:underline" onClick={() => copyLink(item.path)}>
                      {copied === item.path ? "Copied" : "Copy"}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
            {overlay.id === "custom" && !fgc.tshLayout ? <FgcDesigner /> : null}
          </section>
        ) : null}
      </main>
      <SetPicker open={picker} onClose={() => setPicker(false)} />
      <FgcAssetsDialog open={assets} onClose={() => setAssets(false)} />
    </div>
  );
}
