import type { FgcTitle, FgcTitleElement, FgcTitleLayer } from "@/lib/fgc-titles";
import { CH, LOGO, R0, R1, R2, TOKEN, anton, oswald, part, pct, slantL, slantR, stripe, text, type Part } from "@/lib/fgc-scoreboard-rok";

/**
 * Built-in FGC layout: ROK H2H split cam ("Versus ROK"), rebuilt as editable layers from
 * rok/h2h/cams_v2/ROK_H2H_SplitCam.html. Same bindings, fallbacks, pips and partners as Scoreboard ROK.
 * Transparent holes: P1 cam 0,0 957x1020 | P2 cam 963,0 957x1020 | gameplay 640,554 640x360.
 */
export const VERSUS_ROK_ID = "versus-rok";

function side(n: 1 | 2): { layers: FgcTitleLayer[]; elements: FgcTitleElement[] } {
  const g = `p${n}`;
  const left = n === 1;
  const shape = left ? slantL : slantR;
  const mx = (x: number, w: number) => (left ? x : 1920 - x - w); // P2 mirrors P1 about x=960
  const chip = (id: string, name: string, x: number, w: number, bind: string, bg: string, template = ""): Part =>
    text({ id: `${g}-${id}`, kind: "text", name, x: mx(x, w), y: 928, w, h: 24, bind, bg, clip: shape(w, 8), hideEmpty: true, template, ...oswald(14, 700, 1.5) });
  const parts: [string, Part][] = [
    [`${g}-chips`, chip("handle", `P${n} X chip`, 112, 170, `p${n}.twitter`, R1, "𝕏 {}")],
    [`${g}-chips`, chip("seed", `P${n} seed chip`, 285, 86, `p${n}.seed`, CH, "Seed {}")],
    [`${g}-chips`, chip("country", `P${n} state chip`, 374, 100, `p${n}.region`, CH)],
    [`${g}-token`, { id: `${g}-token-well`, kind: "rect", name: `P${n} character token well`, x: mx(24, 78), y: 956, w: 78, h: 52, bg: `linear-gradient(${left ? 90 : 270}deg, ${R2} 0 55%, ${R1} 55%)`, clip: shape(78, 17) }],
    [`${g}-token`, { id: `${g}-character`, kind: "rect", name: `P${n} character`, x: mx(24, 78), y: 956, w: 78, h: 52, bind: `p${n}.skin`, src: TOKEN, clip: shape(78, 17), fit: "cover", focus: "50% 22%", fallbackPad: [10, 14] }],
    [`${g}-card`, { id: `${g}-card`, kind: "rect", name: `P${n} card`, x: mx(106, 430), y: 956, w: 430, h: 52, bg: stripe(CH, R1, 52), clip: shape(430, 17) }],
    [`${g}-card`, text({ id: `${g}-name`, kind: "text", name: `P${n} name`, x: mx(136, 370), y: 956, w: 370, h: 50, bind: `p${n}.sponsorName`, prefixColor: R1, ...anton(30) })],
    [`${g}-score`, text({ id: `${g}-score`, kind: "text", name: `P${n} score`, x: mx(540, 80), y: 956, w: 80, h: 52, bind: `p${n}.score`, bg: stripe(R0, R2, 52), clip: shape(80, 17), anim: "pulse", ...anton(36, 0) })],
    [`${g}-pips`, { id: `${g}-pips`, kind: "text", name: `P${n} games-won pips`, x: mx(500, 120), y: 1010, w: 120, h: 8, pips: g as "p1" | "p2", anim: "pulse", color: "#ffffff" }],
  ];
  const layers: FgcTitleLayer[] = [
    { id: g, name: `Player ${n}`, visible: true, locked: false, kind: "group", open: true, parent: "" },
    { id: `${g}-chips`, name: `P${n} chips`, visible: true, locked: false, kind: "layer", parent: g },
    { id: `${g}-token`, name: `P${n} character token`, visible: true, locked: false, kind: "layer", parent: g },
    { id: `${g}-card`, name: `P${n} card`, visible: true, locked: false, kind: "layer", parent: g },
    { id: `${g}-score`, name: `P${n} score`, visible: true, locked: false, kind: "layer", parent: g },
    { id: `${g}-pips`, name: `P${n} games-won pips`, visible: true, locked: false, kind: "layer", parent: g },
  ];
  return { layers, elements: parts.map(([layer, p]) => part(layer, { enter: "slide", ...p })) };
}

export function versusRokTitle(): FgcTitle {
  const p1 = side(1);
  const p2 = side(2);
  const corner = pct(5, 30);
  const end = pct(25, 30);
  const layers: FgcTitleLayer[] = [
    { id: "frame", name: "Dividers and gameplay window", visible: true, locked: false, kind: "layer", parent: "" },
    { id: "center", name: "ROK logo", visible: true, locked: false, kind: "layer", parent: "" },
    { id: "round", name: "Round and phase", visible: true, locked: false, kind: "layer", parent: "" },
    ...p1.layers,
    ...p2.layers,
    { id: "strip", name: "Bottom strip", visible: true, locked: false, kind: "layer", parent: "" },
    { id: "sponsor", name: "Sponsor box", visible: true, locked: false, kind: "layer", parent: "" },
  ];
  const elements: FgcTitleElement[] = [
    part("frame", { id: "divider-top", kind: "rect", name: "Divider (logo to window)", x: 957, y: 118, w: 6, h: 430, bg: R1 }),
    part("frame", { id: "divider-bottom", kind: "rect", name: "Divider (window to strip)", x: 957, y: 920, w: 6, h: 100, bg: R1 }),
    part("frame", { id: "game-window", kind: "rect", name: "Gameplay window border", x: 634, y: 548, w: 652, h: 372, borderWidth: 6, borderColor: R1 }),
    part("frame", { id: "game-corner-a", kind: "rect", name: "Window corner (top left)", x: 624, y: 538, w: 30, h: 30, bg: "#ffffff", clip: `polygon(0 0, 100% 0, 100% ${corner}, ${corner} ${corner}, ${corner} 100%, 0 100%)` }),
    part("frame", { id: "game-corner-b", kind: "rect", name: "Window corner (bottom right)", x: 1266, y: 900, w: 30, h: 30, bg: "#ffffff", clip: `polygon(${end} 0, 100% 0, 100% 100%, 0 100%, 0 ${end}, ${end} ${end})` }),
    part("center", { id: "logo-plate", kind: "rect", name: "ROK logo plate", x: 880, y: 0, w: 160, h: 118, enter: "slide", bg: stripe(CH, R1, 118, 4), clip: `polygon(0 0, 100% 0, calc(100% - ${pct(22, 160)}) 100%, ${pct(22, 160)} 100%)` }),
    part("center", { id: "logo", kind: "rect", name: "ROK logo", x: 908, y: 20, w: 104, h: 70, src: LOGO, enter: "slide" }),
    part("round", text({ id: "round", kind: "text", name: "Round", x: 700, y: 504, w: 520, h: 44, bind: "round", bg: stripe(CH, R1, 44), clip: `polygon(0 0, 100% 0, calc(100% - ${pct(14, 520)}) 100%, ${pct(14, 520)} 100%)`, hideEmpty: true, enter: "slide", ...anton(26) })),
    part("round", text({ id: "phase", kind: "text", name: "Phase chip", x: 880, y: 932, w: 160, h: 24, bind: "phase", bg: R2, clip: `polygon(${pct(8, 160)} 0, calc(100% - ${pct(8, 160)}) 0, 100% 100%, 0 100%)`, hideEmpty: true, enter: "slide", ...oswald(14, 700, 2) })),
    ...p1.elements,
    ...p2.elements,
    part("strip", { id: "strip", kind: "rect", name: "Bottom strip", x: 0, y: 1020, w: 1920, h: 60, bg: `linear-gradient(to bottom, ${R1} 0, ${R0} 60%, ${R2} 100%)` }),
    part("strip", text({ id: "strip-left", kind: "text", name: "Strip text", x: 40, y: 1020, w: 400, h: 60, text: "ROK GAMING LOUNGE", align: "left", color: "rgba(255,255,255,0.85)", ...anton(20, 4) })),
    part("strip", { id: "strip-token", kind: "rect", name: "Strip token", x: 1844, y: 1031, w: 36, h: 38, src: TOKEN, opacity: 0.85 }),
    part("sponsor", { id: "sponsor-plate", kind: "rect", name: "Sponsor box", x: 660, y: 1024, w: 600, h: 52, bg: CH, clip: `polygon(${pct(20, 600)} 0, calc(100% - ${pct(20, 600)}) 0, 100% 100%, 0 100%)` }),
    part("sponsor", text({ id: "sponsor-key", kind: "text", name: "Partners label", x: 700, y: 1024, w: 110, h: 52, text: "PARTNERS", align: "left", color: R1, ...anton(18, 3) })),
    // Partners: logo and ad text rotate together, .8s crossfade every sponsorSeconds (same as Scoreboard ROK).
    part("sponsor", text({ id: "sponsor-partners", kind: "text", name: "Sponsor partners", x: 810, y: 1024, w: 420, h: 52, bind: "sponsor.name", anim: "partners", ...oswald(16, 600, 1.5) })),
  ];
  return { id: VERSUS_ROK_ID, name: "Versus ROK", group: "", layers, elements };
}
