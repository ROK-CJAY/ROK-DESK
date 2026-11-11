/**
 * Picks the set start.gg has on a given stream. Pure so it can be unit tested.
 *
 * start.gg's tournament.streamQueue is a LIST (one entry per stream), tournament-wide, so it
 * also carries other events' sets. Inside one stream's queue: in progress (state 2) first,
 * then called (state 6), then the first queued set that is not finished.
 */
export type QueueSetIn = { id?: string | number | null; state?: number | null; event?: { id?: string | number | null } | null };
export type QueueIn = { stream?: { id?: string | number | null; streamName?: string | null } | null; sets?: QueueSetIn[] | null };
export type LiveSetIn = { id?: string | number | null; state?: number | null; stream?: { streamName?: string | null } | null };

export type StreamPick = { setId: string; streamName: string; source: "queue" | "live" };

const norm = (value: string | null | undefined) => (value || "").trim().toLowerCase();

function bestInQueue(sets: QueueSetIn[], eventId: string): string | null {
  const mine = sets.filter((set) => set.id != null && (!eventId || !set.event?.id || String(set.event.id) === eventId) && set.state !== 3);
  const pick = mine.find((set) => set.state === 2) ?? mine.find((set) => set.state === 6) ?? mine[0];
  return pick?.id == null ? null : String(pick.id);
}

export function pickStreamSet(input: { queues?: QueueIn[] | QueueIn | null; live?: LiveSetIn[] | null; eventId?: string | null; streamName?: string | null }): StreamPick | null {
  const raw = input.queues;
  const queues = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const eventId = input.eventId ? String(input.eventId) : "";
  const wanted = norm(input.streamName);
  const matching = wanted ? queues.filter((queue) => norm(queue.stream?.streamName) === wanted) : queues;
  for (const queue of matching) {
    const id = bestInQueue(queue.sets ?? [], eventId);
    if (id) return { setId: id, streamName: queue.stream?.streamName?.trim() || "", source: "queue" };
  }
  // Fallback: an in-progress set of this event that start.gg tied to the same stream.
  // Without a stream name, only accept it when exactly one stream has a live set.
  const live = (input.live ?? []).filter((set) => set.id != null && set.state === 2 && norm(set.stream?.streamName));
  const onStream = wanted ? live.filter((set) => norm(set.stream?.streamName) === wanted) : live;
  const streams = new Set(onStream.map((set) => norm(set.stream?.streamName)));
  if (onStream.length && (wanted || streams.size === 1)) {
    return { setId: String(onStream[0].id), streamName: onStream[0].stream?.streamName?.trim() || "", source: "live" };
  }
  return null;
}

/** Poll delay after a result: 15 s normally, doubling on errors up to 60 s, 60 s on a rate limit. */
export function nextPollDelay(previous: number, outcome: "ok" | "error" | "rate-limit", base = 15_000, max = 60_000): number {
  if (outcome === "ok") return base;
  if (outcome === "rate-limit") return max;
  return Math.min(max, Math.max(base, previous) * 2);
}

export function isRateLimit(message: string, status?: number): boolean {
  return status === 429 || /\b429\b|rate.?limit|too many requests/i.test(message);
}
