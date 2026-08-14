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
import { OVERLAY_SOURCES, type OverlaySourceId } from "@/components/desk/sources";
import { useDeskStore } from "@/lib/desk-store";
import { useTournamentStore } from "@/lib/tournament-store";
import { BracketOverlay } from "@/components/overlays/bracket";
import { FloorClockOverlay } from "@/components/overlays/floor-clock";
import { RosterView } from "@/components/overlays/roster";
import {
  cloneLayout,
  isDefaultLayout,
  layoutsEqual,
  type LayoutMap,
  type WidgetId,
} from "@/lib/layout";
import { cn } from "@/lib/cn";

const HISTORY_LIMIT = 30;

export function OverlayPreview() {
  const desk = useDeskStore((s) => s.desk);
  const moveWidget = useDeskStore((s) => s.moveWidget);
  const applyLayout = useDeskStore((s) => s.applyLayout);
  const resetLayout = useDeskStore((s) => s.resetLayout);
  const tournament = useTournamentStore((s) => s.tournament);
  const tourneyReady = useTournamentStore((s) => s.ready);
  const hydrateTourney = useTournamentStore((s) => s.hydrate);
  const [source, setSource] = useState<OverlaySourceId>("hud");
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [arranging, setArranging] = useState(false);
  const [selected, setSelected] = useState<WidgetId | null>(null);
  const [past, setPast] = useState<LayoutMap[]>([]);
  const [future, setFuture] = useState<LayoutMap[]>([]);
  const gestureStart = useRef<LayoutMap | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

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
  const url = origin ? `${origin}${current.path}` : current.path;
  const canArrange = source !== "versus" && source !== "slate" && source !== "bracket" && source !== "floor-clock";
  const atDefault = isDefaultLayout(desk.layout);

  const edit = useMemo<OverlayEdit | null>(() => {
    if (!arranging) return null;
    return {
      selected,
      select: setSelected,
      move: (id, pos, commit) => {
        if (!gestureStart.current) {
          gestureStart.current = cloneLayout(useDeskStore.getState().desk.layout);
        }
        moveWidget(id, pos, commit);
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
          <Button variant="secondary" size="sm" onClick={() => void copy(current.path)}>
            {copied === current.path ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            Copy URL
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={current.path} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" />
              Pop out
            </a>
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,52rem)_minmax(18rem,1fr)]">
      <div className="checker relative aspect-video overflow-hidden rounded-lg border border-border">
        <img
          src="/slates/starting.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-ov-bg/25" />
        <ScaleFrame>
          {source === "hud" ? <HudView desk={desk} now={now} /> : null}
          {source === "scorebug" ? <ScorebugView desk={desk} now={now} /> : null}
          {source === "versus" ? <VersusView desk={desk} /> : null}
          {source === "slate" ? <SlateView desk={desk} /> : null}
          {source === "casters" ? <CastersView desk={desk} /> : null}
          {source === "lower-third" ? <LowerThirdView desk={desk} /> : null}
          {source === "winner" ? <WinnerView desk={desk} /> : null}
          {source === "game-win" ? <GameWinView desk={desk} /> : null}
          {source === "timer" ? <TimerView desk={desk} now={now} /> : null}
          {source === "resource" ? <ResourceView desk={desk} /> : null}
          {source === "upcoming" ? <UpcomingView desk={desk} /> : null}
          {source === "bracket" && tourneyReady ? <BracketOverlay tournament={tournament} /> : null}
          {source === "floor-clock" && tourneyReady ? <FloorClockOverlay tournament={tournament} /> : null}
          {source === "roster" ? <RosterView desk={desk} force={desk.rosterSide === "hidden" ? "both" : desk.rosterSide} /> : null}
        </ScaleFrame>
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

      <details className="mt-3 rounded-lg bg-surface-2 px-3 py-2">
        <summary className="cursor-pointer text-sm text-fg">vMix setup</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-muted">
          <li>Add Input → Web Browser.</li>
          <li>Paste the overlay URL. Width 1920, Height 1080.</li>
          <li>Enable Transparent. Native CEF browser.</li>
          <li>Use HUD pack for one source, or split widgets onto their own inputs.</li>
          <li>Arrange to park widgets. Undo a drag, or snap back to the default look.</li>
        </ol>
        <ul className="mt-3 space-y-1 border-t border-border pt-2">
          {OVERLAY_SOURCES.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted">
                {item.name}
                <span className="text-subtle"> · {item.size}</span>
              </span>
              <button
                type="button"
                className="text-fg underline-offset-2 hover:underline"
                onClick={() => void copy(item.path)}
              >
                {copied === item.path ? "Copied" : "Copy"}
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
                    Arrange widgets
                  </h2>
                  <p className="text-sm text-muted">
                    Drag to place. Undo a move, or snap to the house default. Esc closes.
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
              <div className="checker relative min-h-0 overflow-hidden rounded-xl border border-border">
                <img
                  src="/slates/starting.jpg"
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-ov-bg/20" />
                <ScaleFrame>
                  <HudView desk={desk} now={now} edit={edit} />
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
