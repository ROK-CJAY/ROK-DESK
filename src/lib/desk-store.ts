import { create } from "zustand";
import {
  defaultDesk,
  parseDesk,
  remainingSeconds,
  seatsFor,
  emptyCmdFrom,
  incomingCmd,
  normalizeDown,
  remainingFromDown,
  downForRemaining,
  type DeskState,
  type PlayerSide,
  type SeatId,
  type SideId,
  type TableSize,
} from "@/lib/desk-types";
import { gameOf, type FormatFamily, type FormatPreset, type GameId } from "@/lib/games";
import { sampleTeamA, sampleTeamB, teamHasMons } from "@/lib/pokemon-vgc";
import {
  CANVAS_H,
  DEFAULT_LAYOUT,
  COMMANDER_LAYOUT,
  VERSUS_PLATE_LAYOUT,
  barPosFor,
  clampPos,
  type LayoutMap,
  type WidgetId,
  type WidgetPos,
} from "@/lib/layout";

type DeskStore = {
  desk: DeskState;
  ready: boolean;
  hydrate: () => Promise<void>;
  setDesk: (desk: DeskState) => void;
  patch: (partial: Partial<DeskState>) => void;
  setPlayer: (side: SideId, partial: Partial<PlayerSide>) => void;
  bumpScore: (side: SideId, delta: number) => void;
  bumpResource: (side: SideId, delta: number) => void;
  setResource: (side: SideId, value: number) => void;
  bumpSecondary: (side: SideId, delta: number) => void;
  bumpCmdDamage: (side: SideId, delta: number) => void;
  bumpCmdFrom: (target: SeatId, from: SeatId, delta: number) => void;
  applyGame: (gameId: GameId) => void;
  applyFormat: (preset: FormatPreset) => void;
  applyMtgLane: (lane: FormatFamily) => void;
  loadStreamMatch: (payload: {
    eventName: string;
    roundName: string;
    eventPhase: string;
    bestOf: 1 | 3 | 5 | 7;
    gameId: GameId;
    formatName: string;
    tableSize?: TableSize;
    matchId?: string | null;
    p1: Partial<PlayerSide>;
    p2: Partial<PlayerSide>;
    p3?: Partial<PlayerSide>;
    p4?: Partial<PlayerSide>;
  }) => void;
  setTableSize: (size: TableSize) => void;
  setFocusedSeat: (seat: SeatId) => void;
  focusedSeat: SeatId;
  swapSides: () => void;
  resetGame: () => void;
  resetMatch: () => void;
  gameWin: (side: SideId) => void;
  matchWin: (side: SideId) => void;
  clearWinners: () => void;
  toggleTimer: () => void;
  setTimerMinutes: (minutes: number) => void;
  setTimerClock: (seconds: number) => void;
  addTimerSeconds: (delta: number) => void;
  resetTimer: () => void;
  moveWidget: (id: WidgetId, pos: WidgetPos, commit: boolean) => void;
  applyLayout: (layout: LayoutMap) => void;
  resetLayout: () => void;
  snapScorebug: (edge: "top" | "bottom") => void;
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: number | null = null;

function startDeskPoll() {
  if (pollTimer || typeof window === "undefined") return;
  pollTimer = window.setInterval(() => {
    void (async () => {
      try {
        const res = await fetch("/api/desk", { cache: "no-store" });
        if (!res.ok) return;
        const parsed = parseDesk(await res.json());
        if (!parsed) return;
        const local = useDeskStore.getState().desk;
        if (parsed.version >= local.version) {
          useDeskStore.setState({ desk: parsed });
        }
      } catch {
        /* keep local */
      }
    })();
  }, 400);
}

function persist(desk: DeskState) {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem("rok-desk", JSON.stringify(desk));
    } catch {
      /* ignore quota */
    }
  }
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void fetch("/api/desk", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(desk),
    }).catch(() => {
      /* overlay polling will catch up on next successful write */
    });
  }, 160);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function nextVersion(desk: DeskState, patch: Partial<DeskState>): DeskState {
  return { ...desk, ...patch, version: desk.version + 1 };
}

function resetResources(desk: DeskState): Pick<PlayerSide, "resource" | "secondary" | "cmdDamage" | "cmdFrom" | "down"> {
  const game = gameOf(desk.gameId);
  const format = game.formats.find((f) => f.label === desk.formatName);
  const resource = format?.resourceStart ?? game.resource.start;
  return {
    resource,
    secondary: format?.secondaryStart ?? game.secondary?.start ?? 0,
    cmdDamage: 0,
    cmdFrom: emptyCmdFrom(),
    down: normalizeDown([]),
  };
}

function withSeats(
  prev: DeskState,
  resources: Partial<PlayerSide>,
  extra: Partial<DeskState> = {},
): Partial<DeskState> {
  return {
    p1: { ...prev.p1, ...resources },
    p2: { ...prev.p2, ...resources },
    p3: { ...prev.p3, ...resources },
    p4: { ...prev.p4, ...resources },
    ...extra,
  };
}

function layoutForTable(prev: LayoutMap, tableSize: TableSize): LayoutMap {
  if (tableSize > 2) {
    return { ...prev, ...COMMANDER_LAYOUT };
  }
  return { ...prev, ...VERSUS_PLATE_LAYOUT };
}

export const useDeskStore = create<DeskStore>((set, get) => ({
  desk: defaultDesk(),
  ready: false,
  focusedSeat: "p1",

  setFocusedSeat: (seat) => set({ focusedSeat: seat }),

  hydrate: async () => {
    let next = defaultDesk();
    try {
      const res = await fetch("/api/desk", { cache: "no-store" });
      if (res.ok) {
        const parsed = parseDesk(await res.json());
        if (parsed) next = parsed;
      }
    } catch {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem("rok-desk");
        const parsed = raw ? parseDesk(raw) : null;
        if (parsed) next = parsed;
      }
    }
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("rok-desk", JSON.stringify(next));
      } catch {
        /* ignore */
      }
    }
    set({ desk: next, ready: true });
    if (typeof window !== "undefined") startDeskPoll();
  },

  setDesk: (desk) => {
    persist(desk);
    set({ desk });
  },

  patch: (partial) => {
    const desk = nextVersion(get().desk, partial);
    persist(desk);
    set({ desk });
  },

  setPlayer: (side, partial) => {
    const prev = get().desk;
    const desk = nextVersion(prev, {
      [side]: { ...prev[side], ...partial },
    });
    persist(desk);
    set({ desk });
  },

  bumpScore: (side, delta) => {
    const prev = get().desk;
    const score = clamp(prev[side].score + delta, 0, 9);
    const desk = nextVersion(prev, {
      [side]: { ...prev[side], score },
    });
    persist(desk);
    set({ desk });
  },

  bumpResource: (side, delta) => {
    const prev = get().desk;
    const game = gameOf(prev.gameId);
    const format = game.formats.find((f) => f.label === prev.formatName);
    const max = format?.resourceMax ?? game.resource.max;
    const resource = clamp(prev[side].resource + delta, game.resource.min, max);
    const desk = nextVersion(prev, {
      [side]: {
        ...prev[side],
        resource,
        down: game.resource.pipStyle === "team" ? downForRemaining(resource, max) : prev[side].down,
      },
    });
    persist(desk);
    set({ desk });
  },

  setResource: (side, value) => {
    const prev = get().desk;
    const game = gameOf(prev.gameId);
    const format = game.formats.find((f) => f.label === prev.formatName);
    const max = format?.resourceMax ?? game.resource.max;
    const resource = clamp(value, game.resource.min, max);
    const desk = nextVersion(prev, {
      [side]: {
        ...prev[side],
        resource,
        down: game.resource.pipStyle === "team" ? downForRemaining(resource, max) : prev[side].down,
      },
    });
    persist(desk);
    set({ desk });
  },

  bumpSecondary: (side, delta) => {
    const prev = get().desk;
    const game = gameOf(prev.gameId);
    if (!game.secondary) return;
    const secondary = clamp(
      prev[side].secondary + delta,
      game.secondary.min,
      game.secondary.max,
    );
    const desk = nextVersion(prev, {
      [side]: { ...prev[side], secondary },
    });
    persist(desk);
    set({ desk });
  },

  bumpCmdDamage: (side, delta) => {
    const prev = get().desk;
    const cmdDamage = clamp(prev[side].cmdDamage + delta, 0, 21);
    const desk = nextVersion(prev, {
      [side]: { ...prev[side], cmdDamage },
    });
    persist(desk);
    set({ desk });
  },

  bumpCmdFrom: (target, from, delta) => {
    if (target === from) return;
    const prev = get().desk;
    const current = prev[target].cmdFrom ?? emptyCmdFrom();
    const nextFrom = {
      ...current,
      [from]: clamp((current[from] ?? 0) + delta, 0, 21),
    };
    const cmdDamage = incomingCmd({ ...prev[target], cmdFrom: nextFrom }, target);
    const desk = nextVersion(prev, {
      [target]: { ...prev[target], cmdFrom: nextFrom, cmdDamage },
    });
    persist(desk);
    set({ desk });
  },

  applyGame: (gameId) => {
    const prev = get().desk;
    const game = gameOf(gameId);
    const format = game.formats[0];
    const resources = {
      resource: format?.resourceStart ?? game.resource.start,
      secondary: format?.secondaryStart ?? game.secondary?.start ?? 0,
      cmdDamage: 0,
      down: normalizeDown([]),
    };
    const seats = withSeats(prev, { ...resources, score: 0 });
    if (gameId === "pokemon-vgc") {
      seats.p1 = {
        ...prev.p1,
        ...resources,
        score: 0,
        team: teamHasMons(prev.p1.team) ? prev.p1.team : sampleTeamA(),
      };
      seats.p2 = {
        ...prev.p2,
        ...resources,
        score: 0,
        team: teamHasMons(prev.p2.team) ? prev.p2.team : sampleTeamB(),
      };
    }
    const saved = {
      remaining: remainingSeconds(prev),
      preset: prev.timerPresetSeconds,
    };
    const clocks = { ...prev.gameClocks, [prev.gameId]: saved };
    const nextClock = clocks[gameId] ?? { remaining: 0, preset: 0 };
    const desk = nextVersion(prev, {
      gameId,
      formatName: format?.label ?? game.name,
      bestOf: format?.bestOf ?? game.defaultBestOf,
      scorebugStyle: game.defaultScorebug,
      tableSize: format?.seats ?? 2,
      layout: layoutForTable(prev.layout, format?.seats ?? 2),
      ...seats,
      winnerSide: null,
      gameWinnerSide: null,
      timerSeconds: nextClock.remaining,
      timerPresetSeconds: nextClock.preset,
      timerRunning: false,
      timerEndsAt: null,
      gameClocks: clocks,
    });
    persist(desk);
    set({ desk, focusedSeat: "p1" });
  },

  applyFormat: (preset) => {
    const prev = get().desk;
    const game = gameOf(prev.gameId);
    const resources = {
      resource: preset.resourceStart ?? game.resource.start,
      secondary: preset.secondaryStart ?? game.secondary?.start ?? 0,
      cmdDamage: 0,
      down: normalizeDown([]),
    };
    const tableSize = preset.seats ?? 2;
    const desk = nextVersion(prev, {
      formatName: preset.label,
      bestOf: preset.bestOf ?? prev.bestOf,
      tableSize,
      layout: layoutForTable(prev.layout, tableSize),
      ...withSeats(prev, resources),
    });
    persist(desk);
    set({ desk });
  },

  applyMtgLane: (lane) => {
    const prev = get().desk;
    if (prev.gameId !== "mtg") {
      get().applyGame("mtg");
    }
    const game = gameOf("mtg");
    const preset =
      game.formats.find((f) => (f.family ?? "constructed") === lane) ?? game.formats[0];
    if (preset) get().applyFormat(preset);
  },

  loadStreamMatch: (payload) => {
    if (get().desk.gameId !== payload.gameId) {
      get().applyGame(payload.gameId);
    }
    const prev = get().desk;
    const resources = resetResources({ ...prev, formatName: payload.formatName });
    const tableSize = payload.tableSize ?? (payload.p3 || payload.p4 ? 4 : prev.tableSize);
    const desk = nextVersion(prev, {
      eventName: payload.eventName,
      roundName: payload.roundName,
      eventPhase: payload.eventPhase,
      bestOf: payload.bestOf,
      formatName: payload.formatName,
      tableSize,
      layout: layoutForTable(prev.layout, tableSize),
      p1: { ...prev.p1, ...resources, score: 0, ...payload.p1 },
      p2: { ...prev.p2, ...resources, score: 0, ...payload.p2 },
      p3: payload.p3 ? { ...prev.p3, ...resources, score: 0, ...payload.p3 } : prev.p3,
      p4: payload.p4 ? { ...prev.p4, ...resources, score: 0, ...payload.p4 } : prev.p4,
      winnerSide: null,
      gameWinnerSide: null,
      streamMatchId: payload.matchId ?? null,
    });
    persist(desk);
    set({ desk });
  },

  setTableSize: (size) => {
    const prev = get().desk;
    const desk = nextVersion(prev, {
      tableSize: size,
      layout: layoutForTable(prev.layout, size),
    });
    persist(desk);
    set({ desk, focusedSeat: seatsFor(size).includes(get().focusedSeat) ? get().focusedSeat : "p1" });
  },

  swapSides: () => {
    const prev = get().desk;
    if (prev.tableSize === 2) {
      const desk = nextVersion(prev, {
        p1: prev.p2,
        p2: prev.p1,
        winnerSide:
          prev.winnerSide === "p1" ? "p2" : prev.winnerSide === "p2" ? "p1" : prev.winnerSide,
        gameWinnerSide:
          prev.gameWinnerSide === "p1" ? "p2" : prev.gameWinnerSide === "p2" ? "p1" : prev.gameWinnerSide,
      });
      persist(desk);
      set({ desk });
      return;
    }
    const rotated: Record<SeatId, SeatId> = { p1: "p4", p2: "p1", p3: "p2", p4: "p3" };
    const desk = nextVersion(prev, {
      p1: prev.p4,
      p2: prev.p1,
      p3: prev.p2,
      p4: prev.p3,
      winnerSide: prev.winnerSide ? rotated[prev.winnerSide] : null,
      gameWinnerSide: prev.gameWinnerSide ? rotated[prev.gameWinnerSide] : null,
    });
    persist(desk);
    set({ desk });
  },

  resetGame: () => {
    const prev = get().desk;
    const resources = resetResources(prev);
    const desk = nextVersion(prev, {
      ...withSeats(prev, resources),
      winnerSide: null,
      gameWinnerSide: null,
    });
    persist(desk);
    set({ desk });
  },

  resetMatch: () => {
    const prev = get().desk;
    const resources = resetResources(prev);
    const desk = nextVersion(prev, {
      ...withSeats(prev, { ...resources, score: 0 }),
      winnerSide: null,
      gameWinnerSide: null,
    });
    persist(desk);
    set({ desk });
  },

  gameWin: (side) => {
    const prev = get().desk;
    const resources = resetResources(prev);
    const score = clamp(prev[side].score + 1, 0, 9);
    const desk = nextVersion(prev, {
      ...withSeats(prev, resources),
      [side]: { ...prev[side], ...resources, score },
      gameWinnerSide: side,
      winnerSide: null,
    });
    persist(desk);
    set({ desk });
  },

  matchWin: (side) => {
    const prev = get().desk;
    const desk = nextVersion(prev, {
      winnerSide: side,
      gameWinnerSide: null,
    });
    persist(desk);
    set({ desk });
  },

  clearWinners: () => {
    const prev = get().desk;
    const desk = nextVersion(prev, {
      winnerSide: null,
      gameWinnerSide: null,
    });
    persist(desk);
    set({ desk });
  },

  toggleTimer: () => {
    const prev = get().desk;
    if (prev.timerRunning) {
      const left = remainingSeconds(prev);
      const desk = nextVersion(prev, {
        timerRunning: false,
        timerEndsAt: null,
        timerSeconds: left,
      });
      persist(desk);
      set({ desk });
      return;
    }
    const left = remainingSeconds(prev);
    const desk = nextVersion(prev, {
      timerRunning: true,
      timerEndsAt: Date.now() + left * 1000,
      timerSeconds: left,
    });
    persist(desk);
    set({ desk });
  },

  setTimerMinutes: (minutes) => {
    get().setTimerClock(Math.max(0, Math.round(minutes * 60)));
  },

  setTimerClock: (seconds) => {
    const prev = get().desk;
    const next = Math.max(0, Math.round(seconds));
    const desk = nextVersion(prev, {
      timerSeconds: next,
      timerPresetSeconds: next,
      timerRunning: false,
      timerEndsAt: null,
      gameClocks: {
        ...prev.gameClocks,
        [prev.gameId]: { remaining: next, preset: next },
      },
    });
    persist(desk);
    set({ desk });
  },

  addTimerSeconds: (delta) => {
    const prev = get().desk;
    const left = Math.max(0, remainingSeconds(prev) + delta);
    const desk = nextVersion(prev, {
      timerSeconds: left,
      timerEndsAt: prev.timerRunning ? Date.now() + left * 1000 : null,
      gameClocks: {
        ...prev.gameClocks,
        [prev.gameId]: { remaining: left, preset: prev.timerPresetSeconds },
      },
    });
    persist(desk);
    set({ desk });
  },

  resetTimer: () => {
    const prev = get().desk;
    const seconds = Math.max(0, prev.timerPresetSeconds || 0);
    const desk = nextVersion(prev, {
      timerSeconds: seconds,
      timerRunning: false,
      timerEndsAt: null,
      gameClocks: {
        ...prev.gameClocks,
        [prev.gameId]: { remaining: seconds, preset: seconds },
      },
    });
    persist(desk);
    set({ desk });
  },

  moveWidget: (id, pos, commit) => {
    const prev = get().desk;
    const nextPos = clampPos(pos, id === "scorebugBar");
    const layout = { ...prev.layout, [id]: nextPos };
    const scorebugPosition =
      id === "scorebugBar"
        ? nextPos.y < CANVAS_H / 2
          ? ("top" as const)
          : ("bottom" as const)
        : prev.scorebugPosition;
    const desk: DeskState = commit
      ? nextVersion(prev, { layout, scorebugPosition })
      : { ...prev, layout, scorebugPosition };
    if (commit) persist(desk);
    set({ desk });
  },

  applyLayout: (layout) => {
    const prev = get().desk;
    const bar = layout.scorebugBar;
    const desk = nextVersion(prev, {
      layout: { ...layout },
      scorebugPosition: bar.y < CANVAS_H / 2 ? "top" : "bottom",
    });
    persist(desk);
    set({ desk });
  },

  resetLayout: () => {
    const prev = get().desk;
    const base = { ...DEFAULT_LAYOUT };
    get().applyLayout(prev.tableSize > 2 ? { ...base, ...COMMANDER_LAYOUT } : base);
  },

  snapScorebug: (edge) => {
    const prev = get().desk;
    const desk = nextVersion(prev, {
      scorebugPosition: edge,
      layout: { ...prev.layout, scorebugBar: barPosFor(edge) },
    });
    persist(desk);
    set({ desk });
  },
}));
