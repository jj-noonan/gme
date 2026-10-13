import type { CSSProperties } from "react";
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

/** The NYC leg's lines as badges, the train icon while it's still the flat estimate, or WALK. */
export function TransitBadges({ lines }: { lines: string[] | null }) {
  if (lines === null) return <Icon name="train" size={16} />;
  return (
    <span className="transit-badges">
      {lines.length > 0 ? (
        lines.map((line, i) => <LineBadge key={i} name={line} />)
      ) : (
        <span className="line-badge line-badge--walk">WALK</span>
      )}
    </span>
  );
}
