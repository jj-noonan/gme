import { STATIONS, type ScheduleRow, type StationCode } from "@gme/shared";
import type { TabId } from "../components/TabBar.js";

const TABS: readonly TabId[] = ["N_TODAY", "S_TODAY", "N_TIMETABLE", "S_TIMETABLE"];

/**
 * One trip's detail page, as it lives in the URL hash: which board it was
 * opened from, and which row — "#/trip/S_TODAY/284-ALB". A train number and
 * station pick out a row; the tab says whether it's today's or the timetable's.
 */
export interface TripRoute {
  tab: TabId;
  trainNumber: number;
  stationCode: StationCode;
}

export function formatTripHash(route: TripRoute): string {
  return `#/trip/${route.tab}/${route.trainNumber}-${route.stationCode}`;
}

/** The trip in `hash`, or null for anything else (the board itself). */
export function parseTripHash(hash: string): TripRoute | null {
  const match = /^#\/trip\/([A-Z_]+)\/(\d+)-([A-Z]+)$/.exec(hash);
  if (!match) return null;
  const [, tab, number, code] = match;
  if (!TABS.includes(tab as TabId)) return null;
  if (!STATIONS.some((s) => s.code === code)) return null;
  return { tab: tab as TabId, trainNumber: Number(number), stationCode: code as StationCode };
}

/** Whether `route` points at `row`. */
export function isTripRow(route: TripRoute | null, row: ScheduleRow): boolean {
  return (
    route !== null && route.trainNumber === row.trainNumber && route.stationCode === row.stationCode
  );
}

/** The trips either side of the open one in the list it was opened from. */
export function neighbors(
  rows: ScheduleRow[],
  route: TripRoute | null,
): { prev: ScheduleRow | null; next: ScheduleRow | null } {
  const i = rows.findIndex((row) => isTripRow(route, row));
  if (i < 0) return { prev: null, next: null };
  return { prev: rows[i - 1] ?? null, next: rows[i + 1] ?? null };
}
