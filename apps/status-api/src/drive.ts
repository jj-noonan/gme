import { formatDriveLeg, slotDepartAt, STATIONS, type DriveLeg } from "@gme/shared";
import {
  DRIVE_CACHE_TTL_MS,
  FETCH_TIMEOUT_MS,
  MAPBOX_DIRECTIONS_URL,
  MAPBOX_TOKEN,
} from "./config.js";

export interface DriveDeps {
  token: string;
  fetchImpl: typeof fetch;
  now: () => Date;
}

const defaultDeps: DriveDeps = { token: MAPBOX_TOKEN, fetchImpl: fetch, now: () => new Date() };

// Keyed by the slotted leg, so every row in the same quarter hour shares one call.
const cache = new Map<string, { minutes: number; fetchedAt: number }>();
const inFlight = new Map<string, Promise<number | null>>();

export function clearDriveCache(): void {
  cache.clear();
  inFlight.clear();
}

/** Current Eastern wall-clock time as "YYYY-MM-DDTHH:MM" — the same form legs are given in. */
export function easternNowLocal(now: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

async function fetchDriveMinutes(leg: DriveLeg, deps: DriveDeps): Promise<number | null> {
  const station = STATIONS.find((s) => s.code === leg.stationCode);
  if (!station) return null;

  const stationEnd = `${station.lon},${station.lat}`;
  const placeEnd = `${leg.place.lon},${leg.place.lat}`;
  const coordinates = leg.toStation ? `${placeEnd};${stationEnd}` : `${stationEnd};${placeEnd}`;
  const params = new URLSearchParams({ overview: "false", access_token: deps.token });
  // Mapbox reads depart_at as the origin's local time, which is Eastern for
  // every tracked station and every place inside VT_REGION. It only accepts
  // future times; a slot that has already started just gets live traffic.
  if (leg.departAt > easternNowLocal(deps.now())) params.set("depart_at", leg.departAt);

  const response = await deps.fetchImpl(`${MAPBOX_DIRECTIONS_URL}/${coordinates}?${params}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Mapbox responded ${response.status}`);

  const body = (await response.json()) as { code?: string; routes?: { duration?: number }[] };
  const seconds = body.routes?.[0]?.duration;
  if (body.code !== "Ok" || typeof seconds !== "number" || !Number.isFinite(seconds)) {
    throw new Error(`Mapbox returned no usable route (code ${body.code})`);
  }
  return seconds / 60;
}

async function lookupSlot(leg: DriveLeg, deps: DriveDeps): Promise<number | null> {
  const key = formatDriveLeg(leg);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < DRIVE_CACHE_TTL_MS) return cached.minutes;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = fetchDriveMinutes(leg, deps)
    .then((minutes) => {
      if (minutes != null) cache.set(key, { minutes, fetchedAt: Date.now() });
      return minutes;
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

/**
 * Traffic-aware drive minutes for each leg, keyed by the leg's wire form as
 * requested. Legs that can't be answered are left out.
 */
export async function getDriveMinutes(
  legs: DriveLeg[],
  deps: DriveDeps = defaultDeps,
): Promise<Record<string, number>> {
  if (!deps.token) return {};

  const results = await Promise.all(
    legs.map(async (leg) => {
      const minutes = await lookupSlot({ ...leg, departAt: slotDepartAt(leg.departAt) }, deps);
      return [formatDriveLeg(leg), minutes] as const;
    }),
  );

  return Object.fromEntries(
    results.filter((entry): entry is readonly [string, number] => entry[1] != null),
  );
}
