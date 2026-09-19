import { ASSUMED_NYC_TRANSIT_MINUTES, pickRecommendedStop, TRIP_BUFFER_MINUTES, type Coordinate } from "./geo.js";
import { STATIONS } from "./stations.js";
import type { ScheduleRow } from "./types.js";

export function parseHHMM(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes from `start` to `end`, both "HH:MM" clock times, wrapping past midnight. */
export function minutesBetweenClockTimes(start: string, end: string): number {
  const s = parseHHMM(start);
  const e = parseHHMM(end);
  return e >= s ? e - s : e + 24 * 60 - s;
}

/**
 * Northbound (NYP -> VT/NY): single origin, so there's no station choice —
 * just the next train you can still reach NYP in time to catch, assuming
 * the flat NYC transit estimate.
 */
export function pickNorthboundRecommendation(
  rows: ScheduleRow[],
  nowMinutes: number,
  transitMinutes: number = ASSUMED_NYC_TRANSIT_MINUTES,
): ScheduleRow | null {
  const catchable = rows
    .filter((r) => parseHHMM(r.scheduledDeparture) >= nowMinutes + transitMinutes)
    .sort((a, b) => parseHHMM(a.scheduledDeparture) - parseHHMM(b.scheduledDeparture));
  return catchable[0] ?? null;
}

export interface SouthboundRecommendation {
  row: ScheduleRow;
  driveMinutes: number;
}

/**
 * Southbound (VT/NY -> NYP): each train may stop at several tracked stations
 * (e.g. Ethan Allen at RUD/CNV/FED/ALB), all arriving NYP at the same time.
 * Picks whichever station minimizes total door-to-door time from the user's
 * actual location — which, since the arrival is fixed, is equivalent to
 * whichever station lets the user leave home latest — so the minimizing
 * station is always the last one to become unreachable. Returns the
 * earliest train whose minimizing station is still reachable in time.
 */
export function pickSouthboundRecommendation(
  rows: ScheduleRow[],
  userLocation: Coordinate,
  nowMinutes: number,
): SouthboundRecommendation | null {
  const byTrain = new Map<number, ScheduleRow[]>();
  for (const row of rows) {
    const group = byTrain.get(row.trainNumber) ?? [];
    group.push(row);
    byTrain.set(row.trainNumber, group);
  }

  const trainsByEarliestDeparture = [...byTrain.values()].sort(
    (a, b) =>
      Math.min(...a.map((r) => parseHHMM(r.scheduledDeparture))) -
      Math.min(...b.map((r) => parseHHMM(r.scheduledDeparture))),
  );

  for (const group of trainsByEarliestDeparture) {
    const best = pickRecommendedStop(
      userLocation,
      STATIONS,
      group.map((r) => ({
        station: r.stationCode,
        trainMinutes: parseHHMM(r.scheduledArrival) - parseHHMM(r.scheduledDeparture),
      })),
    );
    if (!best) continue;

    const row = group.find((r) => r.stationCode === best.station);
    if (!row) continue;

    const canStillMakeIt =
      nowMinutes + best.driveMinutes + TRIP_BUFFER_MINUTES <= parseHHMM(row.scheduledDeparture);
    if (canStillMakeIt) {
      return { row, driveMinutes: best.driveMinutes };
    }
  }

  return null;
}
