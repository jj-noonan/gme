import { NYP_COORDINATE, STATIONS, type Coordinate, type ScheduleRow } from "@gme/shared";

export type MapLegKind = "drive" | "train" | "flight" | "subway";

/** The trip on a map: its four places in order, and how you get between each. */
export interface TripMapShape {
  /** Start, boarding station, change station, end. */
  points: Coordinate[];
  /** The three legs between them, in order. */
  legs: MapLegKind[];
}

export function tripMapShape(
  row: ScheduleRow,
  vtLocation: Coordinate,
  nycLocation: Coordinate,
): TripMapShape {
  const station = STATIONS.find((s) => s.code === row.stationCode);
  const vtStation = station ? { lat: station.lat, lon: station.lon } : vtLocation;
  const middle: MapLegKind = row.mode === "flight" ? "flight" : "train";

  return row.direction === "N"
    ? { points: [nycLocation, NYP_COORDINATE, vtStation, vtLocation], legs: ["subway", middle, "drive"] }
    : { points: [vtLocation, vtStation, NYP_COORDINATE, nycLocation], legs: ["drive", middle, "subway"] };
}
