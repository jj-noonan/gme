import type { Coordinate, ScheduleRow } from "@gme/shared";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { tripMapShape, type MapLegKind } from "../lib/tripMap.js";

// OpenStreetMap's own tiles: free with attribution for light use, no key.
// They're light; CSS (.trip-map .leaflet-tile-pane) darkens them to sit in
// the black board.
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Read from the board's tokens, so the map's lines match the timeline's.
function token(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** How each kind of leg is drawn: solid for roads, dashed rail, dotted subway. */
function legStyle(kind: MapLegKind): L.PolylineOptions {
  const ink = token("--ink", "#ffc93c");
  const dim = token("--ink-dim", "#e0b347");
  switch (kind) {
    case "drive":
      return { color: dim, weight: 3 };
    case "train":
      return { color: ink, weight: 3, dashArray: "8 6" };
    case "flight":
      return { color: ink, weight: 2, dashArray: "2 8" };
    case "subway":
      return { color: dim, weight: 3, dashArray: "1 6", lineCap: "round" };
  }
}

/**
 * The trip on a map, under the timeline. A picture of where you're going
 * rather than a route: legs are straight lines between the four places, and
 * the map doesn't pan or zoom, so it never fights the page's scroll.
 */
export default function TripMap({
  row,
  vtLocation,
  nycLocation,
}: {
  row: ScheduleRow;
  vtLocation: Coordinate;
  nycLocation: Coordinate;
}) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
    });
    L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);

    const { points, legs } = tripMapShape(row, vtLocation, nycLocation);
    const latLngs = points.map((p) => L.latLng(p.lat, p.lon));
    legs.forEach((kind, i) => {
      L.polyline([latLngs[i], latLngs[i + 1]], legStyle(kind)).addTo(map);
    });

    const amber = token("--amber", "#fff1a8");
    const black = token("--board-bg", "#000000");
    latLngs.forEach((at, i) => {
      const end = i === latLngs.length - 1;
      L.circleMarker(at, {
        radius: i === 0 || end ? 7 : 5,
        color: amber,
        weight: 2,
        fillColor: end ? amber : black,
        fillOpacity: 1,
      }).addTo(map);
    });

    map.fitBounds(L.latLngBounds(latLngs), { padding: [24, 24] });
    return () => {
      map.remove();
    };
    // By value: the places may be new objects each render, and rebuilding the
    // map on every status poll would flash it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row, vtLocation.lat, vtLocation.lon, nycLocation.lat, nycLocation.lon]);

  return <div ref={container} className="trip-map" role="img" aria-label="Map of the trip" />;
}
