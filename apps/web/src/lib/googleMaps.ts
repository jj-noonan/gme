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
 * Google Maps driving directions between the vt-location and a station (or
 * Cape Air's airport). The station goes by name rather than coordinates, so
 * Maps lands on the station or terminal itself, not a nearby road.
 */
export function drivingDirectionsUrl(
  place: Coordinate,
  stationCode: StationCode,
  toStation: boolean,
): string {
  const here = `${place.lat},${place.lon}`;
  const known = STATIONS.find((s) => s.code === stationCode);
  const station = known?.mapsName ?? `${known?.name ?? stationCode} Amtrak station`;
  const params = new URLSearchParams({
    api: "1",
    origin: toStation ? here : station,
    destination: toStation ? station : here,
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${params}`;
}
