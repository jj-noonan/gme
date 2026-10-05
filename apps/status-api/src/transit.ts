import { formatTransitLeg, NYP_COORDINATE, type TransitLeg, type TransitTrip } from "@gme/shared";
import { FETCH_TIMEOUT_MS, GOOGLE_MAPS_API_KEY, GOOGLE_ROUTES_URL } from "./config.js";
import { easternLocalToInstant } from "./eastern.js";

export interface TransitDeps {
  apiKey: string;
  fetchImpl: typeof fetch;
}

const defaultDeps: TransitDeps = { apiKey: GOOGLE_MAPS_API_KEY, fetchImpl: fetch };

// Only what's used below — Google bills by the fields asked for.
const FIELD_MASK = [
  "routes.duration",
  "routes.legs.steps.travelMode",
  "routes.legs.steps.staticDuration",
  "routes.legs.steps.transitDetails.stopDetails.departureTime",
  "routes.legs.steps.transitDetails.stopDetails.arrivalTime",
  "routes.legs.steps.transitDetails.transitLine.nameShort",
  "routes.legs.steps.transitDetails.transitLine.name",
].join(",");

interface RoutesStep {
  travelMode?: string;
  staticDuration?: string;
  transitDetails?: {
    stopDetails?: { departureTime?: string; arrivalTime?: string };
    transitLine?: { nameShort?: string; name?: string };
  };
}

interface RoutesResponse {
  routes?: { duration?: string; legs?: { steps?: RoutesStep[] }[] }[];
}

// Google's terms don't allow caching route results, so this only merges
// identical lookups that are in flight at the same moment.
const inFlight = new Map<string, Promise<TransitTrip | null>>();

/** "754s" → 754. */
function seconds(duration: string | undefined): number {
  const value = Number.parseFloat(duration ?? "");
  return Number.isFinite(value) ? value : 0;
}

/**
 * Turns Google's route into a trip measured from the leg's Penn Station time.
 * Google may plan a trip that arrives early or leaves late (a sparse bus,
 * say), so the clock times of the first and last rides are what count, not
 * just the route's duration: heading out, it's how long before `at` you must
 * leave; heading home, how long after `at` you get in.
 */
export function tripFromRoute(leg: TransitLeg, body: RoutesResponse): TransitTrip | null {
  const route = body.routes?.[0];
  if (!route) return null;
  const steps = route.legs?.flatMap((l) => l.steps ?? []) ?? [];

  const rides = steps.filter((s) => s.travelMode === "TRANSIT" && s.transitDetails);
  const lines = rides
    .map((s) => s.transitDetails?.transitLine?.nameShort ?? s.transitDetails?.transitLine?.name)
    .filter((name): name is string => Boolean(name));

  const at = easternLocalToInstant(leg.at).getTime();
  const firstRide = steps.findIndex((s) => s.travelMode === "TRANSIT");
  const lastRide = steps.length - 1 - [...steps].reverse().findIndex((s) => s.travelMode === "TRANSIT");
  const walkSeconds = (from: number, to: number) =>
    steps.slice(from, to).reduce((sum, s) => sum + seconds(s.staticDuration), 0);

  let minutes: number;
  if (firstRide === -1) {
    // Walking the whole way: no timetable to wait on.
    minutes = seconds(route.duration) / 60;
  } else if (leg.toNyp) {
    const boards = Date.parse(steps[firstRide].transitDetails?.stopDetails?.departureTime ?? "");
    if (!Number.isFinite(boards)) return null;
    const leaves = boards - walkSeconds(0, firstRide) * 1000;
    minutes = (at - leaves) / 60_000;
  } else {
    const alights = Date.parse(steps[lastRide].transitDetails?.stopDetails?.arrivalTime ?? "");
    if (!Number.isFinite(alights)) return null;
    const arrives = alights + walkSeconds(lastRide + 1, steps.length) * 1000;
    minutes = (arrives - at) / 60_000;
  }

  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  return { minutes, lines };
}

async function fetchTrip(leg: TransitLeg, deps: TransitDeps): Promise<TransitTrip | null> {
  const place = { location: { latLng: { latitude: leg.place.lat, longitude: leg.place.lon } } };
  const nyp = { location: { latLng: { latitude: NYP_COORDINATE.lat, longitude: NYP_COORDINATE.lon } } };
  const at = easternLocalToInstant(leg.at).toISOString();

  const response = await deps.fetchImpl(GOOGLE_ROUTES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": deps.apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      origin: leg.toNyp ? place : nyp,
      destination: leg.toNyp ? nyp : place,
      travelMode: "TRANSIT",
      ...(leg.toNyp ? { arrivalTime: at } : { departureTime: at }),
      // Subway and bus; no commuter rail (LIRR, NJ Transit, Metro-North).
      transitPreferences: { allowedTravelModes: ["SUBWAY", "BUS"] },
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Google Routes responded ${response.status}`);
  return tripFromRoute(leg, (await response.json()) as RoutesResponse);
}

function lookup(leg: TransitLeg, deps: TransitDeps): Promise<TransitTrip | null> {
  const key = formatTransitLeg(leg);
  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = fetchTrip(leg, deps)
    .catch((error: unknown) => {
      // A miss just means the web app keeps its flat estimate for this train.
      console.error(`Transit lookup failed for ${key}:`, error);
      return null;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}

/**
 * Transit trips for each leg, keyed by the leg's wire form as requested.
 * Legs that can't be answered are left out.
 */
export async function getTransitTrips(
  legs: TransitLeg[],
  deps: TransitDeps = defaultDeps,
): Promise<Record<string, TransitTrip>> {
  if (!deps.apiKey) return {};
  const results = await Promise.all(
    legs.map(async (leg) => [formatTransitLeg(leg), await lookup(leg, deps)] as const),
  );
  return Object.fromEntries(
    results.filter((entry): entry is readonly [string, TransitTrip] => entry[1] != null),
  );
}
