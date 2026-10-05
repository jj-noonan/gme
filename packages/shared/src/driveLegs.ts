import { TRIP_BUFFER_MINUTES, type Coordinate } from "./geo.js";
import { straightLineDriveMinutes } from "./leaveBy.js";
import { parseHHMM } from "./recommend.js";
import { STATIONS } from "./stations.js";
import type { ScheduleRow, StationCode } from "./types.js";
import { formatPlace, isValidLocalTime, localTimeOn, parsePlace } from "./wire.js";

/**
 * One VT-side drive between a tracked station and a place, starting at a
 * local (Eastern) wall-clock time. One end is always a station: these are the
 * only drives the app needs, and it keeps the routing endpoint from being an
 * open-ended directions proxy.
 */
export interface DriveLeg {
  stationCode: StationCode;
  place: Coordinate;
  /** True for place → station (heading out), false for station → place (getting home). */
  toStation: boolean;
  /** "YYYY-MM-DDTHH:MM", Eastern local time. */
  departAt: string;
}

/**
 * Drive estimates are looked up per slot, not per minute: traffic doesn't
 * change meaningfully inside a quarter hour, and it keeps routing calls cacheable.
 */
export const DRIVE_SLOT_MINUTES = 15;

const MINUTES_PER_DAY = 24 * 60;

function isStationCode(text: string): text is StationCode {
  return STATIONS.some((s) => s.code === text);
}

/**
 * The wire form of a leg — "ALB>43.609,-72.978@2026-10-05T18:00" heading
 * home, "43.609,-72.978>ALB@…" heading out. Also the key it's answered under.
 */
export function formatDriveLeg(leg: DriveLeg): string {
  const place = formatPlace(leg.place);
  const route = leg.toStation ? `${place}>${leg.stationCode}` : `${leg.stationCode}>${place}`;
  return `${route}@${leg.departAt}`;
}

/** Parses the wire form back, or null if it's malformed or has no tracked station end. */
export function parseDriveLeg(text: string): DriveLeg | null {
  const [route, departAt, ...rest] = text.split("@");
  if (rest.length > 0 || !departAt || !isValidLocalTime(departAt)) return null;

  const [from, to, ...more] = route.split(">");
  if (more.length > 0 || !from || !to) return null;

  if (isStationCode(from)) {
    const place = parsePlace(to);
    return place ? { stationCode: from, place, toStation: false, departAt } : null;
  }
  if (isStationCode(to)) {
    const place = parsePlace(from);
    return place ? { stationCode: to, place, toStation: true, departAt } : null;
  }
  return null;
}

/** Floors a "YYYY-MM-DDTHH:MM" time to the start of its drive slot. */
export function slotDepartAt(departAt: string): string {
  const minute = Number(departAt.slice(14, 16));
  const slotted = minute - (minute % DRIVE_SLOT_MINUTES);
  return `${departAt.slice(0, 14)}${String(slotted).padStart(2, "0")}`;
}

/**
 * The VT-side drive for a row whose train runs on `day` (read off the local
 * clock, assumed Eastern like the rest of the app):
 *
 * - Northbound: station → vt-location, starting at the scheduled arrival
 *   (the next day for trains arriving after midnight). Scheduled, not
 *   delay-adjusted: a late train rarely changes the traffic picture, and
 *   tracking delay would re-key the lookup every minute.
 * - Southbound: vt-location → station, starting when you'd leave. That
 *   depends on the drive time itself, so it's taken from the straight-line
 *   estimate — close enough, since lookups are per 15-minute slot anyway.
 */
export function vtDriveLeg(row: ScheduleRow, vtLocation: Coordinate, day: Date): DriveLeg {
  const departure = parseHHMM(row.scheduledDeparture);

  if (row.direction === "N") {
    const arrival = parseHHMM(row.scheduledArrival);
    const overnight = arrival < departure;
    return {
      stationCode: row.stationCode,
      place: vtLocation,
      toStation: false,
      departAt: localTimeOn(day, arrival + (overnight ? MINUTES_PER_DAY : 0)),
    };
  }

  const lead = Math.round(straightLineDriveMinutes(vtLocation, row.stationCode) + TRIP_BUFFER_MINUTES);
  return {
    stationCode: row.stationCode,
    place: vtLocation,
    toStation: true,
    departAt: localTimeOn(day, departure - lead),
  };
}
