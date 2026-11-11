/**
 * Which start.gg sets sit on a station / stream card. Empty ids never match: a stream with no
 * station has stationId "", and every set that is not on a station also has stationId "".
 */
export type SpotIds = { stationId?: string | null; streamId?: string | null };
export type SpotSet = { stationId: string; streamId: string };

export function onSpot(set: SpotSet, spot: SpotIds): boolean {
  const station = spot.stationId || "";
  const stream = spot.streamId || "";
  return (!!station && set.stationId === station) || (!!stream && set.streamId === stream);
}
