import {
  ASSUMED_NYC_TRANSIT_MINUTES,
  estimateDriveMinutes,
  haversineMiles,
  NYC_STATION_BUFFER_MINUTES,
  TRIP_BUFFER_MINUTES,
  vtBufferMinutes,
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
 * The door-side legs of a row's trip, whichever way it runs: the drive
 * between the vt-location and the VT/NY station, and the transit trip
 * between the nyc-location and Penn Station. Routed when known, estimates
 * otherwise — the caller decides.
 */
export interface DoorLegs {
  vtDriveMinutes: number;
  /**
   * Heading out: from leaving the door to the arrive-by time at Penn Station
   * (the station buffer before departure). Heading home: from the train
   * getting in to reaching the door.
   */
  nycTransitMinutes: number;
}

/** Door legs with nothing looked up yet: the flat subway assumption for NYC. */
export function estimatedDoorLegs(vtDriveMinutes: number): DoorLegs {
  return { vtDriveMinutes, nycTransitMinutes: ASSUMED_NYC_TRANSIT_MINUTES };
}

/**
 * How long before departure you need to set off, door to platform: the leg
 * you start on, plus that end's station buffer.
 */
export function leadMinutes(
  direction: Direction,
  legs: DoorLegs,
  vtBuffer: number = TRIP_BUFFER_MINUTES,
): number {
  const raw =
    direction === "N"
      ? legs.nycTransitMinutes + NYC_STATION_BUFFER_MINUTES
      : legs.vtDriveMinutes + vtBuffer;
  // Routed times are fractional; sub-minute precision is false precision
  // anyway, and a non-integer here renders as "12:0.1" downstream.
  return Math.round(raw);
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

/** Everything the UI needs to render a "leave by" time for one row. */
export function computeLeaveBy(row: ScheduleRow, legs: DoorLegs, nowMinutes: number): LeaveBy {
  const lead = leadMinutes(row.direction, legs, vtBufferMinutes(row));
  const minutes = leaveByMinutes(row.scheduledDeparture, lead);

  // Only meaningful within the same day; a wrapped (previous-evening) leave
  // time for an early train is always already past by definition.
  const departure = parseHHMM(row.scheduledDeparture);
  const missed = departure - lead < nowMinutes;

  return { minutes, leadMinutes: lead, missed };
}

/**
 * The last leg: from where the train drops you to the far-end door — the
 * drive to the vt-location northbound, transit to the nyc-location
 * southbound. No buffer: buffers exist so you catch a train, not so you get
 * off one.
 */
export function arrivalLegMinutes(row: ScheduleRow, legs: DoorLegs): number {
  return Math.round(row.direction === "N" ? legs.vtDriveMinutes : legs.nycTransitMinutes);
}

/** Clock time you actually get to the door, as minutes since midnight. */
export function doorArrivalMinutes(row: ScheduleRow, legMinutes: number): number {
  const raw = Math.round(parseHHMM(row.scheduledArrival) + legMinutes);
  return ((raw % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}
