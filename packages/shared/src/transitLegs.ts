import { NYC_STATION_BUFFER_MINUTES, type Coordinate } from "./geo.js";
import { parseHHMM } from "./recommend.js";
import type { ScheduleRow } from "./types.js";
import { formatPlace, isValidLocalTime, localTimeOn, parsePlace } from "./wire.js";

const MINUTES_PER_DAY = 24 * 60;

/**
 * One NYC-side transit trip between a place and Penn Station, pinned to a
 * local (Eastern) wall-clock time at the Penn Station end — which is the end
 * the train fixes:
 *
 * - toNyp: place → NYP, arriving by `at` (heading out, northbound).
 * - !toNyp: NYP → place, leaving at `at` (getting home, southbound).
 *
 * Every row of the same train shares that time, so they share one lookup.
 */
export interface TransitLeg {
  place: Coordinate;
  toNyp: boolean;
  /** "YYYY-MM-DDTHH:MM", Eastern local time, at Penn Station. */
  at: string;
}

/**
 * One looked-up transit trip. `minutes` runs from `at` to the other end of
 * the trip, so it includes any wait: arriving early at Penn Station
 * northbound, or waiting for the first train southbound.
 */
export interface TransitTrip {
  minutes: number;
  /** Lines ridden, in order — "C", "A", "B25" — for badges. Empty for a walk. */
  lines: string[];
}

const NYP = "NYP";

/** The wire form — "40.687,-73.969>NYP@2026-10-05T20:20" heading out, "NYP>40.687,-73.969@…" home. */
export function formatTransitLeg(leg: TransitLeg): string {
  const place = formatPlace(leg.place);
  const route = leg.toNyp ? `${place}>${NYP}` : `${NYP}>${place}`;
  return `${route}@${leg.at}`;
}

/** Parses the wire form back, or null if it's malformed or doesn't have Penn Station at one end. */
export function parseTransitLeg(text: string): TransitLeg | null {
  const [route, at, ...rest] = text.split("@");
  if (rest.length > 0 || !at || !isValidLocalTime(at)) return null;

  const [from, to, ...more] = route.split(">");
  if (more.length > 0 || !from || !to) return null;

  if (to === NYP) {
    const place = parsePlace(from);
    return place ? { place, toNyp: true, at } : null;
  }
  if (from === NYP) {
    const place = parsePlace(to);
    return place ? { place, toNyp: false, at } : null;
  }
  return null;
}

/**
 * The NYC-side trip for a row whose train runs on `day` (local clock, assumed
 * Eastern):
 *
 * - Northbound: nyc-location → NYP, arriving the station buffer before the
 *   train leaves.
 * - Southbound: NYP → nyc-location, leaving when the train gets in (the next
 *   day for trains arriving after midnight). Scheduled, not delay-adjusted,
 *   for the same reason as the drives: it'd re-key the lookup every minute.
 */
export function nycTransitLeg(row: ScheduleRow, nycLocation: Coordinate, day: Date): TransitLeg {
  const departure = parseHHMM(row.scheduledDeparture);

  if (row.direction === "N") {
    return {
      place: nycLocation,
      toNyp: true,
      at: localTimeOn(day, departure - NYC_STATION_BUFFER_MINUTES),
    };
  }

  const arrival = parseHHMM(row.scheduledArrival);
  const overnight = arrival < departure;
  return {
    place: nycLocation,
    toNyp: false,
    at: localTimeOn(day, arrival + (overnight ? MINUTES_PER_DAY : 0)),
  };
}
