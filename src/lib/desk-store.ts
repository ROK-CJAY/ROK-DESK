import { create } from "zustand";
import {
  defaultDesk,
  parseDesk,
  remainingSeconds,
  seatsFor,
  emptyCmdFrom,
  emptySpotlight,
  incomingCmd,
  normalizeDown,
  remainingFromDown,
  downForRemaining,
  resourceLimit,
  resourceResetValue,
  blankPlayer,
  stripLane,
  laneKey,
  parseMatchSlot,
  type DeskState,
  type MatchSlot,
  type PlayerSide,
  type SeatId,
  type SideId,
  type TableSize,
} from "@/lib/desk-types";
import { gameOf, isCommanderLane, slugOf, supportsRokLayout, type FormatFamily, type FormatPreset, type GameId } from "@/lib/games";
import { emptyPtcgBoard } from "@/lib/ptcg-board";
import { clearLegacyDesk, deskLooksLikeTest, toggleTestDesk } from "@/lib/test-fixtures";
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
  pinnedGameId: GameId | null;
  pinnedSlot: MatchSlot | null;
  hydrate: (gameId?: GameId | null, slot?: MatchSlot | null) => Promise<void>;
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
  applyMatchSlot: (slot: MatchSlot) => void;
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
    matchSlot?: MatchSlot;
    p1: Partial<PlayerSide>;
    p2: Partial<PlayerSide>;
    p3?: Partial<PlayerSide>;
    p4?: Partial<PlayerSide>;
  }) => void;
  setTableSize: (size: TableSize) => void;
  setResourceCap: (n: number) => void;
  setFocusedSeat: (seat: SeatId) => void;
  focusedSeat: SeatId;
  swapSides: () => void;
  resetGame: () => void;
  resetMatch: () => void;
  resetInfo: () => void;
  clearStreamSlot: (gameId: GameId, slot: MatchSlot) => void;
  gameWin: (side: SideId) => void;
  matchWin: (side: SideId) => void;
  clearWinners: () => void;
  setInitiative: (side: SideId | null) => void;
  toggleTimer: () => void;
  setTimerMinutes: (minutes: number) => void;
  setTimerClock: (seconds: number) => void;
  addTimerSeconds: (delta: number) => void;
  resetTimer: () => void;
  moveWidget: (id: WidgetId, pos: WidgetPos, commit: boolean) => void;
  applyLayout: (layout: LayoutMap) => void;
  resetLayout: () => void;
  snapScorebug: (edge: "top" | "bottom") => void;
  loadTestMode: () => void;
  ensureTestMode: (on: boolean) => void;
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: number | null = null;

function deskApiUrl(): string {
  const { pinnedGameId, pinnedSlot } = useDeskStore.getState();
  if (!pinnedGameId) return "/api/desk";
  const q = new URLSearchParams({ game: slugOf(pinnedGameId), slot: String(pinnedSlot ?? 1) });
  return `/api/desk?${q.toString()}`;
}

function startDeskPoll() {
  if (pollTimer || typeof window === "undefined") return;
  pollTimer = window.setInterval(() => {
    void (async () => {
      try {
        const res = await fetch(deskApiUrl(), { cache: "no-store" });
        if (!res.ok) return;
        const parsed = parseDesk(await res.json());
        if (!parsed) return;
        const incoming = clearLegacyDesk(parsed);
        const local = useDeskStore.getState().desk;
        if (incoming.version > local.version) {
          useDeskStore.setState({ desk: incoming });
        }
      } catch {
        /* keep local */
      }
    })();
  }, 400);
}

function persist(desk: DeskState, immediate = false) {
  const slot = desk.matchSlot ?? 1;
  const next = {
    ...desk,
    matchSlot: slot,
    lanes: { ...desk.lanes, [laneKey(desk.gameId, slot)]: stripLane({ ...desk, matchSlot: slot }) },
  };
  if (typeof window !== "undefined" && !useDeskStore.getState().pinnedGameId) {
    try {
      window.localStorage.setItem("rok-desk", JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
  }
  const write = () => {
    void fetch(deskApiUrl(), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    }).catch(() => {
      /* overlay polling will catch up on next successful write */
    });
  };
  if (saveTimer) clearTimeout(saveTimer);
  if (immediate) {
    write();
    return;
  }
  saveTimer = setTimeout(write, 160);
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
  const resource = resourceResetValue(desk);
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
  pinnedGameId: null,
  pinnedSlot: null,
  focusedSeat: "p1",

  setFocusedSeat: (seat) => set({ focusedSeat: seat }),

  hydrate: async (gameId, slot) => {
    const pin = gameId === undefined ? get().pinnedGameId : gameId;
    const pinSlot = slot === undefined ? get().pinnedSlot : slot;
    set({ pinnedGameId: pin, pinnedSlot: pin ? parseMatchSlot(pinSlot ?? 1) : null });
    let next = defaultDesk();
    let stripped = false;
    try {
      const res = await fetch(deskApiUrl(), { cache: "no-store" });
      if (res.ok) {
        const parsed = parseDesk(await res.json());
        if (parsed) {
          const cleaned = clearLegacyDesk(parsed);
          stripped = cleaned !== parsed;
          next = cleaned;
        }
      }
    } catch {
      if (typeof window !== "undefined" && !pin) {
        const raw = window.localStorage.getItem("rok-desk");
        const parsed = raw ? parseDesk(raw) : null;
        if (parsed) {
          const cleaned = clearLegacyDesk(parsed);
          stripped = cleaned !== parsed;
          next = cleaned;
        }
      }
    }
    if (typeof window !== "undefined" && !pin) {
      try {
        window.localStorage.setItem("rok-desk", JSON.stringify(next));
      } catch {
        /* ignore */
      }
    }
    set({ desk: next, ready: true, pinnedGameId: pin, pinnedSlot: pin ? parseMatchSlot(pinSlot ?? 1) : null });
    if (stripped) persist(next, true);
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
    const current = prev[side];
    const nextPlayer = { ...current, ...partial };
    if ((Object.keys(partial) as Array<keyof typeof partial>).every((key) => current[key] === nextPlayer[key])) {
      return;
    }
    const desk = nextVersion(prev, {
      [side]: nextPlayer,
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
    const max = resourceLimit(prev);
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
    const max = resourceLimit(prev);
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
    if (prev.gameId === gameId) return;
    const fromSlot = prev.matchSlot ?? 1;
    const nextSlot = fromSlot;
    const lanes = { ...prev.lanes, [laneKey(prev.gameId, fromSlot)]: stripLane({ ...prev, matchSlot: fromSlot }) };
    const saved = lanes[laneKey(gameId, nextSlot)] ? parseDesk(lanes[laneKey(gameId, nextSlot)]) : null;
    if (saved && saved.gameId === gameId) {
      const desk = { ...saved, matchSlot: nextSlot, lanes, version: prev.version + 1 };
      persist(desk);
      set({ desk, focusedSeat: "p1" });
      return;
    }
    const game = gameOf(gameId);
    const format = game.formats[0];
    const resources = {
      resource: format?.resourceStart ?? game.resource.start,
      secondary: format?.secondaryStart ?? game.secondary?.start ?? 0,
      cmdDamage: 0,
      down: normalizeDown([]),
    };
    const seats = withSeats(prev, { ...resources, score: 0 });
    const savedClock = {
      remaining: remainingSeconds(prev),
      preset: prev.timerPresetSeconds,
    };
    const clocks = { ...prev.gameClocks, [prev.gameId]: savedClock };
    const nextClock = clocks[gameId] ?? { remaining: 0, preset: 0 };
    const desk = nextVersion(prev, {
      gameId,
      matchSlot: nextSlot,
      formatName: format?.label ?? game.name,
      bestOf: format?.bestOf ?? game.defaultBestOf,
      scorebugStyle: game.defaultScorebug,
      tableSize: format?.seats ?? 2,
      resourceCap: format?.resourceMax ?? game.resource.max,
      layout: layoutForTable(prev.layout, format?.seats ?? 2),
      ...seats,
      winnerSide: null,
      gameWinnerSide: null,
      timerSeconds: nextClock.remaining,
      timerPresetSeconds: nextClock.preset,
      timerRunning: false,
      timerEndsAt: null,
      gameClocks: clocks,
      lanes,
    });
    persist(desk);
    set({ desk, focusedSeat: "p1" });
  },

  applyMatchSlot: (slot) => {
    const prev = get().desk;
    const current = prev.matchSlot ?? 1;
    if (current === slot) return;
    const lanes = { ...prev.lanes, [laneKey(prev.gameId, current)]: stripLane({ ...prev, matchSlot: current }) };
    const saved = lanes[laneKey(prev.gameId, slot)] ? parseDesk(lanes[laneKey(prev.gameId, slot)]) : null;
    if (saved && saved.gameId === prev.gameId) {
      const desk = { ...saved, matchSlot: slot, lanes, version: prev.version + 1 };
      persist(desk);
      set({ desk, focusedSeat: "p1" });
      return;
    }
    const resources = resetResources(prev);
    const empty = blankPlayer({ ...resources, score: 0 });
    const desk = nextVersion(prev, {
      matchSlot: slot,
      p1: { ...empty },
      p2: { ...empty },
      p3: blankPlayer({ resource: prev.p3.resource }),
      p4: blankPlayer({ resource: prev.p4.resource }),
      winnerSide: null,
      gameWinnerSide: null,
      streamMatchId: null,
      cardSpotlight: emptySpotlight(),
      roundName: "",
      timerSeconds: 0,
      timerRunning: false,
      timerEndsAt: null,
      lanes,
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
    const nextFormat = { gameId: prev.gameId, formatName: preset.label };
    const nextStyle = supportsRokLayout(nextFormat)
      ? isCommanderLane(prev) && game.defaultScorebug === "rok"
        ? "rok"
        : prev.scorebugStyle
      : prev.scorebugStyle === "rok"
        ? "bar"
        : prev.scorebugStyle;
    const desk = nextVersion(prev, {
      formatName: preset.label,
      bestOf: preset.bestOf ?? prev.bestOf,
      tableSize,
      resourceCap: preset.resourceMax ?? game.resource.max,
      layout: layoutForTable(prev.layout, tableSize),
      scorebugStyle: nextStyle,
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
    const wantedSlot = payload.matchSlot ?? 1;
    if ((get().desk.matchSlot ?? 1) !== wantedSlot) {
      get().applyMatchSlot(wantedSlot);
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

  setResourceCap: (n) => {
    const prev = get().desk;
    const cap = clamp(Math.round(n), 1, 6);
    const desk = nextVersion(prev, {
      resourceCap: cap,
      p1: { ...prev.p1, resource: cap },
      p2: { ...prev.p2, resource: cap },
    });
    persist(desk);
    set({ desk });
  },

  swapSides: () => {
    const prev = get().desk;
    if (prev.tableSize === 2) {
      const desk = nextVersion(prev, {
        p1: prev.p2,
        p2: prev.p1,
        ptcgBoard: { p1: prev.ptcgBoard.p2, p2: prev.ptcgBoard.p1 },
        winnerSide:
          prev.winnerSide === "p1" ? "p2" : prev.winnerSide === "p2" ? "p1" : prev.winnerSide,
        gameWinnerSide:
          prev.gameWinnerSide === "p1" ? "p2" : prev.gameWinnerSide === "p2" ? "p1" : prev.gameWinnerSide,
        initiativeSide:
          prev.initiativeSide === "p1" ? "p2" : prev.initiativeSide === "p2" ? "p1" : prev.initiativeSide,
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
      initiativeSide: prev.initiativeSide ? rotated[prev.initiativeSide] : null,
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
      ptcgBoard: {
        p1: { ...prev.ptcgBoard.p1, energy: true, supporter: true, retreat: true, spotlight: null },
        p2: { ...prev.ptcgBoard.p2, energy: true, supporter: true, retreat: true, spotlight: null },
      },
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
      initiativeSide: null,
      ptcgBoard: emptyPtcgBoard(),
    });
    persist(desk);
    set({ desk });
  },

  resetInfo: () => {
    const prev = get().desk;
    const resources = resetResources(prev);
    const empty = blankPlayer({ ...resources, score: 0 });
    const desk = nextVersion(prev, {
      p1: { ...empty },
      p2: { ...empty },
      p3: { ...empty },
      p4: { ...empty },
      winnerSide: null,
      gameWinnerSide: null,
      initiativeSide: null,
      streamMatchId: null,
      cardSpotlight: emptySpotlight(),
      ptcgBoard: emptyPtcgBoard(),
      lowerThird: { ...prev.lowerThird, visible: false },
    });
    persist(desk);
    set({ desk });
  },

  clearStreamSlot: (gameId, slot) => {
    const prev = get().desk;
    const current = prev.matchSlot ?? 1;
    if (prev.gameId === gameId && current === slot) {
      get().resetInfo();
      return;
    }
    const key = laneKey(gameId, slot);
    const parsed = prev.lanes[key] ? parseDesk(prev.lanes[key]) : null;
    if (!parsed) return;
    const resources = resetResources(parsed);
    const empty = blankPlayer({ ...resources, score: 0 });
    const cleaned = {
      ...parsed,
      p1: { ...empty },
      p2: { ...empty },
      p3: { ...empty },
      p4: { ...empty },
      winnerSide: null,
      gameWinnerSide: null,
      streamMatchId: null,
      cardSpotlight: emptySpotlight(),
    };
    const desk = nextVersion(prev, {
      lanes: { ...prev.lanes, [key]: stripLane(cleaned) },
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
    const resources = resetResources(prev);
    const alreadyCounted = prev.gameWinnerSide === side;
    const score = alreadyCounted ? prev[side].score : clamp(prev[side].score + 1, 0, 9);
    const desk = nextVersion(prev, {
      ...withSeats(prev, resources),
      [side]: { ...prev[side], ...resources, score },
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

  setInitiative: (side) => {
    const prev = get().desk;
    const desk = nextVersion(prev, {
      initiativeSide: prev.initiativeSide === side ? null : side,
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

  loadTestMode: () => {
    const prev = get().desk;
    const desk = nextVersion(prev, toggleTestDesk(prev));
    persist(desk, true);
    set({ desk });
  },

  ensureTestMode: (on) => {
    const prev = get().desk;
    if (deskLooksLikeTest(prev) === on) return;
    const desk = nextVersion(prev, toggleTestDesk(prev));
    persist(desk, true);
    set({ desk });
  },
}));
