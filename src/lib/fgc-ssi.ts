import type { FgcPartnerCard, FgcTitle, FgcTitleElement } from "@/lib/fgc-types";
import { CH, R0, R1, R2, TOKEN, part, pct, scoreboardRokTitle, stripe, text } from "@/lib/fgc-scoreboard-rok";
import { versusRokTitle } from "@/lib/fgc-versus-rok";

/**
 * PlayVS "Sunshine State Invitational" (Smash), presented by the Florida Army National Guard, ROK host venue.
 * SSI variants of Scoreboard ROK and Versus ROK: same layers, bindings, pips, flags and partners,
 * restyled from ssi/pack/scoreboard/SSI_Gameplay_Scoreboard.html and ssi/pack/versus/SSI_Versus_SplitCam.html.
 */
export const SCOREBOARD_SSI_ID = "scoreboard-ssi";
export const VERSUS_SSI_ID = "versus-ssi";

export const S0 = "#FF5500";
export const S1 = "#FF5500";
export const S2 = "#D14600";
export const SCH = "#1F2223";
const DIR = "/overlays/ssi";
export const FLAME_WHITE = `${DIR}/playvs_flame_white.png`;
export const FLAME_ORANGE = `${DIR}/playvs_flame_orange.png`;
export const PLAYVS_H = `${DIR}/playvs_h_primary_white.png`;
export const ROK_MONO = `${DIR}/rok_logo_mono_white.png`;
export const GUARD = `${DIR}/flarng_badge.png`;
export const LOCKUP = `${DIR}/ssi_event_lockup.png`;
export const OFFICIAL = `${DIR}/SSI_official_logo.png`;

export const SSI_PARTNER_CARDS: FgcPartnerCard[] = [
  { id: "ssi-host", label: "Host\nvenue", logo: ROK_MONO, logoH: 30, name: "ROK Gaming Lounge", font: "Saira" },
  { id: "ssi-presented", label: "Presented\nby", logo: GUARD, logoH: 42, font: "Saira" },
  { id: "ssi-playvs", logo: PLAYVS_H, logoH: 24, logoW: 200 },
];

const COLORS: [string, string][] = [[R0, S0], [R1, S1], [R2, S2], [CH, SCH]];
const recolor = (value: string) => COLORS.reduce((out, [a, b]) => out.split(a).join(b), value);

/** ROK -> SSI: colours, PlayVS flame for the ROK token, Saira names/round, Orbitron scores, Manrope chips. */
function restyle(element: FgcTitleElement, sizes: { name: number; round: number; score: number }): FgcTitleElement {
  const out: FgcTitleElement = { ...element, bg: recolor(element.bg), color: recolor(element.color) };
  if (out.borderColor) out.borderColor = recolor(out.borderColor);
  if (out.prefixColor) out.prefixColor = recolor(out.prefixColor);
  if (out.src === TOKEN) out.src = FLAME_WHITE;
  if (out.font === "Oswald") out.font = "Manrope";
  if (out.font === "Anton") Object.assign(out, { font: "Saira", weight: 700 });
  if (/^p[12]-name$/.test(out.id)) out.size = sizes.name;
  if (out.id === "round") out.size = sizes.round;
  if (/^p[12]-score$/.test(out.id)) Object.assign(out, { font: "Orbitron", weight: 900, size: sizes.score, tracking: 0 });
  if (out.pips) out.color = S1;
  return out;
}

export function scoreboardSsiTitle(): FgcTitle {
  const rok = scoreboardRokTitle();
  const drop = new Set(["sponsor-plate", "sponsor-key", "sponsor-token", "sponsor-partners", "logo"]);
  const elements = rok.elements.filter((e) => !drop.has(e.id)).map((e) => restyle(e, { name: 26, round: 24, score: 32 }));
  const at = elements.findIndex((e) => e.id === "logo-plate") + 1;
  elements.splice(at, 0, part("center", { id: "logo", kind: "rect", name: "PlayVS flame", x: 946, y: 47, w: 28, h: 34, src: FLAME_ORANGE, enter: "slide" }));
  elements.push(
    part("sponsor", { id: "sponsor-plate", kind: "rect", name: "Partner slot", x: 24, y: 802, w: 344, h: 48, bg: stripe(SCH, S1, 48) }),
    part("sponsor", { id: "sponsor-key", kind: "rect", name: "Partner key", x: 24, y: 802, w: 41, h: 45, bg: S1 }),
    part("sponsor", { id: "sponsor-token", kind: "rect", name: "Partner key flame", x: 34, y: 811, w: 21, h: 26, src: FLAME_WHITE }),
    // Built-in cards (host venue ROK, presented by the Guard, PlayVS), then the Production partners; .8s crossfade every sponsorSeconds.
    part("sponsor", text({ id: "sponsor-partners", kind: "text", name: "Partner cards and sponsors", x: 65, y: 802, w: 303, h: 45, bind: "sponsor.name", anim: "partners", partnerCards: SSI_PARTNER_CARDS, font: "Manrope", weight: 600, size: 13, tracking: 1 })),
  );
  const layers = rok.layers.map((l) => (l.id === "center" ? { ...l, name: "PlayVS logo" } : l.id === "sponsor" ? { ...l, name: "Partner slot" } : l));
  return { id: SCOREBOARD_SSI_ID, name: "Scoreboard SSI · index", group: "", layers, elements };
}

export function versusSsiTitle(): FgcTitle {
  const rok = versusRokTitle();
  const drop = new Set(["logo-plate", "logo", "strip", "strip-left", "strip-token", "sponsor-key", "sponsor-partners"]);
  const base = rok.elements.filter((e) => !drop.has(e.id)).map((e) => restyle(e, { name: 30, round: 26, score: 36 }));
  // Source divider stops at the round plate (y504); the plate and window keep the Versus ROK positions.
  // HTML #ph is at y908 so the Guard badge under the window (y930) stays clear.
  const elements = base.map((e) => {
    if (e.id === "divider-top") return { ...e, h: 386 };
    if (e.id === "phase") return { ...e, y: 908 };
    return e;
  });
  const at = elements.findIndex((e) => e.id === "game-corner-b") + 1;
  elements.splice(at, 0,
    part("center", { id: "logo-plate", kind: "rect", name: "Event lockup plate", x: 870, y: 0, w: 180, h: 118, enter: "slide", bg: stripe(SCH, S1, 118, 4), clip: `polygon(0 0, 100% 0, calc(100% - ${pct(22, 180)}) 100%, ${pct(22, 180)} 100%)` }),
    // Official PlayVS SSI logo: HTML #logo img is height 96, width auto, flex-centered with margin-top 4 in the 180×118 plate.
    part("center", { id: "logo", kind: "rect", name: "SSI official logo", x: 892, y: 13, w: 135, h: 96, src: OFFICIAL, enter: "slide" }),
    // HTML #guard: left 960 + translateX(-50%), top 930, height 80 → 72×80 box at x924 (badge asset 431×479).
    part("frame", { id: "guard-badge", kind: "rect", name: "Florida Army National Guard badge", x: 924, y: 930, w: 72, h: 80, src: GUARD }),
  );
  const strip = [
    part("strip", { id: "strip", kind: "rect", name: "Bottom strip", x: 0, y: 1020, w: 1920, h: 60, bg: `linear-gradient(to bottom, ${S1} ${pct(4, 60)}, #0F1010 ${pct(4, 60)})` }),
    part("strip", text({ id: "strip-left", kind: "text", name: "Strip text", x: 40, y: 1024, w: 560, h: 56, text: "SUNSHINE STATE INVITATIONAL", align: "left", font: "Saira", weight: 600, size: 20, tracking: 4 })),
    part("strip", text({ id: "host-label", kind: "text", name: "Host venue label", x: 1640, y: 1024, w: 126, h: 56, text: "HOST VENUE", align: "right", color: "#AFB4B6", font: "Saira", weight: 600, size: 12, tracking: 3 })),
    part("strip", { id: "host-logo", kind: "rect", name: "ROK logo", x: 1805, y: 1027, w: 56, h: 38, src: ROK_MONO }),
    part("strip", text({ id: "host-name", kind: "text", name: "ROK Gaming Lounge", x: 1778, y: 1065, w: 110, h: 14, text: "ROK Gaming Lounge", caps: false, font: "Saira", weight: 600, size: 12, tracking: 0.5 })),
  ];
  // Gray sponsor plate: no PRESENTED BY / small Guard. Desk sponsors still rotate when present (centred on x960).
  const sponsor = [
    part("sponsor", text({ id: "sponsor-partners", kind: "text", name: "Sponsor partners", x: 826, y: 1024, w: 406, h: 52, bind: "sponsor.name", anim: "partners", partnerSplit: 134, partnerGap: 14, font: "Manrope", weight: 600, size: 16, tracking: 1.5 })),
  ];
  const plate = elements.findIndex((e) => e.id === "sponsor-plate");
  elements.splice(plate, 0, ...strip);
  elements.push(...sponsor);
  const layers = rok.layers.map((l) => (l.id === "center" ? { ...l, name: "SSI official logo" } : l));
  return { id: VERSUS_SSI_ID, name: "Versus SSI", group: "", layers, elements };
}
