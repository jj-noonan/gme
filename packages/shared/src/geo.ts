import type { ScheduleRow } from "./types.js";

export interface Coordinate {
  lat: number;
  lon: number;
}

export interface Bounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export function isInBounds(point: Coordinate, bounds: Bounds): boolean {
  return (
    point.lat >= bounds.minLat &&
    point.lat <= bounds.maxLat &&
    point.lon >= bounds.minLon &&
    point.lon <= bounds.maxLon
  );
}

/** Assumed flat transit time from anywhere in NYC to Penn Station, until this is worth making real. */
export const ASSUMED_NYC_TRANSIT_MINUTES = 50;

/** Door-to-door buffer baked into every trip time, matching the original hand-built sheet. */
export const TRIP_BUFFER_MINUTES = 15;

/** Slack before a Cape Air flight at Lebanon: check-in closes ahead of departure. */
export const AIRPORT_BUFFER_MINUTES = 30;

/** The buffer at the VT end of a row: the airport's for a flight, the station's for a train. */
export function vtBufferMinutes(row: Pick<ScheduleRow, "mode">): number {
  return row.mode === "flight" ? AIRPORT_BUFFER_MINUTES : TRIP_BUFFER_MINUTES;
}

/**
 * Slack on top of the NYC subway estimate. Smaller than the drive-side buffer
 * because Penn Station is walk-in — you're not parking a car.
 */
export const NYC_STATION_BUFFER_MINUTES = 10;

/** Rough average speed for the rural VT/NY roads around these stations. Tune freely. */
export const DEFAULT_AVG_DRIVE_MPH = 42;

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineMiles(a: Coordinate, b: Coordinate): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function estimateDriveMinutes(
  miles: number,
  avgMph: number = DEFAULT_AVG_DRIVE_MPH,
): number {
  return (miles / avgMph) * 60;
}
