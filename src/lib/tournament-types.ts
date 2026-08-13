import { z } from "zod";
import { type BestOf, type GameId, gameOf } from "@/lib/games";
import { mergeTeam, teamHasMons, type TeamMon } from "@/lib/pokemon-vgc";

export type BracketType = "single" | "double" | "swiss";
export type BracketSize = 4 | 8 | 16 | 32;
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

export function viewsFor(type: BracketType) {
  return BRACKET_VIEWS.filter((v) => v.types.includes(type));
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
};

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

export type TournamentState = {
  version: number;
  name: string;
  gameId: GameId;
  formatName: string;
  bracketType: BracketType;
  size: BracketSize;
  bestOf: BestOf;
  phase: TournamentPhase;
  overlayView: BracketViewId;
  streamMatchId: string | null;
  swissRounds: number;
  entrants: Entrant[];
  matches: BracketMatch[];
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

export const tournamentSchema: z.ZodType<TournamentState> = z.object({
  version: z.number(),
  name: z.string(),
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
  formatName: z.string(),
  bracketType: z.enum(["single", "double", "swiss"]),
  size: z.union([z.literal(4), z.literal(8), z.literal(16), z.literal(32)]),
  bestOf: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(7)]),
  phase: z.enum(["setup", "running", "complete"]),
  overlayView: z.enum(["full", "winners", "losers", "top16", "top8", "top4", "finals", "standings"]),
  streamMatchId: z.string().nullable(),
  swissRounds: z.number(),
  entrants: z.array(entrantSchema),
  matches: z.array(matchSchema),
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
    ...overrides,
    team: mergeTeam(overrides.team),
  };
}

export function teamSheetLabel(team: TeamMon[] | undefined): string {
  if (!teamHasMons(team)) return "";
  const names = (team ?? []).map((mon) => mon.species.trim()).filter(Boolean);
  if (names.length === 0) return "";
  return names.length === 1 ? names[0]! : `${names[0]} +${names.length - 1}`;
}

function demoEntrants(): Entrant[] {
  const rows: [string, string, string, string][] = [
    ["Maya Cruz", "pocketstorm", "Charizard ex", "US"],
    ["Luis Ortega", "tidebound", "Dragapult", "US"],
    ["Ana Delgado", "anacuts", "Gardevoir", "MX"],
    ["Kenji Mori", "voidline", "Raging Bolt", "JP"],
    ["Chris Bell", "bellcurve", "Lugia", "US"],
    ["Priya Shah", "priyaplays", "Pidgeot control", "GB"],
    ["Jordan Hale", "praxis", "Roaring Moon", "US"],
    ["Samir Cole", "kinnanfan", "Lost Zone box", "CA"],
  ];
  return rows.map(([name, tag, deck, country], i) =>
    blankEntrant({ name, tag, deck, country, seed: i + 1, pronouns: i === 2 ? "she/her" : "" }),
  );
}

export function defaultTournament(): TournamentState {
  const game = gameOf("pokemon-tcg");
  return {
    version: 1,
    name: "ROK League Cup",
    gameId: "pokemon-tcg",
    formatName: game.formats[0]?.label ?? "Standard",
    bracketType: "double",
    size: 8,
    bestOf: 3,
    phase: "setup",
    overlayView: "full",
    streamMatchId: null,
    swissRounds: 3,
    entrants: demoEntrants(),
    matches: [],
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
    entrants: Array.isArray(incoming.entrants) ? incoming.entrants : base.entrants,
    matches: Array.isArray(incoming.matches) ? incoming.matches : base.matches,
  };
  const parsed = tournamentSchema.safeParse(merged);
  return parsed.success ? parsed.data : null;
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
  if (t.bracketType === "swiss") return null;
  const grands = t.matches.filter((m) => m.side === "grand");
  const last = [...grands].reverse().find((m) => m.winnerId);
  if (last?.winnerId) return entrantById(t, last.winnerId);
  const lastW = [...t.matches.filter((m) => m.side === "winners")].sort(
    (a, b) => b.round - a.round || a.position - b.position,
  )[0];
  if (t.bracketType === "single" && lastW?.winnerId) return entrantById(t, lastW.winnerId);
  return null;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
