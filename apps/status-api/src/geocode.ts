import { isInBounds, type Bounds, type Coordinate } from "@gme/shared";
import { FETCH_TIMEOUT_MS, MAPBOX_GEOCODE_URL, MAPBOX_TOKEN } from "./config.js";

export interface GeocodeDeps {
  token: string;
  fetchImpl: typeof fetch;
}

const defaultDeps: GeocodeDeps = { token: MAPBOX_TOKEN, fetchImpl: fetch };

export interface GeocodeResult extends Coordinate {
  /** Mapbox's tidied-up address, for showing back to the rider. */
  label: string;
}

/**
 * The best address match for `query` inside `bounds`, or null if there's
 * none. Throws if there's no token or Mapbox itself fails, so the caller can
 * tell "not found" from "try again".
 *
 * Deliberately uncached: Mapbox's temporary geocoding results may not be
 * stored, so the web app keeps only the typed text and looks it up again.
 */
export async function geocode(
  query: string,
  bounds: Bounds,
  deps: GeocodeDeps = defaultDeps,
): Promise<GeocodeResult | null> {
  if (!deps.token) throw new Error("MAPBOX_TOKEN is not set");

  const params = new URLSearchParams({
    q: query,
    limit: "1",
    country: "us",
    autocomplete: "false",
    bbox: [bounds.minLon, bounds.minLat, bounds.maxLon, bounds.maxLat].join(","),
    access_token: deps.token,
  });
  const response = await deps.fetchImpl(`${MAPBOX_GEOCODE_URL}?${params}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Mapbox geocoding responded ${response.status}`);

  const body = (await response.json()) as {
    features?: {
      geometry?: { coordinates?: [number, number] };
      properties?: { full_address?: string; name?: string };
    }[];
  };
  const feature = body.features?.[0];
  const [lon, lat] = feature?.geometry?.coordinates ?? [];
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  // bbox should already guarantee this; don't trust it blindly.
  if (!isInBounds({ lat, lon }, bounds)) return null;

  const label = feature?.properties?.full_address ?? feature?.properties?.name ?? query;
  return { lat, lon, label };
}
