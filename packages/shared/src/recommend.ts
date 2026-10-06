import { NYC_STATION_BUFFER_MINUTES, vtBufferMinutes } from "./geo.js";
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
 * just the next train you can still reach NYP in time to catch, with the
 * station buffer to spare. `nycTransitMinutes` gives each row's trip from
 * the nyc-location to Penn Station.
 */
export function pickNorthboundRecommendation(
  rows: ScheduleRow[],
  nowMinutes: number,
  nycTransitMinutes: (row: ScheduleRow) => number,
): ScheduleRow | null {
  const catchable = rows
    .filter(
      (r) =>
        parseHHMM(r.scheduledDeparture) >=
        nowMinutes + nycTransitMinutes(r) + NYC_STATION_BUFFER_MINUTES,
    )
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
 * Picks whichever station minimizes total door-to-door time from the
 * vt-location — which, since the arrival is fixed, is equivalent to
 * whichever station lets the user leave home latest — so the minimizing
 * station is always the last one to become unreachable. Returns the
 * earliest train whose minimizing station is still reachable in time.
 * `vtDriveMinutes` gives each row's drive from the vt-location to its station.
 */
export function pickSouthboundRecommendation(
  rows: ScheduleRow[],
  nowMinutes: number,
  vtDriveMinutes: (row: ScheduleRow) => number,
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
    // Ties keep the earlier row in the group.
    let best: SouthboundRecommendation | null = null;
    let bestTotal = Infinity;
    for (const row of group) {
      const driveMinutes = vtDriveMinutes(row);
      const total = minutesBetweenClockTimes(row.scheduledDeparture, row.scheduledArrival) + driveMinutes;
      if (total < bestTotal) {
        best = { row, driveMinutes };
        bestTotal = total;
      }
    }
    if (!best) continue;

    const canStillMakeIt =
      nowMinutes + best.driveMinutes + vtBufferMinutes(best.row) <=
      parseHHMM(best.row.scheduledDeparture);
    if (canStillMakeIt) return best;
  }

  return null;
}
