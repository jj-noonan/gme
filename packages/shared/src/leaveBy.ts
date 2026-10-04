import {
  ASSUMED_NYC_TRANSIT_MINUTES,
  estimateDriveMinutes,
  haversineMiles,
  NYC_STATION_BUFFER_MINUTES,
  TRIP_BUFFER_MINUTES,
  type Coordinate,
} from "./geo.js";
import { parseHHMM } from "./recommend.js";
import { STATIONS } from "./stations.js";
import type { Direction, ScheduleRow, StationCode } from "./types.js";

const MINUTES_PER_DAY = 24 * 60;

/**
 * Where you physically get on this train. Northbound always boards at NYP;
 * southbound boards at the tracked VT/NY station. This is deliberately not
 * the same as `row.stationCode`, which for a northbound row is the
 * *destination*, not the boarding point.
 */
export function boardingStationCode(row: ScheduleRow): StationCode | "NYP" {
  return row.direction === "N" ? "NYP" : row.stationCode;
}

/**
 * Where you get *off* the train and change modes — onto a car heading north,
 * onto the subway heading south. The middle of a door-to-door trip.
 */
export function changeStationCode(row: ScheduleRow): StationCode | "NYP" {
  return row.direction === "N" ? row.stationCode : "NYP";
}

/**
 * How long before departure you need to set off, door to platform.
 * NYC is a flat subway assumption; the Rutland side is the drive from the
 * vt-location.
 */
export function leadMinutes(direction: Direction, driveMinutes: number | null): number {
  if (direction === "N") {
    return ASSUMED_NYC_TRANSIT_MINUTES + NYC_STATION_BUFFER_MINUTES;
  }
  // Drive estimates are fractional; sub-minute precision is false precision
  // anyway, and a non-integer here renders as "12:0.1" downstream.
  return Math.round((driveMinutes ?? 0) + TRIP_BUFFER_MINUTES);
}

/**
 * Straight-line drive estimate between a place and a tracked station (either
 * way — it's symmetric). The fallback whenever there's no routed time.
 */
export function straightLineDriveMinutes(place: Coordinate, stationCode: StationCode): number {
  const station = STATIONS.find((s) => s.code === stationCode);
  return station ? estimateDriveMinutes(haversineMiles(place, station)) : 0;
}

/**
 * Clock time you need to leave, as minutes since midnight. Wraps to the
 * previous day for early-morning departures (a 00:30 train with a 60-minute
 * lead means leaving at 23:30 the night before).
 */
export function leaveByMinutes(scheduledDeparture: string, lead: number): number {
  const raw = Math.round(parseHHMM(scheduledDeparture) - lead);
  return ((raw % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

export interface LeaveBy {
  /** Minutes since midnight. */
  minutes: number;
  leadMinutes: number;
  /** True when that moment has already passed — you can't make this one. */
  missed: boolean;
}

/**
 * Everything the UI needs to render a "leave by" time for one row.
 * `vtDriveMinutes` is the row's vt-location ↔ station drive; only southbound
 * uses it here, since that's the leg you set off on.
 */
export function computeLeaveBy(
  row: ScheduleRow,
  vtDriveMinutes: number,
  nowMinutes: number,
): LeaveBy {
  const lead = leadMinutes(row.direction, row.direction === "S" ? vtDriveMinutes : null);
  const minutes = leaveByMinutes(row.scheduledDeparture, lead);

  // Only meaningful within the same day; a wrapped (previous-evening) leave
  // time for an early train is always already past by definition.
  const departure = parseHHMM(row.scheduledDeparture);
  const missed = departure - lead < nowMinutes;

  return { minutes, leadMinutes: lead, missed };
}

/**
 * The last leg: from where the train drops you to the far-end door. No buffer
 * — buffers exist so you catch a train, not so you get off one.
 * `vtDriveMinutes` is the row's station ↔ vt-location drive; only northbound
 * uses it here, since that's the leg you finish on.
 */
export function arrivalLegMinutes(row: ScheduleRow, vtDriveMinutes: number): number {
  if (row.direction === "N") {
    // Off the train in VT/NY, then drive to the vt-location.
    return Math.round(vtDriveMinutes);
  }
  // Off the train at NYP, then across town to the apartment.
  return ASSUMED_NYC_TRANSIT_MINUTES;
}

/** Clock time you actually get to the door, as minutes since midnight. */
export function doorArrivalMinutes(row: ScheduleRow, legMinutes: number): number {
  const raw = Math.round(parseHHMM(row.scheduledArrival) + legMinutes);
  return ((raw % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}
