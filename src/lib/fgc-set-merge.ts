/**
 * Pure helpers for merging start.gg set data with what the operator set in ROK Desk.
 * No runtime imports so the node test runner can load this file directly.
 */
import type { FgcSet } from "./fgc-types";

/** " (L)" when that side came from losers (the Losers box on the scoreboard). */
export function losersSuffix(set: Pick<FgcSet, "losers1" | "losers2"> | null | undefined, side: "p1" | "p2"): string {
  if (!set) return "";
  return (side === "p1" ? set.losers1 : set.losers2) ? " (L)" : "";
}

/** Appends " (L)" to a name when the side is on losers. Empty names stay empty. */
export function withLosers(name: string, set: Pick<FgcSet, "losers1" | "losers2"> | null | undefined, side: "p1" | "p2"): string {
  if (!name) return name;
  const tag = losersSuffix(set, side);
  return tag && !name.endsWith(tag) ? `${name}${tag}` : name;
}

export type MergeContext = {
  /** Keep the earlier scores (automatic score updating is off). */
  keepScores?: boolean;
};

/**
 * Merge one freshly imported start.gg set with the copy already in ROK Desk.
 * Keeps the operator's Losers ticks; start.gg only seeds Losers on first sight
 * (Grand Final / reset).
 */
export function mergeImportedSet(fresh: FgcSet, previous: FgcSet | null | undefined, ctx: MergeContext = {}): FgcSet {
  if (!previous) return fresh;
  return {
    ...fresh,
    losers1: previous.losers1,
    losers2: previous.losers2,
    ...(ctx.keepScores ? { score1: previous.score1, score2: previous.score2 } : {}),
  };
}
