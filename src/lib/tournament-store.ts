import { create } from "zustand";
import {
  blankEntrant,
  defaultTournament,
  parseTournament,
  type Entrant,
  type SlotId,
  type TournamentState,
} from "@/lib/tournament-types";
import {
  generateBracket,
  pairNextSwissRound,
  reportWinner,
  setMatchScore,
  defaultSwissRounds,
} from "@/lib/tournament-bracket";
import { isCommanderPodFormat } from "@/lib/games";

type TournamentStore = {
  tournament: TournamentState;
  ready: boolean;
  hydrate: () => Promise<void>;
  setTournament: (t: TournamentState) => void;
  patch: (partial: Partial<TournamentState>) => void;
  addEntrant: (partial?: Partial<Entrant>) => void;
  updateEntrant: (id: string, partial: Partial<Entrant>) => void;
  removeEntrant: (id: string) => void;
  reseed: () => void;
  reorderEntrants: (fromId: string, toId: string) => void;
  generate: () => void;
  pairNext: () => void;
  resetBracket: () => void;
  report: (matchId: string, winnerId: string) => void;
  setScore: (matchId: string, slot: SlotId, score: number) => void;
  setStreamMatch: (matchId: string | null) => void;
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;

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
  return { ...t, ...patch, version: t.version + 1 };
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
        if (parsed) next = parsed;
      }
    } catch {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem("rok-tournament");
        const parsed = raw ? parseTournament(raw) : null;
        if (parsed) next = parsed;
      }
    }
    set({ tournament: next, ready: true });
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
    const tournament = nextVersion(prev, {
      entrants: prev.entrants.map((e) => (e.id === id ? { ...e, ...partial } : e)),
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

  resetBracket: () => {
    const prev = get().tournament;
    const tournament = nextVersion(prev, {
      matches: [],
      phase: "setup",
      streamMatchId: null,
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

  setStreamMatch: (matchId) => {
    const tournament = nextVersion(get().tournament, { streamMatchId: matchId });
    persist(tournament);
    set({ tournament });
  },
}));
