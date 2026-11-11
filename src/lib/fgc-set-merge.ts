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

export function validBestOf(value: unknown): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n % 2 === 1 && n <= 15 ? n : 0;
}

/**
 * Best-of for one imported set. Never "resets":
 *   1. a best-of the TO desk saved for this set (Send to station / stream)
 *   2. the best-of this set already has in ROK Desk
 *   3. a set seen for the first time inherits the best-of of the current / most recent ROK Desk set
 *   4. only with no earlier set at all: start.gg's bestOf / totalGames, else 3
 */
export function pickBestOf(input: { toSaved?: number | null; existing?: number | null; inherited?: number | null; startgg?: number | null }): number {
  return validBestOf(input.toSaved) || validBestOf(input.existing) || validBestOf(input.inherited) || validBestOf(input.startgg) || 3;
}

export type MergeContext = {
  /** Best-of saved by the TO desk, keyed by start.gg set id. */
  toBestOf?: Record<string, number>;
  /** Best-of of the current / most recent set in ROK Desk, used for sets seen the first time. */
  inheritedBestOf?: number | null;
  /** Keep the earlier scores (automatic score updating is off). */
  keepScores?: boolean;
};

/**
 * Merge one freshly imported start.gg set with the copy already in ROK Desk.
 * Keeps the operator's Losers ticks and best-of; start.gg only seeds Losers on first sight
 * (Grand Final / reset).
 */
export function mergeImportedSet(fresh: FgcSet, previous: FgcSet | null | undefined, ctx: MergeContext = {}): FgcSet {
  const toSaved = validBestOf(ctx.toBestOf?.[fresh.id]);
  const bestOf = pickBestOf({
    toSaved,
    existing: previous?.bestOf,
    inherited: previous ? null : ctx.inheritedBestOf,
    startgg: fresh.bestOf,
  });
  const bestOfSet = toSaved ? "to" : previous?.bestOfSet;
  if (!previous) return { ...fresh, bestOf, ...(bestOfSet ? { bestOfSet } : {}) };
  return {
    ...fresh,
    bestOf,
    ...(bestOfSet ? { bestOfSet } : {}),
    losers1: previous.losers1,
    losers2: previous.losers2,
    ...(ctx.keepScores ? { score1: previous.score1, score2: previous.score2 } : {}),
  };
}

/** The best-of new sets should inherit: the set on the active board, else the most recently touched one. */
export function currentBestOf(sets: Pick<FgcSet, "id" | "bestOf">[], currentId: string | null | undefined): number | null {
  const current = currentId ? sets.find((set) => set.id === currentId) : null;
  return validBestOf(current?.bestOf) || null;
}

/**
 * A set coming onto a scoreboard keeps a best-of the TO desk or the operator chose.
 * Otherwise it carries over the best-of of the set that was on that board, so once the
 * operator switches to Bo5 the next sets stay Bo5.
 */
export function carryBestOf(next: FgcSet, previousOnBoard: Pick<FgcSet, "bestOf"> | null | undefined): FgcSet {
  if (next.bestOfSet) return next;
  const carried = validBestOf(previousOnBoard?.bestOf);
  return carried && carried !== next.bestOf ? { ...next, bestOf: carried } : next;
}
