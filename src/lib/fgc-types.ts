export type FgcSetState = "pending" | "live" | "done";

export type FgcPlayer = {
  id: string;
  tag: string;
  prefix: string;
  realName: string;
  country: string;
  twitter: string;
  seed: number | null;
};

export type FgcSet = {
  id: string;
  phase: string;
  group: string;
  round: string;
  identifier: string;
  state: FgcSetState;
  winnerId: string | null;
  p1: FgcPlayer | null;
  p2: FgcPlayer | null;
  score1: number;
  score2: number;
};

export type FgcEvent = {
  id: string;
  name: string;
  slug: string;
  tournamentName: string;
  game: string;
  url: string;
};

export type FgcState = {
  url: string;
  event: FgcEvent | null;
  sets: FgcSet[];
  streamSetId: string | null;
  importedAt: string | null;
};

export const EMPTY_FGC: FgcState = {
  url: "",
  event: null,
  sets: [],
  streamSetId: null,
  importedAt: null,
};

export function playerLabel(player: FgcPlayer | null): string {
  if (!player) return "TBD";
  const tag = player.tag.trim();
  const prefix = player.prefix.trim();
  if (prefix && tag) return `${prefix} | ${tag}`;
  return tag || player.realName || "TBD";
}

export function streamSetOf(state: FgcState): FgcSet | null {
  if (!state.streamSetId) return null;
  return state.sets.find((set) => set.id === state.streamSetId) ?? null;
}
