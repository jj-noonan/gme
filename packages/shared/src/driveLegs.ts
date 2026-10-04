import type { Coordinate } from "./geo.js";
import { leadMinutes, straightLineDriveMinutes } from "./leaveBy.js";
import { parseHHMM } from "./recommend.js";
import { STATIONS } from "./stations.js";
import type { ScheduleRow, StationCode } from "./types.js";

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

/** Places are rounded to 3 decimals (~100m) on the wire — plenty for a drive, and cacheable. */
const PLACE_DECIMALS = 3;

const MINUTES_PER_DAY = 24 * 60;

const PLACE_PATTERN = /^(-?\d{1,2}\.\d{1,3}),(-?\d{1,3}\.\d{1,3})$/;
const TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function formatPlace(place: Coordinate): string {
  return `${place.lat.toFixed(PLACE_DECIMALS)},${place.lon.toFixed(PLACE_DECIMALS)}`;
}

function parsePlace(text: string): Coordinate | null {
  const match = PLACE_PATTERN.exec(text);
  return match ? { lat: Number(match[1]), lon: Number(match[2]) } : null;
}

function isStationCode(text: string): text is StationCode {
  return STATIONS.some((s) => s.code === text);
}

function isValidLocalTime(text: string): boolean {
  const match = TIME_PATTERN.exec(text);
  if (!match) return false;
  const [, year, month, day, hour, minute] = match.map(Number);
  // Round-trip through Date to reject impossible dates like 2026-02-30 or 25:00.
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute
  );
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

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** `day`'s date at `minutes` past its midnight (may spill into a neighboring day), as "YYYY-MM-DDTHH:MM". */
function localTimeOn(day: Date, minutes: number): string {
  const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes);
  const date = `${at.getFullYear()}-${pad2(at.getMonth() + 1)}-${pad2(at.getDate())}`;
  return `${date}T${pad2(at.getHours())}:${pad2(at.getMinutes())}`;
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

  const lead = leadMinutes("S", straightLineDriveMinutes(vtLocation, row.stationCode));
  return {
    stationCode: row.stationCode,
    place: vtLocation,
    toStation: true,
    departAt: localTimeOn(day, departure - lead),
  };
}
