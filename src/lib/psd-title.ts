import type { BezierPath, Layer, LayerMaskData, LayerVectorMask, Psd } from "ag-psd";
import { saveTitleImage } from "@/lib/fgc-assets";
import type { FgcTitle, FgcTitleElement, FgcTitleLayer } from "@/lib/fgc-types";
import { blankElement } from "@/lib/fgc-titles";

const BLEND: Record<string, string> = {
  multiply: "multiply",
  screen: "screen",
  overlay: "overlay",
  darken: "darken",
  lighten: "lighten",
  "color burn": "color-burn",
  "linear burn": "color-burn",
  "color dodge": "color-dodge",
  "linear dodge": "plus-lighter",
  "soft light": "soft-light",
  "hard light": "hard-light",
  difference: "difference",
  exclusion: "exclusion",
  hue: "hue",
  saturation: "saturation",
  color: "color",
  luminosity: "luminosity",
};

type Clip = { canvas: HTMLCanvasElement; x: number; y: number; invert?: boolean };

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function channel(value: number) {
  const scaled = value <= 1 ? value * 255 : value;
  return Math.max(0, Math.min(255, Math.round(scaled)));
}

function colorOf(color: { r?: number; g?: number; b?: number } | undefined) {
  if (!color || color.r == null) return "#ffffff";
  return `#${[channel(color.r), channel(color.g ?? 0), channel(color.b ?? 0)].map((part) => part.toString(16).padStart(2, "0")).join("")}`;
}

function alignOf(value: string | undefined): FgcTitleElement["align"] {
  if (value === "center" || value === "justify-center") return "center";
  if (value === "right" || value === "justify-right") return "right";
  return "left";
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

function drawPath(ctx: CanvasRenderingContext2D, path: BezierPath) {
  if (path.open || path.knots.length < 2) return;
  const anchor = (index: number) => ({ x: path.knots[index].points[2], y: path.knots[index].points[3] });
  const leave = (index: number) => ({ x: path.knots[index].points[4], y: path.knots[index].points[5] });
  const enter = (index: number) => ({ x: path.knots[index].points[0], y: path.knots[index].points[1] });
  ctx.beginPath();
  const start = anchor(0);
  ctx.moveTo(start.x, start.y);
  for (let index = 0; index < path.knots.length; index += 1) {
    const next = (index + 1) % path.knots.length;
    const c1 = leave(index);
    const c2 = enter(next);
    const point = anchor(next);
    ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, point.x, point.y);
  }
  ctx.closePath();
}

function rasterVectorMask(mask: LayerVectorMask, width: number, height: number): HTMLCanvasElement | null {
  if (mask.disable || !mask.paths?.length || width < 1 || height < 1) return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  if (mask.fillStartsWithAllPixels) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
  }
  for (const path of mask.paths) {
    const operation = path.operation || "combine";
    ctx.globalCompositeOperation = operation === "subtract" || operation === "exclude" ? "destination-out" : operation === "intersect" ? "destination-in" : "source-over";
    ctx.fillStyle = "#fff";
    drawPath(ctx, path);
    ctx.fill(path.fillRule === "even-odd" ? "evenodd" : "nonzero");
  }
  return canvas;
}

function rasterLayerMask(mask: LayerMaskData, width: number, height: number, layer: Layer): HTMLCanvasElement | null {
  if (mask.disabled || !mask.canvas || width < 1 || height < 1) return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  if ((mask.defaultColor ?? 0) > 0) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
  }
  const originX = mask.positionRelativeToLayer ? (layer.left ?? 0) : 0;
  const originY = mask.positionRelativeToLayer ? (layer.top ?? 0) : 0;
  ctx.drawImage(mask.canvas, (mask.left ?? 0) + originX, (mask.top ?? 0) + originY);
  return canvas;
}

function masksOf(layer: Layer, width: number, height: number): Clip[] {
  const clips: Clip[] = [];
  if (layer.mask) {
    const canvas = rasterLayerMask(layer.mask, width, height, layer);
    if (canvas) clips.push({ canvas, x: 0, y: 0 });
  }
  if (layer.vectorMask) {
    const canvas = rasterVectorMask(layer.vectorMask, width, height);
    if (canvas) clips.push({ canvas, x: 0, y: 0, invert: layer.vectorMask.invert });
  }
  return clips;
}

function crop(canvas: HTMLCanvasElement, x: number, y: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx || canvas.width < 1 || canvas.height < 1) return { canvas, x, y };
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = -1;
  let maxY = -1;
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 2) continue;
    const pixel = (index - 3) / 4;
    const px = pixel % canvas.width;
    const py = Math.floor(pixel / canvas.width);
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }
  if (maxX < minX) return null;
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  if (w === canvas.width && h === canvas.height) return { canvas, x, y };
  const next = document.createElement("canvas");
  next.width = w;
  next.height = h;
  next.getContext("2d")?.drawImage(canvas, minX, minY, w, h, 0, 0, w, h);
  return { canvas: next, x: x + minX, y: y + minY };
}

function clipCanvas(source: HTMLCanvasElement, x: number, y: number, clips: Clip[]) {
  if (!clips.length) return { canvas: source, x, y };
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { canvas: source, x, y };
  ctx.drawImage(source, 0, 0);
  for (const clip of clips) {
    ctx.globalCompositeOperation = clip.invert ? "destination-out" : "destination-in";
    ctx.drawImage(clip.canvas, clip.x - x, clip.y - y);
  }
  return crop(canvas, x, y);
}

function fontFace(name: string | undefined) {
  if (!name) return "";
  return name.replace(/MT$|PS$/i, "").replace(/-(Bold|Italic|Regular|Medium|Black|Light|Semibold|SemiBold).*$/i, "").replace(/([a-z])([A-Z])/g, "$1 $2").trim();
}

function textObject(layer: Layer, layerId: string, scaleX: number, scaleY: number, opacity: number): FgcTitleElement | null {
  const source = layer.text;
  if (!source?.text?.trim()) return null;
  const style = source.style?.fontSize ? source.style : source.styleRuns?.[0]?.style || source.style;
  const left = layer.left ?? source.left ?? 0;
  const top = layer.top ?? source.top ?? 0;
  const right = layer.right ?? source.right ?? left;
  const bottom = layer.bottom ?? source.bottom ?? top;
  const boxW = Math.max(1, Math.round((right - left) * scaleX));
  const boxH = Math.max(1, Math.round((bottom - top) * scaleY));
  const transform = source.transform || [];
  const transformScale = transform.length >= 4 ? Math.max(0.01, Math.hypot(transform[1] || 0, transform[3] || 0)) : 1;
  const raw = style?.fontSize || 0;
  const text = source.text.replace(/\r/g, "\n");
  const lines = Math.max(1, text.split("\n").length);
  const fitted = Math.max(8, Math.round((boxH / lines) * 0.82));
  const scaled = raw ? Math.round(raw * transformScale * scaleY) : fitted;
  const caps = style?.fontCaps === 2;
  const bold = !!style?.fauxBold || /bold|black|heavy/i.test(style?.font?.name || "");
  return {
    ...blankElement("text", layerId),
    name: layer.name || "Text",
    bind: "",
    text: caps ? text.toUpperCase() : text,
    x: Math.round(left * scaleX),
    y: Math.round(top * scaleY),
    w: boxW,
    h: boxH,
    size: Math.max(8, Math.min(scaled, Math.round(fitted * 1.2))),
    color: colorOf(style?.fillColor as { r?: number; g?: number; b?: number } | undefined),
    align: alignOf(source.paragraphStyle?.justification || source.paragraphStyleRuns?.[0]?.style.justification),
    font: fontFace(style?.font?.name),
    weight: bold ? 700 : 500,
    bg: "transparent",
    blend: "",
    locked: !!layer.protected?.position,
    opacity: Math.max(0, Math.min(1, (layer.opacity ?? 1) * opacity)),
    visible: !layer.hidden,
  };
}

async function objectsFrom(layer: Layer, layerId: string, scaleX: number, scaleY: number, opacity: number, canvas: HTMLCanvasElement | null, at: { x: number; y: number }): Promise<FgcTitleElement[]> {
  const text = textObject(layer, layerId, scaleX, scaleY, opacity);
  if (text) return [text];
  const width = canvas ? canvas.width : Math.max(0, (layer.right ?? 0) - (layer.left ?? 0));
  const height = canvas ? canvas.height : Math.max(0, (layer.bottom ?? 0) - (layer.top ?? 0));
  const boxW = Math.round(width * scaleX);
  const boxH = Math.round(height * scaleY);
  if (boxW < 1 || boxH < 1) return [];
  const created: FgcTitleElement[] = [];
  const shared = {
    x: Math.round(at.x * scaleX),
    y: Math.round(at.y * scaleY),
    w: boxW,
    h: boxH,
    locked: !!layer.protected?.position,
    opacity: Math.max(0, Math.min(1, (layer.opacity ?? 1) * opacity)),
    blend: BLEND[layer.blendMode || ""] || "",
  };
  if (canvas) {
    const blob = await canvasBlob(canvas);
    if (blob) {
      const image = { ...blankElement("image", layerId), ...shared, name: layer.name || "Image", bind: "", visible: !layer.hidden };
      image.imageKey = `title:${image.id}`;
      await saveTitleImage(image.imageKey, blob);
      created.push(image);
    }
  }
  return created;
}

export async function titleFromPsd(psd: Psd, name: string): Promise<FgcTitle> {
  const docW = psd.width || 1920;
  const docH = psd.height || 1080;
  const scaleX = docW ? 1920 / docW : 1;
  const scaleY = docH ? 1080 / docH : 1;
  const buckets: { layer: FgcTitleLayer; elements: FgcTitleElement[] }[] = [];

  // ag-psd builds children bottom to top: the first child is the back layer.
  // The desk paints in that same order, and the layer panel shows it reversed.
  const walk = async (nodes: Layer[], parentId: string, parentOpacity: number, clips: Clip[]) => {
    let clipBase: Clip | null = null;
    for (const layer of nodes) {
      const opacity = (layer.opacity ?? 1) * parentOpacity;
      if (layer.children?.length) {
        const id = uid("layer");
        buckets.push({
          layer: {
            id,
            name: layer.name || "Group",
            visible: !layer.hidden,
            locked: !!layer.protected?.position,
            parent: parentId,
            kind: "group",
            open: true,
          },
          elements: [],
        });
        const groupClips = [...clips, ...masksOf(layer, docW, docH)];
        await walk(layer.children, id, opacity, layer.clipping && clipBase ? [...groupClips, clipBase] : groupClips);
        if (!layer.clipping) clipBase = null;
        continue;
      }
      const id = uid("layer");
      const raw = layer.canvas && layer.canvas.width > 0 && layer.canvas.height > 0 ? layer.canvas : null;
      const own = masksOf(layer, docW, docH);
      const leafClips = layer.clipping && clipBase ? [...clips, ...own, clipBase] : [...clips, ...own];
      const placed = raw ? clipCanvas(raw, layer.left ?? 0, layer.top ?? 0, leafClips) : null;
      const made = await objectsFrom(layer, id, scaleX, scaleY, opacity, placed?.canvas ?? null, { x: placed?.x ?? layer.left ?? 0, y: placed?.y ?? layer.top ?? 0 });
      if (!made.length) continue;
      if (layer.hidden) made.forEach((item) => { item.visible = false; });
      buckets.push({
        layer: {
          id,
          name: layer.name || made[0]?.name || "Layer",
          visible: !layer.hidden,
          locked: !!layer.protected?.position,
          parent: parentId,
          kind: "layer",
          open: true,
        },
        elements: made,
      });
      if (!layer.clipping && placed) clipBase = { canvas: placed.canvas, x: placed.x, y: placed.y };
      else if (!layer.clipping) clipBase = null;
    }
  };

  await walk(psd.children ?? [], "", 1, []);
  const used = new Set(buckets.flatMap((bucket) => bucket.elements.map((item) => item.layer)));
  const keep = new Set<string>();
  for (const bucket of buckets) {
    if (used.has(bucket.layer.id)) keep.add(bucket.layer.id);
  }
  let grew = true;
  while (grew) {
    grew = false;
    for (const bucket of buckets) {
      if (keep.has(bucket.layer.id) && bucket.layer.parent && !keep.has(bucket.layer.parent)) {
        keep.add(bucket.layer.parent);
        grew = true;
      }
    }
  }
  const kept = buckets.filter((bucket) => keep.has(bucket.layer.id));
  if (!kept.some((bucket) => bucket.elements.length)) throw new Error("That PSD has no visible layers to import.");
  return {
    id: uid("title"),
    name: name || "Imported layout",
    group: "",
    layers: kept.map((bucket) => bucket.layer),
    elements: kept.flatMap((bucket) => bucket.elements),
  };
}
