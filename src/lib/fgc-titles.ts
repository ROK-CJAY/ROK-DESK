import { libraryFor, playerLabel, streamSetOf, type FgcOverlayId, type FgcSet, type FgcState, type FgcTitle, type FgcTitleElement } from "@/lib/fgc-types";

export type { FgcOverlayId, FgcTitle, FgcTitleElement };

export const FGC_OVERLAYS: { id: FgcOverlayId; name: string; note: string }[] = [
  { id: "hud", name: "Scoreboard HUD", note: "Names, characters, and score along the bottom." },
  { id: "versus", name: "Versus", note: "Full-frame match intro." },
  { id: "casters", name: "Commentators", note: "Plates for the commentators on the desk." },
  { id: "lower", name: "Lower third", note: "Event, players, and round in one bar." },
  { id: "winner", name: "Winner", note: "The player who is ahead." },
  { id: "custom", name: "Custom layout", note: "The layout you built in the designer." },
];

export const TITLE_BINDS = [
  { id: "", label: "Static text" },
  { id: "p1.name", label: "Player 1" },
  { id: "p2.name", label: "Player 2" },
  { id: "p1.score", label: "P1 score" },
  { id: "p2.score", label: "P2 score" },
  { id: "score", label: "Score" },
  { id: "p1.character", label: "P1 character" },
  { id: "p2.character", label: "P2 character" },
  { id: "p1.sponsor", label: "P1 sponsor" },
  { id: "p2.sponsor", label: "P2 sponsor" },
  { id: "p1.realName", label: "P1 real name" },
  { id: "p2.realName", label: "P2 real name" },
  { id: "p1.flag", label: "P1 flag" },
  { id: "p2.flag", label: "P2 flag" },
  { id: "p1.region", label: "P1 state" },
  { id: "p2.region", label: "P2 state" },
  { id: "p1.twitter", label: "P1 Twitter" },
  { id: "p2.twitter", label: "P2 Twitter" },
  { id: "round", label: "Round" },
  { id: "phase", label: "Phase" },
  { id: "stage", label: "Stage" },
  { id: "bestOf", label: "Best of" },
  { id: "event.name", label: "Event" },
  { id: "event.tournament", label: "Tournament" },
  { id: "event.game", label: "Game" },
  { id: "caster1", label: "Commentator 1" },
  { id: "caster2", label: "Commentator 2" },
  { id: "caster3", label: "Commentator 3" },
  { id: "caster4", label: "Commentator 4" },
  { id: "event.icon", label: "Event icon" },
  { id: "p1.icon", label: "P1 character icon" },
  { id: "p2.icon", label: "P2 character icon" },
];

export function blankElement(kind: FgcTitleElement["kind"]): FgcTitleElement {
  return {
    id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    kind,
    x: 120,
    y: 120,
    w: kind === "text" ? 480 : 240,
    h: kind === "text" ? 80 : 140,
    bind: kind === "text" ? "p1.name" : kind === "image" ? "event.icon" : "",
    text: kind === "text" ? "Text" : "",
    color: "#ffffff",
    bg: kind === "rect" ? "#111111" : "transparent",
    size: 42,
    align: "left",
    src: "",
  };
}

export function starterTitle(): FgcTitle {
  return {
    id: "scorebug",
    name: "Scorebug",
    elements: [
      { ...blankElement("rect"), id: "bar", x: 80, y: 900, w: 1760, h: 120, bg: "#111111" },
      { ...blankElement("text"), id: "p1", x: 110, y: 918, w: 620, h: 84, bind: "p1.name", align: "left", size: 46 },
      { ...blankElement("text"), id: "score", x: 760, y: 918, w: 400, h: 84, bind: "score", align: "center", size: 46 },
      { ...blankElement("text"), id: "p2", x: 1190, y: 918, w: 620, h: 84, bind: "p2.name", align: "right", size: 46 },
    ],
  };
}

function casterName(fgc: FgcState, index: number): string {
  const caster = fgc.casters[index];
  if (!caster?.name) return "";
  return [caster.prefix, caster.name].filter(Boolean).join(" | ");
}

export function titleText(fgc: FgcState, set: FgcSet | null, bind: string, fallback: string): string {
  const p1 = set?.p1;
  const p2 = set?.p2;
  const value: Record<string, string> = {
    "p1.name": playerLabel(p1 ?? null),
    "p2.name": playerLabel(p2 ?? null),
    "p1.score": String(set?.score1 ?? 0),
    "p2.score": String(set?.score2 ?? 0),
    score: set ? `${set.score1} – ${set.score2}` : "VS",
    "p1.character": p1?.character || "",
    "p2.character": p2?.character || "",
    "p1.sponsor": p1?.prefix || "",
    "p2.sponsor": p2?.prefix || "",
    "p1.realName": p1?.realName || "",
    "p2.realName": p2?.realName || "",
    "p1.flag": p1?.flag || "",
    "p2.flag": p2?.flag || "",
    "p1.region": p1?.region || "",
    "p2.region": p2?.region || "",
    "p1.twitter": p1?.twitter ? `@${p1.twitter}` : "",
    "p2.twitter": p2?.twitter ? `@${p2.twitter}` : "",
    round: set?.round || "",
    phase: set?.phase || "",
    stage: set?.stage || "",
    bestOf: set?.bestOf ? `Bo${set.bestOf}` : "",
    "event.name": fgc.event?.name || "",
    "event.tournament": fgc.event?.tournamentName || "",
    "event.game": fgc.event?.game || "",
    caster1: casterName(fgc, 0),
    caster2: casterName(fgc, 1),
    caster3: casterName(fgc, 2),
    caster4: casterName(fgc, 3),
  };
  if (!bind) return fallback;
  return value[bind] ?? fallback;
}

export function titleImage(fgc: FgcState, set: FgcSet | null, element: FgcTitleElement): string {
  if (element.bind === "event.icon") return fgc.event?.icon || "";
  const library = libraryFor(fgc);
  const name = element.bind === "p1.icon" ? set?.p1?.character : element.bind === "p2.icon" ? set?.p2?.character : "";
  if (name && library) return library.characters.find((item) => item.name === name)?.icon || "";
  return element.src;
}

export function activeTitle(fgc: FgcState): FgcTitle {
  return fgc.titles.find((item) => item.id === fgc.activeTitleId) ?? fgc.titles[0] ?? starterTitle();
}

export function liveSet(fgc: FgcState): FgcSet | null {
  return streamSetOf(fgc) ?? fgc.sets[0] ?? null;
}

export function overlayHref(id: FgcOverlayId): string {
  return id === "hud" ? "/fgc/overlay/hud" : `/fgc/overlay/hud?source=${id}`;
}
