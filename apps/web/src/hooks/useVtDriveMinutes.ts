import {
  formatDriveLeg,
  straightLineDriveMinutes,
  vtDriveLeg,
  type Coordinate,
  type ScheduleRow,
} from "@gme/shared";
import { useCallback, useMemo } from "react";
import { useDriveMinutes } from "./useDriveMinutes.js";

/**
 * Each row's VT-side drive (vt-location → station southbound, station →
 * vt-location northbound) for trains running on `day`: routed and
 * traffic-aware once status-api answers, straight-line until then.
 */
export function useVtDriveMinutes(
  rows: ScheduleRow[],
  vtLocation: Coordinate,
  day: Date,
): (row: ScheduleRow) => number {
  const dayKey = day.toDateString();
  const legs = useMemo(
    () => rows.map((row) => vtDriveLeg(row, vtLocation, day)),
    // `day` is only read for its date; keying on it avoids refetching every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, vtLocation, dayKey],
  );
  const routed = useDriveMinutes(legs);

  return useCallback(
    (row: ScheduleRow) =>
      routed[formatDriveLeg(vtDriveLeg(row, vtLocation, day))] ??
      straightLineDriveMinutes(vtLocation, row.stationCode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routed, vtLocation, dayKey],
  );
}
