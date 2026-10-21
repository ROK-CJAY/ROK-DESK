import type { Layer, Psd } from "ag-psd";
import { saveTitleImage } from "@/lib/fgc-assets";
import type { FgcTitle, FgcTitleElement, FgcTitleLayer } from "@/lib/fgc-types";
import { blankElement } from "@/lib/fgc-titles";

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

async function objectsFrom(layer: Layer, layerId: string, scaleX: number, scaleY: number, opacity: number): Promise<FgcTitleElement[]> {
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
  };
  if (layer.canvas && layer.canvas.width > 0 && layer.canvas.height > 0) {
    const blob = await canvasBlob(layer.canvas);
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
  const layers: FgcTitleLayer[] = [];
  const elements: FgcTitleElement[] = [];

  const addGroup = async (layer: Layer, parentOpacity: number) => {
    const group: FgcTitleLayer = {
      id: uid("layer"),
      name: layer.name || "Group",
      visible: !layer.hidden,
      locked: !!layer.protected?.position,
    };
    const opacity = (layer.opacity ?? 1) * parentOpacity;
    const children = [...(layer.children ?? [])].reverse();
    const own: FgcTitleElement[] = [];
    for (const child of children) {
      if (child.children?.length) await addGroup(child, opacity);
      else {
        const objects = await objectsFrom(child, group.id, scaleX, scaleY, opacity);
        own.push(...objects);
      }
    }
    if (own.length) {
      layers.push(group);
      elements.push(...own);
    }
  };

  const roots = [...(psd.children ?? [])].reverse();
  for (const layer of roots) {
    if (layer.children?.length) await addGroup(layer, 1);
    else {
      const group: FgcTitleLayer = {
        id: uid("layer"),
        name: layer.name || "Layer",
        visible: !layer.hidden,
        locked: !!layer.protected?.position,
      };
      const objects = await objectsFrom(layer, group.id, scaleX, scaleY, 1);
      if (!objects.length) continue;
      layers.push(group);
      elements.push(...objects);
    }
  }

  if (!elements.length) throw new Error("That PSD has no visible layers to import.");
  return {
    id: uid("title"),
    name: name || "Imported layout",
    group: "",
    layers: layers.length ? layers : [{ id: "layer-1", name: "Layer 1", visible: true, locked: false }],
    elements,
  };
}
