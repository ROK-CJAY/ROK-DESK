import type { FgcTitle, FgcTitleElement, FgcTitleLayer } from "@/lib/fgc-titles";
import { CH, R0, R1, R2, anton, oswald, part, pct, text, type Part } from "@/lib/fgc-scoreboard-rok";

/**
 * Built-in FGC layout: ROK dual-commentator lower third ("Commentators ROK"), rebuilt as editable layers
 * from rok/smash_v2/lower_third/dual/build.py (render(f) at 60 fps). Two units at 0.86 scale, left unit at
 * x60-920 and right unit at x1000-1860, right unit 8 frames behind. In-transition (0-54f), then it holds and
 * the Production partners rotate (same sponsorSeconds and index as Scoreboard ROK, so both units stay in sync).
 * Names/handles: FGC commentators 1 and 2 (caster1 / caster1.twitter, caster2 / caster2.twitter), blank when empty.
 */
export const COMMENTATORS_ROK_ID = "commentators-rok";

export const LIGHT = "#f4f4f4";
export const ROK_LOGO_COLOR = "/overlays/commentators-rok/rok-logo.png";

const SC = 0.86;
const TA = Math.tan((22 * Math.PI) / 180); // 22 deg brand slant: x moves left as y goes down
const STAGGER = 8;
const r1 = (v: number) => Math.round(v * 10) / 10;

/** build.py place(): native unit (x70..1070) to the 1920 stage, scaled 0.86 about y890. */
function unitMap(ux: number) {
  const X = (x: number) => r1(ux + (x - 70) * SC);
  const Y = (y: number) => r1(890 + (y - 890) * SC);
  /** pc(x0,x1,y0,y1,ref): parallelogram whose edges pass x0/x1 at row `ref`, as box + clip polygon. */
  const pc = (x0: number, x1: number, y0: number, y1: number, ref = (y0 + y1) / 2) => {
    const top = Y(y0);
    const bottom = Y(y1);
    const r = Y(ref);
    const left = X(x0) - (bottom - r) * TA;
    const right = X(x1) + (r - top) * TA;
    const w = right - left;
    const tl = X(x0) + (r - top) * TA - left;
    const br = X(x1) - (bottom - r) * TA - left;
    return { x: r1(left), y: top, w: r1(w), h: r1(bottom - top), clip: `polygon(${pct(tl, w)} 0, 100% 0, ${pct(br, w)} 100%, 0 100%)` };
  };
  /** wipe(f,a,b,x0,x1,cy): lead edge from x0-120 to x1+140, eased in-out quart. */
  const wipe = (a: number, b: number, x0: number, x1: number, cy: number, d: number): [number, number, number, number, number] => [a + d, b + d, X(x0 - 120), X(x1 + 140), Y(cy)];
  return { X, Y, pc, wipe };
}

function unit(n: 1 | 2): { layers: FgcTitleLayer[]; elements: FgcTitleElement[] } {
  const g = `c${n}`;
  const d = n === 1 ? 0 : STAGGER;
  const { X, Y, pc, wipe } = unitMap(n === 1 ? 60 : 1860 - 1000 * SC);
  const f = (a: number, b: number): [number, number] => [a + d, b + d];
  const darkWipe = wipe(14, 34, 330, 1070, 862, d);
  const parts: [string, Part][] = [
    // Left accent bars (dark red, then red), first in.
    [`${g}-bars`, { id: `${g}-bar-dark`, kind: "rect", name: `C${n} accent bar (dark)`, ...pc(70, 104, 812, 968, 890), bg: R2, motion: { wipe: wipe(0, 14, 70, 112, 890, d) } }],
    [`${g}-bars`, { id: `${g}-bar-red`, kind: "rect", name: `C${n} accent bar (red)`, ...pc(96, 112, 812, 968, 890), bg: R1, motion: { wipe: wipe(0, 14, 70, 112, 890, d) } }],
    // Name plate: charcoal bar with a soft white top rule.
    [`${g}-name`, { id: `${g}-plate`, kind: "rect", name: `C${n} name plate`, ...pc(330, 1070, 820, 904, 862), bg: CH, opacity: 0.96, motion: { wipe: darkWipe } }],
    [`${g}-name`, { id: `${g}-plate-rule`, kind: "rect", name: `C${n} name plate top rule`, ...pc(330, 1070, 820, 823, 862), bg: "#ffffff", opacity: 0.7, motion: { wipe: darkWipe } }],
    [`${g}-name`, text({ id: `${g}-name`, kind: "text", name: `Commentator ${n} name`, x: X(384), y: Y(820), w: r1(332 * SC), h: r1(84 * SC), bind: `caster${n}`, align: "left", prefixColor: R1, shadow: "3px 4px 6px rgba(0,0,0,0.6)", ...anton(r1(80 * SC), r1(1 * SC)), motion: { wipe: wipe(22, 44, 300, 560, 862, d), shift: [22 + d, 44 + d, r1(36 * SC)] } })],
    // Handle bar: red with a darker right end (RD2 at 60% over 600px).
    [`${g}-handle`, { id: `${g}-handle-bar`, kind: "rect", name: `C${n} handle bar`, ...pc(318, 1020, 906, 950, 928), bg: `linear-gradient(to right, ${R0} ${r1(22 * SC * TA)}px, #a41010 ${r1(22 * SC * TA + 600 * SC)}px)`, motion: { wipe: wipe(20, 40, 318, 1020, 928, d) } }],
    [`${g}-handle`, text({ id: `${g}-handle`, kind: "text", name: `Commentator ${n} X handle`, x: X(372), y: Y(906), w: r1(600 * SC), h: r1(44 * SC), bind: `caster${n}.twitter`, template: "𝕏 {}", align: "left", ...oswald(r1(32 * SC), 700, r1(7 * SC)), motion: { wipe: wipe(30, 50, 318, 760, 928, d), shift: [30 + d, 50 + d, r1(30 * SC)] } })],
    // Light logo tag on top, red rule along its foot, colour ROK logo popping in.
    [`${g}-tag`, { id: `${g}-tag`, kind: "rect", name: `C${n} logo tag`, ...pc(112, 350, 816, 944, 880), bg: LIGHT, motion: { wipe: wipe(6, 24, 112, 350, 880, d) } }],
    [`${g}-tag`, { id: `${g}-tag-rule`, kind: "rect", name: `C${n} logo tag rule`, ...pc(112, 350, 938, 944, 880), bg: R1, motion: { wipe: wipe(6, 24, 112, 350, 880, d) } }],
    [`${g}-tag`, { id: `${g}-logo`, kind: "rect", name: `C${n} ROK logo`, x: r1(X(236) - 79 * SC), y: r1(Y(880) - 53.5 * SC), w: r1(158 * SC), h: r1(107 * SC), src: ROK_LOGO_COLOR, motion: { fade: f(16, 22), pop: f(16, 34) } }],
    // One glint across tag and plate at 2s (frames 120-160).
    [`${g}-tag`, { id: `${g}-glint-tag`, kind: "rect", name: `C${n} glint (tag)`, ...pc(112, 350, 816, 944, 880), motion: { sweep: [120 + d, 160 + d, X(150), X(960), Y(880), r1(30 * SC), 0.45] } }],
    [`${g}-name`, { id: `${g}-glint-plate`, kind: "rect", name: `C${n} glint (plate)`, ...pc(330, 1070, 820, 904, 862), motion: { sweep: [120 + d, 160 + d, X(150), X(960), Y(880), r1(30 * SC), 0.27] } }],
    // Partners: red divider, then the rotating Production partners (logo over label), synced across both units.
    [`${g}-partners`, { id: `${g}-divider`, kind: "rect", name: `C${n} partner divider`, ...pc(732, 736, 836, 888, 862), bg: R1, motion: { wipe: darkWipe, fade: f(40, 54) } }],
    [`${g}-partners`, text({ id: `${g}-partners`, kind: "text", name: `C${n} partners`, x: X(744), y: Y(820), w: r1(308 * SC), h: r1(84 * SC), bind: "sponsor.name", anim: "partners", partnerLayout: "stack", ...oswald(r1(16 * SC), 600, 1.5), color: "#ebebeb", motion: { wipe: darkWipe, fade: f(40, 54) } })],
  ];
  const layers: FgcTitleLayer[] = [
    { id: g, name: `Commentator ${n}`, visible: true, locked: false, kind: "group", open: true, parent: "" },
    { id: `${g}-bars`, name: `C${n} accent bars`, visible: true, locked: false, kind: "layer", parent: g },
    { id: `${g}-name`, name: `C${n} name plate`, visible: true, locked: false, kind: "layer", parent: g },
    { id: `${g}-handle`, name: `C${n} handle bar`, visible: true, locked: false, kind: "layer", parent: g },
    { id: `${g}-tag`, name: `C${n} logo tag`, visible: true, locked: false, kind: "layer", parent: g },
    { id: `${g}-partners`, name: `C${n} partners`, visible: true, locked: false, kind: "layer", parent: g },
  ];
  return { layers, elements: parts.map(([layer, p]) => part(layer, p)) };
}

export function commentatorsRokTitle(): FgcTitle {
  const c1 = unit(1);
  const c2 = unit(2);
  return { id: COMMENTATORS_ROK_ID, name: "Commentators ROK", group: "", layers: [...c1.layers, ...c2.layers], elements: [...c1.elements, ...c2.elements] };
}
