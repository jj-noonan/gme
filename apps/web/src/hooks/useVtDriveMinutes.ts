import {
  formatDriveLeg,
  straightLineDriveMinutes,
  vtDriveLeg,
  type Coordinate,
  type ScheduleRow,
} from "@gme/shared";
import { useDriveMinutes } from "./useDriveMinutes.js";

/**
 * Each row's VT-side drive (vt-location → station southbound, station →
 * vt-location northbound), for the train running on `dayFor(row)`: routed
 * and traffic-aware once status-api answers, straight-line until then.
 */
export function useVtDriveMinutes(
  rows: ScheduleRow[],
  vtLocation: Coordinate,
  dayFor: (row: ScheduleRow) => Date,
): (row: ScheduleRow) => number {
  // Rebuilt every render, but cheap; useDriveMinutes only refetches when the
  // legs' wire form changes.
  const legs = rows.map((row) => vtDriveLeg(row, vtLocation, dayFor(row)));
  const keys = new Map(rows.map((row, i) => [row, formatDriveLeg(legs[i])]));
  const routed = useDriveMinutes(legs);

  return (row) => {
    const key = keys.get(row);
    const minutes = key === undefined ? undefined : routed[key];
    return minutes ?? straightLineDriveMinutes(vtLocation, row.stationCode);
  };
}
