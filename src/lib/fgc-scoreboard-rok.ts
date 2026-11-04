import { blankElement, type FgcTitle, type FgcTitleElement, type FgcTitleLayer } from "@/lib/fgc-titles";

/** Built-in FGC layout: the approved ROK gameplay scoreboard, rebuilt as editable layers. */
export const SCOREBOARD_ROK_ID = "scoreboard-rok";

const R0 = "#c62828";
const R1 = "#d32f2f";
const R2 = "#8e0000";
const CH = "#1a1a1a";
const TOKEN = "/overlays/scoreboard-rok/rok-token-white.png";
const LOGO = "/overlays/scoreboard-rok/rok-logo-white.png";

const pct = (px: number, w: number) => `${Math.round((px / w) * 10000) / 100}%`;
/** Slants, in percent of the box so the editor (scaled) and the browser source match. */
const slantL = (w: number, s = 16) => `polygon(0 0, calc(100% - ${pct(s, w)}) 0, 100% 100%, ${pct(s, w)} 100%)`;
const slantR = (w: number, s = 16) => `polygon(${pct(s, w)} 0, 100% 0, calc(100% - ${pct(s, w)}) 100%, 0 100%)`;
const stripe = (top: string, bottom: string, h: number, px = 3) => `linear-gradient(to top, ${bottom} ${pct(px, h)}, ${top} ${pct(px, h)})`;

type Part = Partial<FgcTitleElement> & Pick<FgcTitleElement, "id" | "kind" | "name" | "x" | "y" | "w" | "h">;

function part(layer: string, p: Part): FgcTitleElement {
  const base = blankElement(p.kind, layer);
  const shape = p.kind === "rect" || p.kind === "circle" || p.kind === "triangle";
  return { ...base, bind: "", text: "", bg: shape ? "transparent" : "transparent", ...p, layer };
}

const text = (p: Part): Part => ({ align: "center", valign: "middle", caps: true, color: "#ffffff", ...p });
const anton = (size: number, tracking = 2) => ({ font: "Anton", weight: 400, size, tracking });
const oswald = (size: number, weight: number, tracking: number) => ({ font: "Oswald", weight, size, tracking });

function side(n: 1 | 2): { layers: FgcTitleLayer[]; elements: FgcTitleElement[] } {
  const g = `p${n}`;
  const left = n === 1;
  const shape = left ? slantL : slantR;
  const chipShape = left ? slantL : slantR;
  const chip = (id: string, name: string, x: number, w: number, bind: string, bg: string, template = ""): Part =>
    text({ id: `${g}-${id}`, kind: "text", name, x, y: 14, w, h: 22, bind, bg, clip: chipShape(w, 7), hideEmpty: true, template, ...oswald(13, 700, 1.5) });
  const chips = left
    ? [chip("country", "P1 state chip", 539, 92, "p1.region", CH), chip("seed", "P1 seed chip", 634, 76, "p1.seed", CH, "Seed {}"), chip("handle", "P1 X chip", 713, 150, "p1.twitter", R1, "𝕏 {}")]
    : [chip("handle", "P2 X chip", 1057, 150, "p2.twitter", R1, "𝕏 {}"), chip("seed", "P2 seed chip", 1210, 76, "p2.seed", CH, "Seed {}"), chip("country", "P2 state chip", 1289, 92, "p2.region", CH)];
  const well = left ? 400 : 1448;
  const card = left ? 460 : 1064;
  const score = left ? 844 : 1004;
  const parts: [string, Part][] = [
    ...chips.map((c) => [`${g}-chips`, c] as [string, Part]),
    [`${g}-token`, { id: `${g}-token-well`, kind: "rect", name: `P${n} character token well`, x: well, y: 40, w: 72, h: 48, bg: `linear-gradient(${left ? 90 : 270}deg, ${R2} 0 55%, ${R1} 55%)`, clip: shape(72) }],
    // Character art for the selected skin, cropped to the face; white ROK token (48x30, centred) when there is none.
    [`${g}-token`, { id: `${g}-character`, kind: "rect", name: `P${n} character`, x: well, y: 40, w: 72, h: 48, bind: `p${n}.skin`, src: TOKEN, clip: shape(72), fit: "cover", focus: "50% 22%", fallbackPad: [9, 12] }],
    [`${g}-card`, { id: `${g}-card`, kind: "rect", name: `P${n} card`, x: card, y: 40, w: 396, h: 48, bg: stripe(CH, R1, 48), clip: shape(396) }],
    [`${g}-card`, text({ id: `${g}-name`, kind: "text", name: `P${n} name`, x: card + 33, y: 40, w: 330, h: 46, bind: `p${n}.sponsorName`, prefixColor: R1, ...anton(27) })],
    [`${g}-pips`, { id: `${g}-pips`, kind: "text", name: `P${n} games-won pips`, x: left ? 716 : 1084, y: 92, w: 120, h: 16, pips: g as "p1" | "p2", anim: "pulse", enter: "slide", color: R1 }],
    [`${g}-score`, text({ id: `${g}-score`, kind: "text", name: `P${n} score`, x: score, y: 40, w: 72, h: 48, bind: `p${n}.score`, bg: stripe(R0, R2, 48), clip: shape(72), ...anton(32, 0) })],
  ];
  const layers: FgcTitleLayer[] = [
    { id: g, name: `Player ${n}`, visible: true, locked: false, kind: "group", open: true, parent: "" },
    { id: `${g}-chips`, name: `P${n} chips`, visible: true, locked: false, kind: "layer", parent: g },
    { id: `${g}-token`, name: `P${n} character token`, visible: true, locked: false, kind: "layer", parent: g },
    { id: `${g}-card`, name: `P${n} card`, visible: true, locked: false, kind: "layer", parent: g },
    { id: `${g}-score`, name: `P${n} score`, visible: true, locked: false, kind: "layer", parent: g },
    { id: `${g}-pips`, name: `P${n} games-won pips`, visible: true, locked: false, kind: "layer", parent: g },
  ];
  // Every top-bar piece slides in (original .tb); the score pulses when it changes.
  return { layers, elements: parts.map(([layer, p]) => part(layer, { enter: "slide", ...p, ...(p.id === `${g}-score` ? { anim: "pulse" } : {}) })) };
}

function cam(n: 1 | 2, x: number, color: string): FgcTitleElement[] {
  const layer = `cam${n}`;
  const t = pct(4, 22);
  const end = pct(18, 22);
  return [
    part(layer, { id: `cam${n}-frame`, kind: "rect", name: `P${n} cam frame`, x: x - 4, y: 858, w: 344, h: 197, borderWidth: 4, borderColor: color }),
    part(layer, { id: `cam${n}-corner-a`, kind: "rect", name: `P${n} cam corner (top left)`, x: x - 8, y: 854, w: 22, h: 22, bg: "#ffffff", clip: `polygon(0 0, 100% 0, 100% ${t}, ${t} ${t}, ${t} 100%, 0 100%)` }),
    part(layer, { id: `cam${n}-corner-b`, kind: "rect", name: `P${n} cam corner (bottom right)`, x: x + 336 + 8 - 22, y: 862 + 189 + 8 - 22, w: 22, h: 22, bg: "#ffffff", clip: `polygon(${end} 0, 100% 0, 100% 100%, 0 100%, 0 ${end}, ${end} ${end})` }),
  ];
}

export function scoreboardRokTitle(): FgcTitle {
  const p1 = side(1);
  const p2 = side(2);
  const layers: FgcTitleLayer[] = [
    { id: "round", name: "Round", visible: true, locked: false, kind: "layer", parent: "" },
    ...p1.layers,
    { id: "center", name: "ROK logo", visible: true, locked: false, kind: "layer", parent: "" },
    ...p2.layers,
    { id: "sponsor", name: "Sponsor ribbon", visible: true, locked: false, kind: "layer", parent: "" },
    { id: "cams", name: "Cam wells", visible: true, locked: false, kind: "group", open: true, parent: "" },
    { id: "cam1", name: "P1 cam frame", visible: true, locked: false, kind: "layer", parent: "cams" },
    { id: "cam2", name: "P2 cam frame", visible: true, locked: false, kind: "layer", parent: "cams" },
  ];
  const elements: FgcTitleElement[] = [
    part("round", text({ id: "round", kind: "text", name: "Round", x: 0, y: 40, w: 260, h: 48, bind: "round", align: "left", bg: stripe(CH, R1, 48), clip: `polygon(0 0, 100% 0, calc(100% - ${pct(16, 260)}) 100%, 0 100%)`, padLeft: 22, padRight: 38, hideEmpty: true, ...anton(24) })),
    part("round", text({ id: "phase", kind: "text", name: "Phase chip", x: 0, y: 92, w: 110, h: 22, bind: "phase", align: "left", bg: R1, clip: `polygon(0 0, 100% 0, calc(100% - ${pct(7, 110)}) 100%, 0 100%)`, padLeft: 22, padRight: 20, hideEmpty: true, ...oswald(13, 700, 2) })),
    ...p1.elements,
    part("center", { id: "logo-plate", kind: "rect", name: "ROK logo plate", x: 904, y: 40, w: 112, h: 48, enter: "slide", bg: stripe(CH, R1, 48), clip: `polygon(0 0, 100% 0, calc(100% - ${pct(16, 112)}) 100%, ${pct(16, 112)} 100%)` }),
    part("center", { id: "logo", kind: "rect", name: "ROK logo", x: 935, y: 47, w: 50, h: 34, src: LOGO, enter: "slide" }),
    ...p2.elements,
    part("sponsor", { id: "sponsor-plate", kind: "rect", name: "Sponsor ribbon", x: 24, y: 806, w: 344, h: 44, bg: stripe(CH, R1, 44) }),
    part("sponsor", { id: "sponsor-key", kind: "rect", name: "Sponsor key", x: 24, y: 806, w: 39, h: 41, bg: R1 }),
    part("sponsor", { id: "sponsor-token", kind: "rect", name: "Sponsor key token", x: 34, y: 813, w: 19, h: 26, src: TOKEN }),
    // Partners: logo and ad text rotate together, centred as a pair, .8s crossfade every sponsorSeconds.
    part("sponsor", text({ id: "sponsor-partners", kind: "text", name: "Sponsor partners", x: 63, y: 806, w: 305, h: 41, bind: "sponsor.name", anim: "partners", ...oswald(13, 600, 1) })),
    ...cam(1, 28, R1),
    ...cam(2, 1556, R2),
  ];
  return { id: SCOREBOARD_ROK_ID, name: "Scoreboard ROK · index", group: "", layers, elements };
}
