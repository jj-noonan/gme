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

/**
 * The first day, starting with `from` itself, that a train with this day
 * code runs — at local midnight. Every day code names at least one weekday,
 * so this always finds one within a week.
 */
export function nextRunningDay(raw: string, from: Date): Date {
  const days = parseDayCode(raw);
  for (let offset = 0; offset < 7; offset++) {
    const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offset);
    if (days.has(day.getDay())) return day;
  }
  throw new Error(`Day code "${raw}" names no days`);
}

/**
 * The day code for a set of weekdays (0=Sun..6=Sat), in the timetable's own
 * notation: "DAILY", ranges for runs of three or more ("MO-FR", wrapping
 * like "FR-MO"), pairs and singles run together ("SUSA", "TH"), segments
 * joined by commas ("SU-WE,SA"). Always reads back to the same set with
 * parseDayCode.
 */
export function formatDayCode(days: Set<number>): string {
  if (days.size === 0) throw new Error("A day code needs at least one day");
  if (days.size === 7) return "DAILY";

  // Start just after a day the train doesn't run, so no run is split across
  // the Saturday/Sunday wrap.
  const gap = [0, 1, 2, 3, 4, 5, 6].find((d) => !days.has(d))!;
  const runs: number[][] = [];
  for (let i = 1; i <= 7; i++) {
    const day = (gap + i) % 7;
    if (!days.has(day)) continue;
    const last = runs.at(-1);
    if (last && (last.at(-1)! + 1) % 7 === day) last.push(day);
    else runs.push([day]);
  }

  // Monday-first reads most naturally ("MO-FR,SU" rather than "SU,MO-FR")...
  // except a run that wraps through Sunday stays whole ("FR-MO").
  runs.sort((a, b) => ((a[0] + 6) % 7) - ((b[0] + 6) % 7));
  return runs
    .map((run) =>
      run.length >= 3
        ? `${DAY_ORDER[run[0]]}-${DAY_ORDER[run.at(-1)!]}`
        : run.map((d) => DAY_ORDER[d]).join(""),
    )
    .join(",");
}
