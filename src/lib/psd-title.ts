import type { Layer, Psd } from "ag-psd";
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

function layerCanvas(layer: Layer): HTMLCanvasElement | null {
  if (!layer.canvas || layer.canvas.width < 1 || layer.canvas.height < 1) return null;
  const mask = layer.mask?.canvas;
  if (!mask || layer.mask?.disabled || mask.width < 1 || mask.height < 1) return layer.canvas;
  const canvas = document.createElement("canvas");
  canvas.width = layer.canvas.width;
  canvas.height = layer.canvas.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return layer.canvas;
  ctx.drawImage(layer.canvas, 0, 0);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(mask, (layer.mask?.left ?? layer.left ?? 0) - (layer.left ?? 0), (layer.mask?.top ?? layer.top ?? 0) - (layer.top ?? 0));
  return canvas;
}

function clipOnto(base: HTMLCanvasElement, bx: number, by: number, over: HTMLCanvasElement, ox: number, oy: number, opacity: number) {
  const left = Math.min(bx, ox);
  const top = Math.min(by, oy);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(bx + base.width, ox + over.width) - left;
  canvas.height = Math.max(by + base.height, oy + over.height) - top;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { canvas: base, x: bx, y: by };
  ctx.drawImage(base, bx - left, by - top);
  ctx.globalCompositeOperation = "source-atop";
  ctx.globalAlpha = opacity;
  ctx.drawImage(over, ox - left, oy - top);
  return { canvas, x: left, y: top };
}

async function objectsFrom(layer: Layer, layerId: string, scaleX: number, scaleY: number, opacity: number, canvas = layerCanvas(layer)): Promise<FgcTitleElement[]> {
  const left = layer.left ?? layer.text?.left ?? 0;
  const top = layer.top ?? layer.text?.top ?? 0;
  const right = layer.right ?? layer.text?.right ?? left;
  const bottom = layer.bottom ?? layer.text?.bottom ?? top;
  const width = Math.round((right - left) * scaleX);
  const height = Math.round((bottom - top) * scaleY);
  if (width < 1 || height < 1) return [];
  const created: FgcTitleElement[] = [];
  const shared = {
    x: Math.round(left * scaleX),
    y: Math.round(top * scaleY),
    w: width,
    h: height,
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
  if (layer.text?.text) {
    created.push({
      ...blankElement("text", layerId),
      ...shared,
      name: created.length ? `${layer.name || "Text"} text` : layer.name || "Text",
      bind: "",
      text: layer.text.text,
      blend: "",
      size: Math.max(8, Math.round((layer.text.style?.fontSize || height) * scaleY)),
      color: colorOf(layer.text.style?.fillColor as { r?: number; g?: number; b?: number } | undefined),
      align: alignOf(layer.text.paragraphStyle?.justification),
      bg: "transparent",
      visible: !layer.hidden && created.length === 0,
    });
  }
  return created;
}

export async function titleFromPsd(psd: Psd, name: string): Promise<FgcTitle> {
  const scaleX = psd.width ? 1920 / psd.width : 1;
  const scaleY = psd.height ? 1080 / psd.height : 1;
  const buckets: { layer: FgcTitleLayer; elements: FgcTitleElement[] }[] = [];

  const placeLeaves = async (leaves: Layer[], group: FgcTitleLayer, parentOpacity: number) => {
    const elements: FgcTitleElement[] = [];
    let base: { element: FgcTitleElement; canvas: HTMLCanvasElement; x: number; y: number } | null = null;
    for (const leaf of leaves) {
      const pixels = layerCanvas(leaf);
      if (leaf.clipping && base && pixels) {
        const next = clipOnto(base.canvas, base.x, base.y, pixels, leaf.left ?? 0, leaf.top ?? 0, leaf.opacity ?? 1);
        const blob = await canvasBlob(next.canvas);
        if (blob) {
          base.canvas = next.canvas;
          base.x = next.x;
          base.y = next.y;
          base.element.x = Math.round(next.x * scaleX);
          base.element.y = Math.round(next.y * scaleY);
          base.element.w = Math.max(1, Math.round(next.canvas.width * scaleX));
          base.element.h = Math.max(1, Math.round(next.canvas.height * scaleY));
          await saveTitleImage(base.element.imageKey, blob);
        }
        continue;
      }
      const made = await objectsFrom(leaf, group.id, scaleX, scaleY, parentOpacity, pixels);
      elements.push(...made);
      const image = [...made].reverse().find((item) => item.kind === "image" && item.imageKey);
      base = image && pixels ? { element: image, canvas: pixels, x: leaf.left ?? 0, y: leaf.top ?? 0 } : null;
    }
    if (elements.length) buckets.push({ layer: group, elements });
  };

  const append = async (layer: Layer, parentOpacity: number) => {
    const opacity = (layer.opacity ?? 1) * parentOpacity;
    if (layer.children?.length) {
      let pending: Layer[] = [];
      const flush = async () => {
        if (!pending.length) return;
        const group: FgcTitleLayer = {
          id: uid("layer"),
          name: layer.name || "Group",
          visible: !layer.hidden,
          locked: !!layer.protected?.position,
        };
        const leaves = pending;
        pending = [];
        await placeLeaves(leaves, group, opacity);
        const last = buckets[buckets.length - 1];
        if (last?.layer.id === group.id && layer.hidden) last.elements.forEach((item) => { item.visible = false; });
      };
      for (const child of layer.children) {
        if (child.children?.length) {
          await flush();
          await append(child, opacity);
        } else pending.push(child);
      }
      await flush();
      return;
    }
    const group: FgcTitleLayer = {
      id: uid("layer"),
      name: layer.name || "Layer",
      visible: !layer.hidden,
      locked: !!layer.protected?.position,
    };
    await placeLeaves([layer], group, parentOpacity);
  };

  for (const layer of psd.children ?? []) await append(layer, 1);

  if (!buckets.some((bucket) => bucket.elements.length)) throw new Error("That PSD has no visible layers to import.");
  return {
    id: uid("title"),
    name: name || "Imported layout",
    group: "",
    layers: buckets.map((bucket) => bucket.layer),
    elements: buckets.flatMap((bucket) => bucket.elements),
  };
}
