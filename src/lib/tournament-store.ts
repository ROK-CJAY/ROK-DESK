import { create } from "zustand";
import { gameOf, isCommanderPodFormat, type GameId } from "@/lib/games";
import {
  blankEntrant,
  blankStaff,
  defaultTournament,
  parseTournament,
  snapshotDesk,
  switchGame,
  type Entrant,
  type SlotId,
  type StaffMember,
  type TournamentState,
} from "@/lib/tournament-types";
import {
  generateBracket,
  pairNextSwissRound,
  reportWinner,
  setMatchScore,
  defaultSwissRounds,
} from "@/lib/tournament-bracket";
import { clearLegacyTournament, tournamentLooksLikeTest, toggleTestTournament } from "@/lib/test-fixtures";
import { remainingSeconds } from "@/lib/desk-types";
import { useDeskStore } from "@/lib/desk-store";
import { withDeskJudgeNotes } from "@/lib/judge-notes-sync";

type TournamentStore = {
  tournament: TournamentState;
  ready: boolean;
  hydrate: () => Promise<void>;
  setTournament: (t: TournamentState) => void;
  patch: (partial: Partial<TournamentState>) => void;
  setGame: (gameId: GameId) => void;
  addEntrant: (partial?: Partial<Entrant>) => void;
  updateEntrant: (id: string, partial: Partial<Entrant>) => void;
  removeEntrant: (id: string) => void;
  addStaff: (partial?: Partial<StaffMember>) => void;
  updateStaff: (id: string, partial: Partial<StaffMember>) => void;
  removeStaff: (id: string) => void;
  reseed: () => void;
  reorderEntrants: (fromId: string, toId: string) => void;
  generate: () => void;
  pairNext: () => void;
  completeTournament: () => void;
  reopenTournament: () => void;
  resetBracket: () => void;
  report: (matchId: string, winnerId: string) => void;
  setScore: (matchId: string, slot: SlotId, score: number) => void;
  setStreamMatch: (matchId: string | null, slot?: 1 | 2 | 3) => void;
  toggleFloorTimer: () => void;
  setFloorClock: (seconds: number) => void;
  addFloorSeconds: (delta: number) => void;
  resetFloorTimer: () => void;
  loadTestMode: () => void;
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: number | null = null;

function startTournamentPoll() {
  if (pollTimer || typeof window === "undefined") return;
  pollTimer = window.setInterval(() => {
    if (typeof document !== "undefined" && document.hidden) return;
    void (async () => {
      try {
        const res = await fetch("/api/tournament", { cache: "no-store" });
        if (!res.ok) return;
        const parsed = parseTournament(await res.json());
        if (!parsed) return;
        const incoming = clearLegacyTournament(parsed);
        const local = useTournamentStore.getState().tournament;
        if (incoming.version > local.version) {
          useTournamentStore.setState({ tournament: incoming });
        }
      } catch {
        /* keep local */
      }
    })();
  }, 800);
}

function persist(t: TournamentState) {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem("rok-tournament", JSON.stringify(t));
    } catch {
      /* ignore */
    }
  }
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void fetch("/api/tournament", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(t),
    }).catch(() => {
      /* overlay polling will catch up */
    });
  }, 160);
}

function nextVersion(t: TournamentState, patch: Partial<TournamentState>): TournamentState {
  const merged = { ...t, ...patch, version: t.version + 1 };
  return {
    ...merged,
    desks: {
      ...merged.desks,
      [merged.gameId]: snapshotDesk(merged),
    },
  };
}

export const useTournamentStore = create<TournamentStore>((set, get) => ({
  tournament: defaultTournament(),
  ready: false,

  hydrate: async () => {
    let next = defaultTournament();
    try {
      const res = await fetch("/api/tournament", { cache: "no-store" });
      if (res.ok) {
        const parsed = parseTournament(await res.json());
        if (parsed) next = clearLegacyTournament(parsed);
      }
    } catch {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem("rok-tournament");
        const parsed = raw ? parseTournament(raw) : null;
        if (parsed) next = clearLegacyTournament(parsed);
      }
    }
    set({ tournament: next, ready: true });
    persist(next);
    if (typeof window !== "undefined") startTournamentPoll();
  },

  setTournament: (tournament) => {
    persist(tournament);
    set({ tournament });
  },

  patch: (partial) => {
    const tournament = nextVersion(get().tournament, partial);
    persist(tournament);
    set({ tournament });
  },

  setGame: (gameId) => {
    const prev = get().tournament;
    if (prev.gameId === gameId) return;
    const switched = switchGame(prev, gameId);
    const tournament = nextVersion(
      { ...switched, version: prev.version },
      {
        formatName: switched.formatName,
        bestOf: switched.bestOf,
      },
    );
    persist(tournament);
    set({ tournament });
  },

  addEntrant: (partial) => {
    const prev = get().tournament;
    const seed =
      partial?.seed && partial.seed > 0
        ? partial.seed
        : prev.entrants.reduce((max, e) => Math.max(max, e.seed), 0) + 1;
    const tournament = nextVersion(prev, {
      entrants: [...prev.entrants, blankEntrant({ ...partial, seed })],
    });
    persist(tournament);
    set({ tournament });
  },

  updateEntrant: (id, partial) => {
    const prev = get().tournament;
    const current = prev.entrants.find((e) => e.id === id);
    if (!current) return;
    const next = { ...current, ...partial };
    if (next === current || (Object.keys(partial) as Array<keyof typeof partial>).every((key) => current[key] === next[key])) {
      return;
    }
    const tournament = nextVersion(prev, {
      entrants: prev.entrants.map((e) => (e.id === id ? next : e)),
    });
    persist(tournament);
    set({ tournament });
  },

  removeEntrant: (id) => {
    const prev = get().tournament;
    const tournament = nextVersion(prev, {
      entrants: prev.entrants.filter((e) => e.id !== id),
    });
    persist(tournament);
    set({ tournament });
  },

  addStaff: (partial) => {
    const prev = get().tournament;
    const tournament = nextVersion(prev, {
      staff: [...(prev.staff ?? []), blankStaff(partial)],
    });
    persist(tournament);
    set({ tournament });
  },

  updateStaff: (id, partial) => {
    const prev = get().tournament;
    const tournament = nextVersion(prev, {
      staff: (prev.staff ?? []).map((row) => (row.id === id ? { ...row, ...partial } : row)),
    });
    persist(tournament);
    set({ tournament });
  },

  removeStaff: (id) => {
    const prev = get().tournament;
    const tournament = nextVersion(prev, {
      staff: (prev.staff ?? []).filter((row) => row.id !== id),
    });
    persist(tournament);
    set({ tournament });
  },

  reseed: () => {
    const prev = get().tournament;
    const tournament = nextVersion(prev, {
      entrants: prev.entrants
        .slice()
        .sort((a, b) => a.seed - b.seed)
        .map((e, i) => ({ ...e, seed: i + 1 })),
    });
    persist(tournament);
    set({ tournament });
  },

  reorderEntrants: (fromId, toId) => {
    if (fromId === toId) return;
    const prev = get().tournament;
    const ordered = prev.entrants.slice().sort((a, b) => a.seed - b.seed || a.name.localeCompare(b.name));
    const from = ordered.findIndex((e) => e.id === fromId);
    const to = ordered.findIndex((e) => e.id === toId);
    if (from < 0 || to < 0) return;
    const next = [...ordered];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const tournament = nextVersion(prev, {
      entrants: next.map((e, i) => ({ ...e, seed: i + 1 })),
    });
    persist(tournament);
    set({ tournament });
  },

  generate: () => {
    const prev = get().tournament;
    const capped = prev.entrants.slice(0, prev.size).map((e, i) => ({
      ...e,
      seed: e.seed > 0 ? e.seed : i + 1,
    }));
    const swissRounds = prev.swissRounds > 0 ? prev.swissRounds : defaultSwissRounds(prev.size);
    const tournament = nextVersion(prev, {
      entrants: [...capped, ...prev.entrants.slice(prev.size)],
      swissRounds,
      overlayView: prev.bracketType === "swiss" ? "standings" : prev.overlayView === "standings" ? "full" : prev.overlayView,
      matches: generateBracket(
        prev.bracketType,
        prev.size,
        capped,
        swissRounds,
        isCommanderPodFormat(prev.gameId, prev.formatName),
      ),
      phase: "running",
      streamMatchId: null,
      streamMatchId2: null,
      streamMatchId3: null,
    });
    persist(tournament);
    set({ tournament });
  },

  pairNext: () => {
    const prev = get().tournament;
    const next = pairNextSwissRound(prev);
    if (next === prev) return;
    const tournament = nextVersion(next, {});
    persist(tournament);
    set({ tournament });
  },

  completeTournament: () => {
    const prev = get().tournament;
    if (prev.phase === "complete") return;
    const desk = useDeskStore.getState().desk;
    const withNotes = withDeskJudgeNotes(prev, desk);
    const tournament = nextVersion(withNotes, { phase: "complete" });
    persist(tournament);
    set({ tournament });
  },

  reopenTournament: () => {
    const prev = get().tournament;
    if (prev.phase !== "complete") return;
    const tournament = nextVersion(prev, { phase: prev.matches.length ? "running" : "setup" });
    persist(tournament);
    set({ tournament });
  },

  resetBracket: () => {
    const prev = get().tournament;
    const tournament = nextVersion(prev, {
      matches: [],
      phase: "setup",
      streamMatchId: null,
      streamMatchId2: null,
      streamMatchId3: null,
    });
    persist(tournament);
    set({ tournament });
  },

  report: (matchId, winnerId) => {
    const tournament = nextVersion(reportWinner(get().tournament, matchId, winnerId), {});
    persist(tournament);
    set({ tournament });
  },

  setScore: (matchId, slot, score) => {
    const tournament = nextVersion(setMatchScore(get().tournament, matchId, slot, score), {});
    persist(tournament);
    set({ tournament });
  },

  setStreamMatch: (matchId, slot = 1) => {
    const prev = get().tournament;
    const ids = {
      streamMatchId: prev.streamMatchId,
      streamMatchId2: prev.streamMatchId2,
      streamMatchId3: prev.streamMatchId3 ?? null,
    };
    if (ids.streamMatchId === matchId) ids.streamMatchId = null;
    if (ids.streamMatchId2 === matchId) ids.streamMatchId2 = null;
    if (ids.streamMatchId3 === matchId) ids.streamMatchId3 = null;
    if (slot === 2) ids.streamMatchId2 = matchId;
    else if (slot === 3) ids.streamMatchId3 = matchId;
    else ids.streamMatchId = matchId;
    const tournament = nextVersion(prev, ids);
    persist(tournament);
    set({ tournament });
  },

  toggleFloorTimer: () => {
    const prev = get().tournament;
    if (prev.timerRunning) {
      const left = remainingSeconds(prev);
      const tournament = nextVersion(prev, {
        timerRunning: false,
        timerEndsAt: null,
        timerSeconds: left,
      });
      persist(tournament);
      set({ tournament });
      return;
    }
    const left = remainingSeconds(prev);
    const tournament = nextVersion(prev, {
      timerRunning: true,
      timerEndsAt: Date.now() + left * 1000,
      timerSeconds: left,
    });
    persist(tournament);
    set({ tournament });
  },

  setFloorClock: (seconds) => {
    const next = Math.max(0, Math.round(seconds));
    const tournament = nextVersion(get().tournament, {
      timerSeconds: next,
      timerPresetSeconds: next,
      timerRunning: false,
      timerEndsAt: null,
    });
    persist(tournament);
    set({ tournament });
  },

  addFloorSeconds: (delta) => {
    const prev = get().tournament;
    const left = Math.max(0, remainingSeconds(prev) + delta);
    const tournament = nextVersion(prev, {
      timerSeconds: left,
      timerEndsAt: prev.timerRunning ? Date.now() + left * 1000 : null,
    });
    persist(tournament);
    set({ tournament });
  },

  resetFloorTimer: () => {
    const prev = get().tournament;
    const seconds = Math.max(0, prev.timerPresetSeconds || 0);
    const tournament = nextVersion(prev, {
      timerSeconds: seconds,
      timerRunning: false,
      timerEndsAt: null,
    });
    persist(tournament);
    set({ tournament });
  },

  loadTestMode: () => {
    const prev = get().tournament;
    const turningOn = !tournamentLooksLikeTest(prev);
    const tournament = nextVersion(prev, toggleTestTournament(prev));
    persist(tournament);
    set({ tournament });
    if (typeof window === "undefined") return;
    const desk = useDeskStore.getState();
    if (turningOn) {
      if (desk.desk.gameId !== tournament.gameId) desk.applyGame(tournament.gameId);
      const after = useDeskStore.getState();
      if (after.desk.formatName !== tournament.formatName) {
        const preset = gameOf(tournament.gameId).formats.find((f) => f.label === tournament.formatName);
        if (preset) after.applyFormat(preset);
      }
    }
    useDeskStore.getState().ensureTestMode(turningOn);
  },
}));
