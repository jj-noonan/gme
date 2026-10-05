import { STATIONS, type Coordinate, type StationCode } from "@gme/shared";

const PENN_STATION = "New York Penn Station";

/**
 * Google Maps transit directions between the nyc-location and Penn Station.
 * Maps URLs can't carry a departure or arrival time, so Maps plans it for now.
 */
export function transitDirectionsUrl(place: Coordinate, toNyp: boolean): string {
  const here = `${place.lat},${place.lon}`;
  const params = new URLSearchParams({
    api: "1",
    origin: toNyp ? here : PENN_STATION,
    destination: toNyp ? PENN_STATION : here,
    travelmode: "transit",
  });
  return `https://www.google.com/maps/dir/?${params}`;
}

/**
 * Google Maps driving directions between the vt-location and a station.
 * The station goes by name rather than coordinates: ours are the town, not
 * the platform, and Maps finds the actual station from its name.
 */
export function drivingDirectionsUrl(
  place: Coordinate,
  stationCode: StationCode,
  toStation: boolean,
): string {
  const here = `${place.lat},${place.lon}`;
  const name = STATIONS.find((s) => s.code === stationCode)?.name ?? stationCode;
  const station = `${name} Amtrak station`;
  const params = new URLSearchParams({
    api: "1",
    origin: toStation ? here : station,
    destination: toStation ? station : here,
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${params}`;
}
