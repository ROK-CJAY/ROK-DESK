import {
  DRAW_ID,
  type BracketMatch,
  type BracketSize,
  type BracketType,
  type BracketViewId,
  type Entrant,
  type MatchSlot,
  type SlotId,
  type TournamentState,
} from "@/lib/tournament-types";

function emptySlot(): MatchSlot {
  return { entrantId: null, score: 0 };
}

function makeMatch(partial: Omit<BracketMatch, "p1" | "p2" | "winnerId"> & Partial<BracketMatch>): BracketMatch {
  return {
    p1: emptySlot(),
    p2: emptySlot(),
    winnerId: null,
    ...partial,
  };
}

export function generateSeeding(size: number): number[] {
  let slots = [1];
  while (slots.length < size) {
    const next: number[] = [];
    const sum = slots.length * 2 + 1;
    for (const seed of slots) {
      next.push(seed, sum - seed);
    }
    slots = next;
  }
  return slots;
}

function winnersLabel(type: BracketType, size: number, round: number, total: number): string {
  const remaining = size / 2 ** (round - 1);
  const prefix = type === "double" ? "Winners " : "";
  if (round === total) return type === "double" ? "Winners Final" : "Grand Final";
  if (remaining === 4) return `${prefix}Semifinals`;
  if (remaining === 8) return `${prefix}Quarterfinals`;
  if (remaining === 16) return `${prefix}Round of 16`;
  if (remaining === 32) return `${prefix}Round of 32`;
  return `${prefix}Round ${round}`;
}

export function defaultSwissRounds(size: number): number {
  if (size <= 4) return 3;
  if (size <= 8) return 3;
  if (size <= 16) return 5;
  return 6;
}

export type Standing = {
  entrantId: string;
  wins: number;
  losses: number;
  draws: number;
  matchPoints: number;
  oppMatchWin: number;
  gamesFor: number;
  gamesAgainst: number;
};

export function generateBracket(
  type: BracketType,
  size: BracketSize,
  entrants: Entrant[],
  swissRounds = defaultSwissRounds(size),
): BracketMatch[] {
  if (type === "swiss") {
    return pairSwissFirstRound(entrants, size);
  }
  const bySeed = new Map(entrants.filter((e) => !e.dropped).map((e) => [e.seed, e]));
  const order = generateSeeding(size);
  const wRounds = Math.round(Math.log2(size));
  const matches: BracketMatch[] = [];

  for (let r = 1; r <= wRounds; r += 1) {
    const count = size / 2 ** r;
    for (let i = 0; i < count; i += 1) {
      const id = `w-${r}-${i}`;
      const last = r === wRounds;
      const nextId = last ? null : `w-${r + 1}-${Math.floor(i / 2)}`;
      const nextSlot: SlotId | null = last ? null : i % 2 === 0 ? "p1" : "p2";
      matches.push(
        makeMatch({
          id,
          round: r,
          position: i,
          side: type === "single" && last ? "grand" : "winners",
          nextWinnerMatchId: nextId,
          nextWinnerSlot: nextSlot,
          nextLoserMatchId: null,
          nextLoserSlot: null,
          label: winnersLabel(type, size, r, wRounds),
        }),
      );
    }
  }

  if (type === "single") {
    placeSeeds(matches, order, bySeed, size);
    autoAdvanceByes(matches);
    return matches;
  }

  buildLosers(matches, size, wRounds);
  placeSeeds(matches, order, bySeed, size);
  autoAdvanceByes(matches);
  void swissRounds;
  return matches;
}

function swissPool(entrants: Entrant[], size: number): Entrant[] {
  return entrants
    .filter((e) => !e.dropped)
    .slice()
    .sort((a, b) => a.seed - b.seed)
    .slice(0, size);
}

function pairSwissFirstRound(entrants: Entrant[], size: number): BracketMatch[] {
  const pool = swissPool(entrants, size);
  const half = Math.ceil(pool.length / 2);
  const matches: BracketMatch[] = [];
  for (let i = 0; i < half; i += 1) {
    const a = pool[i];
    const b = pool[i + half];
    matches.push(
      makeMatch({
        id: `s-1-${i}`,
        round: 1,
        position: i,
        side: "swiss",
        nextWinnerMatchId: null,
        nextWinnerSlot: null,
        nextLoserMatchId: null,
        nextLoserSlot: null,
        label: "Swiss Round 1",
        p1: { entrantId: a?.id ?? null, score: 0 },
        p2: { entrantId: b?.id ?? null, score: 0 },
      }),
    );
  }
  autoAdvanceByes(matches);
  return matches;
}

function playedTogether(matches: BracketMatch[], a: string, b: string): boolean {
  return matches.some((m) => {
    const ids = [m.p1.entrantId, m.p2.entrantId];
    return ids.includes(a) && ids.includes(b);
  });
}

function hadBye(matches: BracketMatch[], id: string): boolean {
  return matches.some(
    (m) =>
      m.winnerId === id &&
      ((m.p1.entrantId === id && !m.p2.entrantId) || (m.p2.entrantId === id && !m.p1.entrantId)),
  );
}

export function computeStandings(t: TournamentState): Standing[] {
  const pool = swissPool(t.entrants, t.size);
  const rows = new Map<string, Standing>();
  for (const e of pool) {
    rows.set(e.id, {
      entrantId: e.id,
      wins: 0,
      losses: 0,
      draws: 0,
      matchPoints: 0,
      oppMatchWin: 0,
      gamesFor: 0,
      gamesAgainst: 0,
    });
  }
  const opponents = new Map<string, string[]>();
  for (const match of t.matches.filter((m) => m.side === "swiss")) {
    const a = match.p1.entrantId;
    const b = match.p2.entrantId;
    if (a && b) {
      opponents.set(a, [...(opponents.get(a) ?? []), b]);
      opponents.set(b, [...(opponents.get(b) ?? []), a]);
    }
    if (!match.winnerId) continue;
    const sa = a ? rows.get(a) : undefined;
    const sb = b ? rows.get(b) : undefined;
    if (match.winnerId === DRAW_ID) {
      if (sa) {
        sa.draws += 1;
        sa.matchPoints += 1;
        sa.gamesFor += match.p1.score;
        sa.gamesAgainst += match.p2.score;
      }
      if (sb) {
        sb.draws += 1;
        sb.matchPoints += 1;
        sb.gamesFor += match.p2.score;
        sb.gamesAgainst += match.p1.score;
      }
      continue;
    }
    if (sa) {
      sa.gamesFor += match.p1.score;
      sa.gamesAgainst += match.p2.score;
      if (match.winnerId === a) {
        sa.wins += 1;
        sa.matchPoints += 3;
      } else if (b) {
        sa.losses += 1;
      }
    }
    if (sb) {
      sb.gamesFor += match.p2.score;
      sb.gamesAgainst += match.p1.score;
      if (match.winnerId === b) {
        sb.wins += 1;
        sb.matchPoints += 3;
      } else if (a) {
        sb.losses += 1;
      }
    }
  }
  for (const row of rows.values()) {
    const opps = opponents.get(row.entrantId) ?? [];
    if (opps.length === 0) {
      row.oppMatchWin = 0.33;
      continue;
    }
    const pcts = opps.map((id) => {
      const o = rows.get(id);
      if (!o) return 0.33;
      const played = o.wins + o.losses + o.draws;
      if (played === 0) return 0.33;
      return Math.max(0.33, o.matchPoints / (played * 3));
    });
    row.oppMatchWin = pcts.reduce((s, n) => s + n, 0) / pcts.length;
  }
  return [...rows.values()].sort((a, b) => {
    if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints;
    if (b.oppMatchWin !== a.oppMatchWin) return b.oppMatchWin - a.oppMatchWin;
    const ga = a.gamesFor - a.gamesAgainst;
    const gb = b.gamesFor - b.gamesAgainst;
    if (gb !== ga) return gb - ga;
    const ea = t.entrants.find((e) => e.id === a.entrantId);
    const eb = t.entrants.find((e) => e.id === b.entrantId);
    return (ea?.seed ?? 99) - (eb?.seed ?? 99);
  });
}

export function currentSwissRound(t: TournamentState): number {
  return t.matches.reduce((max, m) => (m.side === "swiss" ? Math.max(max, m.round) : max), 0);
}

export function swissRoundComplete(t: TournamentState, round: number): boolean {
  const rows = t.matches.filter((m) => m.side === "swiss" && m.round === round);
  return rows.length > 0 && rows.every((m) => Boolean(m.winnerId));
}

export function pairNextSwissRound(t: TournamentState): TournamentState {
  if (t.bracketType !== "swiss") return t;
  const round = currentSwissRound(t);
  if (round === 0) {
    return { ...t, matches: pairSwissFirstRound(t.entrants, t.size), phase: "running" };
  }
  if (!swissRoundComplete(t, round)) return t;
  if (round >= t.swissRounds) {
    return { ...t, phase: "complete" };
  }
  const nextRound = round + 1;
  if (t.matches.some((m) => m.side === "swiss" && m.round === nextRound)) return t;

  const standings = computeStandings(t);
  const used = new Set<string>();
  const pairs: Array<[string, string | null]> = [];

  if (standings.length % 2 === 1) {
    for (let i = standings.length - 1; i >= 0; i -= 1) {
      const id = standings[i].entrantId;
      if (!hadBye(t.matches, id)) {
        pairs.push([id, null]);
        used.add(id);
        break;
      }
    }
  }

  const open = standings.map((s) => s.entrantId).filter((id) => !used.has(id));
  while (open.length > 0) {
    const a = open.shift();
    if (!a) break;
    let idx = open.findIndex((b) => !playedTogether(t.matches, a, b));
    if (idx < 0) idx = 0;
    const b = open.splice(idx, 1)[0] ?? null;
    pairs.push([a, b]);
  }

  const extra = pairs.map(([a, b], i) =>
    makeMatch({
      id: `s-${nextRound}-${i}`,
      round: nextRound,
      position: i,
      side: "swiss",
      nextWinnerMatchId: null,
      nextWinnerSlot: null,
      nextLoserMatchId: null,
      nextLoserSlot: null,
      label: `Swiss Round ${nextRound}`,
      p1: { entrantId: a, score: 0 },
      p2: { entrantId: b, score: 0 },
    }),
  );
  autoAdvanceByes(extra);
  return { ...t, matches: [...t.matches, ...extra], phase: "running" };
}

function buildLosers(matches: BracketMatch[], size: number, wRounds: number) {
  const wr1 = matches.filter((m) => m.side === "winners" && m.round === 1);
  let lRound = 1;
  let prevIds: string[] = [];

  const lr1Count = size / 4;
  const lr1Ids: string[] = [];
  for (let i = 0; i < lr1Count; i += 1) {
    const id = `l-${lRound}-${i}`;
    lr1Ids.push(id);
    const a = wr1[i * 2];
    const b = wr1[i * 2 + 1];
    if (a) {
      a.nextLoserMatchId = id;
      a.nextLoserSlot = "p1";
    }
    if (b) {
      b.nextLoserMatchId = id;
      b.nextLoserSlot = "p2";
    }
    matches.push(
      makeMatch({
        id,
        round: lRound,
        position: i,
        side: "losers",
        nextWinnerMatchId: null,
        nextWinnerSlot: null,
        nextLoserMatchId: null,
        nextLoserSlot: null,
        label: "Losers Round 1",
      }),
    );
  }
  prevIds = lr1Ids;

  for (let wr = 2; wr <= wRounds; wr += 1) {
    const wMatches = matches.filter((m) => m.side === "winners" && m.round === wr);
    lRound += 1;
    const dropIds: string[] = [];
    for (let i = 0; i < wMatches.length; i += 1) {
      const id = `l-${lRound}-${i}`;
      dropIds.push(id);
      const fromL = prevIds[i];
      const fromW = wMatches[i];
      const drop = matches.find((m) => m.id === fromL);
      if (drop) {
        drop.nextWinnerMatchId = id;
        drop.nextWinnerSlot = "p1";
      }
      if (fromW) {
        fromW.nextLoserMatchId = id;
        fromW.nextLoserSlot = "p2";
      }
      matches.push(
        makeMatch({
          id,
          round: lRound,
          position: i,
          side: "losers",
          nextWinnerMatchId: null,
          nextWinnerSlot: null,
          nextLoserMatchId: null,
          nextLoserSlot: null,
          label: wr === wRounds ? "Losers Final" : `Losers Round ${lRound}`,
        }),
      );
    }
    prevIds = dropIds;

    if (prevIds.length > 1) {
      lRound += 1;
      const compactIds: string[] = [];
      const count = prevIds.length / 2;
      for (let i = 0; i < count; i += 1) {
        const id = `l-${lRound}-${i}`;
        compactIds.push(id);
        const a = matches.find((m) => m.id === prevIds[i * 2]);
        const b = matches.find((m) => m.id === prevIds[i * 2 + 1]);
        if (a) {
          a.nextWinnerMatchId = id;
          a.nextWinnerSlot = "p1";
        }
        if (b) {
          b.nextWinnerMatchId = id;
          b.nextWinnerSlot = "p2";
        }
        matches.push(
          makeMatch({
            id,
            round: lRound,
            position: i,
            side: "losers",
            nextWinnerMatchId: null,
            nextWinnerSlot: null,
            nextLoserMatchId: null,
            nextLoserSlot: null,
            label: `Losers Round ${lRound}`,
          }),
        );
      }
      prevIds = compactIds;
    }
  }

  const wf = matches.find((m) => m.side === "winners" && m.round === wRounds);
  const lf = matches.find((m) => m.id === prevIds[0]);
  const gf1 = makeMatch({
    id: "gf-1",
    round: 1,
    position: 0,
    side: "grand",
    nextWinnerMatchId: "gf-2",
    nextWinnerSlot: "p1",
    nextLoserMatchId: "gf-2",
    nextLoserSlot: "p2",
    label: "Grand Final",
  });
  const gf2 = makeMatch({
    id: "gf-2",
    round: 2,
    position: 0,
    side: "grand",
    nextWinnerMatchId: null,
    nextWinnerSlot: null,
    nextLoserMatchId: null,
    nextLoserSlot: null,
    label: "Grand Final Reset",
  });
  if (wf) {
    wf.nextWinnerMatchId = "gf-1";
    wf.nextWinnerSlot = "p1";
  }
  if (lf) {
    lf.nextWinnerMatchId = "gf-1";
    lf.nextWinnerSlot = "p2";
    lf.label = "Losers Final";
  }
  matches.push(gf1, gf2);
}

function placeSeeds(
  matches: BracketMatch[],
  order: number[],
  bySeed: Map<number, Entrant>,
  size: number,
) {
  const first = matches.filter((m) => m.side === "winners" && m.round === 1);
  for (let i = 0; i < size / 2; i += 1) {
    const match = first[i];
    if (!match) continue;
    const s1 = order[i * 2];
    const s2 = order[i * 2 + 1];
    match.p1.entrantId = (s1 && bySeed.get(s1)?.id) || null;
    match.p2.entrantId = (s2 && bySeed.get(s2)?.id) || null;
  }
}

function autoAdvanceByes(matches: BracketMatch[]) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const match of matches) {
      if (match.winnerId) continue;
      const a = match.p1.entrantId;
      const b = match.p2.entrantId;
      if (a && !b) {
        applyAdvance(matches, match, a);
        changed = true;
      } else if (b && !a) {
        applyAdvance(matches, match, b);
        changed = true;
      }
    }
  }
}

function applyAdvance(matches: BracketMatch[], match: BracketMatch, winnerId: string) {
  match.winnerId = winnerId;
  const loserId =
    match.p1.entrantId === winnerId ? match.p2.entrantId : match.p1.entrantId;
  placeInto(matches, match.nextWinnerMatchId, match.nextWinnerSlot, winnerId);
  if (loserId) placeInto(matches, match.nextLoserMatchId, match.nextLoserSlot, loserId);
}

function placeInto(
  matches: BracketMatch[],
  matchId: string | null,
  slot: SlotId | null,
  entrantId: string,
) {
  if (!matchId || !slot) return;
  const next = matches.find((m) => m.id === matchId);
  if (!next) return;
  next[slot] = { entrantId, score: 0 };
}

function clearDownstream(matches: BracketMatch[], fromId: string, entrantId: string | null) {
  if (!entrantId) return;
  const seen = new Set<string>();
  const walk = (id: string | null) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    const match = matches.find((m) => m.id === id);
    if (!match) return;
    for (const slot of ["p1", "p2"] as const) {
      if (match[slot].entrantId === entrantId) {
        match[slot] = emptySlot();
      }
    }
    if (match.winnerId === entrantId) match.winnerId = null;
    walk(match.nextWinnerMatchId);
    walk(match.nextLoserMatchId);
  };
  const start = matches.find((m) => m.id === fromId);
  walk(start?.nextWinnerMatchId ?? null);
  walk(start?.nextLoserMatchId ?? null);
}

export function reportWinner(t: TournamentState, matchId: string, winnerId: string): TournamentState {
  const matches = t.matches.map((m) => ({
    ...m,
    p1: { ...m.p1 },
    p2: { ...m.p2 },
  }));
  const match = matches.find((m) => m.id === matchId);
  if (!match) return t;
  const ids = [match.p1.entrantId, match.p2.entrantId];
  if (winnerId !== DRAW_ID && !ids.includes(winnerId)) return t;

  if (t.bracketType === "swiss") {
    match.winnerId = winnerId;
    const next = { ...t, matches };
    const round = match.round;
    const finished = swissRoundComplete(next, t.swissRounds) && currentSwissRound(next) >= t.swissRounds;
    return { ...next, phase: finished ? "complete" : "running" };
  }

  if (match.winnerId && match.winnerId !== winnerId) {
    clearDownstream(matches, match.id, match.winnerId);
    const prevLoser = ids.find((id) => id && id !== match.winnerId) ?? null;
    clearDownstream(matches, match.id, prevLoser);
  }

  if (match.id === "gf-1") {
    const wfWinner = match.p1.entrantId;
    if (winnerId === wfWinner) {
      match.winnerId = winnerId;
      const gf2 = matches.find((m) => m.id === "gf-2");
      if (gf2) {
        gf2.p1 = emptySlot();
        gf2.p2 = emptySlot();
        gf2.winnerId = null;
      }
    } else {
      applyAdvance(matches, match, winnerId);
    }
  } else {
    applyAdvance(matches, match, winnerId);
  }

  const champ = resolveChampion({ ...t, matches });
  return {
    ...t,
    matches,
    phase: champ ? "complete" : "running",
  };
}

function resolveChampion(t: TournamentState): string | null {
  const gf2 = t.matches.find((m) => m.id === "gf-2");
  if (gf2?.winnerId) return gf2.winnerId;
  const gf1 = t.matches.find((m) => m.id === "gf-1");
  if (gf1?.winnerId && gf1.winnerId === gf1.p1.entrantId) return gf1.winnerId;
  if (t.bracketType === "single") {
    const last = t.matches.find((m) => m.side === "grand" || (m.side === "winners" && !m.nextWinnerMatchId));
    return last?.winnerId ?? null;
  }
  if (t.bracketType === "swiss") {
    const table = computeStandings(t);
    const done = swissRoundComplete(t, t.swissRounds) && currentSwissRound(t) >= t.swissRounds;
    return done ? table[0]?.entrantId ?? null : null;
  }
  return null;
}

export function setMatchScore(
  t: TournamentState,
  matchId: string,
  slot: SlotId,
  score: number,
): TournamentState {
  return {
    ...t,
    matches: t.matches.map((m) =>
      m.id === matchId ? { ...m, [slot]: { ...m[slot], score: Math.max(0, score) } } : m,
    ),
  };
}

export function matchesForView(t: TournamentState, view: BracketViewId): BracketMatch[] {
  const all = t.matches;
  if (t.bracketType === "swiss") {
    if (view === "standings") return [];
    const current = currentSwissRound(t);
    if (view === "full") return all;
    return all.filter((m) => m.round === current);
  }
  if (view === "full" || view === "standings") return all;
  if (view === "winners") return all.filter((m) => m.side === "winners" || m.side === "grand");
  if (view === "losers") return all.filter((m) => m.side === "losers" || m.side === "grand");
  if (view === "finals") {
    return all.filter((m) => m.side === "grand" || /final/i.test(m.label));
  }
  const cutoff = view === "top16" ? 16 : view === "top8" ? 8 : 4;
  return all.filter((m) => {
    if (m.side === "grand") return true;
    if (m.side === "winners") {
      const remaining = t.size / 2 ** (m.round - 1);
      return remaining <= cutoff;
    }
    if (m.side === "losers") {
      const maxL = Math.max(0, ...all.filter((x) => x.side === "losers").map((x) => x.round));
      const keepFrom = view === "top4" ? Math.max(1, maxL - 1) : view === "top8" ? Math.max(1, maxL - 3) : 1;
      return m.round >= keepFrom;
    }
    return false;
  });
}

export function groupByRound(matches: BracketMatch[]) {
  const sides: Array<"winners" | "losers" | "grand" | "swiss"> = ["winners", "losers", "grand", "swiss"];
  return sides
    .map((side) => {
      const rows = matches.filter((m) => m.side === side);
      if (rows.length === 0) return null;
      const rounds = [...new Set(rows.map((m) => m.round))].sort((a, b) => a - b);
      return {
        side,
        rounds: rounds.map((round) => ({
          round,
          label: rows.find((m) => m.round === round)?.label ?? `Round ${round}`,
          matches: rows.filter((m) => m.round === round).sort((a, b) => a.position - b.position),
        })),
      };
    })
    .filter((g): g is NonNullable<typeof g> => Boolean(g));
}

export function readyMatches(t: TournamentState): BracketMatch[] {
  return t.matches.filter(
    (m) => m.p1.entrantId && m.p2.entrantId && !m.winnerId && m.id !== "gf-2",
  );
}
