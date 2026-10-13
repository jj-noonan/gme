import {
  ASSUMED_NYC_TRANSIT_MINUTES,
  formatTransitLeg,
  nycTransitLeg,
  type Coordinate,
  type DoorLegs,
  type ScheduleRow,
} from "@gme/shared";
import { useTransitTrips } from "./useTransitTrips.js";
import { useVtDriveMinutes } from "./useVtDriveMinutes.js";

export interface RowDoorLegs extends DoorLegs {
  /** The VT drive with typical traffic, to compare against; null when unknown. */
  vtDriveTypicalMinutes: number | null;
  /** Lines ridden on the NYC leg, once looked up; null while it's still the flat estimate. */
  nycLines: string[] | null;
}

/**
 * Both door-side legs for each row, for the train running on `dayFor(row)`:
 * the VT drive (routed, else straight-line) and the NYC transit trip
 * (routed, else the flat subway estimate).
 */
export function useDoorLegs(
  rows: ScheduleRow[],
  vtLocation: Coordinate,
  nycLocation: Coordinate,
  dayFor: (row: ScheduleRow) => Date,
): (row: ScheduleRow) => RowDoorLegs {
  const vtDrive = useVtDriveMinutes(rows, vtLocation, dayFor);

  const legs = rows.map((row) => nycTransitLeg(row, nycLocation, dayFor(row)));
  const keys = new Map(rows.map((row, i) => [row, formatTransitLeg(legs[i])]));
  const trips = useTransitTrips(legs);

  return (row) => {
    const key = keys.get(row);
    const trip = key === undefined ? undefined : trips[key];
    const drive = vtDrive(row);
    return {
      vtDriveMinutes: drive.minutes,
      vtDriveTypicalMinutes: drive.typicalMinutes,
      nycTransitMinutes: trip?.minutes ?? ASSUMED_NYC_TRANSIT_MINUTES,
      nycLines: trip?.lines ?? null,
    };
  };
}
