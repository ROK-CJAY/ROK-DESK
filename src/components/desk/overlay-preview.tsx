import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, ExternalLink, Move, Redo2, RotateCcw, Undo2, X } from "lucide-react";
import {
  CastersView,
  HudView,
  LowerThirdView,
  ResourceView,
  SlateView,
  TimerView,
  UpcomingView,
  VersusView,
  WinnerView,
  GameWinView,
} from "@/components/overlays/graphics";
import { ScorebugView } from "@/components/overlays/scorebug";
import { ScaleFrame } from "@/components/overlays/scale-frame";
import type { OverlayEdit } from "@/components/overlays/placed";
import { Button } from "@/components/ui/button";
import { OVERLAY_SOURCES, overlayPath, overlayWindowName, type OverlaySourceId } from "@/components/desk/sources";
import { useDeskStore } from "@/lib/desk-store";
import { useTournamentStore } from "@/lib/tournament-store";
import { viewTournament } from "@/lib/tournament-types";
import { BracketOverlay } from "@/components/overlays/bracket";
import { FloorClockOverlay } from "@/components/overlays/floor-clock";
import { OverlayLookRoot } from "@/components/overlays/overlay-look-root";
import { CardSpotlightView } from "@/components/overlays/card";
import { EventLogoView } from "@/components/overlays/event-logo";
import { SponsorsView } from "@/components/overlays/sponsors";
import { RosterView } from "@/components/overlays/roster";
import { LookEditor } from "@/components/desk/look-editor";
import {
  cloneLayout,
  isDefaultLayout,
  layoutsEqual,
  type LayoutMap,
  type WidgetId,
} from "@/lib/layout";
import { cn } from "@/lib/cn";
import { useClockNow } from "@/lib/use-clock-now";
import { NativeSelect } from "@/components/desk/field";
import { supportsPlayLayout, supportsRokLayout } from "@/lib/games";
import { isCommanderTable } from "@/lib/desk-types";

const HISTORY_LIMIT = 30;
const PREVIEW_BGS = [
  { id: "slate", label: "Slate" },
  { id: "checker", label: "Checker" },
  { id: "black", label: "Black" },
  { id: "playmat", label: "Playmat" },
] as const;
type PreviewBg = (typeof PREVIEW_BGS)[number]["id"];

export function OverlayPreview() {
  const desk = useDeskStore((s) => s.desk);
  const patch = useDeskStore((s) => s.patch);
  const moveWidget = useDeskStore((s) => s.moveWidget);
  const applyLayout = useDeskStore((s) => s.applyLayout);
  const resetLayout = useDeskStore((s) => s.resetLayout);
  const snapScorebug = useDeskStore((s) => s.snapScorebug);
  const tournament = useTournamentStore((s) => s.tournament);
  const tourneyReady = useTournamentStore((s) => s.ready);
  const hydrateTourney = useTournamentStore((s) => s.hydrate);
  const [source, setSource] = useState<OverlaySourceId>("hud");
  const now = useClockNow({ live: desk.timerRunning, pauseWhenHidden: true });
  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [arranging, setArranging] = useState(false);
  const [selected, setSelected] = useState<WidgetId | null>(null);
  const [previewBg, setPreviewBg] = useState<PreviewBg>("slate");
  const [safeGuides, setSafeGuides] = useState(false);
  const [past, setPast] = useState<LayoutMap[]>([]);
  const [future, setFuture] = useState<LayoutMap[]>([]);
  const gestureStart = useRef<LayoutMap | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!tourneyReady) void hydrateTourney();
  }, [tourneyReady, hydrateTourney]);

  const pushHistory = (snapshot: LayoutMap) => {
    setPast((prev) => [...prev.slice(-(HISTORY_LIMIT - 1)), cloneLayout(snapshot)]);
    setFuture([]);
  };

  const undo = () => {
    const previous = past.at(-1);
    if (!previous) return;
    const current = cloneLayout(useDeskStore.getState().desk.layout);
    setPast((prev) => prev.slice(0, -1));
    setFuture((next) => [current, ...next].slice(0, HISTORY_LIMIT));
    applyLayout(previous);
  };

  const redo = () => {
    const next = future[0];
    if (!next) return;
    const current = cloneLayout(useDeskStore.getState().desk.layout);
    setFuture((items) => items.slice(1));
    setPast((prev) => [...prev.slice(-(HISTORY_LIMIT - 1)), current]);
    applyLayout(next);
  };

  const restoreDefault = () => {
    const current = useDeskStore.getState().desk.layout;
    if (isDefaultLayout(current)) return;
    pushHistory(current);
    resetLayout();
  };

  useEffect(() => {
    if (!arranging) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const key = event.key.toLowerCase();
      const mod = event.metaKey || event.ctrlKey;
      if (event.key === "Escape") {
        setArranging(false);
        return;
      }
      if (mod && key === "z" && event.shiftKey) {
        event.preventDefault();
        redo();
        return;
      }
      if (mod && key === "z") {
        event.preventDefault();
        undo();
        return;
      }
      if (mod && key === "y") {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [arranging, past, future]);

  const current = OVERLAY_SOURCES.find((s) => s.id === source)!;
  const pathFor = (id: OverlaySourceId) => overlayPath(desk.gameId, id, desk.matchSlot ?? 1);
  const url = origin ? `${origin}${pathFor(source)}` : pathFor(source);
  const canArrange = source !== "versus" && source !== "slate" && source !== "bracket" && source !== "floor-clock" && source !== "stream-clock";
  const atDefault = isDefaultLayout(desk.layout);

  const edit = useMemo<OverlayEdit | null>(() => {
    if (!arranging) return null;
    return {
      selected,
      select: setSelected,
      move: (id, pos, commit, size) => {
        if (!gestureStart.current) {
          gestureStart.current = cloneLayout(useDeskStore.getState().desk.layout);
        }
        moveWidget(id, pos, commit, size);
        if (commit) {
          const start = gestureStart.current;
          gestureStart.current = null;
          const next = useDeskStore.getState().desk.layout;
          if (start && !layoutsEqual(start, next)) {
            pushHistory(start);
          }
        }
      },
    };
  }, [arranging, selected, moveWidget]);

  const copy = async (path: string) => {
    const full = origin ? `${origin}${path}` : path;
    try {
      await navigator.clipboard.writeText(full);
      setCopied(path);
      window.setTimeout(() => setCopied(null), 1400);
    } catch {
      /* clipboard may be blocked */
    }
  };

  return (
    <section className="flex flex-col rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">
            Overlay preview
          </p>
          <p className="text-sm text-muted">{current.note}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canArrange ? (
            <Button variant="secondary" size="sm" onClick={() => setArranging(true)}>
              <Move className="size-3.5" />
              Arrange
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={restoreDefault}
            disabled={atDefault}
          >
            <RotateCcw className="size-3.5" />
            Default look
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void copy(pathFor(source))}>
            {copied === pathFor(source) ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            Copy URL
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a
              href={pathFor(source)}
              target={overlayWindowName(desk.gameId, source, desk.matchSlot ?? 1)}
              rel="noreferrer"
            >
              <ExternalLink className="size-3.5" />
              Pop out
            </a>
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,52rem)_minmax(18rem,1fr)]">
      <div>
      <div className="checker relative aspect-video overflow-hidden rounded-lg border border-border contain-paint">
        <PreviewBackdrop kind={previewBg} />
        <div className="absolute inset-0">
        <ScaleFrame>
          <OverlayLookRoot book={desk.overlayLook} source={source}>
            <SourceCanvas desk={desk} now={now} source={source} />
          </OverlayLookRoot>
        </ScaleFrame>
        </div>
        {safeGuides ? <SafeGuides /> : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="font-mono text-[0.58rem] tracking-[0.16em] text-subtle uppercase">Preview</p>
        {PREVIEW_BGS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPreviewBg(item.id)}
            className={cn(
              "rounded-md border px-2 py-0.5 text-[0.7rem]",
              previewBg === item.id
                ? "border-accent bg-accent text-accent-fg"
                : "border-border bg-surface-2 text-muted hover:text-fg",
            )}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSafeGuides((on) => !on)}
          className={cn(
            "rounded-md border px-2 py-0.5 text-[0.7rem]",
            safeGuides ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface-2 text-muted hover:text-fg",
          )}
        >
          Safe area
        </button>
      </div>
      {!isCommanderTable(desk) && (source === "hud" || source === "scorebug") ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <NativeSelect
            value={desk.scorebugStyle}
            onChange={(e) => patch({ scorebugStyle: e.target.value as typeof desk.scorebugStyle })}
          >
            <option value="bar">Scorebug · bar</option>
            <option value="split">Scorebug · split</option>
            {supportsRokLayout(desk) ? <option value="rok">ROK Layout</option> : null}
            {supportsPlayLayout(desk) ? <option value="play">Play Layout</option> : null}
          </NativeSelect>
          {desk.scorebugStyle === "bar" || desk.scorebugStyle === "split" ? (
            <NativeSelect
              value={desk.scorebugPosition}
              onChange={(e) => snapScorebug(e.target.value as typeof desk.scorebugPosition)}
            >
              <option value="bottom">Bottom</option>
              <option value="top">Top</option>
            </NativeSelect>
          ) : (
            <p className="self-center text-[0.7rem] text-muted">
              {desk.scorebugStyle === "play" ? "Play Layout" : "ROK Layout"}
            </p>
          )}
        </div>
      ) : null}
      </div>

      <div>
      <div className="mt-0 flex flex-wrap gap-1.5">
        {OVERLAY_SOURCES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSource(item.id)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs transition-colors duration-150",
              source === item.id
                ? "border-accent bg-accent text-accent-fg"
                : "border-border bg-surface-2 text-muted hover:text-fg",
            )}
          >
            {item.name}
          </button>
        ))}
      </div>

      <p className="mt-3 truncate font-mono text-[0.7rem] text-subtle">{url}</p>

      <LookEditor
        book={desk.overlayLook}
        source={source}
        onChange={(overlayLook) => patch({ overlayLook })}
      />

      <details className="mt-3 rounded-lg bg-surface-2 px-3 py-2">
        <summary className="cursor-pointer text-sm text-fg">OBS setup</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-muted">
          <li>Add Source → Browser.</li>
          <li>Paste the overlay URL. Width 1920, Height 1080. FPS 30 is fine.</li>
          <li>Check Shutdown source when not visible and Refresh browser when scene becomes active.</li>
          <li>Leave Custom CSS empty. The page is already transparent — do not set a background.</li>
          <li>Use HUD pack for one source, or add one Browser source per overlay (scorebug, clock, winner, …).</li>
          <li>Look and Arrange changes save here and show up live. If a source looks stuck, click Refresh on the Browser source.</li>
        </ol>
      </details>
      <details className="mt-3 rounded-lg bg-surface-2 px-3 py-2">
        <summary className="cursor-pointer text-sm text-fg">vMix setup</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-muted">
          <li>Add Input → Web Browser.</li>
          <li>Paste the overlay URL. Width 1920, Height 1080.</li>
          <li>Enable Transparent. Native CEF browser.</li>
          <li>Use HUD pack for one source, or split widgets onto their own inputs.</li>
          <li>Arrange to park widgets. Undo a drag, or snap back to the default layout.</li>
          <li>Look changes (color, type, size) save automatically per overlay. No extra step.</li>
        </ol>
      </details>
      <details className="mt-3 rounded-lg bg-surface-2 px-3 py-2">
        <summary className="cursor-pointer text-sm text-fg">Browser sources</summary>
        <ul className="mt-2 space-y-1">
          {OVERLAY_SOURCES.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted">
                {item.name}
                <span className="text-subtle"> · {item.size}</span>
              </span>
              <button
                type="button"
                className="text-fg underline-offset-2 hover:underline"
                onClick={() => void copy(pathFor(item.id))}
              >
                {copied === pathFor(item.id) ? "Copied" : "Copy"}
              </button>
            </li>
          ))}
        </ul>
      </details>
      </div>
      </div>

      {arranging
        ? createPortal(
            <div
              className="fixed inset-0 z-50 grid grid-rows-[auto_minmax(0,1fr)_auto] bg-bg p-3 sm:p-5"
              style={{ backgroundColor: "var(--color-bg)" }}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">
                    Layout stage
                  </p>
                  <h2 className="font-display text-2xl font-semibold tracking-tight uppercase">
                    Arrange {current.name}
                  </h2>
                  <p className="text-sm text-muted">
                    Drag to place this overlay. Undo a move, or snap to the house default. Esc closes.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={undo} disabled={past.length === 0}>
                    <Undo2 className="size-3.5" />
                    Undo
                  </Button>
                  <Button variant="secondary" size="sm" onClick={redo} disabled={future.length === 0}>
                    <Redo2 className="size-3.5" />
                    Redo
                  </Button>
                  <Button variant="outline" size="sm" onClick={restoreDefault} disabled={atDefault}>
                    <RotateCcw className="size-3.5" />
                    Default look
                  </Button>
                  <Button size="sm" onClick={() => setArranging(false)}>
                    <X className="size-3.5" />
                    Done
                  </Button>
                </div>
              </div>
              <div className="relative min-h-0 overflow-hidden rounded-xl border border-border bg-black contain-paint">
                <ScaleFrame>
                  <PreviewBackdrop kind={previewBg} dim />
                  <OverlayLookRoot book={desk.overlayLook} source={source}>
                    <div className="layout-grid pointer-events-none absolute inset-0">
                      <SourceCanvas desk={desk} now={now} source={source} edit={edit} />
                    </div>
                  </OverlayLookRoot>
                  {safeGuides ? <SafeGuides /> : null}
                </ScaleFrame>
              </div>
              <p className="mt-2 text-xs text-muted">
                {selected ? (
                  <>
                    Selected {selected}
                    <span className="font-mono text-subtle">
                      {" "}
                      · {desk.layout[selected].x}, {desk.layout[selected].y}
                    </span>
                  </>
                ) : (
                  "Click a widget to select it."
                )}
                <span className="text-subtle">
                  {" "}
                  · Ctrl/⌘Z undo · Shift+Ctrl/⌘Z redo · arrows nudge
                </span>
              </p>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

function SourceCanvas({
  desk,
  now,
  source,
  edit = null,
}: {
  desk: import("@/lib/desk-types").DeskState;
  now: number;
  source: OverlaySourceId;
  edit?: OverlayEdit | null;
}) {
  const tournament = useTournamentStore((s) => s.tournament);
  const tourneyReady = useTournamentStore((s) => s.ready);
  if (source === "hud") return <HudView desk={desk} now={now} edit={edit} />;
  if (source === "scorebug") return <ScorebugView desk={desk} now={now} edit={edit} />;
  if (source === "versus") return <VersusView desk={desk} />;
  if (source === "slate") return <SlateView desk={desk} />;
  if (source === "casters") return <CastersView desk={desk} edit={edit} />;
  if (source === "lower-third") return <LowerThirdView desk={desk} edit={edit} />;
  if (source === "winner") return <WinnerView desk={desk} edit={edit} />;
  if (source === "game-win") return <GameWinView desk={desk} edit={edit} />;
  if (source === "timer") return <TimerView desk={desk} now={now} edit={edit} />;
  if (source === "resource") return <ResourceView desk={desk} edit={edit} />;
  if (source === "upcoming") return <UpcomingView desk={desk} edit={edit} />;
  if (source === "bracket" && tourneyReady) {
    return <BracketOverlay tournament={viewTournament(tournament, desk.gameId)} />;
  }
  if (source === "floor-clock" && tourneyReady) {
    return <FloorClockOverlay tournament={viewTournament(tournament, desk.gameId)} desk={desk} />;
  }
  if (source === "stream-clock" && tourneyReady) {
    return <FloorClockOverlay tournament={viewTournament(tournament, desk.gameId)} desk={desk} variant="stream" />;
  }
  if (source === "roster") {
    return <RosterView desk={desk} edit={edit} force={desk.rosterSide === "hidden" ? "both" : desk.rosterSide} />;
  }
  if (source === "card") return <CardSpotlightView desk={desk} edit={edit} />;
  if (source === "sponsors") return <SponsorsView desk={desk} now={now} edit={edit} />;
  if (source === "event-logo") return <EventLogoView desk={desk} edit={edit} />;
  return null;
}

function PreviewBackdrop({ kind, dim = false }: { kind: PreviewBg; dim?: boolean }) {
  if (kind === "checker") {
    return <div className="absolute inset-0" />;
  }
  if (kind === "black") {
    return <div className="absolute inset-0 bg-black" />;
  }
  const src = kind === "playmat" ? "/slates/playmat.jpg" : "/slates/starting.jpg";
  return (
    <>
      <img src={src} alt="" className={cn("absolute inset-0 h-full w-full object-cover", dim ? "opacity-80" : "opacity-90")} />
      <div className={cn("absolute inset-0", dim ? "bg-ov-bg/20" : "bg-ov-bg/25")} />
    </>
  );
}

function SafeGuides() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="absolute inset-[3.5%] rounded-sm border border-dashed border-white/35" />
      <div className="absolute inset-[5%] rounded-sm border border-white/20" />
      <p className="absolute top-2 right-2 rounded bg-black/50 px-1.5 py-0.5 font-mono text-[0.58rem] tracking-[0.14em] text-white/70 uppercase">
        Title safe
      </p>
    </div>
  );
}
