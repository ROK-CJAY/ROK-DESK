import { create } from "zustand";
import { EMPTY_FGC, type FgcSet, type FgcState } from "@/lib/fgc-types";

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
  clear: () => void;
};

function read(): FgcState {
  if (typeof window === "undefined") return EMPTY_FGC;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_FGC;
    const parsed = JSON.parse(raw) as Partial<FgcState>;
    return { ...EMPTY_FGC, ...parsed, sets: parsed.sets ?? [] };
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
      const body = (await res.json()) as { event?: FgcState["event"]; sets?: FgcState["sets"]; error?: string };
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
  clear: () => {
    const fgc = EMPTY_FGC;
    write(fgc);
    set({ fgc, error: "" });
  },
}));
