import { describe, expect, it } from "vitest";
import { parseCsv, scheduleRows, type GtfsFeed, type ImportConfig } from "./gtfsSchedule.js";

describe("parseCsv", () => {
  it("handles quoted fields, escaped quotes, CRLF and a BOM", () => {
    const text = '﻿id,name\r\n1,"Albany, NY"\r\n2,"Say ""hi"""\r\n';
    expect(parseCsv(text)).toEqual([
      { id: "1", name: "Albany, NY" },
      { id: "2", name: 'Say "hi"' },
    ]);
  });
});

function stop(trip: string, stop_id: string, seq: number, time: string, extra = {}) {
  return { trip_id: trip, stop_id, stop_sequence: String(seq), arrival_time: time, departure_time: time, pickup_type: "0", drop_off_type: "0", ...extra };
}

const WEEKDAYS = { monday: "1", tuesday: "1", wednesday: "1", thursday: "1", friday: "1", saturday: "0", sunday: "0" };
const WEEKEND = { monday: "0", tuesday: "0", wednesday: "0", thursday: "0", friday: "0", saturday: "1", sunday: "1" };
const ALL_YEAR = { start_date: "20260101", end_date: "20271231" };
// Monday 2026-10-05 through Sunday 2026-10-11.
const WEEK = new Date("2026-10-05T00:00:00Z");

const FEED: GtfsFeed = {
  routes: [
    { route_id: "r1", route_long_name: "Ethan Allen Express" },
    { route_id: "r2", route_long_name: "Northeast Regional" },
    { route_id: "r3", route_long_name: "Keystone" },
  ],
  calendar: [
    { service_id: "wk", ...WEEKDAYS, ...ALL_YEAR },
    { service_id: "we", ...WEEKEND, ...ALL_YEAR },
    // A timetable change from the following Monday: shouldn't show this week.
    { service_id: "wk-later", ...WEEKDAYS, start_date: "20261012", end_date: "20271231" },
  ],
  trips: [
    // Same times on weekdays and weekends: one DAILY row per station.
    { trip_id: "t291wk", route_id: "r1", service_id: "wk", trip_short_name: "291" },
    { trip_id: "t291we", route_id: "r1", service_id: "we", trip_short_name: "291" },
    // Southbound, past midnight in GTFS terms.
    { trip_id: "t290", route_id: "r1", service_id: "wk", trip_short_name: "290" },
    // New Haven: one before and one after the 14:00 cut-off, and one after
    // midnight (29:44 = 5:44am) that mustn't count as late in the day.
    { trip_id: "t170", route_id: "r2", service_id: "wk", trip_short_name: "170" },
    { trip_id: "t66", route_id: "r2", service_id: "wk", trip_short_name: "66" },
    { trip_id: "t176", route_id: "r2", service_id: "wk", trip_short_name: "176" },
    // Next timetable's version of 291, not running this week.
    { trip_id: "t291later", route_id: "r1", service_id: "wk-later", trip_short_name: "291" },
    // A route no group asks for.
    { trip_id: "t640", route_id: "r3", service_id: "wk", trip_short_name: "640" },
  ],
  stopTimes: [
    ...["t291wk", "t291we"].flatMap((t) => [
      stop(t, "NYP", 1, "14:19:00"),
      stop(t, "ALB", 5, "16:49:00"),
      stop(t, "RUD", 9, "19:35:00"),
    ]),
    stop("t291later", "NYP", 1, "14:30:00"),
    stop("t291later", "RUD", 9, "19:50:00"),
    stop("t290", "RUD", 1, "23:06:00"),
    stop("t290", "ALB", 5, "25:49:00", { pickup_type: "1" }),
    stop("t290", "NYP", 9, "28:27:00"),
    stop("t170", "NYP", 1, "09:05:00"),
    stop("t170", "NHV", 4, "10:50:00"),
    stop("t66", "NYP", 1, "29:44:00"),
    stop("t66", "NHV", 4, "31:24:00"),
    stop("t176", "NYP", 1, "19:12:00"),
    stop("t176", "NHV", 4, "21:01:00"),
    stop("t640", "NYP", 1, "15:00:00"),
  ],
};

const CONFIG: ImportConfig = {
  feed: "test",
  groups: [
    { routes: { "Ethan Allen Express": "ETHAN ALLEN" }, stations: ["RUD", "ALB"] },
    {
      routes: { "Northeast Regional": "NE REGIONAL" },
      stations: ["NHV"],
      northbound: { days: ["FR"], departsFrom: "14:00" },
    },
  ],
};

describe("scheduleRows", () => {
  const rows = scheduleRows(FEED, CONFIG, WEEK);

  it("makes one row per train, direction, station and timing, merging days", () => {
    expect(rows.filter((r) => r.trainRoute === "ETHAN ALLEN 291")).toEqual([
      { direction: "N", day: "DAILY", trainRoute: "ETHAN ALLEN 291", trainDeparture: "02:19P NYP", trainArrival: "04:49P ALB" },
      { direction: "N", day: "DAILY", trainRoute: "ETHAN ALLEN 291", trainDeparture: "02:19P NYP", trainArrival: "07:35P RUD" },
    ]);
  });

  it("wraps after-midnight GTFS times and skips stops you can't board at", () => {
    expect(rows.filter((r) => r.trainRoute === "ETHAN ALLEN 290")).toEqual([
      { direction: "S", day: "MO-FR", trainRoute: "ETHAN ALLEN 290", trainDeparture: "11:06P RUD", trainArrival: "04:27A NYP" },
    ]);
  });

  it("applies a group's direction filter", () => {
    expect(rows.filter((r) => r.trainRoute.startsWith("NE REGIONAL")).map((r) => r.trainRoute)).toEqual([
      "NE REGIONAL 176",
    ]);
  });

  it("only counts service that runs during the chosen week", () => {
    expect(rows.some((r) => r.trainDeparture === "02:30P NYP")).toBe(false);
    expect(scheduleRows(FEED, CONFIG, new Date("2026-10-12T00:00:00Z"))).toContainEqual({
      direction: "N",
      day: "MO-FR",
      trainRoute: "ETHAN ALLEN 291",
      trainDeparture: "02:30P NYP",
      trainArrival: "07:50P RUD",
    });
  });

  it("applies one-off calendar exceptions", () => {
    const feed = {
      ...FEED,
      calendarDates: [{ service_id: "wk", date: "20261009", exception_type: "2" }],
    };
    expect(scheduleRows(feed, CONFIG, WEEK).find((r) => r.trainRoute === "ETHAN ALLEN 290")?.day).toBe(
      "MO-TH",
    );
  });

  it("ignores routes no group asks for", () => {
    expect(rows.some((r) => r.trainRoute.includes("640"))).toBe(false);
  });
});
