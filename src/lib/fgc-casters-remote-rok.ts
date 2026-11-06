import type { FgcTitle, FgcTitleElement, FgcTitleLayer } from "@/lib/fgc-types";
import { CH, R0, R1, R2, anton, oswald, part, pct, text, type Part } from "@/lib/fgc-scoreboard-rok";

/**
 * Built-in FGC layout: ROK dual remote-caster scene, from rok/casters_remote/ROK_RemoteCasters.html.
 * Transparent cam holes: Caster 1 x24 y48 924×760, Caster 2 x972 y48 924×760.
 * No top-left logo tab. Names/handles: FGC commentators (caster1 / caster1.twitter, caster2 / caster2.twitter).
 * Bottom-right: Desk sponsors rotate (logo + name); blank when there are none.
 */
export const CASTERS_REMOTE_ROK_ID = "casters-remote-rok";

const LIGHT = "#f4f4f4";
const G15 = "#0e0e0e";
const DIR = "/overlays/casters-remote-rok";
export const ROK_LOGO_COLOR = `${DIR}/rok-logo.png`;
export const ROK_LOGO_WHITE = `${DIR}/rok_logo_white.png`;

const para = (w: number, s: number) => `polygon(${pct(s, w)} 0, 100% 0, calc(100% - ${pct(s, w)}) 100%, 0 100%)`;

function unit(n: 1 | 2): { layers: FgcTitleLayer[]; elements: FgcTitleElement[] } {
  const g = `c${n}`;
  const ux = n === 1 ? 40 : 980;
  const uy = 840;
  const parts: [string, Part][] = [
    [`${g}-bars`, { id: `${g}-bar-dark`, kind: "rect", name: `C${n} accent bar (dark)`, x: ux, y: uy + 8, w: 22, h: 140, bg: R2, clip: para(22, 10) }],
    [`${g}-bars`, { id: `${g}-bar-red`, kind: "rect", name: `C${n} accent bar (red)`, x: ux + 18, y: uy + 8, w: 18, h: 140, bg: R1, clip: para(18, 10) }],
    [`${g}-tag`, { id: `${g}-tag`, kind: "rect", name: `C${n} ROK tag`, x: ux + 40, y: uy + 12, w: 170, h: 112, bg: LIGHT, clip: para(170, 14) }],
    [`${g}-tag`, { id: `${g}-tag-rule`, kind: "rect", name: `C${n} ROK tag rule`, x: ux + 40, y: uy + 12 + 106, w: 170, h: 6, bg: R1, clip: para(170, 14) }],
    [`${g}-tag`, { id: `${g}-logo`, kind: "rect", name: `C${n} ROK logo`, x: ux + 40 + 28, y: uy + 12 + 17, w: 115, h: 78, src: ROK_LOGO_COLOR }],
    [`${g}-name`, { id: `${g}-plate`, kind: "rect", name: `C${n} name plate`, x: ux + 190, y: uy + 16, w: 680, h: 72, bg: CH, opacity: 0.96, clip: para(680, 16) }],
    [`${g}-name`, { id: `${g}-plate-rule`, kind: "rect", name: `C${n} name plate top rule`, x: ux + 190, y: uy + 16, w: 680, h: 2, bg: "#ffffff", opacity: 0.55, clip: para(680, 16) }],
    [`${g}-name`, text({ id: `${g}-name`, kind: "text", name: `Caster ${n} name`, x: ux + 226, y: uy + 16, w: 620, h: 72, bind: `caster${n}`, align: "left", prefixColor: R1, shadow: "3px 4px 6px rgba(0,0,0,0.55)", hideEmpty: true, ...anton(44, 1) })],
    [`${g}-handle`, text({ id: `${g}-handle`, kind: "text", name: `Caster ${n} X handle`, x: ux + 178, y: uy + 92, w: 640, h: 40, bind: `caster${n}.twitter`, template: "𝕏 {}", align: "left", bg: `linear-gradient(to right, ${R0}, #a41010 60%)`, clip: para(640, 14), hideEmpty: true, ...oswald(22, 700, 4) })],
  ];
  const layers: FgcTitleLayer[] = [
    { id: g, name: `Caster ${n}`, visible: true, locked: false, kind: "group", open: true, parent: "" },
    { id: `${g}-bars`, name: `C${n} accent bars`, visible: true, locked: false, kind: "layer", parent: g },
    { id: `${g}-tag`, name: `C${n} ROK tag`, visible: true, locked: false, kind: "layer", parent: g },
    { id: `${g}-name`, name: `C${n} name plate`, visible: true, locked: false, kind: "layer", parent: g },
    { id: `${g}-handle`, name: `C${n} handle bar`, visible: true, locked: false, kind: "layer", parent: g },
  ];
  return { layers, elements: parts.map(([layer, p]) => part(layer, { enter: "slide", ...p })) };
}

export function castersRemoteRokTitle(): FgcTitle {
  const c1 = unit(1);
  const c2 = unit(2);
  const corner = pct(5, 28);
  const end = pct(25, 28);
  const layers: FgcTitleLayer[] = [
    { id: "frame", name: "Cam frames", visible: true, locked: false, kind: "layer", parent: "" },
    ...c1.layers,
    ...c2.layers,
    { id: "strip", name: "Bottom strip", visible: true, locked: false, kind: "layer", parent: "" },
    { id: "sponsor", name: "Partner logos", visible: true, locked: false, kind: "layer", parent: "" },
  ];
  const elements: FgcTitleElement[] = [
    part("frame", { id: "cam1-frame", kind: "rect", name: "Caster 1 cam border", x: 24, y: 48, w: 924, h: 760, borderWidth: 4, borderColor: R1 }),
    part("frame", { id: "cam2-frame", kind: "rect", name: "Caster 2 cam border", x: 972, y: 48, w: 924, h: 760, borderWidth: 4, borderColor: R1 }),
    part("frame", { id: "divider", kind: "rect", name: "Cam divider", x: 957, y: 48, w: 6, h: 760, bg: R1 }),
    part("frame", { id: "cam1-corner", kind: "rect", name: "Cam 1 corner (top left)", x: 16, y: 40, w: 28, h: 28, bg: "#ffffff", clip: `polygon(0 0, 100% 0, 100% ${corner}, ${corner} ${corner}, ${corner} 100%, 0 100%)` }),
    part("frame", { id: "cam2-corner", kind: "rect", name: "Cam 2 corner (bottom right)", x: 1876, y: 788, w: 28, h: 28, bg: "#ffffff", clip: `polygon(${end} 0, 100% 0, 100% 100%, 0 100%, 0 ${end}, ${end} ${end})` }),
    ...c1.elements,
    ...c2.elements,
    part("strip", { id: "strip", kind: "rect", name: "Bottom strip", x: 0, y: 1020, w: 1920, h: 60, bg: `linear-gradient(to bottom, ${R1} ${pct(4, 60)}, ${G15} ${pct(4, 60)})` }),
    part("strip", { id: "brand-logo", kind: "rect", name: "Strip ROK logo", x: 40, y: 1032, w: 53, h: 36, src: ROK_LOGO_WHITE }),
    part("strip", text({ id: "brand-name", kind: "text", name: "Strip brand text", x: 104, y: 1024, w: 420, h: 56, text: "ROK GAMING LOUNGE", align: "left", ...oswald(20, 600, 4) })),
    // Desk sponsors only (logo + name); blank when Production has none. No built-in AMD/Red Bull/SOARDOGG cards.
    part("sponsor", text({ id: "sponsor-partners", kind: "text", name: "Partner logos", x: 1460, y: 1028, w: 420, h: 48, bind: "sponsor.name", anim: "partners", partnerLayout: "name-logo", font: "Oswald", weight: 600, size: 15, tracking: 1.5 })),
  ];
  return { id: CASTERS_REMOTE_ROK_ID, name: "Remote Casters ROK", group: "", layers, elements };
}
