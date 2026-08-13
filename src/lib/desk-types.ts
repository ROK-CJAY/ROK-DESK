import { z } from "zod";
import { type BestOf, type GameId, type ScorebugStyle, gameOf } from "@/lib/games";
import { DEFAULT_LAYOUT, mergeLayout, type LayoutMap } from "@/lib/layout";
import {
  emptyTeam,
  mergeTeam,
  sampleTeamA,
  sampleTeamB,
  type TeamMon,
} from "@/lib/pokemon-vgc";

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
  timerRunning: boolean;
  timerEndsAt: number | null;
  slate: SlateKind;
  lowerThird: LowerThirdState;
  winnerSide: SeatId | null;
  queue: QueueMatch[];
  sponsorLine: string;
  showResources: boolean;
  scorebugStyle: ScorebugStyle;
  scorebugPosition: "top" | "bottom";
  tableSize: TableSize;
  rosterSide: RosterSide;
  layout: LayoutMap;
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
});

const casterSchema: z.ZodType<Caster> = z.object({
  name: z.string(),
  handle: z.string(),
  role: z.string(),
});

export const deskSchema: z.ZodType<DeskState> = z.object({
  version: z.number(),
  gameId: z.enum([
    "pokemon-vgc",
    "pokemon-tcg",
    "one-piece",
    "yugioh",
    "mtg",
    "lorcana",
    "fab",
    "swu",
    "union-arena",
    "generic",
  ]),
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
  timerRunning: z.boolean(),
  timerEndsAt: z.number().nullable(),
  slate: z.enum(["hidden", "starting", "brb", "thanks", "tech"]),
  lowerThird: z.object({
    visible: z.boolean(),
    mode: z.enum(["player", "caster", "custom"]),
    title: z.string(),
    subtitle: z.string(),
    side: z.enum(["p1", "p2", "p3", "p4", "c1", "c2"]),
  }),
  winnerSide: z.enum(["p1", "p2", "p3", "p4"]).nullable(),
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
  showResources: z.boolean(),
  scorebugStyle: z.enum(["bar", "split"]),
  scorebugPosition: z.enum(["top", "bottom"]),
  tableSize: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  rosterSide: z.enum(["hidden", "p1", "p2", "both"]),
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
    upcoming: z.object({ x: z.number(), y: z.number() }),
    rosterP1: z.object({ x: z.number(), y: z.number() }),
    rosterP2: z.object({ x: z.number(), y: z.number() }),
  }),
});

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
  };
}

export function defaultDesk(): DeskState {
  const game = gameOf("pokemon-tcg");
  return {
    version: 1,
    gameId: "pokemon-tcg",
    eventName: "ROK League Cup",
    eventPhase: "Swiss",
    roundName: "Round 4",
    bestOf: 3,
    formatName: game.formats[0]?.label ?? "Standard",
    p1: blankPlayer({
      name: "Maya Cruz",
      tag: "pocketstorm",
      pronouns: "she/her",
      country: "US",
      score: 1,
      resource: 4,
      archetype: "Charizard ex",
      team: sampleTeamA(),
    }),
    p2: blankPlayer({
      name: "Luis Ortega",
      tag: "tidebound",
      pronouns: "he/him",
      country: "US",
      score: 0,
      resource: 5,
      archetype: "Dragapult",
      team: sampleTeamB(),
    }),
    p3: blankPlayer({
      name: "Jordan Hale",
      tag: "praxis",
      pronouns: "they/them",
      country: "US",
      resource: 40,
      archetype: "Atraxa",
    }),
    p4: blankPlayer({
      name: "Samir Cole",
      tag: "kinnanfan",
      pronouns: "he/him",
      country: "US",
      resource: 40,
      archetype: "Kinnan",
    }),
    casters: [
      { name: "Rook", handle: "rookcasts", role: "Play-by-play" },
      { name: "Marisol Vega", handle: "mariplays", role: "Color" },
    ],
    timerSeconds: 50 * 60,
    timerRunning: false,
    timerEndsAt: null,
    slate: "hidden",
    lowerThird: {
      visible: false,
      mode: "player",
      title: "",
      subtitle: "",
      side: "p1",
    },
    winnerSide: null,
    queue: [
      { id: "q1", p1: "Kenji Mori", p2: "Ana Delgado", round: "Winners Semis", note: "Feature" },
      { id: "q2", p1: "Chris Bell", p2: "Priya Shah", round: "Losers Quarters", note: "" },
    ],
    sponsorLine: "ROK Esports",
    showResources: true,
    scorebugStyle: "bar",
    scorebugPosition: "bottom",
    tableSize: 2,
    rosterSide: "hidden",
    layout: { ...DEFAULT_LAYOUT },
  };
}

export function remainingSeconds(desk: DeskState, now = Date.now()): number {
  if (desk.timerRunning && desk.timerEndsAt) {
    return Math.max(0, Math.ceil((desk.timerEndsAt - now) / 1000));
  }
  return Math.max(0, desk.timerSeconds);
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
    p1: mergePlayer(base.p1, incoming.p1),
    p2: mergePlayer(base.p2, incoming.p2),
    p3: mergePlayer(base.p3, incoming.p3),
    p4: mergePlayer(base.p4, incoming.p4),
    lowerThird: {
      ...base.lowerThird,
      ...(isRecord(incoming.lowerThird) ? incoming.lowerThird : {}),
    },
    layout: mergeLayout(incoming.layout),
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
