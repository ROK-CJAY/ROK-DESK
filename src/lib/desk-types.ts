import { z } from "zod";
import { type BestOf, type GameId, type ScorebugStyle, coerceGameId, gameOf } from "@/lib/games";
import { DEFAULT_LAYOUT, mergeLayout, type LayoutMap } from "@/lib/layout";
import { DEFAULT_LOOK_BOOK, mergeLookBook, type OverlayLookBook } from "@/lib/overlay-look";
import { type Sponsor } from "@/lib/sponsors";
import {
  emptyTeam,
  mergeTeam,
  type TeamMon,
} from "@/lib/pokemon-vgc";

export type GameClock = {
  remaining: number;
  preset: number;
};

export type SeatId = "p1" | "p2" | "p3" | "p4";
export type SideId = SeatId;
export type TableSize = 2 | 3 | 4;
export type RosterSide = "hidden" | "p1" | "p2" | "both";
export type CmdFrom = Record<SeatId, number>;

export const SEAT_IDS: SeatId[] = ["p1", "p2", "p3", "p4"];
export const SEAT_LABELS: Record<SeatId, string> = {
  p1: "Seat 1",
  p2: "Seat 2",
  p3: "Seat 3",
  p4: "Seat 4",
};

export function emptyCmdFrom(): CmdFrom {
  return { p1: 0, p2: 0, p3: 0, p4: 0 };
}

export function seatsFor(size: TableSize): SeatId[] {
  return SEAT_IDS.slice(0, size);
}

export function normalizeDown(down: boolean[] | undefined, max = 6): boolean[] {
  return Array.from({ length: max }, (_, i) => Boolean(down?.[i]));
}

export function remainingFromDown(down: boolean[] | undefined, max = 6): number {
  return normalizeDown(down, max).filter((flag) => !flag).length;
}

export function toggleMonDown(down: boolean[] | undefined, index: number, max = 6): boolean[] {
  const next = normalizeDown(down, max);
  if (index < 0 || index >= max) return next;
  next[index] = !next[index];
  return next;
}

export function downForRemaining(value: number, max = 6): boolean[] {
  const remaining = Math.min(max, Math.max(0, value));
  return Array.from({ length: max }, (_, i) => i >= remaining);
}

export type PlayerSide = {
  name: string;
  tag: string;
  pronouns: string;
  country: string;
  score: number;
  resource: number;
  secondary: number;
  archetype: string;
  extra: string;
  photoUrl: string;
  cmdDamage: number;
  cmdFrom: CmdFrom;
  team: TeamMon[];
  down: boolean[];
  recordW: number;
  recordL: number;
  recordD: number;
  ink1: string;
  ink2: string;
};

export type Caster = {
  name: string;
  handle: string;
  role: string;
};

export type QueueMatch = {
  id: string;
  p1: string;
  p2: string;
  round: string;
  note: string;
};

export type SlateKind = "hidden" | "starting" | "brb" | "thanks" | "tech";
export type LowerThirdMode = "player" | "caster" | "custom";

export type LowerThirdState = {
  visible: boolean;
  mode: LowerThirdMode;
  title: string;
  subtitle: string;
  side: SideId | "c1" | "c2";
};

export type SpotlightCard = {
  visible: boolean;
  id: string;
  name: string;
  set: string;
  number: string;
  image: string;
  type: string;
};

export type DeskState = {
  version: number;
  gameId: GameId;
  eventName: string;
  eventPhase: string;
  roundName: string;
  bestOf: BestOf;
  formatName: string;
  p1: PlayerSide;
  p2: PlayerSide;
  p3: PlayerSide;
  p4: PlayerSide;
  casters: [Caster, Caster];
  timerSeconds: number;
  timerPresetSeconds: number;
  timerRunning: boolean;
  timerEndsAt: number | null;
  gameClocks: Partial<Record<GameId, GameClock>>;
  slate: SlateKind;
  lowerThird: LowerThirdState;
  winnerSide: SeatId | null;
  gameWinnerSide: SeatId | null;
  initiativeSide: SeatId | null;
  streamMatchId: string | null;
  queue: QueueMatch[];
  sponsorLine: string;
  sponsors: Sponsor[];
  sponsorSeconds: number;
  eventLogo: string;
  showResources: boolean;
  resourceCap: number | null;
  scorebugStyle: ScorebugStyle;
  scorebugPosition: "top" | "bottom";
  tableSize: TableSize;
  rosterSide: RosterSide;
  layout: LayoutMap;
  overlayLook: OverlayLookBook;
  cardSpotlight: SpotlightCard;
  lanes: Partial<Record<GameId, Record<string, unknown>>>;
  testMode: boolean;
  testSnapshot: Record<string, unknown> | null;
};

const playerSchema: z.ZodType<PlayerSide> = z.object({
  name: z.string(),
  tag: z.string(),
  pronouns: z.string(),
  country: z.string(),
  score: z.number(),
  resource: z.number(),
  secondary: z.number(),
  archetype: z.string(),
  extra: z.string(),
  photoUrl: z.string(),
  cmdDamage: z.number(),
  cmdFrom: z.object({
    p1: z.number(),
    p2: z.number(),
    p3: z.number(),
    p4: z.number(),
  }),
  team: z
    .array(
      z.object({
        species: z.string(),
        dex: z.number(),
        types: z.array(z.string()).optional(),
        tera: z.string(),
        ability: z.string(),
        item: z.string(),
        moves: z.array(z.object({ name: z.string(), type: z.string() })),
      }),
    )
    .optional()
    .transform((rows) => mergeTeam(rows)),
  down: z
    .array(z.boolean())
    .optional()
    .transform((rows) => normalizeDown(rows)),
  recordW: z.number().optional().transform((v) => (typeof v === "number" && v >= 0 ? v : 0)),
  recordL: z.number().optional().transform((v) => (typeof v === "number" && v >= 0 ? v : 0)),
  recordD: z.number().optional().transform((v) => (typeof v === "number" && v >= 0 ? v : 0)),
  ink1: z.string().optional().transform((v) => v ?? ""),
  ink2: z.string().optional().transform((v) => v ?? ""),
});

const casterSchema: z.ZodType<Caster> = z.object({
  name: z.string(),
  handle: z.string(),
  role: z.string(),
});

export const deskSchema: z.ZodType<DeskState> = z.object({
  version: z.number(),
  gameId: z.enum(["pokemon-vgc", "pokemon-tcg", "one-piece", "yugioh", "mtg", "lorcana", "swu", "riftbound"]),
  eventName: z.string(),
  eventPhase: z.string(),
  roundName: z.string(),
  bestOf: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(7)]),
  formatName: z.string(),
  p1: playerSchema,
  p2: playerSchema,
  p3: playerSchema,
  p4: playerSchema,
  casters: z.tuple([casterSchema, casterSchema]),
  timerSeconds: z.number(),
  timerPresetSeconds: z.number().optional().transform((v) => v ?? 0),
  timerRunning: z.boolean(),
  timerEndsAt: z.number().nullable(),
  gameClocks: z
    .record(z.string(), z.object({ remaining: z.number(), preset: z.number() }))
    .optional()
    .transform((v) => (v ?? {}) as Partial<Record<GameId, GameClock>>),
  slate: z.enum(["hidden", "starting", "brb", "thanks", "tech"]),
  lowerThird: z.object({
    visible: z.boolean(),
    mode: z.enum(["player", "caster", "custom"]),
    title: z.string(),
    subtitle: z.string(),
    side: z.enum(["p1", "p2", "p3", "p4", "c1", "c2"]),
  }),
  winnerSide: z.enum(["p1", "p2", "p3", "p4"]).nullable(),
  gameWinnerSide: z.enum(["p1", "p2", "p3", "p4"]).nullable().optional().transform((v) => v ?? null),
  initiativeSide: z.enum(["p1", "p2", "p3", "p4"]).nullable().optional().transform((v) => v ?? null),
  streamMatchId: z.string().nullable().optional().transform((v) => v ?? null),
  queue: z.array(
    z.object({
      id: z.string(),
      p1: z.string(),
      p2: z.string(),
      round: z.string(),
      note: z.string(),
    }),
  ),
  sponsorLine: z.string(),
  sponsors: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        logo: z.string(),
      }),
    )
    .optional()
    .transform((v) => v ?? []),
  sponsorSeconds: z.number().optional().transform((v) => (typeof v === "number" && v >= 2 ? v : 8)),
  eventLogo: z.string().optional().transform((v) => v ?? ""),
  showResources: z.boolean(),
  resourceCap: z.number().nullable().optional().transform((v) => (typeof v === "number" && v > 0 ? v : null)),
  scorebugStyle: z.enum(["bar", "split", "rok"]),
  scorebugPosition: z.enum(["top", "bottom"]),
  tableSize: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  rosterSide: z.enum(["hidden", "p1", "p2", "both"]),
  lanes: z.record(z.string(), z.any()).optional().transform((v) => (v ?? {}) as DeskState["lanes"]),
  overlayLook: z.any().optional().transform((v) => mergeLookBook(v)),
  cardSpotlight: z
    .object({
      visible: z.boolean(),
      id: z.string(),
      name: z.string(),
      set: z.string().optional().transform((v) => v ?? ""),
      number: z.string().optional().transform((v) => v ?? ""),
      image: z.string().optional().transform((v) => v ?? ""),
      type: z.string().optional().transform((v) => v ?? ""),
    })
    .optional()
    .transform((v) => v ?? emptySpotlight()),
  testMode: z.boolean().optional().transform((v) => Boolean(v)),
  testSnapshot: z.record(z.string(), z.any()).nullable().optional().transform((v) => v ?? null),
  layout: z.object({
    scorebugBar: z.object({ x: z.number(), y: z.number() }),
    scorebugP1: z.object({ x: z.number(), y: z.number() }),
    scorebugP2: z.object({ x: z.number(), y: z.number() }),
    scorebugP3: z.object({ x: z.number(), y: z.number() }),
    scorebugP4: z.object({ x: z.number(), y: z.number() }),
    scorebugCenter: z.object({ x: z.number(), y: z.number() }),
    caster1: z.object({ x: z.number(), y: z.number() }),
    caster2: z.object({ x: z.number(), y: z.number() }),
    lowerThird: z.object({ x: z.number(), y: z.number() }),
    timer: z.object({ x: z.number(), y: z.number() }),
    resourceP1: z.object({ x: z.number(), y: z.number() }),
    resourceP2: z.object({ x: z.number(), y: z.number() }),
    winner: z.object({ x: z.number(), y: z.number() }),
    gameWin: z.object({ x: z.number(), y: z.number() }),
    upcoming: z.object({ x: z.number(), y: z.number() }),
    rosterP1: z.object({ x: z.number(), y: z.number() }),
    rosterP2: z.object({ x: z.number(), y: z.number() }),
    cardSpotlight: z.object({ x: z.number(), y: z.number() }),
    sponsors: z.object({ x: z.number(), y: z.number() }),
    eventLogo: z.object({ x: z.number(), y: z.number() }),
  }),
});

export function emptySpotlight(): SpotlightCard {
  return { visible: false, id: "", name: "", set: "", number: "", image: "", type: "" };
}

export function blankPlayer(overrides: Partial<PlayerSide> = {}): PlayerSide {
  return {
    name: "",
    tag: "",
    pronouns: "",
    country: "US",
    score: 0,
    resource: 0,
    secondary: 0,
    archetype: "",
    extra: "",
    photoUrl: "",
    cmdDamage: 0,
    ...overrides,
    cmdFrom: { ...emptyCmdFrom(), ...overrides.cmdFrom },
    team: mergeTeam(overrides.team ?? emptyTeam()),
    down: normalizeDown(overrides.down),
    recordW: overrides.recordW ?? 0,
    recordL: overrides.recordL ?? 0,
    recordD: overrides.recordD ?? 0,
    ink1: overrides.ink1 ?? "",
    ink2: overrides.ink2 ?? "",
  };
}

export function defaultDesk(): DeskState {
  const game = gameOf("pokemon-tcg");
  return {
    version: 1,
    gameId: "pokemon-tcg",
    eventName: "",
    eventPhase: "",
    roundName: "",
    bestOf: 3,
    formatName: game.formats[0]?.label ?? "Standard",
    p1: blankPlayer({ resource: game.resource.start }),
    p2: blankPlayer({ resource: game.resource.start }),
    p3: blankPlayer({ resource: 40 }),
    p4: blankPlayer({ resource: 40 }),
    casters: [
      { name: "", handle: "", role: "Play-by-play" },
      { name: "", handle: "", role: "Color" },
    ],
    timerSeconds: 0,
    timerPresetSeconds: 0,
    timerRunning: false,
    timerEndsAt: null,
    gameClocks: {},
    slate: "hidden",
    lowerThird: {
      visible: false,
      mode: "player",
      title: "",
      subtitle: "",
      side: "p1",
    },
    winnerSide: null,
    gameWinnerSide: null,
    initiativeSide: null,
    streamMatchId: null,
    queue: [],
    sponsorLine: "",
    sponsors: [],
    sponsorSeconds: 8,
    eventLogo: "",
    showResources: true,
    resourceCap: 6,
    scorebugStyle: "bar",
    scorebugPosition: "bottom",
    tableSize: 2,
    rosterSide: "hidden",
    layout: { ...DEFAULT_LAYOUT },
    overlayLook: { ...DEFAULT_LOOK_BOOK, sources: {} },
    cardSpotlight: emptySpotlight(),
    lanes: {},
    testMode: false,
    testSnapshot: null,
  };
}

export function resourceLimit(desk: Pick<DeskState, "gameId" | "formatName" | "resourceCap">): number {
  if (typeof desk.resourceCap === "number" && desk.resourceCap > 0) return desk.resourceCap;
  const game = gameOf(desk.gameId);
  const format = game.formats.find((f) => f.label === desk.formatName);
  return format?.resourceMax ?? game.resource.max;
}

export function resourceResetValue(desk: Pick<DeskState, "gameId" | "formatName" | "resourceCap">): number {
  const game = gameOf(desk.gameId);
  const format = game.formats.find((f) => f.label === desk.formatName);
  // Prize-style remaining (PTCG prizes, VGC mons) start at the match cap.
  // Point resources (Lorcana lore, Riftbound) start at 0 / format start.
  if (game.resource.invertWin && typeof desk.resourceCap === "number" && desk.resourceCap > 0) {
    return desk.resourceCap;
  }
  return format?.resourceStart ?? game.resource.start;
}

export function remainingSeconds(
  clock: { timerRunning: boolean; timerEndsAt: number | null; timerSeconds: number },
  now = Date.now(),
): number {
  if (clock.timerRunning && clock.timerEndsAt) {
    return Math.max(0, Math.ceil((clock.timerEndsAt - now) / 1000));
  }
  return Math.max(0, clock.timerSeconds);
}

export function formatClock(total: number): string {
  const sign = total < 0 ? "-" : "";
  const abs = Math.abs(total);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  if (h > 0) {
    return `${sign}${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${sign}${m}:${String(s).padStart(2, "0")}`;
}

export function parseClockInput(raw: string): number | null {
  const text = raw.trim();
  if (!text) return 0;
  if (!/^[\d:]+$/.test(text)) return null;
  const parts = text.split(":").map((part) => Number(part));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  if (parts.length === 1) return Math.round(parts[0]! * 60);
  if (parts.length === 2) return Math.round(parts[0]! * 60 + parts[1]!);
  if (parts.length === 3) return Math.round(parts[0]! * 3600 + parts[1]! * 60 + parts[2]!);
  return null;
}

export function gamesToWin(bestOf: BestOf): number {
  return Math.ceil(bestOf / 2);
}

export function monogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function isCommanderTable(desk: DeskState): boolean {
  return desk.tableSize > 2;
}

export function incomingCmd(player: PlayerSide, seat: SeatId): number {
  const from = player.cmdFrom ?? emptyCmdFrom();
  return Math.max(0, ...SEAT_IDS.filter((id) => id !== seat).map((id) => from[id] ?? 0));
}

export function parseDesk(raw: unknown): DeskState | null {
  const data = typeof raw === "string" ? safeJson(raw) : raw;
  if (!data || typeof data !== "object") return null;
  const incoming = data as Record<string, unknown>;
  const base = defaultDesk();
  const merged = {
    ...base,
    ...incoming,
    gameId: coerceGameId(incoming.gameId, base.gameId),
    p1: mergePlayer(base.p1, incoming.p1),
    p2: mergePlayer(base.p2, incoming.p2),
    p3: mergePlayer(base.p3, incoming.p3),
    p4: mergePlayer(base.p4, incoming.p4),
    lowerThird: {
      ...base.lowerThird,
      ...(isRecord(incoming.lowerThird) ? incoming.lowerThird : {}),
    },
    layout: mergeLayout(incoming.layout),
    overlayLook: mergeLookBook(incoming.overlayLook),
    cardSpotlight: {
      ...emptySpotlight(),
      ...(isRecord(incoming.cardSpotlight) ? incoming.cardSpotlight : {}),
    },
    rosterSide:
      incoming.rosterSide === "p1" ||
      incoming.rosterSide === "p2" ||
      incoming.rosterSide === "both" ||
      incoming.rosterSide === "hidden"
        ? incoming.rosterSide
        : base.rosterSide,
  };
  const parsed = deskSchema.safeParse(merged);
  return parsed.success ? (parsed.data as DeskState) : null;
}

export function stripLane(desk: DeskState): Record<string, unknown> {
  const { lanes: _lanes, ...rest } = desk;
  return rest;
}

export function withCurrentLane(desk: DeskState): DeskState {
  return {
    ...desk,
    lanes: { ...desk.lanes, [desk.gameId]: stripLane(desk) },
  };
}

export function deskLaneOf(live: DeskState, gameId: GameId): DeskState {
  if (live.gameId === gameId) return live;
  const raw = live.lanes?.[gameId];
  const parsed = raw ? parseDesk(raw) : null;
  if (parsed) return { ...parsed, lanes: live.lanes };
  const game = gameOf(gameId);
  const format = game.formats[0];
  return {
    ...defaultDesk(),
    gameId,
    formatName: format?.label ?? game.name,
    bestOf: format?.bestOf ?? game.defaultBestOf,
    scorebugStyle: game.defaultScorebug,
    tableSize: format?.seats ?? 2,
    p1: { ...defaultDesk().p1, resource: format?.resourceStart ?? game.resource.start, score: 0, down: normalizeDown([]), team: emptyTeam() },
    p2: { ...defaultDesk().p2, resource: format?.resourceStart ?? game.resource.start, score: 0, down: normalizeDown([]), team: emptyTeam() },
    timerSeconds: 0,
    timerPresetSeconds: 0,
    timerRunning: false,
    timerEndsAt: null,
    winnerSide: null,
    gameWinnerSide: null,
    lanes: live.lanes,
  };
}

export function mergeDeskLane(live: DeskState, gameId: GameId, incoming: DeskState): DeskState {
  const lane = stripLane({ ...incoming, gameId });
  if (live.gameId === gameId) {
    return {
      ...incoming,
      gameId,
      version: Math.max(live.version, incoming.version) + 1,
      lanes: { ...live.lanes, [gameId]: lane },
    };
  }
  return {
    ...live,
    version: live.version + 1,
    lanes: { ...live.lanes, [gameId]: lane },
  };
}

function mergePlayer(base: PlayerSide, raw: unknown): PlayerSide {
  const incoming = isRecord(raw) ? raw : {};
  const cmdFromRaw = isRecord(incoming.cmdFrom) ? incoming.cmdFrom : {};
  return {
    ...base,
    ...incoming,
    cmdFrom: {
      ...emptyCmdFrom(),
      ...base.cmdFrom,
      p1: typeof cmdFromRaw.p1 === "number" ? cmdFromRaw.p1 : 0,
      p2: typeof cmdFromRaw.p2 === "number" ? cmdFromRaw.p2 : 0,
      p3: typeof cmdFromRaw.p3 === "number" ? cmdFromRaw.p3 : 0,
      p4: typeof cmdFromRaw.p4 === "number" ? cmdFromRaw.p4 : 0,
    },
    team: mergeTeam(incoming.team ?? base.team),
    down: normalizeDown(Array.isArray(incoming.down) ? incoming.down : base.down),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
