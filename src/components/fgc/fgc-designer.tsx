import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFgcStore } from "@/lib/fgc-store";
import { activeTitle, blankElement, liveSet, starterTitle, TITLE_BINDS, titleImage, titleText, type FgcTitleElement } from "@/lib/fgc-titles";

export function FgcDesigner() {
  const fgc = useFgcStore((s) => s.fgc);
  const patch = useFgcStore((s) => s.patch);
  const frame = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const title = activeTitle(fgc);
  const set = liveSet(fgc);
  const current = title.elements.find((item) => item.id === selected) ?? null;

  const write = (elements: FgcTitleElement[]) => {
    const state = useFgcStore.getState().fgc;
    const base = activeTitle(state);
    const next = { ...base, elements };
    const titles = state.titles.some((item) => item.id === next.id)
      ? state.titles.map((item) => (item.id === next.id ? next : item))
      : [...state.titles, next];
    useFgcStore.getState().patch({ titles, activeTitleId: next.id });
  };

  const update = (partial: Partial<FgcTitleElement>) => {
    if (!current) return;
    write(title.elements.map((item) => (item.id === current.id ? { ...item, ...partial } : item)));
  };

  const drag = (element: FgcTitleElement, event: ReactPointerEvent, resize = false) => {
    event.stopPropagation();
    setSelected(element.id);
    const rect = frame.current?.getBoundingClientRect();
    const scaleX = rect && rect.width ? 1920 / rect.width : 1;
    const scaleY = rect && rect.height ? 1080 / rect.height : 1;
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = { ...element };
    const snapshot = title.elements;
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) * scaleX;
      const dy = (ev.clientY - startY) * scaleY;
      write(snapshot.map((item) => item.id !== element.id ? item : resize
        ? { ...origin, w: Math.max(40, Math.round(origin.w + dx)), h: Math.max(24, Math.round(origin.h + dy)) }
        : { ...origin, x: Math.round(origin.x + dx), y: Math.round(origin.y + dy) }));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_18rem]">
      <div>
        <div ref={frame} className="relative aspect-video overflow-hidden rounded-lg border border-border bg-[linear-gradient(45deg,#1a1a1a_25%,#111_25%,#111_50%,#1a1a1a_50%,#1a1a1a_75%,#111_75%)] bg-[length:24px_24px] [container-type:inline-size]" onPointerDown={() => setSelected(null)}>
          {title.elements.map((element) => (
            <button
              key={element.id}
              type="button"
              className="absolute overflow-hidden text-left"
              style={{
                left: `${(element.x / 1920) * 100}%`,
                top: `${(element.y / 1080) * 100}%`,
                width: `${(element.w / 1920) * 100}%`,
                height: `${(element.h / 1080) * 100}%`,
                color: element.color,
                background: element.kind === "image" ? "transparent" : element.bg,
                fontSize: `${(element.size / 1920) * 100}cqw`,
                textAlign: element.align,
                outline: selected === element.id ? "2px solid #e11d2e" : "1px dashed rgba(255,255,255,0.35)",
              }}
              onPointerDown={(event) => drag(element, event)}
            >
              {element.kind === "image" ? (
                titleImage(fgc, set, element) ? <img src={titleImage(fgc, set, element)} alt="" className="h-full w-full object-contain" /> : <span className="text-xs text-white/60">Image</span>
              ) : element.kind === "text" ? (
                <span className="block uppercase">{titleText(fgc, set, element.bind, element.text) || "Text"}</span>
              ) : null}
              <span className="absolute right-0 bottom-0 h-3 w-3 cursor-se-resize bg-white" onPointerDown={(event) => drag(element, event, true)} />
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => { const element = blankElement("text"); write([...title.elements, element]); setSelected(element.id); }}>Text</Button>
          <Button size="sm" variant="secondary" onClick={() => { const element = blankElement("rect"); write([...title.elements, element]); setSelected(element.id); }}>Box</Button>
          <Button size="sm" variant="secondary" onClick={() => { const element = blankElement("image"); write([...title.elements, element]); setSelected(element.id); }}>Image</Button>
          <Button size="sm" variant="outline" disabled={!current} onClick={() => current && write(title.elements.filter((item) => item.id !== current.id))}>Delete layer</Button>
        </div>
      </div>
      <div className="grid content-start gap-2">
        <label className="grid gap-1 text-xs text-muted">
          Layout
          <select
            className="h-10 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg"
            value={title.id}
            onChange={(e) => {
              if (e.target.value === "new") {
                const created = { ...starterTitle(), id: `title-${Date.now()}`, name: "New layout", elements: [] };
                patch({ titles: [...fgc.titles, created], activeTitleId: created.id });
                return;
              }
              patch({ activeTitleId: e.target.value });
            }}
          >
            {(fgc.titles.length ? fgc.titles : [starterTitle()]).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            <option value="new">New layout</option>
          </select>
        </label>
        <Input value={title.name} onChange={(e) => {
          const next = { ...title, name: e.target.value };
          const titles = fgc.titles.some((item) => item.id === next.id) ? fgc.titles.map((item) => item.id === next.id ? next : item) : [...fgc.titles, next];
          patch({ titles, activeTitleId: next.id });
        }} />
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" onClick={() => {
            const state = useFgcStore.getState().fgc;
            const base = activeTitle(state);
            const titles = state.titles.some((item) => item.id === base.id) ? state.titles.map((item) => item.id === base.id ? base : item) : [...state.titles, base];
            patch({ titles, activeTitleId: base.id });
            setSaved(true);
            window.setTimeout(() => setSaved(false), 1200);
          }}>{saved ? "Saved" : "Save layout"}</Button>
          <Button size="sm" variant="outline" onClick={() => {
            const titles = fgc.titles.filter((item) => item.id !== title.id);
            patch({ titles, activeTitleId: titles[0]?.id ?? null });
            setSelected(null);
          }}>Delete layout</Button>
        </div>
        {current ? (
          <>
            <label className="grid gap-1 text-xs text-muted">
              Data
              <select className="h-10 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg" value={current.bind} onChange={(e) => update({ bind: e.target.value })}>
                {TITLE_BINDS.map((item) => <option key={item.id || "static"} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            {current.kind === "text" && !current.bind ? <Input value={current.text} onChange={(e) => update({ text: e.target.value })} placeholder="Text" /> : null}
            {current.kind === "image" ? (
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
                        const max = 960;
                        const scale = Math.min(1, max / Math.max(image.width, image.height));
                        const canvas = document.createElement("canvas");
                        canvas.width = Math.max(1, Math.round(image.width * scale));
                        canvas.height = Math.max(1, Math.round(image.height * scale));
                        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
                        const png = file.type === "image/png";
                        update({ src: canvas.toDataURL(png ? "image/png" : "image/jpeg", 0.85), bind: "" });
                      };
                      image.src = String(reader.result || "");
                    };
                    reader.readAsDataURL(file);
                  }} />
                </label>
              </>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" value={current.x} onChange={(e) => update({ x: Number(e.target.value) || 0 })} />
              <Input type="number" value={current.y} onChange={(e) => update({ y: Number(e.target.value) || 0 })} />
              <Input type="number" value={current.w} onChange={(e) => update({ w: Number(e.target.value) || 40 })} />
              <Input type="number" value={current.h} onChange={(e) => update({ h: Number(e.target.value) || 24 })} />
            </div>
            {current.kind === "text" ? <Input type="number" value={current.size} onChange={(e) => update({ size: Number(e.target.value) || 16 })} /> : null}
            <div className="grid grid-cols-2 gap-2">
              <Input type="color" value={current.color} onChange={(e) => update({ color: e.target.value })} />
              <Input type="color" value={current.bg === "transparent" ? "#000000" : current.bg} onChange={(e) => update({ bg: e.target.value })} />
            </div>
          </>
        ) : <p className="text-sm text-muted">Select a layer, or add text, a box, or an image. Bind it to the live set.</p>}
      </div>
    </div>
  );
}
