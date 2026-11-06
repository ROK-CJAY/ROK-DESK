import type { FgcTitle, FgcTitleElement, FgcTitleLayer } from "@/lib/fgc-types";
import { part, pct, stripe, text, type Part } from "@/lib/fgc-scoreboard-rok";
import { FLAME_ORANGE, GUARD, OFFICIAL, ROK_MONO, S0, S1, S2, SCH } from "@/lib/fgc-ssi";

/**
 * PlayVS Sunshine State Invitational caster scenes (desk + remote), rebuilt as native FGC layers
 * from ssi/pack/casters/SSI_Casters.html and ssi/pack/casters_remote/SSI_RemoteCasters.html.
 * Names/handles: FGC commentators (caster1 / caster1.twitter, caster2 / caster2.twitter).
 */
export const CASTERS_SSI_ID = "casters-ssi";
export const CASTERS_REMOTE_SSI_ID = "casters-remote-ssi";

const LIGHT = "#f4f4f4";
const G15 = "#0F1010";
const GRAY = "#AFB4B6";
const saira = (size: number, weight: number, tracking: number) => ({ font: "Saira", weight, size, tracking });
/** Left-leaning parallelogram used by SSI caster plates and bars. */
const para = (w: number, s: number) => `polygon(${pct(s, w)} 0, 100% 0, calc(100% - ${pct(s, w)}) 100%, 0 100%)`;

function deskUnit(n: 1 | 2): { layers: FgcTitleLayer[]; elements: FgcTitleElement[] } {
  const g = `c${n}`;
  const ux = n === 1 ? 180 : 1000;
  const uy = 880;
  const parts: [string, Part][] = [
    [`${g}-bars`, { id: `${g}-bar-dark`, kind: "rect", name: `C${n} accent bar (dark)`, x: ux, y: uy + 6, w: 18, h: 76, bg: S2, clip: para(18, 8) }],
    [`${g}-bars`, { id: `${g}-bar-orange`, kind: "rect", name: `C${n} accent bar (orange)`, x: ux + 14, y: uy + 6, w: 14, h: 76, bg: S1, clip: para(14, 8) }],
    [`${g}-tag`, { id: `${g}-tag`, kind: "rect", name: `C${n} PlayVS tag`, x: ux + 30, y: uy + 8, w: 110, h: 72, bg: LIGHT, clip: para(110, 10) }],
    [`${g}-tag`, { id: `${g}-tag-rule`, kind: "rect", name: `C${n} PlayVS tag rule`, x: ux + 30, y: uy + 8 + 67, w: 110, h: 5, bg: S1, clip: para(110, 10) }],
    [`${g}-tag`, { id: `${g}-flame`, kind: "rect", name: `C${n} PlayVS flame`, x: ux + 30 + 34, y: uy + 8 + 10, w: 42, h: 52, src: FLAME_ORANGE }],
    [`${g}-name`, { id: `${g}-plate`, kind: "rect", name: `C${n} name plate`, x: ux + 128, y: uy + 8, w: 580, h: 44, bg: SCH, opacity: 0.96, clip: para(580, 12) }],
    [`${g}-name`, { id: `${g}-plate-rule`, kind: "rect", name: `C${n} name plate top rule`, x: ux + 128, y: uy + 8, w: 580, h: 2, bg: "#ffffff", opacity: 0.5, clip: para(580, 12) }],
    [`${g}-name`, text({ id: `${g}-name`, kind: "text", name: `Caster ${n} name`, x: ux + 154, y: uy + 8, w: 540, h: 44, bind: `caster${n}`, align: "left", prefixColor: S1, shadow: "2px 3px 5px rgba(0,0,0,0.55)", hideEmpty: true, ...saira(28, 700, 1) })],
    [`${g}-handle`, text({ id: `${g}-handle`, kind: "text", name: `Caster ${n} X handle`, x: ux + 120, y: uy + 54, w: 520, h: 30, bind: `caster${n}.twitter`, template: "𝕏 {}", align: "left", bg: `linear-gradient(to right, ${S0}, ${S2})`, clip: para(520, 10), hideEmpty: true, ...saira(17, 700, 3) })],
  ];
  const layers: FgcTitleLayer[] = [
    { id: g, name: `Caster ${n}`, visible: true, locked: false, kind: "group", open: true, parent: "" },
    { id: `${g}-bars`, name: `C${n} accent bars`, visible: true, locked: false, kind: "layer", parent: g },
    { id: `${g}-tag`, name: `C${n} PlayVS tag`, visible: true, locked: false, kind: "layer", parent: g },
    { id: `${g}-name`, name: `C${n} name plate`, visible: true, locked: false, kind: "layer", parent: g },
    { id: `${g}-handle`, name: `C${n} handle bar`, visible: true, locked: false, kind: "layer", parent: g },
  ];
  return { layers, elements: parts.map(([layer, p]) => part(layer, { enter: "slide", ...p })) };
}

function remoteUnit(n: 1 | 2): { layers: FgcTitleLayer[]; elements: FgcTitleElement[] } {
  const g = `c${n}`;
  const ux = n === 1 ? 40 : 980;
  const uy = 840;
  const parts: [string, Part][] = [
    [`${g}-bars`, { id: `${g}-bar-dark`, kind: "rect", name: `C${n} accent bar (dark)`, x: ux, y: uy + 8, w: 22, h: 140, bg: S2, clip: para(22, 10) }],
    [`${g}-bars`, { id: `${g}-bar-orange`, kind: "rect", name: `C${n} accent bar (orange)`, x: ux + 18, y: uy + 8, w: 18, h: 140, bg: S1, clip: para(18, 10) }],
    [`${g}-tag`, { id: `${g}-tag`, kind: "rect", name: `C${n} PlayVS tag`, x: ux + 40, y: uy + 12, w: 170, h: 112, bg: LIGHT, clip: para(170, 14) }],
    [`${g}-tag`, { id: `${g}-tag-rule`, kind: "rect", name: `C${n} PlayVS tag rule`, x: ux + 40, y: uy + 12 + 106, w: 170, h: 6, bg: S1, clip: para(170, 14) }],
    [`${g}-tag`, { id: `${g}-flame`, kind: "rect", name: `C${n} PlayVS flame`, x: ux + 40 + 54, y: uy + 12 + 17, w: 62, h: 78, src: FLAME_ORANGE }],
    [`${g}-name`, { id: `${g}-plate`, kind: "rect", name: `C${n} name plate`, x: ux + 190, y: uy + 16, w: 680, h: 72, bg: SCH, opacity: 0.96, clip: para(680, 16) }],
    [`${g}-name`, { id: `${g}-plate-rule`, kind: "rect", name: `C${n} name plate top rule`, x: ux + 190, y: uy + 16, w: 680, h: 2, bg: "#ffffff", opacity: 0.55, clip: para(680, 16) }],
    [`${g}-name`, text({ id: `${g}-name`, kind: "text", name: `Caster ${n} name`, x: ux + 226, y: uy + 16, w: 620, h: 72, bind: `caster${n}`, align: "left", prefixColor: S1, shadow: "3px 4px 6px rgba(0,0,0,0.55)", hideEmpty: true, ...saira(42, 700, 1) })],
    [`${g}-handle`, text({ id: `${g}-handle`, kind: "text", name: `Caster ${n} X handle`, x: ux + 178, y: uy + 92, w: 640, h: 40, bind: `caster${n}.twitter`, template: "𝕏 {}", align: "left", bg: `linear-gradient(to right, ${S0}, ${S2})`, clip: para(640, 14), hideEmpty: true, ...saira(22, 700, 4) })],
  ];
  const layers: FgcTitleLayer[] = [
    { id: g, name: `Caster ${n}`, visible: true, locked: false, kind: "group", open: true, parent: "" },
    { id: `${g}-bars`, name: `C${n} accent bars`, visible: true, locked: false, kind: "layer", parent: g },
    { id: `${g}-tag`, name: `C${n} PlayVS tag`, visible: true, locked: false, kind: "layer", parent: g },
    { id: `${g}-name`, name: `C${n} name plate`, visible: true, locked: false, kind: "layer", parent: g },
    { id: `${g}-handle`, name: `C${n} handle bar`, visible: true, locked: false, kind: "layer", parent: g },
  ];
  return { layers, elements: parts.map(([layer, p]) => part(layer, { enter: "slide", ...p })) };
}

/** Desk cam hole: x160 y80 1600×900. Guard top-right. Dual caster plates. */
export function castersSsiTitle(): FgcTitle {
  const c1 = deskUnit(1);
  const c2 = deskUnit(2);
  const corner = pct(5, 30);
  const end = pct(25, 30);
  const layers: FgcTitleLayer[] = [
    { id: "frame", name: "Desk cam frame", visible: true, locked: false, kind: "layer", parent: "" },
    { id: "brand", name: "Guard badge", visible: true, locked: false, kind: "layer", parent: "" },
    ...c1.layers,
    ...c2.layers,
    { id: "strip", name: "Bottom strip", visible: true, locked: false, kind: "layer", parent: "" },
  ];
  const elements: FgcTitleElement[] = [
    part("frame", { id: "cam-frame", kind: "rect", name: "Desk cam border", x: 160, y: 80, w: 1600, h: 900, borderWidth: 6, borderColor: S1 }),
    part("frame", { id: "cam-corner-a", kind: "rect", name: "Cam corner (top left)", x: 150, y: 70, w: 30, h: 30, bg: "#ffffff", clip: `polygon(0 0, 100% 0, 100% ${corner}, ${corner} ${corner}, ${corner} 100%, 0 100%)` }),
    part("frame", { id: "cam-corner-b", kind: "rect", name: "Cam corner (bottom right)", x: 1740, y: 960, w: 30, h: 30, bg: "#ffffff", clip: `polygon(${end} 0, 100% 0, 100% 100%, 0 100%, 0 ${end}, ${end} ${end})` }),
    // HTML #guard: right 6, top 6, height 135 → ~122×135 at x1792.
    part("brand", { id: "guard-badge", kind: "rect", name: "Florida Army National Guard badge", x: 1792, y: 6, w: 122, h: 135, src: GUARD }),
    ...c1.elements,
    ...c2.elements,
    part("strip", { id: "strip", kind: "rect", name: "Bottom strip", x: 0, y: 1000, w: 1920, h: 80, bg: `linear-gradient(to bottom, ${S1} ${pct(4, 80)}, ${G15} ${pct(4, 80)})` }),
    part("strip", text({ id: "game", kind: "text", name: "Game title", x: 40, y: 1008, w: 900, h: 64, text: "SUPER SMASH BROS.™ ULTIMATE", align: "left", ...saira(22, 600, 4) })),
    part("strip", text({ id: "host-label", kind: "text", name: "Host venue label", x: 1640, y: 1008, w: 126, h: 64, text: "HOST VENUE", align: "right", color: GRAY, ...saira(12, 600, 3) })),
    part("strip", { id: "host-logo", kind: "rect", name: "ROK logo", x: 1805, y: 1014, w: 56, h: 36, src: ROK_MONO }),
    part("strip", text({ id: "host-name", kind: "text", name: "ROK Gaming Lounge", x: 1778, y: 1052, w: 110, h: 14, text: "ROK Gaming Lounge", caps: false, ...saira(11, 600, 0.5) })),
  ];
  return { id: CASTERS_SSI_ID, name: "Caster Scene SSI", group: "", layers, elements };
}

/** Remote dual cams: 24,48 924×760 and 972,48 924×760. Official logo tab + Guard. */
export function castersRemoteSsiTitle(): FgcTitle {
  const c1 = remoteUnit(1);
  const c2 = remoteUnit(2);
  const corner = pct(5, 28);
  const end = pct(25, 28);
  const layers: FgcTitleLayer[] = [
    { id: "frame", name: "Cam frames", visible: true, locked: false, kind: "layer", parent: "" },
    { id: "brand", name: "Logo and Guard", visible: true, locked: false, kind: "layer", parent: "" },
    ...c1.layers,
    ...c2.layers,
    { id: "strip", name: "Bottom strip", visible: true, locked: false, kind: "layer", parent: "" },
  ];
  const elements: FgcTitleElement[] = [
    part("frame", { id: "cam1-frame", kind: "rect", name: "Caster 1 cam border", x: 24, y: 48, w: 924, h: 760, borderWidth: 4, borderColor: S1 }),
    part("frame", { id: "cam2-frame", kind: "rect", name: "Caster 2 cam border", x: 972, y: 48, w: 924, h: 760, borderWidth: 4, borderColor: S1 }),
    part("frame", { id: "divider", kind: "rect", name: "Cam divider", x: 957, y: 48, w: 6, h: 760, bg: S1 }),
    part("frame", { id: "cam1-corner", kind: "rect", name: "Cam 1 corner (top left)", x: 16, y: 40, w: 28, h: 28, bg: "#ffffff", clip: `polygon(0 0, 100% 0, 100% ${corner}, ${corner} ${corner}, ${corner} 100%, 0 100%)` }),
    part("frame", { id: "cam2-corner", kind: "rect", name: "Cam 2 corner (bottom right)", x: 1876, y: 788, w: 28, h: 28, bg: "#ffffff", clip: `polygon(${end} 0, 100% 0, 100% 100%, 0 100%, 0 ${end}, ${end} ${end})` }),
    part("brand", { id: "logo-plate", kind: "rect", name: "Event lockup plate", x: 40, y: 0, w: 200, h: 118, enter: "slide", bg: stripe(SCH, S1, 118, 4), clip: `polygon(0 0, 100% 0, calc(100% - ${pct(22, 200)}) 100%, ${pct(22, 200)} 100%)` }),
    // HTML #logo img height 100, width auto, flex-centred with margin-top 4 in the 200×118 plate.
    part("brand", { id: "logo", kind: "rect", name: "SSI official logo", x: 70, y: 11, w: 141, h: 100, src: OFFICIAL, enter: "slide" }),
    // HTML #guard: right 28, top 16, height 120 → ~108×120 at x1784.
    part("brand", { id: "guard-badge", kind: "rect", name: "Florida Army National Guard badge", x: 1784, y: 16, w: 108, h: 120, src: GUARD }),
    ...c1.elements,
    ...c2.elements,
    part("strip", { id: "strip", kind: "rect", name: "Bottom strip", x: 0, y: 1020, w: 1920, h: 60, bg: `linear-gradient(to bottom, ${S1} ${pct(4, 60)}, ${G15} ${pct(4, 60)})` }),
    part("strip", text({ id: "game", kind: "text", name: "Game title", x: 40, y: 1024, w: 900, h: 56, text: "SUPER SMASH BROS.™ ULTIMATE", align: "left", ...saira(20, 600, 4) })),
    part("strip", text({ id: "host-label", kind: "text", name: "Host venue label", x: 1640, y: 1024, w: 126, h: 56, text: "HOST VENUE", align: "right", color: GRAY, ...saira(12, 600, 3) })),
    part("strip", { id: "host-logo", kind: "rect", name: "ROK logo", x: 1805, y: 1028, w: 56, h: 34, src: ROK_MONO }),
    part("strip", text({ id: "host-name", kind: "text", name: "ROK Gaming Lounge", x: 1778, y: 1064, w: 110, h: 14, text: "ROK Gaming Lounge", caps: false, ...saira(11, 600, 0.5) })),
  ];
  return { id: CASTERS_REMOTE_SSI_ID, name: "Remote Casters SSI", group: "", layers, elements };
}
