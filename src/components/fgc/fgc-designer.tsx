import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Lock, LockOpen, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTitleImages } from "@/lib/fgc-assets";
import { useFgcStore } from "@/lib/fgc-store";
import { titleFromPsd } from "@/lib/psd-title";
import type { FgcTitle, FgcTitleElement } from "@/lib/fgc-types";
import { activeTitle, blankElement, blankLayer, liveSet, normalizeTitle, starterTitle, TITLE_BINDS, TITLE_GROUPS, titleImage, titleText } from "@/lib/fgc-titles";

type Tool = "select" | "text" | "image" | "rect";
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
  const title = normalizeTitle(activeTitle(fgc));
  const set = liveSet(fgc);
  const layer = title.layers.find((item) => item.id === layerId) ?? title.layers[0];
  const objects = title.elements.filter((item) => item.layer === layer.id);
  const current = title.elements.find((item) => item.id === selected) ?? null;

  const commit = (next: FgcTitle) => {
    const state = useFgcStore.getState().fgc;
    const titles = state.titles.some((item) => item.id === next.id)
      ? state.titles.map((item) => (item.id === next.id ? next : item))
      : [...state.titles, next];
    useFgcStore.getState().patch({ titles, activeTitleId: next.id });
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
    const move = (ev: PointerEvent) => {
      const now = point(ev);
      const dx = now.x - start.x;
      const dy = now.y - start.y;
      const box = handle ? resizedBox(origin, dx, dy, handle, ev.shiftKey) : { x: origin.x + dx, y: origin.y + dy, w: origin.w, h: origin.h };
      commit({ ...snapshot, elements: snapshot.elements.map((item) => item.id === element.id ? { ...origin, ...box } : item) });
    };
    const up = () => {
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
        box = { x: start.x, y: start.y, w: tool === "text" ? 420 : tool === "image" ? 360 : 240, h: tool === "text" ? 72 : tool === "image" ? 200 : 80 };
      }
      const kind = tool === "rect" ? "rect" : tool;
      const createdLayer = { ...blankLayer(), id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, name: kind === "text" ? "Text" : kind === "image" ? "Image" : "Rectangle" };
      const element = {
        ...blankElement(kind, createdLayer.id),
        ...box,
        bind: "",
        text: kind === "text" ? "Text" : "",
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
      <div className="flex flex-wrap items-center gap-2">
        {([["select", "Select"], ["text", "Text"], ["image", "Image"], ["rect", "Rectangle"]] as const).map(([id, label]) => (
          <Button key={id} size="sm" variant={tool === id ? "default" : "secondary"} onClick={() => setTool(id)}>{label}</Button>
        ))}
        <span className="ml-auto font-mono text-xs text-muted">1920 × 1080 · {cursor.x}, {cursor.y}</span>
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
                    background: element.kind === "image" ? "transparent" : element.bg,
                    fontSize: `${(element.size / 1920) * 100}cqw`,
                    textAlign: element.align,
                    lineHeight: 1,
                    opacity: element.opacity,
                    mixBlendMode: (element.blend || undefined) as CSSProperties["mixBlendMode"],
                    outline: active ? "1px solid #e11d2e" : undefined,
                    outlineOffset: "-1px",
                  }}
                >
                  {element.kind === "image" ? (
                    titleImage(fgc, set, element) ? <img src={titleImage(fgc, set, element)} alt="" className="pointer-events-none h-full w-full object-cover" /> : <span className="text-xs text-white/60">Image</span>
                  ) : element.kind === "text" ? (
                    <span className="pointer-events-none block h-full overflow-hidden whitespace-pre-wrap break-words">{titleText(fgc, set, element.bind, element.text) || element.name}</span>
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
            <div className="grid">
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
          {current ? <ObjectFields current={current} update={update} onDelete={() => { commit({ ...title, elements: title.elements.filter((item) => item.id !== current.id) }); setSelected(null); }} /> : <p className="text-sm text-muted">Drag with Text, Image, or Rectangle. Shift keeps the box square. The object stays inside the box you draw.</p>}
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

function ObjectFields({ current, update, onDelete }: { current: FgcTitleElement; update: (partial: Partial<FgcTitleElement>) => void; onDelete: () => void }) {
  return (
    <div className="grid gap-2">
      <Input value={current.name} onChange={(e) => update({ name: e.target.value })} />
      <label className="grid gap-1 text-xs text-muted">
        Data
        <select className="h-10 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg" value={current.bind} onChange={(e) => update({ bind: e.target.value })}>
          {TITLE_BINDS.map((item) => <option key={item.id || "static"} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      {current.kind === "text" && !current.bind ? <Input value={current.text} onChange={(e) => update({ text: e.target.value })} /> : null}
      {current.kind === "image" ? <ImageSource current={current} update={update} /> : null}
      <div className="grid grid-cols-2 gap-2">
        <Input type="number" value={current.x} onChange={(e) => update({ x: Number(e.target.value) || 0 })} />
        <Input type="number" value={current.y} onChange={(e) => update({ y: Number(e.target.value) || 0 })} />
        <Input type="number" value={current.w} onChange={(e) => update({ w: Number(e.target.value) || 24 })} />
        <Input type="number" value={current.h} onChange={(e) => update({ h: Number(e.target.value) || 24 })} />
      </div>
      {current.kind === "text" ? (
        <div className="grid grid-cols-3 gap-2">
          {(["left", "center", "right"] as const).map((align) => (
            <Button key={align} size="sm" variant={current.align === align ? "default" : "outline"} onClick={() => update({ align })}>{align}</Button>
          ))}
        </div>
      ) : null}
      {current.kind === "text" ? <Input type="number" value={current.size} onChange={(e) => update({ size: Number(e.target.value) || 16 })} /> : null}
      <div className="grid grid-cols-2 gap-2">
        <Input type="color" value={current.color} onChange={(e) => update({ color: e.target.value })} />
        <Input type="color" value={current.bg === "transparent" ? "#000000" : current.bg} onChange={(e) => update({ bg: e.target.value })} />
      </div>
      <label className="grid gap-1 text-xs text-muted">
        Opacity
        <input type="range" min={0} max={1} step={0.05} value={current.opacity} onChange={(e) => update({ opacity: Number(e.target.value) })} />
      </label>
      <Button size="sm" variant="outline" onClick={onDelete}>Delete object</Button>
    </div>
  );
}

function ImageSource({ current, update }: { current: FgcTitleElement; update: (partial: Partial<FgcTitleElement>) => void }) {
  return (
    <>
      {!current.bind ? <Input value={current.src.startsWith("data:") ? "" : current.src} onChange={(e) => update({ src: e.target.value })} placeholder="Image URL" /> : null}
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
