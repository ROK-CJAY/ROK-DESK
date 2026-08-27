import { z } from "zod";
import { type BestOf, type GameId, GAME_LIST, coerceGameId, gameOf } from "@/lib/games";
import { mergeTeam, teamHasMons, type TeamMon } from "@/lib/pokemon-vgc";
import { mergeDecklist, type DeckCard } from "@/lib/decklist";

export type BracketType = "single" | "double" | "swiss";
export type BracketSize = number;
export const PRESET_SIZES = [4, 8, 16, 32] as const;

export function clampBracketSize(n: number): number {
  if (!Number.isFinite(n)) return 8;
  return Math.max(2, Math.min(128, Math.round(n)));
}

export function isPresetSize(n: number): boolean {
  return (PRESET_SIZES as readonly number[]).includes(n);
}

export function bracketSlots(size: number): number {
  const n = clampBracketSize(size);
  let slots = 2;
  while (slots < n) slots *= 2;
  return slots;
}
export type BracketSide = "winners" | "losers" | "grand" | "swiss";
export type SlotId = "p1" | "p2" | "p3" | "p4";
export type TournamentPhase = "setup" | "running" | "complete";
export type BracketViewId =
  | "full"
  | "winners"
  | "losers"
  | "top16"
  | "top8"
  | "top4"
  | "finals"
  | "standings";

export const DRAW_ID = "draw";

export const CUT_PRESETS = [4, 6, 8, 16, 32] as const;
export type CutType = "single" | "double";

export function clampCutSize(n: number, field = 128): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(2, Math.min(128, field, Math.round(n)));
}

export function cutLabel(size: number): string {
  if (size <= 0) return "None";
  return `Top ${size}`;
}

export const BRACKET_VIEWS: { id: BracketViewId; label: string; note: string; types: BracketType[] }[] = [
  { id: "full", label: "Full bracket", note: "Every match.", types: ["single", "double", "swiss"] },
  { id: "standings", label: "Standings", note: "Swiss table by match points.", types: ["swiss"] },
  { id: "winners", label: "Winners side", note: "Winners bracket plus grands.", types: ["single", "double"] },
  { id: "losers", label: "Losers side", note: "Losers bracket plus grands.", types: ["double"] },
  { id: "top16", label: "Top 16", note: "From the round of 16 onward.", types: ["single", "double", "swiss"] },
  { id: "top8", label: "Top 8", note: "Quarters, semis, and finals / top of table.", types: ["single", "double", "swiss"] },
  { id: "top4", label: "Top 4", note: "Semis and finals / top of table.", types: ["single", "double", "swiss"] },
  { id: "finals", label: "Finals", note: "Winners / losers / grand finals only.", types: ["single", "double"] },
];

export function viewsFor(
  type: BracketType,
  cut?: { cutSize?: number; cutType?: CutType; matches?: { side: string }[] },
) {
  const rows = BRACKET_VIEWS.filter((v) => v.types.includes(type));
  if (type !== "swiss" || !cut || (cut.cutSize ?? 0) <= 0) return rows;
  if (!cut.matches?.some((m) => m.side !== "swiss")) return rows;
  const extra = BRACKET_VIEWS.filter((v) => v.types.includes(cut.cutType === "double" ? "double" : "single"));
  const seen = new Set(rows.map((v) => v.id));
  return [...rows, ...extra.filter((v) => !seen.has(v.id))];
}

export type Entrant = {
  id: string;
  name: string;
  tag: string;
  pronouns: string;
  country: string;
  deck: string;
  extra: string;
  seed: number;
  dropped: boolean;
  team: TeamMon[];
  playerId: string;
  trainerName: string;
  switchProfile: string;
  ageDivision: AgeDivision;
  birthDate: string;
  ink1: string;
  ink2: string;
  photoUrl: string;
  note: string;
  judgeNote: string;
  decklist: DeckCard[];
};

export type AgeDivision = "" | "juniors" | "seniors" | "masters";

export type StaffRole =
  | "head-judge"
  | "judge"
  | "feature-judge"
  | "producer"
  | "scorekeeper"
  | "staff"
  | "other";

export const STAFF_ROLES: { id: StaffRole; label: string }[] = [
  { id: "head-judge", label: "Head Judge" },
  { id: "judge", label: "Judge" },
  { id: "feature-judge", label: "Feature Match Judge" },
  { id: "producer", label: "Producer" },
  { id: "scorekeeper", label: "Scorekeeper" },
  { id: "staff", label: "Staff" },
  { id: "other", label: "Other" },
];

export function staffRoleLabel(role: StaffRole): string {
  return STAFF_ROLES.find((row) => row.id === role)?.label ?? "Staff";
}

export type StaffMember = {
  id: string;
  name: string;
  role: StaffRole;
  note: string;
};

export function blankStaff(overrides: Partial<StaffMember> = {}): StaffMember {
  return {
    id: `s-${Math.random().toString(36).slice(2, 9)}`,
    name: "",
    role: "staff",
    note: "",
    ...overrides,
  };
}

export type MatchSlot = {
  entrantId: string | null;
  score: number;
};

export type BracketMatch = {
  id: string;
  round: number;
  position: number;
  side: BracketSide;
  p1: MatchSlot;
  p2: MatchSlot;
  p3: MatchSlot;
  p4: MatchSlot;
  winnerId: string | null;
  nextWinnerMatchId: string | null;
  nextWinnerSlot: "p1" | "p2" | null;
  nextLoserMatchId: string | null;
  nextLoserSlot: "p1" | "p2" | null;
  label: string;
};

export type GameDesk = {
  name: string;
  streamChannel: string;
  formatName: string;
  bracketType: BracketType;
  size: BracketSize;
  bestOf: BestOf;
  phase: TournamentPhase;
  overlayView: BracketViewId;
  streamMatchId: string | null;
  streamMatchId2: string | null;
  streamMatchId3: string | null;
  swissRounds: number;
  cutSize: number;
  cutType: CutType;
  entrants: Entrant[];
  matches: BracketMatch[];
  timerSeconds: number;
  timerPresetSeconds: number;
  timerRunning: boolean;
  timerEndsAt: number | null;
  testMode: boolean;
  testSnapshot: Record<string, unknown> | null;
  staff: StaffMember[];
  requireDecklist: boolean;
};

export type TournamentState = {
  version: number;
  name: string;
  streamChannel: string;
  gameId: GameId;
  formatName: string;
  bracketType: BracketType;
  size: BracketSize;
  bestOf: BestOf;
  phase: TournamentPhase;
  overlayView: BracketViewId;
  streamMatchId: string | null;
  streamMatchId2: string | null;
  streamMatchId3: string | null;
  swissRounds: number;
  cutSize: number;
  cutType: CutType;
  entrants: Entrant[];
  matches: BracketMatch[];
  desks: Partial<Record<GameId, GameDesk>>;
  timerSeconds: number;
  timerPresetSeconds: number;
  timerRunning: boolean;
  timerEndsAt: number | null;
  testMode: boolean;
  testSnapshot: Record<string, unknown> | null;
  staff: StaffMember[];
  requireDecklist: boolean;
};

const slotSchema = z.object({
  entrantId: z.string().nullable(),
  score: z.number(),
});

const entrantSchema: z.ZodType<Entrant> = z.object({
  id: z.string(),
  name: z.string(),
  tag: z.string(),
  pronouns: z.string(),
  country: z.string(),
  deck: z.string(),
  extra: z.string(),
  seed: z.number(),
  dropped: z.boolean(),
  team: z.unknown().optional().transform((rows) => mergeTeam(rows)),
  playerId: z.string().optional().transform((v) => v ?? ""),
  trainerName: z.string().optional().transform((v) => v ?? ""),
  switchProfile: z.string().optional().transform((v) => v ?? ""),
  ageDivision: z
    .string()
    .optional()
    .transform((v): AgeDivision => (v === "juniors" || v === "seniors" || v === "masters" ? v : "")),
  birthDate: z.string().optional().transform((v) => v ?? ""),
  ink1: z.string().optional().transform((v) => v ?? ""),
  ink2: z.string().optional().transform((v) => v ?? ""),
  photoUrl: z.string().optional().transform((v) => v ?? ""),
  note: z.string().optional().transform((v) => v ?? ""),
  judgeNote: z.string().optional().transform((v) => v ?? ""),
  decklist: z.unknown().optional().transform((rows) => mergeDecklist(rows)),
});

const staffSchema: z.ZodType<StaffMember> = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(["head-judge", "judge", "feature-judge", "producer", "scorekeeper", "staff", "other"]),
  note: z.string().optional().transform((v) => v ?? ""),
});

const matchSchema: z.ZodType<BracketMatch> = z.object({
  id: z.string(),
  round: z.number(),
  position: z.number(),
  side: z.enum(["winners", "losers", "grand", "swiss"]),
  p1: slotSchema,
  p2: slotSchema,
  p3: slotSchema.default({ entrantId: null, score: 0 }),
  p4: slotSchema.default({ entrantId: null, score: 0 }),
  winnerId: z.string().nullable(),
  nextWinnerMatchId: z.string().nullable(),
  nextWinnerSlot: z.enum(["p1", "p2"]).nullable(),
  nextLoserMatchId: z.string().nullable(),
  nextLoserSlot: z.enum(["p1", "p2"]).nullable(),
  label: z.string(),
});

const gameDeskSchema: z.ZodType<GameDesk> = z.object({
  name: z.string().optional().transform((v) => v ?? ""),
  streamChannel: z.string().optional().transform((v) => v ?? ""),
  formatName: z.string(),
  bracketType: z.enum(["single", "double", "swiss"]),
  size: z.number().int().min(2).max(128),
  bestOf: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(7)]),
  phase: z.enum(["setup", "running", "complete"]),
  overlayView: z.enum(["full", "winners", "losers", "top16", "top8", "top4", "finals", "standings"]),
  streamMatchId: z.string().nullable(),
  streamMatchId2: z.string().nullable().optional().transform((v) => v ?? null),
  streamMatchId3: z.string().nullable().optional().transform((v) => v ?? null),
  swissRounds: z.number(),
  cutSize: z.number().optional().transform((v) => (typeof v === "number" && v > 0 ? v : 0)),
  cutType: z.enum(["single", "double"]).optional().transform((v) => (v === "double" ? "double" : "single")),
  entrants: z.array(entrantSchema),
  matches: z.array(matchSchema),
  timerSeconds: z.number().optional().transform((v) => v ?? 0),
  timerPresetSeconds: z.number().optional().transform((v) => v ?? 0),
  timerRunning: z.boolean().optional().transform((v) => v ?? false),
  timerEndsAt: z.number().nullable().optional().transform((v) => v ?? null),
  testMode: z.boolean().optional().transform((v) => Boolean(v)),
  testSnapshot: z.record(z.string(), z.any()).nullable().optional().transform((v) => v ?? null),
  staff: z.array(staffSchema).optional().transform((v) => v ?? []),
  requireDecklist: z.boolean().optional().transform((v) => Boolean(v)),
});

export const tournamentSchema: z.ZodType<TournamentState> = z.object({
  version: z.number(),
  name: z.string(),
  streamChannel: z.string().optional().transform((v) => v ?? ""),
  gameId: z.enum(["pokemon-vgc", "pokemon-tcg", "one-piece", "yugioh", "mtg", "lorcana", "swu", "riftbound"]),
  formatName: z.string(),
  bracketType: z.enum(["single", "double", "swiss"]),
  size: z.number().int().min(2).max(128),
  bestOf: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(7)]),
  phase: z.enum(["setup", "running", "complete"]),
  overlayView: z.enum(["full", "winners", "losers", "top16", "top8", "top4", "finals", "standings"]),
  streamMatchId: z.string().nullable(),
  streamMatchId2: z.string().nullable().optional().transform((v) => v ?? null),
  streamMatchId3: z.string().nullable().optional().transform((v) => v ?? null),
  swissRounds: z.number(),
  cutSize: z.number().optional().transform((v) => (typeof v === "number" && v > 0 ? v : 0)),
  cutType: z.enum(["single", "double"]).optional().transform((v) => (v === "double" ? "double" : "single")),
  entrants: z.array(entrantSchema),
  matches: z.array(matchSchema),
  desks: z.record(z.string(), gameDeskSchema).optional().transform((value) => (value ?? {}) as Partial<Record<GameId, GameDesk>>),
  timerSeconds: z.number().optional().transform((v) => v ?? 0),
  timerPresetSeconds: z.number().optional().transform((v) => v ?? 0),
  timerRunning: z.boolean().optional().transform((v) => v ?? false),
  timerEndsAt: z.number().nullable().optional().transform((v) => v ?? null),
  testMode: z.boolean().optional().transform((v) => Boolean(v)),
  testSnapshot: z.record(z.string(), z.any()).nullable().optional().transform((v) => v ?? null),
  staff: z.array(staffSchema).optional().transform((v) => v ?? []),
  requireDecklist: z.boolean().optional().transform((v) => Boolean(v)),
});

export function blankEntrant(overrides: Partial<Entrant> = {}): Entrant {
  return {
    id: `e-${Math.random().toString(36).slice(2, 9)}`,
    name: "",
    tag: "",
    pronouns: "",
    country: "US",
    deck: "",
    extra: "",
    seed: 0,
    dropped: false,
    playerId: "",
    trainerName: "",
    switchProfile: "",
    ageDivision: "",
    birthDate: "",
    ink1: "",
    ink2: "",
    photoUrl: "",
    note: "",
    ...overrides,
    team: mergeTeam(overrides.team),
    decklist: mergeDecklist(overrides.decklist),
    judgeNote: overrides.judgeNote ?? "",
  };
}

export function teamSheetLabel(team: TeamMon[] | undefined): string {
  if (!teamHasMons(team)) return "";
  const names = (team ?? []).map((mon) => mon.species.trim()).filter(Boolean);
  if (names.length === 0) return "";
  return names.length === 1 ? names[0]! : `${names[0]} +${names.length - 1}`;
}

export function snapshotDesk(t: Pick<TournamentState, keyof GameDesk>): GameDesk {
  return {
    name: t.name ?? "",
    streamChannel: t.streamChannel ?? "",
    formatName: t.formatName,
    bracketType: t.bracketType,
    size: t.size,
    bestOf: t.bestOf,
    phase: t.phase,
    overlayView: t.overlayView,
    streamMatchId: t.streamMatchId,
    streamMatchId2: t.streamMatchId2 ?? null,
    streamMatchId3: t.streamMatchId3 ?? null,
    swissRounds: t.swissRounds,
    cutSize: t.cutSize ?? 0,
    cutType: t.cutType === "double" ? "double" : "single",
    entrants: t.entrants,
    matches: t.matches,
    timerSeconds: t.timerSeconds,
    timerPresetSeconds: t.timerPresetSeconds,
    timerRunning: t.timerRunning,
    timerEndsAt: t.timerEndsAt,
    testMode: t.testMode,
    testSnapshot: t.testSnapshot,
    staff: t.staff ?? [],
    requireDecklist: Boolean(t.requireDecklist),
  };
}

export function deskForGame(t: TournamentState, gameId: GameId): GameDesk {
  if (t.gameId === gameId) return snapshotDesk(t);
  return t.desks[gameId] ?? emptyDesk(gameId);
}

export function viewTournament(t: TournamentState, gameId: GameId): TournamentState {
  if (t.gameId === gameId) return t;
  return { ...t, gameId, ...deskForGame(t, gameId) };
}

export function emptyDesk(gameId: GameId): GameDesk {
  const game = gameOf(gameId);
  return {
    name: "",
    streamChannel: "",
    formatName: game.formats[0]?.label ?? game.name,
    bracketType: "single",
    size: 8,
    bestOf: game.defaultBestOf,
    phase: "setup",
    overlayView: "full",
    streamMatchId: null,
    streamMatchId2: null,
    streamMatchId3: null,
    swissRounds: 3,
    cutSize: 0,
    cutType: "single",
    entrants: [],
    matches: [],
    timerSeconds: 0,
    timerPresetSeconds: 0,
    timerRunning: false,
    timerEndsAt: null,
    testMode: false,
    testSnapshot: null,
    staff: [],
    requireDecklist: false,
  };
}

export function applyDesk(t: TournamentState, desk: GameDesk): TournamentState {
  return {
    ...t,
    ...desk,
    desks: { ...t.desks, [t.gameId]: desk },
  };
}

export function switchGame(t: TournamentState, gameId: GameId): TournamentState {
  if (t.gameId === gameId) return t;
  const desks: Partial<Record<GameId, GameDesk>> = {
    ...t.desks,
    [t.gameId]: snapshotDesk(t),
  };
  const next = desks[gameId] ?? emptyDesk(gameId);
  const game = gameOf(gameId);
  const format = game.formats.find((f) => f.label === next.formatName) ?? game.formats[0];
  const clamped: GameDesk = {
    ...emptyDesk(gameId),
    ...next,
    name: typeof next.name === "string" ? next.name : "",
    streamChannel: typeof next.streamChannel === "string" ? next.streamChannel : "",
    formatName: format?.label ?? game.name,
    bestOf: format?.bestOf ?? next.bestOf ?? game.defaultBestOf,
  };
  return {
    ...t,
    gameId,
    ...clamped,
    desks: { ...desks, [gameId]: clamped },
  };
}

export function defaultTournament(): TournamentState {
  const game = gameOf("pokemon-tcg");
  const desk: GameDesk = emptyDesk("pokemon-tcg");
  return {
    version: 1,
    gameId: "pokemon-tcg",
    ...desk,
    formatName: game.formats[0]?.label ?? "Standard",
    desks: { "pokemon-tcg": desk },
  };
}

export function parseTournament(raw: unknown): TournamentState | null {
  const data = typeof raw === "string" ? safeJson(raw) : raw;
  if (!data || typeof data !== "object") return null;
  const base = defaultTournament();
  const incoming = data as Record<string, unknown>;
  const merged = {
    ...base,
    ...incoming,
    swissRounds:
      typeof incoming.swissRounds === "number" && incoming.swissRounds > 0
        ? incoming.swissRounds
        : base.swissRounds,
    cutSize:
      typeof incoming.cutSize === "number" && incoming.cutSize > 0
        ? clampCutSize(incoming.cutSize)
        : 0,
    cutType: incoming.cutType === "double" ? "double" : "single",
    streamChannel: typeof incoming.streamChannel === "string" ? incoming.streamChannel : "",
    overlayView:
      incoming.overlayView === "winners" ||
      incoming.overlayView === "losers" ||
      incoming.overlayView === "top16" ||
      incoming.overlayView === "top8" ||
      incoming.overlayView === "top4" ||
      incoming.overlayView === "finals" ||
      incoming.overlayView === "standings" ||
      incoming.overlayView === "full"
        ? incoming.overlayView
        : base.overlayView,
    bracketType:
      incoming.bracketType === "single" || incoming.bracketType === "double" || incoming.bracketType === "swiss"
        ? incoming.bracketType
        : base.bracketType,
    size: typeof incoming.size === "number" ? clampBracketSize(incoming.size) : base.size,
    gameId: coerceGameId(incoming.gameId, base.gameId),
    entrants: Array.isArray(incoming.entrants) ? incoming.entrants : base.entrants,
    matches: Array.isArray(incoming.matches) ? incoming.matches : base.matches,
    staff: Array.isArray(incoming.staff) ? incoming.staff : base.staff,
    desks: incoming.desks && typeof incoming.desks === "object" ? incoming.desks : {},
  };
  const parsed = tournamentSchema.safeParse(merged);
  if (!parsed.success) return null;
  const t = parsed.data;
  return {
    ...t,
    desks: {
      ...t.desks,
      [t.gameId]: snapshotDesk(t),
    },
  };
}

export function rosterCount(t: TournamentState, gameId: GameId): number {
  if (t.gameId === gameId) return t.entrants.length;
  return t.desks[gameId]?.entrants.length ?? 0;
}

export function gameIds(): GameId[] {
  return GAME_LIST.map((g) => g.id);
}

export function entrantById(t: TournamentState, id: string | null): Entrant | null {
  if (!id) return null;
  return t.entrants.find((e) => e.id === id) ?? null;
}

export function matchById(t: TournamentState, id: string | null): BracketMatch | null {
  if (!id) return null;
  return t.matches.find((m) => m.id === id) ?? null;
}

export function emptySlot(): MatchSlot {
  return { entrantId: null, score: 0 };
}

export function matchSlots(match: BracketMatch): { id: SlotId; slot: MatchSlot }[] {
  return (
    [
      ["p1", match.p1],
      ["p2", match.p2],
      ["p3", match.p3 ?? emptySlot()],
      ["p4", match.p4 ?? emptySlot()],
    ] as const
  ).map(([id, slot]) => ({ id, slot }));
}

export function matchEntrantIds(match: BracketMatch): string[] {
  return matchSlots(match)
    .map((row) => row.slot.entrantId)
    .filter((id): id is string => Boolean(id));
}

export function isPodMatch(match: BracketMatch): boolean {
  return Boolean(match.p3?.entrantId || match.p4?.entrantId);
}

export function championOf(t: TournamentState): Entrant | null {
  const elim = t.matches.filter((m) => m.side !== "swiss");
  if (elim.length === 0) return null;
  const grands = elim.filter((m) => m.side === "grand");
  const last = [...grands].reverse().find((m) => m.winnerId);
  if (last?.winnerId) return entrantById(t, last.winnerId);
  const lastW = [...elim.filter((m) => m.side === "winners")].sort(
    (a, b) => b.round - a.round || a.position - b.position,
  )[0];
  if (!elim.some((m) => m.side === "losers") && lastW?.winnerId) return entrantById(t, lastW.winnerId);
  return null;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
