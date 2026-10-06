import { haversineMiles, type Coordinate } from "./geo.js";
import { DEFAULT_VT_LOCATION, NYP_COORDINATE } from "./stations.js";

/** How far from Penn Station still counts as the NYC metro area. */
export const NYC_METRO_RADIUS_MILES = 50;

/** How far from Rutland still counts as within reach of the VT stations. */
export const VT_RANGE_MILES = 100;

/**
 * Which end of the trip the viewer is at: the NYC metro area, within reach
 * of Rutland, or neither — somewhere the Today boards and "current location"
 * don't make sense.
 */
export type Region = "NYC" | "RUTLAND" | "AWAY";

export function classifyRegion(location: Coordinate): Region {
  if (haversineMiles(location, NYP_COORDINATE) <= NYC_METRO_RADIUS_MILES) return "NYC";
  if (haversineMiles(location, DEFAULT_VT_LOCATION) <= VT_RANGE_MILES) return "RUTLAND";
  return "AWAY";
}

/** Whichever end of the trip is nearer, for picking a sensible default when away. */
export function nearerEnd(location: Coordinate): "NYC" | "RUTLAND" {
  return haversineMiles(location, NYP_COORDINATE) <= haversineMiles(location, DEFAULT_VT_LOCATION)
    ? "NYC"
    : "RUTLAND";
}
