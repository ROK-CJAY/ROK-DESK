import assert from "node:assert/strict";
import { test } from "node:test";
import { onSpot } from "../src/lib/fgc-spot.ts";

// Mirrors the stream-station cards in FGC tournament control.
const streams = [
  { name: "Stream A", stationId: "", streamId: "sa" },
  { name: "Stream B", stationId: "", streamId: "sb" },
  { name: "Stream C (station 9)", stationId: "st9", streamId: "sc" },
];

test("a set sent to one stream occupies only that stream card", () => {
  const sent = { stationId: "", streamId: "sa" };
  assert.deepEqual(streams.filter((card) => onSpot(sent, card)).map((card) => card.name), ["Stream A"]);
});

test("a set with no station and no stream sits on no card", () => {
  const loose = { stationId: "", streamId: "" };
  assert.equal(streams.some((card) => onSpot(loose, card)), false);
});

test("a set on a stream's station still matches that stream card", () => {
  assert.equal(onSpot({ stationId: "st9", streamId: "" }, streams[2]), true);
  assert.equal(onSpot({ stationId: "st9", streamId: "" }, streams[0]), false);
});
