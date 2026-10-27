import { resolvePreview, titleImageObjectUrl } from "@/lib/fgc-assets";
import { libraryFor, playerLabel, streamSetOf, type FgcOverlayId, type FgcSet, type FgcState, type FgcTitle, type FgcTitleElement, type FgcTitleLayer } from "@/lib/fgc-types";

export function tshLayoutHref(file: string) {
  return `/tsh/layout/${file.replace(/^\/+/, "")}`;
}

export type { FgcOverlayId, FgcTitle, FgcTitleElement, FgcTitleLayer };

export const TITLE_GROUPS = ["In game", "Versus", "People", "Bracket", "Desk"] as const;

export const FGC_OVERLAYS: { id: FgcOverlayId; name: string; note: string; group: string }[] = [
  { id: "hud", group: "In game", name: "Scoreboard", note: "In-game names, characters, and score along the bottom." },
  { id: "scoreboard-simple", group: "In game", name: "Scoreboard simple", note: "A thinner bottom scoreboard." },
  { id: "scoreboard-topleft", group: "In game", name: "Scoreboard top left", note: "Compact scoreboard in the top left." },
  { id: "scoreboard-4by3", group: "In game", name: "Scoreboard 4:3", note: "Scoreboard kept inside a 4:3 frame." },
  { id: "scoreboard-ultimate", group: "In game", name: "Scoreboard · Ultimate", note: "Smash Bros. Ultimate. Tag, losers, seed, state, flag, Twitter, pronouns, character, and camera wells." },
  { id: "versus", group: "Versus", name: "Versus", note: "Match intro. Smash, Tekken, or Pokkén is picked from the game." },
  { id: "versus-tekken", group: "Versus", name: "Versus · Tekken", note: "Tekken versus screen." },
  { id: "versus-pokken", group: "Versus", name: "Versus · Pokkén", note: "Pokkén versus screen." },
  { id: "casters", group: "People", name: "Commentators", note: "Plates for the commentators on the desk." },
  { id: "player-list", group: "People", name: "Player list", note: "Everyone in the imported bracket." },
  { id: "character-gallery", group: "People", name: "Character gallery", note: "The downloaded character roster." },
  { id: "character-line", group: "People", name: "Character line", note: "The characters in the live set, in a row." },
  { id: "bracket", group: "Bracket", name: "Bracket", note: "Sets by round." },
  { id: "bracket-ultimate", group: "Bracket", name: "Bracket · Ultimate", note: "Winners on top, losers underneath." },
  { id: "top-8", group: "Bracket", name: "Top 8", note: "The eight players with the most wins." },
  { id: "top-n", group: "Bracket", name: "Top list", note: "A longer standings list." },
  { id: "last-sets", group: "Bracket", name: "Last sets", note: "The latest finished sets." },
  { id: "recent-sets", group: "Bracket", name: "Recent sets", note: "A longer list of finished sets." },
  { id: "tournament-history", group: "Bracket", name: "Tournament history", note: "Event, phases, and how many sets are done." },
  { id: "stage-strike", group: "Desk", name: "Stage strike", note: "Neutrals, counterpicks, and the stage in play." },
  { id: "stream-queue", group: "Desk", name: "Stream queue", note: "Sets marked for the stream." },
  { id: "ruleset", group: "Desk", name: "Ruleset", note: "The saved ruleset on stream." },
  { id: "world", group: "Desk", name: "World", note: "Players grouped by country." },
  { id: "lower", group: "Desk", name: "Lower third", note: "Event, players, and round in one bar." },
  { id: "winner", group: "Desk", name: "Winner", note: "The player who is ahead." },
  { id: "custom", group: "Custom", name: "Custom overlay", note: "The layout you built in the editor." },
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
  { id: "p1.skin", label: "P1 character skin" },
  { id: "p2.skin", label: "P2 character skin" },
  { id: "p1.skin2", label: "P1 second skin" },
  { id: "p2.skin2", label: "P2 second skin" },
];

export function blankLayer(): FgcTitleLayer {
  return { id: `layer-${Date.now()}`, name: "Layer", visible: true, locked: false, parent: "", kind: "layer", open: true };
}

export function layerVisible(layers: FgcTitleLayer[], id: string) {
  const seen = new Set<string>();
  let current = layers.find((layer) => layer.id === id);
  while (current && !seen.has(current.id)) {
    if (current.visible === false) return false;
    seen.add(current.id);
    current = current.parent ? layers.find((layer) => layer.id === current?.parent) : undefined;
  }
  return true;
}

export function layerLocked(layers: FgcTitleLayer[], id: string) {
  const seen = new Set<string>();
  let current = layers.find((layer) => layer.id === id);
  while (current && !seen.has(current.id)) {
    if (current.locked) return true;
    seen.add(current.id);
    current = current.parent ? layers.find((layer) => layer.id === current?.parent) : undefined;
  }
  return false;
}

export function kindLabel(kind: FgcTitleElement["kind"]) {
  if (kind === "text") return "Text";
  if (kind === "image") return "Image";
  if (kind === "circle") return "Circle";
  if (kind === "triangle") return "Triangle";
  if (kind === "ticker") return "Ticker";
  return "Rectangle";
}

export function blankElement(kind: FgcTitleElement["kind"], layer = "layer-1"): FgcTitleElement {
  const shape = kind === "rect" || kind === "circle" || kind === "triangle";
  return {
    id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    kind,
    name: kindLabel(kind),
    layer,
    visible: true,
    locked: false,
    opacity: 1,
    x: 120,
    y: 120,
    w: kind === "text" || kind === "ticker" ? 480 : 240,
    h: kind === "text" || kind === "ticker" ? 80 : 140,
    bind: kind === "text" || kind === "ticker" ? "p1.name" : "",
    text: kind === "text" || kind === "ticker" ? "Text" : "",
    color: "#ffffff",
    bg: shape ? "#111111" : "transparent",
    size: 42,
    align: "left",
    font: "",
    weight: 0,
    fontStyle: "",
    src: "",
    imageKey: "",
    blend: "",
    anim: "",
  };
}

export function normalizeTitle(title: FgcTitle): FgcTitle {
  const rawLayers = title.layers?.length ? title.layers : [{ id: "layer-1", name: "Layer 1", visible: true, locked: false }];
  const layers = rawLayers.map((layer) => ({
    id: layer.id,
    name: layer.name || "Layer",
    visible: layer.visible !== false,
    locked: !!layer.locked,
    parent: layer.parent || "",
    kind: layer.kind === "group" ? "group" as const : "layer" as const,
    open: layer.open !== false,
  }));
  return {
    ...title,
    group: title.group || "",
    layers,
    elements: (title.elements ?? []).map((element) => ({
      ...blankElement(element.kind || "text", layers[0].id),
      ...element,
      name: element.name || kindLabel(element.kind),
      layer: element.layer || layers[0].id,
      visible: element.visible !== false,
      locked: !!element.locked,
      opacity: typeof element.opacity === "number" ? element.opacity : 1,
      imageKey: element.imageKey || "",
      blend: element.blend || "",
      font: element.font || "",
      weight: element.weight || 0,
      fontStyle: element.fontStyle === "italic" ? "italic" : "",
      anim: element.anim === "fade" ? "fade" : "",
    })),
  };
}

export function titleStack(title: FgcTitle): FgcTitleElement[] {
  const normalized = normalizeTitle(title);
  return normalized.layers.flatMap((layer) => {
    if (layer.kind === "group" || !layerVisible(normalized.layers, layer.id)) return [];
    return normalized.elements.filter((element) => element.layer === layer.id && element.visible);
  });
}

export function starterTitle(): FgcTitle {
  return {
    id: "scorebug",
    name: "Scorebug",
    group: "",
    layers: [{ id: "layer-1", name: "Layer 1", visible: true, locked: false }],
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
  const skinBind = element.bind.match(/^p([12])\.skin(2)?$/);
  if (skinBind && library) {
    const player = skinBind[1] === "1" ? set?.p1 : set?.p2;
    const name = skinBind[2] ? player?.character2 : player?.character;
    const skin = skinBind[2] ? player?.skin2 : player?.skin;
    const found = library.characters.find((item) => item.name === name);
    return found ? resolvePreview(fgc.assetBase, library.code, found.code, skin || 0) : "";
  }
  const name = element.bind === "p1.icon" ? set?.p1?.character : element.bind === "p2.icon" ? set?.p2?.character : "";
  if (name && library) return library.characters.find((item) => item.name === name)?.icon || "";
  if (element.imageKey) return titleImageObjectUrl(element.imageKey) || element.src;
  return element.src;
}

export function activeTitle(fgc: FgcState, id?: string | null): FgcTitle {
  const key = id || fgc.activeTitleId;
  return normalizeTitle(fgc.titles.find((item) => item.id === key) ?? fgc.titles[0] ?? starterTitle());
}

export function liveSet(fgc: FgcState): FgcSet | null {
  return streamSetOf(fgc) ?? fgc.sets[0] ?? null;
}

export function overlayHref(id: string, titleId?: string | null): string {
  if (id === "custom" && titleId) return `/fgc/overlay/hud?source=custom&title=${encodeURIComponent(titleId)}`;
  return id === "hud" ? "/fgc/overlay/hud" : `/fgc/overlay/hud?source=${id}`;
}
