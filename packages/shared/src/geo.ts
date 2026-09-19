import type { RecommendedStop, Station, StationCode } from "./types.js";

export interface Coordinate {
  lat: number;
  lon: number;
}

/** Assumed flat transit time from anywhere in NYC to Penn Station, until this is worth making real. */
export const ASSUMED_NYC_TRANSIT_MINUTES = 50;

/** Door-to-door buffer baked into every trip time, matching the original hand-built sheet. */
export const TRIP_BUFFER_MINUTES = 15;

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

export interface StopCandidate {
  station: StationCode;
  /** Minutes the train itself takes between NYP and this station. */
  trainMinutes: number;
}

/**
 * Picks whichever candidate station minimizes total door-to-door trip time
 * (train + estimated drive from the user's actual location + buffer).
 * Ties keep the first candidate given.
 */
export function pickRecommendedStop(
  userLocation: Coordinate,
  stations: Station[],
  candidates: StopCandidate[],
  avgMph: number = DEFAULT_AVG_DRIVE_MPH,
): RecommendedStop | null {
  let best: RecommendedStop | null = null;

  for (const candidate of candidates) {
    const station = stations.find((s) => s.code === candidate.station);
    if (!station) continue;

    const driveMinutes = estimateDriveMinutes(haversineMiles(userLocation, station), avgMph);
    const totalTripMinutes = candidate.trainMinutes + driveMinutes + TRIP_BUFFER_MINUTES;

    if (!best || totalTripMinutes < best.totalTripMinutes) {
      best = { station: candidate.station, driveMinutes, totalTripMinutes };
    }
  }

  return best;
}

export type Region = "NYC" | "RUTLAND";

/** Classifies a location as NYC-side or Rutland-side by proximity to each anchor point. */
export function classifyRegion(
  userLocation: Coordinate,
  nyp: Coordinate,
  rutlandClusterCentroid: Coordinate,
): Region {
  return haversineMiles(userLocation, nyp) <= haversineMiles(userLocation, rutlandClusterCentroid)
    ? "NYC"
    : "RUTLAND";
}
