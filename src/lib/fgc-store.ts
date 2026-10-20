import { create } from "zustand";
import { blankPlayer, blankSet, EMPTY_FGC, type FgcPlayer, type FgcSet, type FgcState } from "@/lib/fgc-types";

const KEY = "rok-fgc";

type FgcStore = {
  fgc: FgcState;
  ready: boolean;
  importing: boolean;
  error: string;
  hydrate: () => void;
  reload: () => void;
  patch: (partial: Partial<FgcState>) => void;
  importEvent: () => Promise<void>;
  selectSet: (id: string | null) => void;
  patchSet: (id: string, partial: Partial<FgcSet>) => void;
  patchPlayer: (setId: string, side: "p1" | "p2", partial: Partial<FgcPlayer>) => void;
  newSet: () => void;
  swapTeams: (id: string) => void;
  resetScore: (id: string) => void;
  clear: () => void;
};

function playerOf(raw: Partial<FgcPlayer> | null | undefined): FgcPlayer | null {
  if (!raw) return null;
  return { ...blankPlayer(), ...raw, id: raw.id || blankPlayer().id };
}

function setOf(raw: Partial<FgcSet>): FgcSet {
  return {
    ...blankSet(),
    ...raw,
    id: raw.id || blankSet().id,
    p1: playerOf(raw.p1),
    p2: playerOf(raw.p2),
  };
}

function read(): FgcState {
  if (typeof window === "undefined") return EMPTY_FGC;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_FGC;
    const parsed = JSON.parse(raw) as Partial<FgcState>;
    return { ...EMPTY_FGC, ...parsed, sets: (parsed.sets ?? []).map(setOf) };
  } catch {
    return EMPTY_FGC;
  }
}

function write(fgc: FgcState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(fgc));
}

export const useFgcStore = create<FgcStore>((set, get) => ({
  fgc: EMPTY_FGC,
  ready: false,
  importing: false,
  error: "",
  hydrate: () => {
    if (get().ready) return;
    set({ fgc: read(), ready: true });
  },
  reload: () => set({ fgc: read(), ready: true }),
  patch: (partial) => {
    const fgc = { ...get().fgc, ...partial };
    write(fgc);
    set({ fgc });
  },
  importEvent: async () => {
    const { url } = get().fgc;
    set({ importing: true, error: "" });
    try {
      const res = await fetch("/api/startgg", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const text = await res.text();
      let body: { event?: FgcState["event"]; sets?: FgcState["sets"]; error?: string };
      try {
        body = JSON.parse(text) as typeof body;
      } catch {
        throw new Error("Import failed before start.gg answered. Refresh and try the event link again.");
      }
      if (!res.ok || !body.event || !body.sets) throw new Error(body.error || "Import failed");
      const live = body.sets.find((set) => set.state === "live");
      const fgc: FgcState = {
        ...get().fgc,
        event: body.event,
        sets: body.sets,
        streamSetId: live?.id ?? get().fgc.streamSetId,
        importedAt: new Date().toISOString(),
      };
      write(fgc);
      set({ fgc, importing: false });
    } catch (err) {
      set({ importing: false, error: err instanceof Error ? err.message : "Import failed" });
    }
  },
  selectSet: (id) => {
    const fgc = { ...get().fgc, streamSetId: id };
    write(fgc);
    set({ fgc });
  },
  patchSet: (id, partial) => {
    const fgc = {
      ...get().fgc,
      sets: get().fgc.sets.map((set) => (set.id === id ? { ...set, ...partial } : set)),
    };
    write(fgc);
    set({ fgc });
  },
  patchPlayer: (setId, side, partial) => {
    const fgc = {
      ...get().fgc,
      sets: get().fgc.sets.map((set) => {
        if (set.id !== setId) return set;
        const current = set[side] ?? blankPlayer();
        return { ...set, [side]: { ...current, ...partial } };
      }),
    };
    write(fgc);
    set({ fgc });
  },
  newSet: () => {
    const created = blankSet();
    const fgc = { ...get().fgc, sets: [created, ...get().fgc.sets], streamSetId: created.id };
    write(fgc);
    set({ fgc });
  },
  swapTeams: (id) => {
    const fgc = {
      ...get().fgc,
      sets: get().fgc.sets.map((set) =>
        set.id === id
          ? { ...set, p1: set.p2, p2: set.p1, score1: set.score2, score2: set.score1, losers1: set.losers2, losers2: set.losers1 }
          : set,
      ),
    };
    write(fgc);
    set({ fgc });
  },
  resetScore: (id) => {
    const fgc = {
      ...get().fgc,
      sets: get().fgc.sets.map((set) => (set.id === id ? { ...set, score1: 0, score2: 0 } : set)),
    };
    write(fgc);
    set({ fgc });
  },
  clear: () => {
    const fgc = EMPTY_FGC;
    write(fgc);
    set({ fgc, error: "" });
  },
}));
