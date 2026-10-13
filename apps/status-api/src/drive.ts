import { formatDriveLeg, slotDepartAt, STATIONS, type DriveLeg } from "@gme/shared";
import {
  DRIVE_CACHE_TTL_MS,
  DRIVE_FAR_CACHE_TTL_MS,
  DRIVE_NEAR_WINDOW_MINUTES,
  FETCH_TIMEOUT_MS,
  MAPBOX_DIRECTIONS_URL,
  MAPBOX_TOKEN,
} from "./config.js";
import { easternLocal } from "./eastern.js";

export interface DriveDeps {
  token: string;
  fetchImpl: typeof fetch;
  now: () => Date;
}

const defaultDeps: DriveDeps = { token: MAPBOX_TOKEN, fetchImpl: fetch, now: () => new Date() };

/** A routed drive: with the traffic expected, and with typical traffic for that time. */
interface DriveTime {
  minutes: number;
  /** Mapbox's typical duration for that slot; null when it doesn't have one. */
  typicalMinutes: number | null;
}

// Keyed by the slotted leg, so every row in the same quarter hour shares one call.
const cache = new Map<string, DriveTime & { expiresAt: number }>();
const inFlight = new Map<string, Promise<DriveTime | null>>();

export function clearDriveCache(): void {
  cache.clear();
  inFlight.clear();
}

async function fetchDriveTime(leg: DriveLeg, deps: DriveDeps): Promise<DriveTime | null> {
  const station = STATIONS.find((s) => s.code === leg.stationCode);
  if (!station) return null;

  const stationEnd = `${station.lon},${station.lat}`;
  const placeEnd = `${leg.place.lon},${leg.place.lat}`;
  const coordinates = leg.toStation ? `${placeEnd};${stationEnd}` : `${stationEnd};${placeEnd}`;
  const params = new URLSearchParams({ overview: "false", access_token: deps.token });
  // Mapbox reads depart_at as the origin's local time, which is Eastern for
  // every tracked station and every place inside VT_REGION. It only accepts
  // future times; a slot that has already started just gets live traffic.
  if (leg.departAt > easternLocal(deps.now())) params.set("depart_at", leg.departAt);

  const response = await deps.fetchImpl(`${MAPBOX_DIRECTIONS_URL}/${coordinates}?${params}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Mapbox responded ${response.status}`);

  const body = (await response.json()) as {
    code?: string;
    routes?: { duration?: number; duration_typical?: number }[];
  };
  const route = body.routes?.[0];
  const seconds = route?.duration;
  if (body.code !== "Ok" || typeof seconds !== "number" || !Number.isFinite(seconds)) {
    throw new Error(`Mapbox returned no usable route (code ${body.code})`);
  }
  const typical = route?.duration_typical;
  return {
    minutes: seconds / 60,
    typicalMinutes: typeof typical === "number" && Number.isFinite(typical) ? typical / 60 : null,
  };
}

function cacheTtlMs(leg: DriveLeg, deps: DriveDeps): number {
  const nearCutoff = new Date(deps.now().getTime() + DRIVE_NEAR_WINDOW_MINUTES * 60_000);
  return leg.departAt > easternLocal(nearCutoff) ? DRIVE_FAR_CACHE_TTL_MS : DRIVE_CACHE_TTL_MS;
}

/** Drops expired entries, so arbitrary vt-locations can't grow the cache without bound. */
function pruneCache(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now >= entry.expiresAt) cache.delete(key);
  }
}

async function lookupSlot(leg: DriveLeg, deps: DriveDeps): Promise<DriveTime | null> {
  const key = formatDriveLeg(leg);
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached;

  const pending = inFlight.get(key);
  if (pending) return pending;

  pruneCache();
  const request = fetchDriveTime(leg, deps)
    .then((time) => {
      if (time != null) cache.set(key, { ...time, expiresAt: Date.now() + cacheTtlMs(leg, deps) });
      return time;
    })
    .catch((error: unknown) => {
      // A miss just means the web app keeps its own estimate for this row.
      console.error(`Drive lookup failed for ${key}:`, error);
      return null;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}

export interface DriveTimes {
  /** Traffic-aware minutes per leg. */
  minutes: Record<string, number>;
  /** Typical minutes for the same slot, for legs Mapbox has one for. */
  typical: Record<string, number>;
}

/**
 * Traffic-aware drive minutes for each leg, plus the typical time where
 * known, keyed by the leg's wire form as requested. Legs that can't be
 * answered are left out.
 */
export async function getDriveMinutes(
  legs: DriveLeg[],
  deps: DriveDeps = defaultDeps,
): Promise<DriveTimes> {
  const times: DriveTimes = { minutes: {}, typical: {} };
  if (!deps.token) return times;

  const results = await Promise.all(
    legs.map(async (leg) => {
      const time = await lookupSlot({ ...leg, departAt: slotDepartAt(leg.departAt) }, deps);
      return [formatDriveLeg(leg), time] as const;
    }),
  );

  for (const [key, time] of results) {
    if (!time) continue;
    times.minutes[key] = time.minutes;
    if (time.typicalMinutes != null) times.typical[key] = time.typicalMinutes;
  }
  return times;
}
