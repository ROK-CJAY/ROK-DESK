import { clampBracketSize, blankEntrant, emptySlot, snapshotDesk, switchGame, type Entrant, type GameDesk, type TournamentState } from "@/lib/tournament-types";
import { cleanTomPlayerName, collapseTomEntrants, isJunkTomPlayerName, type TomPlayer, type TomReports } from "@/lib/tom-reports";
import type { TomTdfImport } from "@/lib/tom-tdf";
import { playAgeDivisionOf, type GameId } from "@/lib/games";

export function applyTomReports(prev: TournamentState, reports: TomReports): TournamentState {
  if (!reports.players.length && !reports.pairings.length) {
    throw new Error("No players or pairings found in those TOM reports.");
  }

  const eventName = reports.eventName || prev.name;
  const collapsed = collapseTomEntrants(prev.entrants, eventName);
  const idMap = collapsed.idMap;
  const entrants = [...collapsed.rows];
  const byId = new Map<string, number>();
  const byName = new Map<string, number>();
  const indexMaps = () => {
    byId.clear();
    byName.clear();
    entrants.forEach((e, i) => {
      if (e.playerId) byId.set(e.playerId, i);
      const key = cleanTomPlayerName(e.name).trim().toLowerCase();
      if (key && !byName.has(key)) byName.set(key, i);
    });
  };
  indexMaps();

  const upsert = (row: TomPlayer): Entrant | null => {
    const name = cleanTomPlayerName(row.name);
    if (isJunkTomPlayerName(name || row.name, eventName) && !row.playerId) return null;
    const existingIndex =
      (row.playerId ? byId.get(row.playerId) : undefined) ?? byName.get(name.trim().toLowerCase());
    if (existingIndex != null) {
      const prevPlayer = entrants[existingIndex]!;
      const next: Entrant = {
        ...prevPlayer,
        name: name || prevPlayer.name,
        playerId: row.playerId || prevPlayer.playerId,
        ageDivision: row.division || prevPlayer.ageDivision || playAgeDivisionOf(prev.gameId) || "",
        dropped: row.dropped ?? prevPlayer.dropped,
        birthDate: row.birthDate || prevPlayer.birthDate,
        trainerName: row.trainerName || prevPlayer.trainerName,
        recordW: row.recordW ?? prevPlayer.recordW,
        recordL: row.recordL ?? prevPlayer.recordL,
        recordD: row.recordD ?? prevPlayer.recordD,
        oppWin: row.oppWin ?? prevPlayer.oppWin,
        oppOppWin: row.oppOppWin ?? prevPlayer.oppOppWin,
      };
      entrants[existingIndex] = next;
      return next;
    }
    const created = blankEntrant({
      name,
      playerId: row.playerId,
      ageDivision: row.division || playAgeDivisionOf(prev.gameId) || "",
      dropped: Boolean(row.dropped),
      seed: entrants.length + 1,
      birthDate: row.birthDate ?? "",
      trainerName: row.trainerName ?? "",
      recordW: row.recordW ?? 0,
      recordL: row.recordL ?? 0,
      recordD: row.recordD ?? 0,
      oppWin: row.oppWin ?? 0,
      oppOppWin: row.oppOppWin ?? 0,
    });
    entrants.push(created);
    indexMaps();
    return created;
  };

  for (const row of reports.players) upsert(row);

  const round = reports.currentRound || 1;
  const roundLabel = reports.roundLabel || `Round ${round}`;
  const cut = /quarter|semi|final|top\s*\d/i.test(roundLabel);
  const liveIds = new Set(entrants.map((e) => e.id));
  const remapSlot = (slot: { entrantId: string | null; score: number }) => ({
    ...slot,
    entrantId: slot.entrantId ? (idMap.get(slot.entrantId) ?? (liveIds.has(slot.entrantId) ? slot.entrantId : null)) : null,
  });
  const matches = reports.pairings.length
    ? reports.pairings.flatMap((row, i) => {
        const p1 = upsert(row.p1);
        if (!p1) return [];
        const p2 = row.p2 ? upsert(row.p2) : null;
        return [
          {
            id: `tom-t${row.table}`,
            round,
            position: i,
            side: cut ? ("winners" as const) : ("swiss" as const),
            p1: { entrantId: p1.id, score: 0 },
            p2: { entrantId: p2?.id ?? null, score: 0 },
            p3: emptySlot(),
            p4: emptySlot(),
            winnerId: null,
            nextWinnerMatchId: null,
            nextWinnerSlot: null,
            nextLoserMatchId: null,
            nextLoserSlot: null,
            label: `${roundLabel} · Table ${row.table}`,
          },
        ];
      })
    : prev.matches.map((match) => ({
        ...match,
        p1: remapSlot(match.p1),
        p2: remapSlot(match.p2),
        p3: remapSlot(match.p3),
        p4: remapSlot(match.p4),
        winnerId: match.winnerId
          ? (idMap.get(match.winnerId) ?? (liveIds.has(match.winnerId) ? match.winnerId : null))
          : null,
      }));

  const matchIds = new Set(matches.map((m) => m.id));
  const keepStream = (id: string | null) => (id && matchIds.has(id) ? id : null);
  const size = clampBracketSize(Math.max(entrants.filter((e) => !e.dropped).length, reports.pairings.length * 2, 2));

  return {
    ...prev,
    name: prev.name.trim() ? prev.name : reports.eventName || prev.name,
    bracketType: cut ? (prev.bracketType === "double" ? "double" : "single") : "swiss",
    size,
    phase: matches.length ? "running" : prev.phase,
    overlayView: cut ? prev.overlayView : "standings",
    swissRounds: reports.totalRounds || prev.swissRounds,
    entrants,
    matches,
    streamMatchId: keepStream(prev.streamMatchId),
    streamMatchId2: keepStream(prev.streamMatchId2),
    streamMatchId3: keepStream(prev.streamMatchId3),
  };
}

export function applyTomTdf(prev: TournamentState, file: TomTdfImport): TournamentState {
  const base = file.gameId !== prev.gameId ? switchGame(prev, file.gameId) : prev;
  const reports: TomReports = {
    eventName: file.name,
    roundLabel: "",
    currentRound: 0,
    totalRounds: 0,
    players: file.players,
    pairings: [],
  };
  const next = applyTomReports(base, reports);
  return {
    ...next,
    gameId: file.gameId,
    name: next.name.trim() ? next.name : file.name || next.name,
    tomCity: file.city || next.tomCity,
    tomState: file.state || next.tomState,
    tomCountry: file.country || next.tomCountry,
    tomOrganizerName: file.organizerName || next.tomOrganizerName,
    tomOrganizerPopId: file.organizerPopId || next.tomOrganizerPopId,
    tomStartDate: file.startDate || next.tomStartDate,
    bracketType: "swiss",
    overlayView: "standings",
  };
}

export function applyTomToGame(prev: TournamentState, reports: TomReports, gameId?: GameId): TournamentState {
  const base = gameId && gameId !== prev.gameId ? switchGame(prev, gameId) : prev;
  return applyTomReports(base, reports);
}

function remapDesk(desk: GameDesk, eventName: string): { desk: GameDesk; changed: boolean } {
  const { rows, idMap } = collapseTomEntrants(desk.entrants, eventName);
  const liveIds = new Set(rows.map((e) => e.id));
  const remapId = (id: string | null) =>
    id ? (idMap.get(id) ?? (liveIds.has(id) ? id : null)) : null;
  const same =
    rows.length === desk.entrants.length &&
    rows.every((row, i) => row.id === desk.entrants[i]?.id && row.name === desk.entrants[i]?.name);
  if (same) return { desk, changed: false };
  return {
    changed: true,
    desk: {
      ...desk,
      entrants: rows,
      matches: desk.matches.map((match) => ({
        ...match,
        p1: { ...match.p1, entrantId: remapId(match.p1.entrantId) },
        p2: { ...match.p2, entrantId: remapId(match.p2.entrantId) },
        p3: { ...match.p3, entrantId: remapId(match.p3.entrantId) },
        p4: { ...match.p4, entrantId: remapId(match.p4.entrantId) },
        winnerId: remapId(match.winnerId),
      })),
    },
  };
}

/** Drop event-title rows and merge `Name (W/L/T (pts) - MA)` copies already on a desk. */
export function sanitizeTomRoster(t: TournamentState): TournamentState {
  const live = remapDesk(snapshotDesk(t), t.name);
  let changed = live.changed;
  const desks: TournamentState["desks"] = { ...t.desks };
  for (const [id, desk] of Object.entries(desks)) {
    if (!desk) continue;
    const next = remapDesk(desk, desk.name || t.name);
    if (next.changed) changed = true;
    desks[id as keyof TournamentState["desks"]] = next.desk;
  }
  desks[t.gameId] = live.desk;
  if (!changed) return t;
  return { ...t, ...live.desk, desks };
}
