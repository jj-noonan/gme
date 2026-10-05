import type { Coordinate } from "@gme/shared";
import { transitDirectionsUrl } from "../lib/googleMaps.js";

/**
 * The lines ridden on the NYC leg, in order, as badges — linking to the same
 * trip in Google Maps.
 */
export function TransitBadges({
  lines,
  nycLocation,
  toNyp,
}: {
  lines: string[];
  nycLocation: Coordinate;
  toNyp: boolean;
}) {
  const description = lines.length > 0 ? `${lines.join(", then ")}` : "walk";
  return (
    <a
      className="transit-badges"
      href={transitDirectionsUrl(nycLocation, toNyp)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Subway route: ${description}. Open in Google Maps`}
      title="Open in Google Maps"
    >
      {lines.length > 0 ? (
        lines.map((line, i) => (
          <span key={i} className="line-badge">
            {line}
          </span>
        ))
      ) : (
        <span className="line-badge line-badge--walk">WALK</span>
      )}
    </a>
  );
}
