import type { Station } from "./types.js";

// Approximate station coordinates (not the platform entrance, just the town) —
// precise enough for haversine + average-speed drive estimates.
export const STATIONS: Station[] = [
  { code: "RUD", name: "Rutland, VT", lat: 43.6106, lon: -72.9726 },
  { code: "CNV", name: "Castleton, VT", lat: 43.6009, lon: -73.1731 },
  { code: "WHL", name: "Whitehall, NY", lat: 43.5548, lon: -73.4051 },
  { code: "FED", name: "Fort Edward, NY", lat: 43.2695, lon: -73.5843 },
  { code: "ALB", name: "Albany-Rensselaer, NY", lat: 42.6339, lon: -73.7423 },
  { code: "BLF", name: "Bellows Falls, VT", lat: 43.1334, lon: -72.4487 },
  { code: "BRA", name: "Brattleboro, VT", lat: 42.8509, lon: -72.5579 },
];

export const NYP_COORDINATE = { lat: 40.7506, lon: -73.9935 };

/**
 * The Rutland-side home end of these trips (Jones Donuts, the reference point
 * the original timetable's drive times were measured from). Used for the far
 * end of a journey, where the rider's live location can't help: heading north
 * from NYC, the drive that matters is station → house, not station → wherever
 * the phone currently is.
 */
export const RUTLAND_HOME = { lat: 43.6089, lon: -72.9781 };

// Centroid of the tracked VT/NY stations, used only to decide NYC-side vs
// Rutland-side at a coarse level (see classifyRegion in geo.ts).
export const RUTLAND_CLUSTER_CENTROID = {
  lat: STATIONS.reduce((sum, s) => sum + s.lat, 0) / STATIONS.length,
  lon: STATIONS.reduce((sum, s) => sum + s.lon, 0) / STATIONS.length,
};

export const TRACKED_TRAIN_NUMBERS = [
  68, 69, // Adirondack
  290, 291, // Ethan Allen Express
  54, 55, 56, 57, // Vermonter
  230, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 243, 244, 245, 280, 281, 283, 284, 1233, 1246, // Empire Service
  63, 64, // Maple Leaf
  48, 49, // Lake Shore Limited — NYP section only, never 448/449 (Boston section)
];
