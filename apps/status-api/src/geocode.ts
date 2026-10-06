import { isInBounds, type Bounds, type Coordinate } from "@gme/shared";
import {
  FETCH_TIMEOUT_MS,
  GOOGLE_MAPS_API_KEY,
  GOOGLE_PLACES_SEARCH_URL,
  MAPBOX_GEOCODE_URL,
  MAPBOX_TOKEN,
} from "./config.js";

export interface GeocodeDeps {
  googleApiKey: string;
  mapboxToken: string;
  fetchImpl: typeof fetch;
}

const defaultDeps: GeocodeDeps = {
  googleApiKey: GOOGLE_MAPS_API_KEY,
  mapboxToken: MAPBOX_TOKEN,
  fetchImpl: fetch,
};

export interface GeocodeResult extends Coordinate {
  /** What the query matched, tidied up, for showing back to the rider. */
  label: string;
}

/**
 * Google Places text search: matches places by name ("Jones Donuts") as
 * well as addresses. Only the fields used are asked for — Google bills by
 * field.
 */
async function searchGooglePlaces(
  query: string,
  bounds: Bounds,
  deps: GeocodeDeps,
): Promise<GeocodeResult | null> {
  const response = await deps.fetchImpl(GOOGLE_PLACES_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": deps.googleApiKey,
      "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify({
      textQuery: query,
      pageSize: 1,
      locationRestriction: {
        rectangle: {
          low: { latitude: bounds.minLat, longitude: bounds.minLon },
          high: { latitude: bounds.maxLat, longitude: bounds.maxLon },
        },
      },
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Google Places responded ${response.status}`);

  const body = (await response.json()) as {
    places?: {
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
    }[];
  };
  const place = body.places?.[0];
  const lat = place?.location?.latitude;
  const lon = place?.location?.longitude;
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  if (!isInBounds({ lat, lon }, bounds)) return null;

  // "Jones Donuts, 23 West St, Rutland, VT 05701, USA" — but don't repeat the
  // name when the match is itself an address.
  const name = place?.displayName?.text;
  const address = place?.formattedAddress;
  const label =
    name && address && !address.startsWith(name) ? `${name}, ${address}` : (address ?? name ?? query);
  return { lat, lon, label };
}

/** Mapbox geocoding: addresses only, no business names. */
async function geocodeMapboxAddress(
  query: string,
  bounds: Bounds,
  deps: GeocodeDeps,
): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    q: query,
    limit: "1",
    country: "us",
    autocomplete: "false",
    bbox: [bounds.minLon, bounds.minLat, bounds.maxLon, bounds.maxLat].join(","),
    access_token: deps.mapboxToken,
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

/**
 * The best match for `query` — a place name or an address — inside
 * `bounds`, or null if there's none. Google first, since it knows places by
 * name; Mapbox (addresses only) if Google isn't configured or fails. Throws
 * when neither can answer, so the caller can tell "not found" from "try
 * again".
 *
 * Deliberately uncached: neither provider's terms allow storing these
 * results, so the web app keeps only the typed text and looks it up again.
 */
export async function geocode(
  query: string,
  bounds: Bounds,
  deps: GeocodeDeps = defaultDeps,
): Promise<GeocodeResult | null> {
  if (deps.googleApiKey) {
    try {
      return await searchGooglePlaces(query, bounds, deps);
    } catch (error) {
      console.error("Google place search failed, trying Mapbox:", error);
    }
  }
  if (!deps.mapboxToken) throw new Error("No geocoding provider is configured");
  return geocodeMapboxAddress(query, bounds, deps);
}
