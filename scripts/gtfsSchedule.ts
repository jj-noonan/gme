// The pure half of the GTFS import: from parsed GTFS tables and the import
// config to schedule-source rows. scripts/import-gtfs.ts does the I/O.

import { formatDayCode } from "@gme/shared";

export type GtfsTable = Record<string, string>[];

export interface GtfsFeed {
  routes: GtfsTable;
  trips: GtfsTable;
  calendar: GtfsTable;
  /** Optional in GTFS: one-off additions (exception_type 1) and removals (2). */
  calendarDates?: GtfsTable;
  stopTimes: GtfsTable;
}

type DayToken = "SU" | "MO" | "TU" | "WE" | "TH" | "FR" | "SA";

export interface DirectionFilter {
  /** Keep a row only if its train runs on at least one of these days. */
  days?: DayToken[];
  /** Keep a row only if it leaves its boarding station at or after this "HH:MM". */
  departsFrom?: string;
}

export interface ImportGroup {
  /** GTFS route_long_name → the service name shown on the board. */
  routes: Record<string, string>;
  /** Tracked station codes to take these routes' stops at. */
  stations: string[];
  northbound?: DirectionFilter;
  southbound?: DirectionFilter;
}

export interface ImportConfig {
  feed: string;
  groups: ImportGroup[];
}

/** One row of data/schedule-source.json. */
export interface SourceRow {
  direction: "N" | "S";
  day: string;
  trainRoute: string;
  trainDeparture: string;
  trainArrival: string;
}

const NYP = "NYP";
const DAY_TOKENS: DayToken[] = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const CALENDAR_DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Parses CSV text with a header row, handling quoted fields. */
export function parseCsv(text: string): GtfsTable {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  const [header, ...rows] = records.filter((r) => r.length > 1 || r[0] !== "");
  // Strip a UTF-8 BOM some feeds start with.
  const keys = header.map((k, i) => (i === 0 ? k.replace(/^﻿/, "") : k).trim());
  return rows.map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? ""])));
}

/** GTFS "HH:MM:SS" (hours may run past 24 for after-midnight stops) → minutes. */
function gtfsMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes → the timetable's "07:15A" clock, wrapping past midnight. */
function clock(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")}${h24 >= 12 ? "P" : "A"}`;
}

/** "HH:MM" → minutes. */
function hhmm(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function passes(filter: DirectionFilter | undefined, days: Set<number>, departs: number): boolean {
  if (!filter) return true;
  if (filter.days && !filter.days.some((d) => days.has(DAY_TOKENS.indexOf(d)))) return false;
  // Compare clock times: a GTFS "29:44" is a 5:44am departure, not an evening one.
  if (filter.departsFrom && departs % (24 * 60) < hhmm(filter.departsFrom)) return false;
  return true;
}

/** "YYYYMMDD" for a date, by its UTC fields (the dates here are calendar days, not instants). */
function gtfsDate(date: Date): string {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

/**
 * For each service pattern, the weekdays (0=Sun..6=Sat) it runs on during
 * the seven days from `from`. A feed holds a year of overlapping patterns
 * with date ranges — a timetable change mid-month, holiday variants — so
 * only what actually runs on those dates counts.
 */
function weekServiceDays(feed: GtfsFeed, from: Date): Map<string, Set<number>> {
  const result = new Map<string, Set<number>>();
  const add = (service: string, weekday: number) => {
    const days = result.get(service) ?? new Set<number>();
    days.add(weekday);
    result.set(service, days);
  };

  for (let i = 0; i < 7; i++) {
    const date = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + i));
    const ymd = gtfsDate(date);
    const weekday = date.getUTCDay();
    const exceptions = (feed.calendarDates ?? []).filter((e) => e.date === ymd);
    const removed = new Set(exceptions.filter((e) => e.exception_type === "2").map((e) => e.service_id));

    for (const c of feed.calendar) {
      const runs = c[CALENDAR_DAYS[weekday]] === "1" && c.start_date <= ymd && ymd <= c.end_date;
      if (runs && !removed.has(c.service_id)) add(c.service_id, weekday);
    }
    for (const e of exceptions) if (e.exception_type === "1") add(e.service_id, weekday);
  }
  return result;
}

/**
 * Every NYP ↔ tracked-station journey the config asks for, as it runs in
 * the week starting `from`: one row per train, direction, station and
 * timing, with the days it runs merged into one day code. Sorted by
 * direction, then departure time.
 */
export function scheduleRows(feed: GtfsFeed, config: ImportConfig, from: Date): SourceRow[] {
  const routeNames = new Map(feed.routes.map((r) => [r.route_id, r.route_long_name]));
  const serviceDays = weekServiceDays(feed, from);

  const stopsByTrip = new Map<string, GtfsTable>();
  const wanted = new Set([NYP, ...config.groups.flatMap((g) => g.stations)]);
  for (const st of feed.stopTimes) {
    if (!wanted.has(st.stop_id)) continue;
    const list = stopsByTrip.get(st.trip_id) ?? [];
    list.push(st);
    stopsByTrip.set(st.trip_id, list);
  }

  // Same train, direction, station and times on different service patterns
  // (weekday/weekend) is one row running on the union of their days.
  const rows = new Map<string, { row: Omit<SourceRow, "day">; days: Set<number>; sortKey: number }>();

  for (const trip of feed.trips) {
    const routeName = routeNames.get(trip.route_id) ?? "";
    const group = config.groups.find((g) => routeName in g.routes);
    if (!group) continue;

    const stops = stopsByTrip.get(trip.trip_id);
    const nyp = stops?.find((s) => s.stop_id === NYP);
    const days = serviceDays.get(trip.service_id);
    if (!stops || !nyp || !days || days.size === 0) continue;

    for (const station of stops.filter((s) => group.stations.includes(s.stop_id))) {
      const northbound = Number(nyp.stop_sequence) < Number(station.stop_sequence);
      const [from, to] = northbound ? [nyp, station] : [station, nyp];
      // Respect discharge-only / receive-only stops: you have to be able to
      // get on where the row says you board, and off where it says you land.
      if (from.pickup_type === "1" || to.drop_off_type === "1") continue;

      const departs = gtfsMinutes(from.departure_time);
      const arrives = gtfsMinutes(to.arrival_time);
      if (!passes(northbound ? group.northbound : group.southbound, days, departs)) continue;

      const row = {
        direction: northbound ? ("N" as const) : ("S" as const),
        trainRoute: `${group.routes[routeName]} ${trip.trip_short_name}`,
        trainDeparture: `${clock(departs)} ${from.stop_id}`,
        trainArrival: `${clock(arrives)} ${to.stop_id}`,
      };
      const key = JSON.stringify(row);
      const existing = rows.get(key);
      if (existing) for (const d of days) existing.days.add(d);
      else rows.set(key, { row, days: new Set(days), sortKey: departs % (24 * 60) });
    }
  }

  return [...rows.values()]
    .sort(
      (a, b) =>
        a.row.direction.localeCompare(b.row.direction) ||
        a.sortKey - b.sortKey ||
        a.row.trainRoute.localeCompare(b.row.trainRoute) ||
        a.row.trainArrival.localeCompare(b.row.trainArrival),
    )
    .map(({ row, days }) => ({
      direction: row.direction,
      day: formatDayCode(days),
      trainRoute: row.trainRoute,
      trainDeparture: row.trainDeparture,
      trainArrival: row.trainArrival,
    }));
}
