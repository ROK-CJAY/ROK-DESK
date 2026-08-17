import { extraFieldFor, gameOf, isCommanderLane, type GameId } from "@/lib/games";
import { blankPlayer, parseDesk, stripLane, type Caster, type DeskState, type PlayerSide, type QueueMatch } from "@/lib/desk-types";
import { blankEntrant, type Entrant, type GameDesk, type TournamentState } from "@/lib/tournament-types";
import { sampleTeamA, sampleTeamB, type TeamMon } from "@/lib/pokemon-vgc";

export type TestPlayer = {
  name: string;
  tag: string;
  pronouns: string;
  country: string;
  deck: string;
  team?: TeamMon[];
};

const PEOPLE: Omit<TestPlayer, "deck" | "team">[] = [
  { name: "Maya Cruz", tag: "pocketstorm", pronouns: "she/her", country: "US" },
  { name: "Luis Ortega", tag: "tidebound", pronouns: "he/him", country: "US" },
  { name: "Ana Delgado", tag: "anacuts", pronouns: "she/her", country: "MX" },
  { name: "Kenji Mori", tag: "voidline", pronouns: "he/him", country: "JP" },
  { name: "Chris Bell", tag: "bellcurve", pronouns: "he/him", country: "US" },
  { name: "Priya Shah", tag: "priyaplays", pronouns: "she/her", country: "GB" },
  { name: "Jordan Hale", tag: "praxis", pronouns: "they/them", country: "US" },
  { name: "Samir Cole", tag: "kinnanfan", pronouns: "he/him", country: "CA" },
];

const DECKS: Record<GameId, string[]> = {
  "pokemon-tcg": [
    "Charizard ex",
    "Dragapult",
    "Gardevoir",
    "Raging Bolt",
    "Lugia",
    "Pidgeot control",
    "Roaring Moon",
    "Lost Zone box",
  ],
  "pokemon-vgc": [
    "Scovillain / Archaludon",
    "Incineroar / Flutter Mane",
    "Calyrex Ice",
    "Miraidon",
    "Kyogre rain",
    "Indeedee / Armarouge",
    "Urshifu rapid",
    "Ogerpon wellspring",
  ],
  mtg: [
    "Domain Zoo",
    "Izzet Phoenix",
    "Rakdos Midrange",
    "Azorius Control",
    "Mono-Red Aggro",
    "Dimir Murktide",
    "Boros Energy",
    "Golgari Midrange",
  ],
  yugioh: [
    "Snake-Eye",
    "Tenpai Dragon",
    "Yubel",
    "Voiceless Voice",
    "Fire King",
    "Branded",
    "Centur-Ion",
    "Rescue-ACE",
  ],
  "one-piece": [
    "Red Shanks",
    "Black Luffy",
    "Purple Luffy",
    "Blue Doflamingo",
    "Green Uta",
    "Yellow Katakuri",
    "Black Imu",
    "Red Whitebeard",
  ],
  lorcana: [
    "Amber/Steel",
    "Ruby Aggro",
    "Sapphire/Steel",
    "Amethyst Control",
    "Emerald Tempo",
    "Amber Songs",
    "Ruby/Sapphire",
    "Steel Challenger",
  ],
  swu: ["Vader", "Sabine", "Luke", "Boba Fett", "Han Solo", "Iden Versio", "Leia", "Thrawn"],
  riftbound: ["Jinx", "Volibear", "Annie", "Lee Sin", "Ahri", "Sett", "Kai'Sa", "Master Yi"],
};

const COMMANDERS = [
  "Atraxa",
  "Kinnan",
  "Kenrith",
  "Tymna / Kraum",
  "Winota",
  "Najeela",
  "Korvold",
  "Yoshimaru / Bruse",
];

export function emptyCasters(): [Caster, Caster] {
  return [
    { name: "", handle: "", role: "Play-by-play" },
    { name: "", handle: "", role: "Color" },
  ];
}

export function testCasters(): [Caster, Caster] {
  return [
    { name: "Rook", handle: "rookcasts", role: "Play-by-play" },
    { name: "Marisol Vega", handle: "mariplays", role: "Color" },
  ];
}

export function testPlayersFor(gameId: GameId, formatName: string): TestPlayer[] {
  const commander = isCommanderLane({ gameId, formatName });
  const decks = commander ? COMMANDERS : (DECKS[gameId] ?? DECKS["pokemon-tcg"]);
  return PEOPLE.map((person, i) => ({
    ...person,
    deck: decks[i] ?? `Seat ${i + 1}`,
    team: gameId === "pokemon-vgc" ? (i === 0 ? sampleTeamA() : i === 1 ? sampleTeamB() : undefined) : undefined,
  }));
}

export function testEntrants(gameId: GameId, formatName: string): Entrant[] {
  return testPlayersFor(gameId, formatName).map((row, i) =>
    blankEntrant({
      name: row.name,
      tag: row.tag,
      pronouns: row.pronouns,
      country: row.country,
      deck: row.deck,
      seed: i + 1,
      team: row.team,
    }),
  );
}

export function applyTestTournament(t: TournamentState): Partial<TournamentState> {
  const game = gameOf(t.gameId);
  return {
    name: t.name.trim() && !isLegacyDemoName(t.name) ? t.name : `${game.short} Test`,
    size: 8,
    phase: "setup",
    matches: [],
    streamMatchId: null,
    entrants: testEntrants(t.gameId, t.formatName),
    testMode: true,
  };
}

export function applyTestDesk(desk: DeskState): Partial<DeskState> {
  const game = gameOf(desk.gameId);
  const players = testPlayersFor(desk.gameId, desk.formatName);
  const seats = Math.max(2, desk.tableSize);
  const featured = players.slice(0, seats);
  const rest = players.slice(seats);
  const queue: QueueMatch[] = [];
  for (let i = 0; i < rest.length; i += 2) {
    const a = rest[i];
    const b = rest[i + 1];
    if (!a || !b) break;
    queue.push({
      id: `q-test-${i}`,
      p1: a.name,
      p2: b.name,
      round: "Up next",
      note: extraFieldFor(desk.gameId, desk.formatName).label === "Commander" ? `${a.deck} / ${b.deck}` : a.deck,
    });
  }
  const asSide = (row: TestPlayer | undefined, fallbackResource: number): PlayerSide =>
    blankPlayer({
      name: row?.name ?? "",
      tag: row?.tag ?? "",
      pronouns: row?.pronouns ?? "",
      country: row?.country ?? "US",
      archetype: row?.deck ?? "",
      resource: fallbackResource,
      team: row?.team,
    });

  return {
    eventName: desk.eventName.trim() && !isLegacyDemoName(desk.eventName) ? desk.eventName : `${game.short} Test`,
    eventPhase: desk.eventPhase.trim() || "Swiss",
    roundName: desk.roundName.trim() || "Round 1",
    sponsorLine: desk.sponsorLine.trim() || "ROK Esports",
    p1: asSide(featured[0], desk.p1.resource),
    p2: asSide(featured[1], desk.p2.resource),
    p3: asSide(featured[2], desk.p3.resource),
    p4: asSide(featured[3], desk.p4.resource),
    casters: testCasters(),
    queue,
    winnerSide: null,
    gameWinnerSide: null,
    testMode: true,
  };
}

export function isLegacyDemoName(name: string): boolean {
  return name.trim() === "ROK League Cup";
}

export function isLegacyDemoDesk(desk: DeskState): boolean {
  return (
    isLegacyDemoName(desk.eventName) &&
    desk.p1.name === "Maya Cruz" &&
    desk.p2.name === "Luis Ortega" &&
    desk.roundName === "Round 4"
  );
}

export function isLegacyDemoTournament(t: TournamentState): boolean {
  return (
    isLegacyDemoName(t.name) &&
    t.entrants[0]?.name === "Maya Cruz" &&
    t.entrants[0]?.deck === "Charizard ex" &&
    t.entrants.length === 8
  );
}

export function clearLegacyDesk(desk: DeskState): DeskState {
  let next = desk;
  if (isLegacyDemoDesk(desk)) {
    next = {
      ...desk,
      eventName: "",
      eventPhase: "",
      roundName: "",
      sponsorLine: "",
      p1: blankPlayer({ resource: desk.p1.resource }),
      p2: blankPlayer({ resource: desk.p2.resource }),
      p3: blankPlayer({ resource: desk.p3.resource }),
      p4: blankPlayer({ resource: desk.p4.resource }),
      casters: emptyCasters(),
      queue: [],
      winnerSide: null,
      gameWinnerSide: null,
      testMode: false,
      testSnapshot: null,
    };
  }
  return stripTestFromDesk(next);
}

export function clearLegacyTournament(t: TournamentState): TournamentState {
  let next = t;
  if (isLegacyDemoTournament(t)) {
    next = {
      ...t,
      name: "",
      phase: "setup",
      matches: [],
      streamMatchId: null,
      entrants: [],
      testMode: false,
      testSnapshot: null,
    };
  }
  return stripTestFromTournament(next);
}

export function deskLooksLikeTest(desk: DeskState): boolean {
  return desk.testMode || (desk.p1.name === "Maya Cruz" && desk.eventName.trim().endsWith("Test"));
}

export function tournamentLooksLikeTest(t: TournamentState): boolean {
  return t.testMode || (t.entrants[0]?.name === "Maya Cruz" && t.name.trim().endsWith("Test") && t.entrants.length === 8);
}

function gameDeskLooksLikeTest(d: GameDesk): boolean {
  return d.testMode || (d.entrants[0]?.name === "Maya Cruz" && d.entrants.length === 8);
}

export function stripTestFromDesk(desk: DeskState): DeskState {
  let next = deskLooksLikeTest(desk) ? { ...desk, ...toggleTestDesk(desk) } : desk;
  let lanesChanged = false;
  const lanes = { ...(next.lanes ?? {}) };
  for (const key of Object.keys(lanes) as GameId[]) {
    const parsed = parseDesk(lanes[key]);
    if (!parsed || !deskLooksLikeTest(parsed)) continue;
    lanes[key] = stripLane({ ...parsed, ...toggleTestDesk(parsed) });
    lanesChanged = true;
  }
  if (next === desk && !lanesChanged) return desk;
  return { ...next, lanes, testMode: false, testSnapshot: next.testSnapshot ?? null };
}

export function stripTestFromTournament(t: TournamentState): TournamentState {
  let next = tournamentLooksLikeTest(t) ? { ...t, ...toggleTestTournament(t) } : t;
  let desksChanged = false;
  const desks = { ...next.desks };
  for (const key of Object.keys(desks) as GameId[]) {
    const desk = desks[key];
    if (!desk || !gameDeskLooksLikeTest(desk)) continue;
    const snap = desk.testSnapshot;
    desks[key] = {
      ...desk,
      entrants: Array.isArray(snap?.entrants) ? (snap.entrants as GameDesk["entrants"]) : [],
      matches: Array.isArray(snap?.matches) ? (snap.matches as GameDesk["matches"]) : [],
      phase: snap?.phase === "running" || snap?.phase === "complete" ? snap.phase : "setup",
      streamMatchId: typeof snap?.streamMatchId === "string" ? snap.streamMatchId : null,
      testMode: false,
      testSnapshot: null,
    };
    desksChanged = true;
  }
  if (next === t && !desksChanged) return t;
  return { ...next, desks, testMode: false, testSnapshot: next.testSnapshot ?? null };
}

function captureDesk(desk: DeskState): Record<string, unknown> {
  return {
    eventName: desk.eventName,
    eventPhase: desk.eventPhase,
    roundName: desk.roundName,
    sponsorLine: desk.sponsorLine,
    p1: desk.p1,
    p2: desk.p2,
    p3: desk.p3,
    p4: desk.p4,
    casters: desk.casters,
    queue: desk.queue,
    winnerSide: desk.winnerSide,
    gameWinnerSide: desk.gameWinnerSide,
  };
}

function emptyDeskPeople(desk: DeskState): Partial<DeskState> {
  return {
    eventName: desk.eventName.trim().endsWith("Test") ? "" : desk.eventName,
    eventPhase: "",
    roundName: "",
    sponsorLine: "",
    p1: blankPlayer({ resource: desk.p1.resource }),
    p2: blankPlayer({ resource: desk.p2.resource }),
    p3: blankPlayer({ resource: desk.p3.resource }),
    p4: blankPlayer({ resource: desk.p4.resource }),
    casters: emptyCasters(),
    queue: [],
    winnerSide: null,
    gameWinnerSide: null,
  };
}

export function toggleTestDesk(desk: DeskState): Partial<DeskState> {
  if (deskLooksLikeTest(desk)) {
    const snap = desk.testSnapshot;
    return {
      ...(snap ?? emptyDeskPeople(desk)),
      testMode: false,
      testSnapshot: null,
    };
  }
  return {
    ...applyTestDesk(desk),
    testMode: true,
    testSnapshot: captureDesk(desk),
  };
}

function captureTournament(t: TournamentState): Record<string, unknown> {
  return {
    name: t.name,
    size: t.size,
    phase: t.phase,
    matches: t.matches,
    streamMatchId: t.streamMatchId,
    entrants: t.entrants,
    staff: t.staff,
  };
}

export function toggleTestTournament(t: TournamentState): Partial<TournamentState> {
  if (tournamentLooksLikeTest(t)) {
    const snap = t.testSnapshot;
    return {
      ...(snap ?? {
        name: t.name.trim().endsWith("Test") ? "" : t.name,
        phase: "setup" as const,
        matches: [],
        streamMatchId: null,
        entrants: [],
      }),
      testMode: false,
      testSnapshot: null,
    };
  }
  return {
    ...applyTestTournament(t),
    testMode: true,
    testSnapshot: captureTournament(t),
  };
}

