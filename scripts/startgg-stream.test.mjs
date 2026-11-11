import assert from "node:assert/strict";
import { test } from "node:test";
import { isRateLimit, nextPollDelay, pickStreamSet } from "../src/lib/startgg-stream.ts";

const queues = [
  { stream: { id: 1, streamName: "rokesports" }, sets: [
    { id: 900, state: 2, event: { id: 77 } }, // other event, in progress
    { id: 101, state: 1, event: { id: 55 } },
    { id: 102, state: 6, event: { id: 55 } },
  ] },
  { stream: { id: 2, streamName: "rokesports2" }, sets: [
    { id: 201, state: 3, event: { id: 55 } }, // finished
    { id: 202, state: 1, event: { id: 55 } },
  ] },
];
const live = [{ id: 500, state: 2, stream: null }, { id: 501, state: 2, stream: { streamName: "rokesports2" } }];

test("streamQueue is read as a list and filtered to this stream and event", () => {
  assert.deepEqual(pickStreamSet({ queues, live, eventId: "55", streamName: "rokesports" }), { setId: "102", streamName: "rokesports", source: "queue" });
  assert.equal(pickStreamSet({ queues, live, eventId: "55", streamName: "RokEsports2 " })?.setId, "202");
});

test("in progress beats called beats queued", () => {
  const q = [{ stream: { streamName: "s" }, sets: [{ id: 1, state: 1 }, { id: 2, state: 6 }, { id: 3, state: 2 }] }];
  assert.equal(pickStreamSet({ queues: q, streamName: "s" })?.setId, "3");
});

test("never falls back to a random in-progress set on another station", () => {
  assert.equal(pickStreamSet({ queues: [], live: [{ id: 500, state: 2, stream: null }], streamName: "" }), null);
  assert.equal(pickStreamSet({ queues: null, live, streamName: "rokesports" }), null);
  assert.equal(pickStreamSet({ queues: null, live, streamName: "rokesports2" })?.setId, "501");
});

test("a single queue object (older shape) still works", () => {
  assert.equal(pickStreamSet({ queues: { stream: { streamName: "x" }, sets: [{ id: 9, state: 1 }] }, streamName: "" })?.setId, "9");
});

test("poll backoff: 15 s, doubles on errors to 60 s, 60 s on rate limit", () => {
  assert.equal(nextPollDelay(15_000, "ok"), 15_000);
  assert.equal(nextPollDelay(15_000, "error"), 30_000);
  assert.equal(nextPollDelay(30_000, "error"), 60_000);
  assert.equal(nextPollDelay(60_000, "error"), 60_000);
  assert.equal(nextPollDelay(15_000, "rate-limit"), 60_000);
  assert.ok(isRateLimit("start.gg rate limit (429). Slowing down."));
  assert.ok(isRateLimit("", 429));
  assert.ok(!isRateLimit("start.gg returned 500"));
});
