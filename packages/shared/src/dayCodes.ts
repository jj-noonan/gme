/**
 * Parses Amtrak "Days of Operation" strings as printed on the timetable.
 * The sheet mixes several notations for the same day-set (comma lists,
 * slash lists, mashed concatenations, ranges) — this handles all of them
 * without ever bucketing into a fixed Mo-Fr/Sa-Su enum.
 */

const DAY_ORDER = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

function dayIndex(token: string): number {
  const index = DAY_ORDER.indexOf(token.toUpperCase() as (typeof DAY_ORDER)[number]);
  if (index === -1) {
    throw new Error(`Unrecognized day token "${token}" in day code`);
  }
  return index;
}

function expandRange(startToken: string, endToken: string): number[] {
  const start = dayIndex(startToken);
  const end = dayIndex(endToken);
  const days: number[] = [];
  let i = start;
  // Forward-only walk with wraparound, e.g. a hypothetical "FR-MO".
  while (true) {
    days.push(i);
    if (i === end) break;
    i = (i + 1) % 7;
  }
  return days;
}

function expandConcatenation(segment: string): number[] {
  if (segment.length % 2 !== 0) {
    throw new Error(`Unrecognized day code segment "${segment}"`);
  }
  const days: number[] = [];
  for (let i = 0; i < segment.length; i += 2) {
    days.push(dayIndex(segment.slice(i, i + 2)));
  }
  return days;
}

/** Returns the set of matching day-of-week indices (0=Sun..6=Sat), JS Date.getDay() convention. */
export function parseDayCode(raw: string): Set<number> {
  const normalized = raw.trim().toUpperCase();
  if (normalized === "DAILY") {
    return new Set([0, 1, 2, 3, 4, 5, 6]);
  }

  const days = new Set<number>();
  for (const segment of normalized.split(/[,/]/).map((s) => s.trim())) {
    if (segment.length === 0) continue;
    if (segment.includes("-")) {
      const [start, end] = segment.split("-");
      for (const d of expandRange(start, end)) days.add(d);
    } else {
      for (const d of expandConcatenation(segment)) days.add(d);
    }
  }
  return days;
}

export function matchesDay(raw: string, date: Date): boolean {
  return parseDayCode(raw).has(date.getDay());
}
