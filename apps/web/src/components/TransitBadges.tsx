import type { Coordinate } from "@gme/shared";
import type { CSSProperties } from "react";
import { transitDirectionsUrl } from "../lib/googleMaps.js";
import { SUBWAY_LINES, subwayLine } from "../lib/subwayLines.js";

/**
 * A subway route as its solid MTA bullet — just the letter or number, so
 * Google's "C Line" shows as (C). Anything else (a bus like B25) keeps the
 * outlined pill with its name.
 */
function LineBadge({ name }: { name: string }) {
  const line = subwayLine(name);
  if (!line) return <span className="line-badge">{name}</span>;

  const { bg, fg } = SUBWAY_LINES[line];
  return (
    <span
      className="line-badge line-badge--subway"
      style={{ "--line-bg": bg, "--line-fg": fg } as CSSProperties}
    >
      {line}
    </span>
  );
}

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
      data-link-out="subway directions in Google Maps"
      aria-label={`Subway route: ${description}. Open in Google Maps`}
      title="Open in Google Maps"
    >
      {lines.length > 0 ? (
        lines.map((line, i) => <LineBadge key={i} name={line} />)
      ) : (
        <span className="line-badge line-badge--walk">WALK</span>
      )}
    </a>
  );
}
