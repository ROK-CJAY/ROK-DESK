import { type BestOf } from "@/lib/games";
import { blankEntrant, DRAW_ID, emptySlot, type BracketMatch, type BracketSide, type Entrant, type TournamentState } from "@/lib/tournament-types";

const API = "https://api.cloudflare.ravensburgerplay.com/hydraproxy/api/v2";
const headers = { Accept: "application/json", Referer: "https://tcg.ravensburgerplay.com/" };

export type PlayHubImport = {
  name: string;
  formatName: string;
  bestOf: BestOf;
  size: number;
  swissRounds: number;
  cutSize: number;
  phase: "setup" | "running" | "complete";
  entrants: Entrant[];
  matches: BracketMatch[];
  summary: string;
};

type RoundRef = { id: number; round: number; side: BracketSide; pairings: boolean };

export function playHubEventId(input: string): string | null {
  const text = input.trim();
  const fromUrl = text.match(/events\/(\d+)/i);
  if (fromUrl) return fromUrl[1] ?? null;
  return /^\d{3,12}$/.test(text) ? text : null;
}

async function readJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(res.status === 404 ? "That Play Hub event was not found." : `Play Hub returned ${res.status}.`);
  return res.json();
}

async function readPages(path: string): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (let page = 1; page <= 30; page += 1) {
    const data = (await readJson(`${API}${path}${path.includes("?") ? "&" : "?"}page=${page}&page_size=500`)) as {
      results?: unknown[];
      next_page_number?: number | null;
    };
    const batch = Array.isArray(data.results) ? data.results : [];
    rows.push(...batch);
    if (!data.next_page_number || batch.length === 0) break;
  }
  return rows;
}

function recordOf(source: unknown): { id: string; [key: string]: unknown } | null {
  return source && typeof source === "object" ? (source as { id: string; [key: string]: unknown }) : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function bestOf(wins: number): BestOf {
  if (wins >= 3) return 5;
  if (wins === 1) return 1;
  return 3;
}

export async function loadPlayHubEvent(raw: string): Promise<PlayHubImport> {
  const eventId = playHubEventId(raw);
  if (!eventId) throw new Error("Paste a Play Hub event link, or just the event number.");
  const event = recordOf(await readJson(`${API}/events/${eventId}/`));
  if (!event) throw new Error("Play Hub did not return that event.");

  const phases = Array.isArray(event.tournament_phases) ? event.tournament_phases : [];
  const rounds: RoundRef[] = [];
  let swissRounds = 0;
  let winsNeeded = 2;
  for (const phase of phases) {
    const row = recordOf(phase);
    if (!row) continue;
    const kind = text(row.round_type);
    const side: BracketSide = kind === "SWISS" ? "swiss" : text(row.phase_name).toLowerCase().includes("loser") ? "losers" : "winners";
    if (side === "swiss") swissRounds += num(row.number_of_rounds) || (Array.isArray(row.rounds) ? row.rounds.length : 0);
    if (num(row.effective_maximum_number_of_game_wins_per_match)) winsNeeded = num(row.effective_maximum_number_of_game_wins_per_match);
    for (const round of Array.isArray(row.rounds) ? row.rounds : []) {
      const item = recordOf(round);
      if (!item) continue;
      rounds.push({
        id: num(item.id),
        round: num(item.round_number),
        side,
        pairings: text(item.pairings_status) === "GENERATED" || text(item.status) === "COMPLETE" || text(item.status) === "IN_PROGRESS",
      });
    }
  }

  const [registrations, standingRows, matchGroups] = await Promise.all([
    readPages(`/events/${eventId}/registrations/`),
    (async () => {
      const ready = [...rounds].reverse().find((round) => round.pairings) ?? rounds[rounds.length - 1];
      if (!ready) return [];
      try {
        const data = recordOf(await readJson(`${API}/tournament-rounds/${ready.id}/standings/`));
        return Array.isArray(data?.standings) ? data.standings : [];
      } catch {
        return [];
      }
    })(),
    mapLimit(
      rounds.filter((round) => round.pairings),
      4,
      async (round) => ({ round, rows: await readPages(`/tournament-rounds/${round.id}/matches/paginated/`) }),
    ),
  ]);

  const entrants = new Map<number, Entrant>();
  const ensure = (userId: number, name: string, extra?: { pronouns?: string; country?: string }) => {
    const current = entrants.get(userId);
    if (current) {
      if (!current.name && name) current.name = name;
      return current;
    }
    const created = blankEntrant({
      id: `rph-${userId}`,
      name: name || `Player ${userId}`,
      pronouns: extra?.pronouns ?? "",
      country: extra?.country && /^[A-Za-z]{2}$/.test(extra.country) ? extra.country.toUpperCase() : "US",
      playerId: String(userId),
      seed: entrants.size + 1,
    });
    entrants.set(userId, created);
    return created;
  };

  registrations.forEach((item, index) => {
    const row = recordOf(item);
    if (!row) return;
    const user = recordOf(row.user);
    const userId = num(user?.id);
    if (!userId) return;
    const status = text(row.registration_status);
    const player = ensure(userId, text(row.best_identifier) || text(user?.best_identifier) || `Player ${index + 1}`, {
      pronouns: text(user?.pronouns),
      country: text(user?.country_code),
    });
    player.dropped = status === "DROPPED" || status === "CANCELED" || status === "CANCELLED";
    player.recordW = num(row.matches_won);
    player.recordL = num(row.matches_lost);
    player.recordD = num(row.matches_drawn);
    if (num(row.final_place_in_standings) > 0) player.seed = num(row.final_place_in_standings);
  });

  for (const item of standingRows) {
    const row = recordOf(item);
    if (!row) continue;
    const status = recordOf(row.user_event_status);
    const user = recordOf(status?.user) ?? recordOf(row.player);
    const userId = num(user?.id) || num(row.id);
    if (!userId) continue;
    const player = ensure(userId, text(status?.best_identifier) || text(recordOf(row.player)?.best_identifier));
    if (num(row.rank) > 0) player.seed = num(row.rank);
    const record = text(row.match_record || row.record).match(/(\d+)\s*-\s*(\d+)(?:\s*-\s*(\d+))?/);
    if (record) {
      player.recordW = Number(record[1]);
      player.recordL = Number(record[2]);
      player.recordD = Number(record[3] ?? 0);
    }
    const omw = num(row.opponent_match_win_percentage);
    if (omw > 0) player.oppWin = omw > 1 ? omw / 100 : omw;
  }

  const matches: BracketMatch[] = [];
  for (const group of matchGroups) {
    for (const item of group.rows) {
      const row = recordOf(item);
      if (!row || row.is_ghost_match === true) continue;
      const seats = (Array.isArray(row.player_match_relationships) ? row.player_match_relationships : [])
        .map((seat) => recordOf(seat))
        .filter((seat): seat is NonNullable<typeof seat> => Boolean(seat))
        .sort((a, b) => num(a.player_order) - num(b.player_order));
      const ids = seats.map((seat) => {
        const user = recordOf(seat.player);
        const status = recordOf(seat.user_event_status);
        const userId = num(user?.id) || num(recordOf(status?.user)?.id);
        if (!userId) return null;
        return ensure(userId, text(status?.best_identifier) || text(user?.best_identifier)).id;
      });
      if (!ids.some(Boolean)) continue;
      const winnerUser = num(row.winning_player) || num(recordOf(row.winning_player)?.id);
      const draw = row.match_is_intentional_draw === true || row.match_is_unintentional_draw === true;
      const complete = text(row.status) === "COMPLETE";
      const winner = !complete || row.match_is_loss === true
        ? null
        : draw
          ? DRAW_ID
          : winnerUser
            ? entrants.get(winnerUser)?.id ?? null
            : ids.length === 1
              ? ids[0]
              : null;
      const winGames = num(row.games_won_by_winner);
      const loseGames = num(row.games_won_by_loser);
      const scoreFor = (entrantId: string | null) => {
        if (!complete || !entrantId || winner === null) return 0;
        if (winner === DRAW_ID) return winGames || loseGames;
        return entrantId === winner ? winGames : loseGames;
      };
      const table = num(row.table_number);
      matches.push({
        id: `rph-m-${num(row.id)}`,
        round: group.round.round,
        position: table || matches.length + 1,
        side: group.round.side,
        label: `Round ${group.round.round}`,
        p1: { entrantId: ids[0] ?? null, score: scoreFor(ids[0] ?? null) },
        p2: { entrantId: ids[1] ?? null, score: scoreFor(ids[1] ?? null) },
        p3: emptySlot(),
        p4: emptySlot(),
        winnerId: winner,
        nextWinnerMatchId: null,
        nextWinnerSlot: null,
        nextLoserMatchId: null,
        nextLoserSlot: null,
      });
    }
  }

  const players = [...entrants.values()].sort((a, b) => a.seed - b.seed || a.name.localeCompare(b.name));
  players.forEach((player, index) => {
    if (!player.seed) player.seed = index + 1;
  });
  const elim = matches.filter((match) => match.side !== "swiss");
  const firstCut = elim.reduce((min, match) => Math.min(min, match.round), Number.POSITIVE_INFINITY);
  const cutPlayers = new Set(
    elim.filter((match) => match.round === firstCut).flatMap((match) => [match.p1.entrantId, match.p2.entrantId].filter(Boolean)),
  );
  const open = matches.some((match) => !match.winnerId);
  const finished = text(recordOf(event.settings)?.event_lifecycle_status) === "EVENT_FINISHED" || text(event.event_status) === "EVENT_FINISHED";
  const format = text(recordOf(event.gameplay_format)?.name);
  return {
    name: text(event.name) || `Play Hub ${eventId}`,
    formatName: format.toLowerCase().includes("core") ? "Core Constructed" : format || "Core Constructed",
    bestOf: bestOf(winsNeeded),
    size: Math.max(2, Math.min(4096, players.length || 8)),
    swissRounds: Math.max(1, swissRounds || rounds.filter((round) => round.side === "swiss").length || 1),
    cutSize: cutPlayers.size >= 2 ? Math.min(128, cutPlayers.size) : 0,
    phase: matches.length === 0 ? "setup" : finished && !open ? "complete" : "running",
    entrants: players,
    matches,
    summary: `${players.length} players · ${matches.length} pairings`,
  };
}

export function mergePlayHubSnapshot(
  current: Pick<TournamentState, "entrants" | "matches" | "streamMatchId" | "streamMatchId2" | "streamMatchId3">,
  incoming: PlayHubImport,
) {
  const previous = new Map(current.entrants.map((entrant) => [entrant.id, entrant]));
  const entrants = incoming.entrants.map((next) => {
    const prev = previous.get(next.id);
    if (!prev) return next;
    return {
      ...next,
      deck: prev.deck || next.deck,
      extra: prev.extra || next.extra,
      tag: prev.tag || next.tag,
      trainerName: prev.trainerName || next.trainerName,
      pronouns: prev.pronouns || next.pronouns,
      photoUrl: prev.photoUrl || next.photoUrl,
      note: prev.note,
      judgeNote: prev.judgeNote,
      ink1: prev.ink1 || next.ink1,
      ink2: prev.ink2 || next.ink2,
      inks: prev.inks || next.inks,
      decklist: prev.decklist.length ? prev.decklist : next.decklist,
      faces: prev.faces.some(Boolean) ? prev.faces : next.faces,
    };
  });
  const local = new Map(current.matches.map((match) => [match.id, match]));
  const matches = incoming.matches.map((next) => {
    const prev = local.get(next.id);
    if (!prev || next.winnerId || !prev.winnerId) return next;
    if (prev.p1.entrantId !== next.p1.entrantId || prev.p2.entrantId !== next.p2.entrantId) return next;
    return {
      ...next,
      winnerId: prev.winnerId,
      p1: { ...next.p1, score: prev.p1.score },
      p2: { ...next.p2, score: prev.p2.score },
    };
  });
  const ids = new Set(matches.map((match) => match.id));
  const keep = (id: string | null) => (id && ids.has(id) ? id : null);
  return {
    entrants,
    matches,
    streamMatchId: keep(current.streamMatchId),
    streamMatchId2: keep(current.streamMatchId2),
    streamMatchId3: keep(current.streamMatchId3),
  };
}

async function mapLimit<T, R>(items: T[], limit: number, run: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      out[index] = await run(items[index] as T);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}
