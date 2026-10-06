import type { Bounds } from "./geo.js";
import type { Station } from "./types.js";

// Station platform coordinates, from Amtraker's station data
// (api.amtraker.com/v3/stations/<code>), so drives route to the station
// itself rather than the middle of town.
export const STATIONS: Station[] = [
  { code: "RUD", name: "Rutland, VT", lat: 43.6058, lon: -72.9815 },
  { code: "CNV", name: "Castleton, VT", lat: 43.6134, lon: -73.1713 },
  { code: "WHL", name: "Whitehall, NY", lat: 43.5547, lon: -73.4032 },
  { code: "FED", name: "Fort Edward, NY", lat: 43.2696, lon: -73.5806 },
  { code: "ALB", name: "Albany-Rensselaer, NY", lat: 42.641, lon: -73.7411 },
  { code: "BLF", name: "Bellows Falls, VT", lat: 43.1365, lon: -72.4446 },
  { code: "BRA", name: "Brattleboro, VT", lat: 42.8508, lon: -72.5587 },
  { code: "NHV", name: "New Haven, CT", lat: 41.2977, lon: -72.9267 },
  // Not a station: Cape Air's Lebanon Municipal Airport, the VT end of its
  // flights to White Plains (and its shuttle to Penn Station).
  {
    code: "LEB",
    name: "Lebanon, NH",
    lat: 43.6249,
    lon: -72.3086,
    mapsName: "Lebanon Municipal Airport, West Lebanon, NH",
  },
];

export const NYP_COORDINATE = { lat: 40.751, lon: -73.9963 };

/**
 * The default vt-location: Jones Donuts, the reference point the original
 * timetable's drive times were measured from. Every VT-side drive runs
 * between a station and the vt-location — out to the station southbound,
 * home from it northbound.
 */
export const DEFAULT_VT_LOCATION = { lat: 43.6089, lon: -72.9781 };

/**
 * The default nyc-location: Bishop Loughlin Memorial High School, 357 Clermont
 * Ave, Brooklyn. Not used in any timing yet — the NYC side is still a flat
 * subway assumption.
 */
export const DEFAULT_NYC_LOCATION = { lat: 40.6871, lon: -73.9691 };

/**
 * Where a vt-location may be: VT plus eastern NY, generously. Keeps status-api
 * from being a free directions/geocoding proxy for anywhere, and keeps every
 * drive's origin in Eastern time.
 */
export const VT_REGION: Bounds = { minLat: 42.0, maxLat: 45.1, minLon: -74.6, maxLon: -71.4 };

/** Where an nyc-location may be: the five boroughs, roughly. */
export const NYC_REGION: Bounds = { minLat: 40.45, maxLat: 40.95, minLon: -74.3, maxLon: -73.65 };

export const TRACKED_TRAIN_NUMBERS = [
  68, 69, // Adirondack
  290, 291, // Ethan Allen Express
  54, 55, 56, 57, // Vermonter
  230, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 243, 244, 245, 280, 281, 283, 284, 1233, 1246, // Empire Service
  63, 64, // Maple Leaf
  48, 49, // Lake Shore Limited — NYP section only, never 448/449 (Boston section)
  // New Haven weekend trains (see data/schedule-import.json), including the
  // Sunday ones that return after the autumn 2026 track work.
  67, 94, 135, 136, 139, 148, 149, 165, 167, 169, 174, 176, 178, 184, // Northeast Regional
  2156, 2158, 2160, 2267, 2271, 2293, // Acela
];
