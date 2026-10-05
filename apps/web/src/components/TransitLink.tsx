import type { Coordinate } from "@gme/shared";
import type { CSSProperties, ReactNode } from "react";
import { transitDirectionsUrl } from "../lib/googleMaps.js";
import { SUBWAY_LINES, subwayLine } from "../lib/subwayLines.js";
import { Icon } from "./Icon.js";

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
 * The NYC leg — its lines as badges (or the train icon while it's still the
 * flat estimate) plus whatever's passed as children, the duration — as one
 * link to the same trip in Google Maps.
 */
export function TransitLink({
  lines,
  nycLocation,
  toNyp,
  children,
}: {
  /** Lines ridden, in order; null until the trip's been looked up. */
  lines: string[] | null;
  nycLocation: Coordinate;
  toNyp: boolean;
  children: ReactNode;
}) {
  const route =
    lines === null ? "" : lines.length > 0 ? `Subway route: ${lines.join(", then ")}. ` : "Walk. ";
  return (
    <a
      className="leg-link"
      href={transitDirectionsUrl(nycLocation, toNyp)}
      target="_blank"
      rel="noopener noreferrer"
      data-link-out="subway directions in Google Maps"
      aria-label={`${route}Open subway directions in Google Maps`}
      title="Open in Google Maps"
    >
      {lines === null ? (
        <Icon name="train" size={16} />
      ) : (
        <span className="transit-badges">
          {lines.length > 0 ? (
            lines.map((line, i) => <LineBadge key={i} name={line} />)
          ) : (
            <span className="line-badge line-badge--walk">WALK</span>
          )}
        </span>
      )}
      {children}
    </a>
  );
}
