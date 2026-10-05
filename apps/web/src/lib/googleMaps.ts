import type { Coordinate } from "@gme/shared";

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
