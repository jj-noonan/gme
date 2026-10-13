import {
  boardingStationCode,
  changeStationCode,
  parseDayCode,
  STATIONS,
  type ScheduleRow,
} from "@gme/shared";
import { abbreviateService } from "./trainStatus.js";

/**
 * A search query, read as words that each narrow the list (every term has to
 * match). Plain words match the train's name, number and stations; time words
 * match the door-to-door times on the board.
 */
export type SearchTerm =
  | { kind: "text"; text: string }
  | { kind: "number"; digits: string }
  | { kind: "bucket"; bucket: TimeBucket }
  | { kind: "time"; field: "leave" | "arrive"; op: "before" | "after"; minutes: number }
  | { kind: "days"; days: number[] };

export type TimeBucket = "morning" | "afternoon" | "evening";

/** What a trip offers to be searched on: its row and its door-to-door times. */
export interface SearchableTrip {
  row: ScheduleRow;
  /** Leave-by time, minutes since midnight. */
  leaveDoor: number;
  /** Door arrival, minutes since midnight. */
  arriveDoor: number;
}

/** By leave-by time: morning to noon, afternoon to 5pm, evening through the night. */
const BUCKETS: Record<TimeBucket, (minutes: number) => boolean> = {
  morning: (m) => m >= 4 * 60 && m < 12 * 60,
  afternoon: (m) => m >= 12 * 60 && m < 17 * 60,
  evening: (m) => m >= 17 * 60 || m < 4 * 60,
};

const BUCKET_WORDS: Record<string, TimeBucket> = {
  morning: "morning",
  afternoon: "afternoon",
  evening: "evening",
  night: "evening",
  tonight: "evening",
};

const FIELD_WORDS: Record<string, "leave" | "arrive"> = {
  leave: "leave",
  leaves: "leave",
  leaving: "leave",
  depart: "leave",
  departs: "leave",
  departing: "leave",
  arrive: "arrive",
  arrives: "arrive",
  arriving: "arrive",
  arrival: "arrive",
};

const OP_WORDS: Record<string, "before" | "after"> = {
  before: "before",
  by: "before",
  after: "after",
};

const SU = 0, MO = 1, TU = 2, WE = 3, TH = 4, FR = 5, SA = 6;
const DAY_WORDS: Record<string, number[]> = {
  sun: [SU], sunday: [SU],
  mon: [MO], monday: [MO],
  tue: [TU], tues: [TU], tuesday: [TU],
  wed: [WE], wednesday: [WE],
  thu: [TH], thur: [TH], thurs: [TH], thursday: [TH],
  fri: [FR], friday: [FR],
  sat: [SA], saturday: [SA],
  weekend: [SA, SU],
  weekday: [MO, TU, WE, TH, FR],
};

// Words that only join others ("leave after 2pm", "trains on saturday").
const FILLER = new Set(["on", "at", "the", "a", "and", "trains", "train's"]);

/**
 * "2pm", "2:30p", "14:30", "9" (bare hours are 24-hour), as minutes since
 * midnight; null if it isn't a time.
 */
export function parseTime(text: string): number | null {
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(a|am|p|pm)?$/.exec(text);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const suffix = match[3];
  if (minute > 59) return null;
  if (suffix) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (suffix.startsWith("p") ? 12 : 0);
  } else if (hour > 23) {
    return null;
  }
  return hour * 60 + minute;
}

function dayWord(word: string): number[] | undefined {
  // Plurals read the same: "saturdays", "weekends", "weekdays".
  return DAY_WORDS[word] ?? (word.endsWith("s") ? DAY_WORDS[word.slice(0, -1)] : undefined);
}

export function parseQuery(query: string): SearchTerm[] {
  // "2 pm" → "2pm", so a spaced suffix stays with its time.
  const words = query
    .toLowerCase()
    .replace(/(\d)\s+(am|pm|a|p)\b/g, "$1$2")
    .split(/[\s,]+/)
    .filter(Boolean);

  const terms: SearchTerm[] = [];
  let field: "leave" | "arrive" | null = null;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    if (word in FIELD_WORDS) {
      field = FIELD_WORDS[word];
      continue;
    }
    if (word in OP_WORDS) {
      const minutes = i + 1 < words.length ? parseTime(words[i + 1]) : null;
      if (minutes !== null) {
        terms.push({ kind: "time", field: field ?? "leave", op: OP_WORDS[word], minutes });
        i++;
        field = null;
      }
      // An unfinished "after" (still typing) narrows nothing.
      continue;
    }
    if (word in BUCKET_WORDS) {
      terms.push({ kind: "bucket", bucket: BUCKET_WORDS[word] });
      continue;
    }
    const days = dayWord(word);
    if (days) {
      terms.push({ kind: "days", days });
      continue;
    }
    if (FILLER.has(word)) continue;
    if (/^\d+$/.test(word)) {
      terms.push({ kind: "number", digits: word });
      continue;
    }
    terms.push({ kind: "text", text: word });
  }
  return terms;
}

/** Everything plain words match: the name (both lengths), mode, and both stations' codes and names. */
function haystack(row: ScheduleRow): string {
  const flight = row.mode === "flight";
  const codes = [boardingStationCode(row), changeStationCode(row)];
  const names = codes.map((code) =>
    code === "NYP"
      ? "new york penn station manhattan"
      : (STATIONS.find((s) => s.code === code)?.name ?? ""),
  );
  return [
    row.service,
    abbreviateService(row.service),
    flight ? "cape air flight plane zyp" : "amtrak train",
    row.direction === "N" ? "northbound" : "southbound",
    ...codes,
    ...names,
  ]
    .join(" ")
    .toLowerCase();
}

function matchesTerm(term: SearchTerm, trip: SearchableTrip, text: string): boolean {
  switch (term.kind) {
    case "text":
      return text.includes(term.text);
    case "number":
      return String(trip.row.trainNumber).startsWith(term.digits);
    case "bucket":
      return BUCKETS[term.bucket](trip.leaveDoor);
    case "time": {
      const at = term.field === "leave" ? trip.leaveDoor : trip.arriveDoor;
      return term.op === "before" ? at <= term.minutes : at >= term.minutes;
    }
    case "days": {
      const runs = parseDayCode(trip.row.daysRaw);
      return term.days.some((d) => runs.has(d));
    }
  }
}

/** Whether `trip` matches every term; no terms matches everything. */
export function matchesSearch(terms: SearchTerm[], trip: SearchableTrip): boolean {
  if (terms.length === 0) return true;
  const text = haystack(trip.row);
  return terms.every((term) => matchesTerm(term, trip, text));
}
