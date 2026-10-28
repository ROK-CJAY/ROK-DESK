import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Lock, LockOpen, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fontChoices, saveFontFile, useTitleImages } from "@/lib/fgc-assets";
import { deskFonts, fontFamilyCss } from "@/lib/fgc-fonts";
import { useFgcStore } from "@/lib/fgc-store";
import { titleFromPsd } from "@/lib/psd-title";
import type { FgcTitle, FgcTitleElement } from "@/lib/fgc-types";
import { activeTitle, blankElement, blankLayer, liveSet, normalizeTitle, starterTitle, TITLE_BINDS, TITLE_GROUPS, titleImage, titleText } from "@/lib/fgc-titles";

type Tool = "select" | "text" | "ticker" | "image" | "rect" | "circle" | "triangle";
type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const HANDLES: { id: Handle; className: string }[] = [
  { id: "nw", className: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize" },
  { id: "n", className: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize" },
  { id: "ne", className: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize" },
  { id: "e", className: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize" },
  { id: "se", className: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize" },
  { id: "s", className: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize" },
  { id: "sw", className: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize" },
  { id: "w", className: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize" },
];

function drawnBox(start: { x: number; y: number }, now: { x: number; y: number }, shift: boolean, alt: boolean) {
  let x2 = now.x;
  let y2 = now.y;
  if (shift) {
    const size = Math.max(Math.abs(x2 - start.x), Math.abs(y2 - start.y));
    x2 = start.x + Math.sign(x2 - start.x || 1) * size;
    y2 = start.y + Math.sign(y2 - start.y || 1) * size;
  }
  if (alt) {
    const dx = x2 - start.x;
    const dy = y2 - start.y;
    return { x: Math.round(start.x - dx), y: Math.round(start.y - dy), w: Math.round(Math.abs(dx) * 2), h: Math.round(Math.abs(dy) * 2) };
  }
  return {
    x: Math.round(Math.min(start.x, x2)),
    y: Math.round(Math.min(start.y, y2)),
    w: Math.round(Math.abs(x2 - start.x)),
    h: Math.round(Math.abs(y2 - start.y)),
  };
}

function resizedBox(origin: FgcTitleElement, dx: number, dy: number, handle: Handle, shift: boolean) {
  let x = origin.x;
  let y = origin.y;
  let w = origin.w;
  let h = origin.h;
  if (handle.includes("e")) w = origin.w + dx;
  if (handle.includes("s")) h = origin.h + dy;
  if (handle.includes("w")) { x = origin.x + dx; w = origin.w - dx; }
  if (handle.includes("n")) { y = origin.y + dy; h = origin.h - dy; }
  if (w < 0) { x += w; w = -w; }
  if (h < 0) { y += h; h = -h; }
  if (shift && origin.h) {
    const aspect = origin.w / origin.h;
    if (w / Math.max(1, h) > aspect) w = h * aspect;
    else h = w / aspect;
  }
  return { x: Math.round(x), y: Math.round(y), w: Math.max(8, Math.round(w)), h: Math.max(8, Math.round(h)) };
}

type Box = { x: number; y: number; w: number; h: number };
type Guides = { x: number[]; y: number[] };

function snapMove(box: Box, peers: Box[]): { box: Box; guides: Guides } {
  const xs = [0, 960, 1920];
  const ys = [0, 540, 1080];
  for (const peer of peers) {
    xs.push(peer.x, peer.x + peer.w / 2, peer.x + peer.w);
    ys.push(peer.y, peer.y + peer.h / 2, peer.y + peer.h);
  }
  const nearest = (value: number, targets: number[]) => {
    let best: { dist: number; target: number } | null = null;
    for (const target of targets) {
      const dist = Math.abs(value - target);
      if (dist <= 8 && (!best || dist < best.dist)) best = { dist, target };
    }
    return best;
  };
  const pick = (edges: [number, (target: number) => number][], targets: number[]) => {
    let best: { dist: number; next: number; guide: number } | null = null;
    for (const [value, apply] of edges) {
      const hit = nearest(value, targets);
      if (hit && (!best || hit.dist < best.dist)) best = { dist: hit.dist, next: apply(hit.target), guide: hit.target };
    }
    return best;
  };
  const hitX = pick([
    [box.x, (target) => target],
    [box.x + box.w / 2, (target) => target - box.w / 2],
    [box.x + box.w, (target) => target - box.w],
  ], xs);
  const hitY = pick([
    [box.y, (target) => target],
    [box.y + box.h / 2, (target) => target - box.h / 2],
    [box.y + box.h, (target) => target - box.h],
  ], ys);
  return {
    box: { ...box, x: Math.round(hitX ? hitX.next : box.x), y: Math.round(hitY ? hitY.next : box.y) },
    guides: { x: hitX ? [hitX.guide] : [], y: hitY ? [hitY.guide] : [] },
  };
}

function snapResize(box: Box, peers: Box[], handle: Handle, origin: Box): { box: Box; guides: Guides } {
  const xs = [0, 960, 1920];
  const ys = [0, 540, 1080];
  for (const peer of peers) {
    xs.push(peer.x, peer.x + peer.w / 2, peer.x + peer.w);
    ys.push(peer.y, peer.y + peer.h / 2, peer.y + peer.h);
  }
  const nearest = (value: number, targets: number[]) => {
    let best: { dist: number; target: number } | null = null;
    for (const target of targets) {
      const dist = Math.abs(value - target);
      if (dist <= 8 && (!best || dist < best.dist)) best = { dist, target };
    }
    return best;
  };
  const east = handle.includes("e");
  const west = handle.includes("w");
  const south = handle.includes("s");
  const north = handle.includes("n");
  const same = (a: number, b: number) => Math.abs(a - b) <= 1;
  const flippedX = (east && !same(box.x, origin.x)) || (west && !same(box.x + box.w, origin.x + origin.w));
  const flippedY = (south && !same(box.y, origin.y)) || (north && !same(box.y + box.h, origin.y + origin.h));
  const moveX = east || west ? (east === flippedX ? "w" : "e") : "";
  const moveY = south || north ? (south === flippedY ? "n" : "s") : "";
  let { x, y, w, h } = box;
  const guides: Guides = { x: [], y: [] };
  if (moveX === "e") {
    const hit = nearest(x + w, xs);
    if (hit) {
      w = Math.max(8, hit.target - x);
      guides.x.push(hit.target);
    }
  }
  if (moveX === "w") {
    const hit = nearest(x, xs);
    if (hit) {
      const right = x + w;
      const next = Math.min(hit.target, right - 8);
      x = next;
      w = right - next;
      guides.x.push(hit.target);
    }
  }
  if (moveY === "s") {
    const hit = nearest(y + h, ys);
    if (hit) {
      h = Math.max(8, hit.target - y);
      guides.y.push(hit.target);
    }
  }
  if (moveY === "n") {
    const hit = nearest(y, ys);
    if (hit) {
      const bottom = y + h;
      const next = Math.min(hit.target, bottom - 8);
      y = next;
      h = bottom - next;
      guides.y.push(hit.target);
    }
  }
  return { box: { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) }, guides };
}

const TOOLS: { id: Tool; label: string }[] = [
  { id: "select", label: "Select" },
  { id: "text", label: "Text" },
  { id: "ticker", label: "Ticker" },
  { id: "image", label: "Image" },
  { id: "rect", label: "Rectangle" },
  { id: "circle", label: "Circle" },
  { id: "triangle", label: "Triangle" },
];

export function FgcDesigner() {
  useTitleImages();
  const fgc = useFgcStore((s) => s.fgc);
  const patch = useFgcStore((s) => s.patch);
  const frame = useRef<HTMLDivElement>(null);
  const imagePick = useRef<HTMLInputElement>(null);
  const pendingImage = useRef<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [layerId, setLayerId] = useState("layer-1");
  const [tool, setTool] = useState<Tool>("select");
  const [saved, setSaved] = useState(false);
  const [askPlace, setAskPlace] = useState(false);
  const [place, setPlace] = useState<(typeof TITLE_GROUPS)[number]>("In game");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [guides, setGuides] = useState<Guides>({ x: [], y: [] });
  const [snap, setSnap] = useState(true);
  const [canvasGuides, setCanvasGuides] = useState(true);
  const past = useRef<FgcTitle[]>([]);
  const future = useRef<FgcTitle[]>([]);
  const clip = useRef<FgcTitleElement | null>(null);
  const [stack, setStack] = useState({ back: 0, forward: 0 });
  const title = normalizeTitle(activeTitle(fgc));
  const set = liveSet(fgc);
  const layer = title.layers.find((item) => item.id === layerId) ?? title.layers[0];
  const objects = title.elements.filter((item) => item.layer === layer.id);
  const current = title.elements.find((item) => item.id === selected) ?? null;

  const write = (next: FgcTitle) => {
    const state = useFgcStore.getState().fgc;
    const titles = state.titles.some((item) => item.id === next.id)
      ? state.titles.map((item) => (item.id === next.id ? next : item))
      : [...state.titles, next];
    useFgcStore.getState().patch({ titles, activeTitleId: next.id });
  };

  const remember = () => {
    past.current.push(title);
    if (past.current.length > 50) past.current.shift();
    future.current = [];
    setStack({ back: past.current.length, forward: 0 });
  };

  const commit = (next: FgcTitle) => {
    remember();
    write(next);
  };

  const undo = () => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(title);
    setStack({ back: past.current.length, forward: future.current.length });
    write(prev);
  };

  const redo = () => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(title);
    setStack({ back: past.current.length, forward: future.current.length });
    write(next);
  };

  const copyObject = () => {
    if (current) clip.current = current;
  };

  const pasteObject = () => {
    const source = clip.current;
    if (!source) return;
    const createdLayer = { ...blankLayer(), id: `layer-${Date.now()}`, name: `${source.name} copy` };
    const element = { ...source, id: `el-${Date.now()}`, layer: createdLayer.id, name: `${source.name} copy`, x: source.x + 24, y: source.y + 24 };
    const index = title.layers.findIndex((item) => item.id === layer.id);
    const layers = [...title.layers];
    layers.splice(Math.max(0, index) + 1, 0, createdLayer);
    commit({ ...title, layers, elements: [...title.elements, element] });
    setLayerId(createdLayer.id);
    setSelected(element.id);
  };

  const point = (event: { clientX: number; clientY: number }) => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return { x: 0, y: 0 };
    return {
      x: Math.round(((event.clientX - rect.left) / rect.width) * 1920),
      y: Math.round(((event.clientY - rect.top) / rect.height) * 1080),
    };
  };

  const update = (partial: Partial<FgcTitleElement>) => {
    if (!current) return;
    commit({ ...title, elements: title.elements.map((item) => (item.id === current.id ? { ...item, ...partial } : item)) });
  };

  const moveLayer = (id: string, direction: -1 | 1) => {
    const index = title.layers.findIndex((item) => item.id === id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= title.layers.length) return;
    const layers = [...title.layers];
    const [row] = layers.splice(index, 1);
    layers.splice(next, 0, row);
    commit({ ...title, layers });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement;
      if (typing) return;
      const command = event.metaKey || event.ctrlKey;
      if (command && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (command && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if (command && event.key.toLowerCase() === "c") {
        copyObject();
        return;
      }
      if (command && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteObject();
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selected) {
        event.preventDefault();
        const element = title.elements.find((item) => item.id === selected);
        if (!element) return;
        const left = title.elements.filter((item) => item.id !== selected);
        const layerStillUsed = left.some((item) => item.layer === element.layer);
        commit({
          ...title,
          elements: left,
          layers: layerStillUsed || title.layers.length === 1 ? title.layers : title.layers.filter((item) => item.id !== element.layer),
        });
        setSelected(null);
      }
      if (event.key === "Escape") setSelected(null);
      if (!selected || !current) return;
      const step = event.shiftKey ? 10 : 1;
      const nudge: Record<string, Partial<FgcTitleElement>> = {
        ArrowLeft: { x: current.x - step },
        ArrowRight: { x: current.x + step },
        ArrowUp: { y: current.y - step },
        ArrowDown: { y: current.y + step },
      };
      if (nudge[event.key]) {
        event.preventDefault();
        update(nudge[event.key]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const dragExisting = (element: FgcTitleElement, event: ReactPointerEvent, handle?: Handle) => {
    const host = title.layers.find((item) => item.id === element.layer);
    if (tool !== "select" || element.locked || host?.locked) return;
    event.stopPropagation();
    event.preventDefault();
    setLayerId(element.layer);
    setSelected(element.id);
    const start = point(event);
    const origin = { ...element };
    const snapshot = title;
    const peers = snapshot.elements.filter((item) => item.id !== element.id && item.visible);
    let saved = false;
    const move = (ev: PointerEvent) => {
      if (!saved) {
        past.current.push(snapshot);
        if (past.current.length > 50) past.current.shift();
        future.current = [];
        setStack({ back: past.current.length, forward: 0 });
        saved = true;
      }
      const now = point(ev);
      const dx = now.x - start.x;
      const dy = now.y - start.y;
      let box = handle ? resizedBox(origin, dx, dy, handle, ev.shiftKey) : { x: origin.x + dx, y: origin.y + dy, w: origin.w, h: origin.h };
      if (snap && !ev.altKey) {
        const snapped = handle ? snapResize(box, peers, handle, origin) : snapMove(box, peers);
        box = snapped.box;
        setGuides(snapped.guides);
      } else setGuides({ x: [], y: [] });
      write({ ...snapshot, elements: snapshot.elements.map((item) => item.id === element.id ? { ...origin, ...box } : item) });
    };
    const up = () => {
      setGuides({ x: [], y: [] });
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const drawNew = (event: ReactPointerEvent) => {
    if (tool === "select" || layer.locked) {
      setSelected(null);
      return;
    }
    event.preventDefault();
    const start = point(event);
    const move = (ev: PointerEvent) => setDraft(drawnBox(start, point(ev), ev.shiftKey, ev.altKey));
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      let box = drawnBox(start, point(ev), ev.shiftKey, ev.altKey);
      if (box.w < 8 && box.h < 8) {
        box = { x: start.x, y: start.y, w: tool === "text" || tool === "ticker" ? 420 : tool === "image" ? 360 : 240, h: tool === "text" || tool === "ticker" ? 72 : tool === "image" ? 200 : 160 };
      }
      const kind = tool;
      const createdLayer = { ...blankLayer(), id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, name: kind === "text" ? "Text" : kind === "ticker" ? "Ticker" : kind === "image" ? "Image" : kind === "circle" ? "Circle" : kind === "triangle" ? "Triangle" : "Rectangle" };
      const element = {
        ...blankElement(kind, createdLayer.id),
        ...box,
        bind: kind === "text" || kind === "ticker" ? "" : "",
        text: kind === "text" || kind === "ticker" ? "Text" : "",
        size: Math.max(16, Math.round(box.h * 0.62)),
      };
      const index = title.layers.findIndex((item) => item.id === layer.id);
      const layers = [...title.layers];
      layers.splice(Math.max(0, index) + 1, 0, createdLayer);
      commit({ ...title, layers, elements: [...title.elements, element] });
      setLayerId(createdLayer.id);
      setSelected(element.id);
      setDraft(null);
      setTool("select");
      if (kind === "image") {
        pendingImage.current = element.id;
        imagePick.current?.click();
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-surface px-2 py-1.5">
        {TOOLS.map((item) => (
          <Button key={item.id} size="sm" variant={tool === item.id ? "default" : "secondary"} title={item.label} onClick={() => setTool(item.id)}>{item.label}</Button>
        ))}
        <span className="mx-1 h-6 w-px bg-border" />
        <Button size="sm" variant="outline" title="Copy" disabled={!current} onClick={copyObject}>Copy</Button>
        <Button size="sm" variant="outline" title="Paste" onClick={pasteObject}>Paste</Button>
        <Button size="sm" variant="outline" title="Undo" disabled={!stack.back} onClick={undo}>Undo</Button>
        <Button size="sm" variant="outline" title="Redo" disabled={!stack.forward} onClick={redo}>Redo</Button>
        <label className="ml-2 flex items-center gap-1 text-xs text-muted"><input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />Snap</label>
        <label className="flex items-center gap-1 text-xs text-muted"><input type="checkbox" checked={canvasGuides} onChange={(e) => setCanvasGuides(e.target.checked)} />Canvas guides</label>
        <span className="ml-auto font-mono text-xs text-muted">
          {current ? `Object ${current.x}, ${current.y} · ${current.w} × ${current.h} · ` : ""}
          Pointer {cursor.x}, {cursor.y} · 1920 × 1080
        </span>
      </div>
      <div className="grid gap-3 xl:grid-cols-[1fr_20rem]">
        <div
          ref={frame}
          className="relative aspect-video overflow-hidden border border-border bg-[linear-gradient(45deg,#1a1a1a_25%,#111_25%,#111_50%,#1a1a1a_50%,#1a1a1a_75%,#111_75%)] bg-[length:24px_24px] [container-type:inline-size]"
          onPointerDown={drawNew}
          onPointerMove={(event) => setCursor(point(event))}
        >
          {title.layers.flatMap((item) => item.visible ? title.elements.filter((element) => element.layer === item.id && element.visible) : []).map((element) => {
            const host = title.layers.find((item) => item.id === element.layer);
            const active = selected === element.id;
            return (
              <div
                key={element.id}
                className="absolute"
                style={{
                  left: `${(element.x / 1920) * 100}%`,
                  top: `${(element.y / 1080) * 100}%`,
                  width: `${(element.w / 1920) * 100}%`,
                  height: `${(element.h / 1080) * 100}%`,
                  pointerEvents: tool === "select" && !element.locked && !host?.locked ? "auto" : "none",
                }}
                onPointerDown={(event) => dragExisting(element, event)}
              >
                <div
                  className="h-full w-full overflow-hidden text-left"
                  style={{
                    color: element.color,
                    background: (element.kind === "image" || element.kind === "rect" || element.kind === "circle" || element.kind === "triangle") && titleImage(fgc, set, element) ? "transparent" : element.bg,
                    fontSize: `${(element.size / 1920) * 100}cqw`,
                    fontFamily: fontFamilyCss(element.font),
                    fontWeight: element.weight || (element.font ? 400 : 500),
                    fontStyle: element.fontStyle === "italic" ? "italic" : "normal",
                    textAlign: element.align,
                    lineHeight: 1,
                    opacity: element.opacity,
                    borderRadius: element.kind === "circle" ? "50%" : undefined,
                    clipPath: element.kind === "triangle" ? "polygon(50% 0, 100% 100%, 0 100%)" : undefined,
                    mixBlendMode: (element.blend || undefined) as CSSProperties["mixBlendMode"],
                    outline: active ? "1px solid #e11d2e" : undefined,
                    outlineOffset: "-1px",
                  }}
                >
                  {element.kind === "image" || element.kind === "rect" || element.kind === "circle" || element.kind === "triangle" ? (
                    titleImage(fgc, set, element) ? <img src={titleImage(fgc, set, element)} alt="" className={`pointer-events-none h-full w-full ${element.kind === "image" ? "object-cover" : "object-contain"}`} /> : element.kind === "image" ? <span className="text-xs text-white/60">Image</span> : null
                  ) : element.kind === "text" || element.kind === "ticker" ? (
                    <span className={element.kind === "ticker" ? "pointer-events-none inline-block whitespace-nowrap" : "pointer-events-none block h-full overflow-hidden whitespace-pre-wrap break-words"} style={element.kind === "ticker" ? { animation: "rok-ticker 14s linear infinite" } : undefined}>{titleText(fgc, set, element.bind, element.text) || element.name}</span>
                  ) : null}
                </div>
                {active && tool === "select" ? HANDLES.map((handle) => (
                  <span
                    key={handle.id}
                    className={`absolute z-10 h-2.5 w-2.5 border border-black bg-white ${handle.className}`}
                    onPointerDown={(event) => dragExisting(element, event, handle.id)}
                  />
                )) : null}
              </div>
            );
          })}
          {canvasGuides ? (
            <>
              <div className="pointer-events-none absolute top-0 h-full w-px bg-cyan-400/40" style={{ left: "50%" }} />
              <div className="pointer-events-none absolute left-0 h-px w-full bg-cyan-400/40" style={{ top: "50%" }} />
            </>
          ) : null}
          {guides.x.map((x) => <div key={`x-${x}`} className="pointer-events-none absolute top-0 z-20 h-full w-px bg-cyan-300" style={{ left: `${(x / 1920) * 100}%` }} />)}
          {guides.y.map((y) => <div key={`y-${y}`} className="pointer-events-none absolute left-0 z-20 h-px w-full bg-cyan-300" style={{ top: `${(y / 1080) * 100}%` }} />)}
          {draft ? (
            <div
              className="pointer-events-none absolute border border-[#e11d2e] bg-[#e11d2e]/15"
              style={{ left: `${(draft.x / 1920) * 100}%`, top: `${(draft.y / 1080) * 100}%`, width: `${(draft.w / 1920) * 100}%`, height: `${(draft.h / 1080) * 100}%` }}
            />
          ) : null}
        </div>
        <div className="grid content-start gap-3">
          <div className="border border-border">
            <div className="flex items-center justify-between border-b border-border px-2 py-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Layers</p>
              <Button size="icon" variant="ghost" aria-label="Add layer" onClick={() => {
                const created = { ...blankLayer(), name: `Layer ${title.layers.length + 1}` };
                commit({ ...title, layers: [...title.layers, created] });
                setLayerId(created.id);
              }}><Plus className="size-4" /></Button>
            </div>
            <div className="grid max-h-80 overflow-y-auto overscroll-contain">
              {[...title.layers].reverse().map((item) => (
                <div key={item.id} className={item.id === layer.id ? "bg-surface-2" : ""}>
                  <div className="flex items-center gap-1 px-2 py-1">
                    <button type="button" className="min-w-0 flex-1 truncate text-left text-sm" onClick={() => { setLayerId(item.id); setSelected(title.elements.find((element) => element.layer === item.id)?.id ?? null); }}>{item.name}</button>
                    <button type="button" aria-label="Bring forward" onClick={() => moveLayer(item.id, 1)}><ChevronUp className="size-3.5" /></button>
                    <button type="button" aria-label="Send backward" onClick={() => moveLayer(item.id, -1)}><ChevronDown className="size-3.5" /></button>
                    <button type="button" aria-label="Hide layer" onClick={() => commit({ ...title, layers: title.layers.map((row) => row.id === item.id ? { ...row, visible: !row.visible } : row) })}>{item.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5 text-muted" />}</button>
                    <button type="button" aria-label="Lock layer" onClick={() => commit({ ...title, layers: title.layers.map((row) => row.id === item.id ? { ...row, locked: !row.locked } : row) })}>{item.locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5 text-muted" />}</button>
                    <button type="button" aria-label="Remove layer" disabled={title.layers.length === 1} onClick={() => {
                      const layers = title.layers.filter((row) => row.id !== item.id);
                      commit({ ...title, layers, elements: title.elements.filter((element) => element.layer !== item.id) });
                      if (item.id === layer.id) setLayerId(layers[0].id);
                    }}><Trash2 className="size-3.5" /></button>
                  </div>
                  {item.id === layer.id ? [...objects].reverse().map((element) => (
                    <div key={element.id} className={`flex items-center gap-1 px-4 py-1 text-sm ${selected === element.id ? "text-fg" : "text-muted"}`}>
                      <button type="button" className="min-w-0 flex-1 truncate text-left" onClick={() => setSelected(element.id)}>{element.name}</button>
                      <button type="button" aria-label="Hide object" onClick={() => commit({ ...title, elements: title.elements.map((row) => row.id === element.id ? { ...row, visible: !row.visible } : row) })}>{element.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}</button>
                      <button type="button" aria-label="Lock object" onClick={() => commit({ ...title, elements: title.elements.map((row) => row.id === element.id ? { ...row, locked: !row.locked } : row) })}>{element.locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}</button>
                    </div>
                  )) : null}
                </div>
              ))}
            </div>
          </div>
          {current ? <ObjectFields current={current} update={update} onAlign={(edge) => {
            if (edge === "left") update({ x: 0 });
            if (edge === "center") update({ x: Math.round((1920 - current.w) / 2) });
            if (edge === "right") update({ x: 1920 - current.w });
            if (edge === "top") update({ y: 0 });
            if (edge === "middle") update({ y: Math.round((1080 - current.h) / 2) });
            if (edge === "bottom") update({ y: 1080 - current.h });
          }} onDelete={() => { commit({ ...title, elements: title.elements.filter((item) => item.id !== current.id) }); setSelected(null); }} /> : <p className="text-sm text-muted">Select moves an object. The other tools draw it. Hold Alt while dragging to ignore snap. Shift keeps a new box square.</p>}
        </div>
      </div>
      <input
        ref={imagePick}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          const id = pendingImage.current;
          pendingImage.current = null;
          if (!file || !id) return;
          const reader = new FileReader();
          reader.onload = () => {
            const image = new Image();
            image.onload = () => {
              const latest = normalizeTitle(activeTitle(useFgcStore.getState().fgc));
              commit({ ...latest, elements: latest.elements.map((item) => item.id === id ? { ...item, src: String(reader.result || ""), bind: "" } : item) });
            };
            image.src = String(reader.result || "");
          };
          reader.readAsDataURL(file);
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Input className="max-w-xs" value={title.name} onChange={(e) => commit({ ...title, name: e.target.value })} />
        <Button size="sm" onClick={() => {
          setPlace(TITLE_GROUPS.includes(title.group as (typeof TITLE_GROUPS)[number]) ? title.group as (typeof TITLE_GROUPS)[number] : "In game");
          setAskPlace(true);
        }}>{saved ? "Saved" : "Save layout"}</Button>
        <Button size="sm" variant="outline" onClick={() => {
          const created = { ...starterTitle(), id: `title-${Date.now()}`, name: "New layout", elements: [] };
          patch({ titles: [...fgc.titles, created], activeTitleId: created.id });
          setLayerId("layer-1");
          setSelected(null);
        }}>New</Button>
        <label className="inline-flex h-8 cursor-pointer items-center rounded-md border border-border px-3 text-xs">
          {importing ? "Reading PSD" : "Import PSD"}
          <input
            type="file"
            accept=".psd,application/octet-stream"
            className="hidden"
            disabled={importing}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              setImporting(true);
              setImportError("");
              void file.arrayBuffer().then(async (buffer) => {
                const { readPsd } = await import("ag-psd");
                const imported = await titleFromPsd(readPsd(buffer, { skipCompositeImageData: true, skipThumbnail: true }), file.name.replace(/\.psd$/i, ""));
                commit(imported);
                setLayerId(imported.layers[0]?.id ?? "layer-1");
                setSelected(null);
              }).catch((error: unknown) => {
                setImportError(error instanceof Error ? error.message : "Could not read that PSD");
              }).finally(() => setImporting(false));
            }}
          />
        </label>
        <Button size="sm" variant="outline" onClick={() => {
          const titles = fgc.titles.filter((item) => item.id !== title.id);
          patch({ titles, activeTitleId: titles[0]?.id ?? null });
          setSelected(null);
        }}>Delete layout</Button>
        <select
          className="h-9 rounded-md border border-border bg-surface-2 px-2 text-sm"
          value={fgc.titles.some((item) => item.id === title.id) ? title.id : ""}
          onChange={(e) => { patch({ activeTitleId: e.target.value }); setSelected(null); }}
        >
          {fgc.titles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>
      {importError ? <p className="text-sm text-live">{importError}</p> : null}
      {askPlace ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="grid w-full max-w-sm gap-3 rounded-xl border border-border bg-surface p-4">
            <p className="font-medium">Where should this layout go?</p>
            <select className="h-10 rounded-md border border-border bg-surface-2 px-2 text-sm" value={place} onChange={(e) => setPlace(e.target.value as (typeof TITLE_GROUPS)[number])}>
              {TITLE_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAskPlace(false)}>Cancel</Button>
              <Button onClick={() => {
                commit({ ...title, group: place });
                setAskPlace(false);
                setSaved(true);
                window.setTimeout(() => setSaved(false), 1200);
              }}>Save</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-[0.7rem] font-medium uppercase tracking-wide text-muted">
      {label}
      {children}
    </label>
  );
}

function ObjectFields({ current, update, onAlign, onDelete }: { current: FgcTitleElement; update: (partial: Partial<FgcTitleElement>) => void; onAlign: (edge: "left" | "center" | "right" | "top" | "middle" | "bottom") => void; onDelete: () => void }) {
  const words = current.kind === "text" || current.kind === "ticker";
  const picture = current.kind === "image" || current.kind === "rect" || current.kind === "circle" || current.kind === "triangle";
  const pictureBind = (id: string) => id.endsWith(".icon") || id.includes(".skin") || id.endsWith(".avatar");
  const binds = TITLE_BINDS.filter((item) => picture ? !item.id || pictureBind(item.id) : !pictureBind(item.id));
  return (
    <div className="grid max-h-[70vh] content-start gap-3 overflow-auto pr-1">
      <Field label="Name"><Input value={current.name} onChange={(e) => update({ name: e.target.value })} /></Field>
      <Field label="Data">
        <select className="h-10 rounded-md border border-border bg-surface-2 px-2 text-sm normal-case tracking-normal text-fg" value={binds.some((item) => item.id === current.bind) ? current.bind : ""} onChange={(e) => update({ bind: e.target.value })}>
          {binds.map((item) => <option key={item.id || "static"} value={item.id}>{item.label}</option>)}
        </select>
      </Field>
      {words && !current.bind ? <Field label="Text"><Input value={current.text} onChange={(e) => update({ text: e.target.value })} /></Field> : null}
      {picture ? <ImageSource current={current} update={update} /> : null}
      <div className="grid grid-cols-2 gap-2">
        <Field label="X"><Input type="number" value={current.x} onChange={(e) => update({ x: Number(e.target.value) || 0 })} /></Field>
        <Field label="Y"><Input type="number" value={current.y} onChange={(e) => update({ y: Number(e.target.value) || 0 })} /></Field>
        <Field label="Width"><Input type="number" value={current.w} onChange={(e) => update({ w: Number(e.target.value) || 24 })} /></Field>
        <Field label="Height"><Input type="number" value={current.h} onChange={(e) => update({ h: Number(e.target.value) || 24 })} /></Field>
      </div>
      <Field label="Align to canvas">
        <div className="grid grid-cols-3 gap-1">
          {([["left", "Left"], ["center", "Center"], ["right", "Right"], ["top", "Top"], ["middle", "Middle"], ["bottom", "Bottom"]] as const).map(([edge, label]) => (
            <Button key={edge} size="sm" variant="outline" onClick={() => onAlign(edge)}>{label}</Button>
          ))}
        </div>
      </Field>
      {words ? (
        <Field label="Align text">
          <div className="grid grid-cols-3 gap-1">
            {(["left", "center", "right"] as const).map((align) => (
              <Button key={align} size="sm" variant={current.align === align ? "default" : "outline"} onClick={() => update({ align })}>{align}</Button>
            ))}
          </div>
        </Field>
      ) : null}
      {words ? <FontField current={current} update={update} /> : null}
      {words ? <Field label="Font size"><Input type="number" value={current.size} onChange={(e) => update({ size: Number(e.target.value) || 16 })} /></Field> : null}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Text color"><Input type="color" value={current.color} onChange={(e) => update({ color: e.target.value })} /></Field>
        <Field label="Fill"><Input type="color" value={current.bg === "transparent" ? "#000000" : current.bg} onChange={(e) => update({ bg: e.target.value })} /></Field>
      </div>
      <Button size="sm" variant="outline" onClick={() => update({ bg: "transparent" })}>No fill</Button>
      <Field label="When data changes">
        <select className="h-10 rounded-md border border-border bg-surface-2 px-2 text-sm normal-case tracking-normal text-fg" value={current.anim || ""} onChange={(e) => update({ anim: e.target.value })}>
          <option value="">None</option>
          <option value="fade">Fade out, then fade in</option>
        </select>
      </Field>
      <Field label="Opacity">
        <input type="range" min={0} max={1} step={0.05} value={current.opacity} onChange={(e) => update({ opacity: Number(e.target.value) })} />
      </Field>
      <Button size="sm" variant="outline" onClick={onDelete}>Delete object</Button>
    </div>
  );
}

function FontField({ current, update }: { current: FgcTitleElement; update: (partial: Partial<FgcTitleElement>) => void }) {
  const uploaded = fontChoices();
  const fonts = [
    ...deskFonts,
    ...uploaded
      .filter((font) => !deskFonts.some((item) => item.family === font.family))
      .map((font) => ({ family: font.family, label: font.label })),
  ].sort((a, b) => a.label.localeCompare(b.label));
  const seen = new Set<string>();
  const families = fonts.filter((font) => (seen.has(font.family) ? false : seen.add(font.family)));
  const bold = current.weight >= 600;
  const italic = current.fontStyle === "italic";
  return (
    <Field label="Font">
      <div className="flex gap-1">
        <select
          className="h-10 min-w-0 flex-1 rounded-md border border-border bg-surface-2 px-2 text-sm normal-case tracking-normal text-fg"
          style={{ fontFamily: fontFamilyCss(current.font), fontWeight: bold ? 700 : 400, fontStyle: italic ? "italic" : "normal" }}
          value={current.font}
          onChange={(event) => update({ font: event.target.value })}
        >
          <option value="">System font</option>
          {current.font && !families.some((font) => font.family === current.font) ? <option value={current.font}>{current.font}</option> : null}
          {families.map((font) => <option key={font.family} value={font.family} style={{ fontFamily: fontFamilyCss(font.family) }}>{font.label}</option>)}
        </select>
        <Button size="sm" className="w-9 font-bold" variant={bold ? "default" : "outline"} onClick={() => update({ weight: bold ? 400 : 700 })}>B</Button>
        <Button size="sm" className="w-9 italic" variant={italic ? "default" : "outline"} onClick={() => update({ fontStyle: italic ? "" : "italic" })}>I</Button>
      </div>
      <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-border text-sm normal-case tracking-normal text-fg">
        Upload font
        <input
          type="file"
          accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            void saveFontFile(file).then((font) => {
              if (font) update({ font: font.family, weight: font.weight >= 600 ? 700 : 400, fontStyle: "" });
            });
          }}
        />
      </label>
    </Field>
  );
}

function ImageSource({ current, update }: { current: FgcTitleElement; update: (partial: Partial<FgcTitleElement>) => void }) {
  return (
    <>
      {!current.bind ? <Field label="Image URL"><Input value={current.src.startsWith("data:") ? "" : current.src} onChange={(e) => update({ src: e.target.value })} placeholder="https://" /></Field> : null}
      <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-border text-sm">
        Upload image
        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const image = new Image();
            image.onload = () => {
              const scale = Math.min(1, 960 / Math.max(image.width, image.height));
              const canvas = document.createElement("canvas");
              canvas.width = Math.max(1, Math.round(image.width * scale));
              canvas.height = Math.max(1, Math.round(image.height * scale));
              canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
              update({ src: canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.85), bind: "" });
            };
            image.src = String(reader.result || "");
          };
          reader.readAsDataURL(file);
        }} />
      </label>
    </>
  );
}
