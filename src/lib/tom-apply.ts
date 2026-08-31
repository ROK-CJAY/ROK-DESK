import { clampBracketSize, blankEntrant, emptySlot, switchGame, type Entrant, type TournamentState } from "@/lib/tournament-types";
import type { TomPlayer, TomReports } from "@/lib/tom-reports";
import type { TomTdfImport } from "@/lib/tom-tdf";
import type { GameId } from "@/lib/games";

export function applyTomReports(prev: TournamentState, reports: TomReports): TournamentState {
  if (!reports.players.length && !reports.pairings.length) {
    throw new Error("No players or pairings found in those TOM reports.");
  }

  const entrants = [...prev.entrants];
  const byId = new Map<string, number>();
  const byName = new Map<string, number>();
  const indexMaps = () => {
    byId.clear();
    byName.clear();
    entrants.forEach((e, i) => {
      if (e.playerId) byId.set(e.playerId, i);
      const key = e.name.trim().toLowerCase();
      if (key && !byName.has(key)) byName.set(key, i);
    });
  };
  indexMaps();

  const upsert = (row: TomPlayer): Entrant => {
    const existingIndex = (row.playerId ? byId.get(row.playerId) : undefined) ?? byName.get(row.name.trim().toLowerCase());
    if (existingIndex != null) {
      const prevPlayer = entrants[existingIndex]!;
      const next: Entrant = {
        ...prevPlayer,
        name: row.name || prevPlayer.name,
        playerId: row.playerId || prevPlayer.playerId,
        ageDivision: row.division || prevPlayer.ageDivision,
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
      name: row.name,
      playerId: row.playerId,
      ageDivision: row.division,
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
  const matches = reports.pairings.length
    ? reports.pairings.map((row, i) => {
        const p1 = upsert(row.p1);
        const p2 = row.p2 ? upsert(row.p2) : null;
        return {
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
        };
      })
    : prev.matches;

  const liveIds = new Set(matches.map((m) => m.id));
  const keepStream = (id: string | null) => (id && liveIds.has(id) ? id : null);
  const size = clampBracketSize(Math.max(entrants.filter((e) => !e.dropped).length, reports.pairings.length * 2, 2));

  return {
    ...prev,
    name: prev.name.trim() ? prev.name : reports.eventName || prev.name,
    bracketType: cut ? prev.bracketType === "double" ? "double" : "single" : "swiss",
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
