import { describe, expect, it } from "vitest";
import { formatDriveLeg, parseDriveLeg, slotDepartAt, vtDriveLeg } from "./driveLegs.js";
import type { ScheduleRow } from "./types.js";

function row(overrides: Partial<ScheduleRow> = {}): ScheduleRow {
  return {
    trainNumber: 291,
    service: "Ethan Allen Express",
    direction: "N",
    daysRaw: "Daily",
    stationCode: "RUD",
    scheduledDeparture: "15:15",
    scheduledArrival: "20:40",
    ...overrides,
  };
}

const JONES = { lat: 43.6089, lon: -72.9781 };

describe("formatDriveLeg / parseDriveLeg", () => {
  it("writes the station first heading home, last heading out", () => {
    const home = { stationCode: "ALB" as const, place: JONES, toStation: false, departAt: "2026-10-05T18:00" };
    expect(formatDriveLeg(home)).toBe("ALB>43.609,-72.978@2026-10-05T18:00");
    expect(formatDriveLeg({ ...home, toStation: true })).toBe("43.609,-72.978>ALB@2026-10-05T18:00");
  });

  it("round-trips, with the place rounded to ~100m", () => {
    for (const toStation of [true, false]) {
      const leg = { stationCode: "FED" as const, place: JONES, toStation, departAt: "2026-10-05T18:00" };
      expect(parseDriveLeg(formatDriveLeg(leg))).toEqual({
        ...leg,
        place: { lat: 43.609, lon: -72.978 },
      });
    }
  });

  it("requires exactly one tracked station end", () => {
    expect(parseDriveLeg("NYP>43.609,-72.978@2026-10-05T18:00")).toBeNull();
    expect(parseDriveLeg("ALB>RUD@2026-10-05T18:00")).toBeNull();
    expect(parseDriveLeg("43.609,-72.978>40.751,-73.994@2026-10-05T18:00")).toBeNull();
  });

  it("rejects over-precise places and malformed or impossible times", () => {
    expect(parseDriveLeg("ALB>43.60891,-72.978@2026-10-05T18:00")).toBeNull();
    expect(parseDriveLeg("ALB>43.609,-72.978@2026-10-05 18:00")).toBeNull();
    expect(parseDriveLeg("ALB>43.609,-72.978@2026-10-05T25:00")).toBeNull();
    expect(parseDriveLeg("ALB>43.609,-72.978@2026-02-30T18:00")).toBeNull();
    expect(parseDriveLeg("ALB>43.609,-72.978@2026-10-05T18:00@x")).toBeNull();
  });
});

describe("slotDepartAt", () => {
  it("floors to the start of the quarter hour", () => {
    expect(slotDepartAt("2026-10-05T18:00")).toBe("2026-10-05T18:00");
    expect(slotDepartAt("2026-10-05T18:14")).toBe("2026-10-05T18:00");
    expect(slotDepartAt("2026-10-05T18:15")).toBe("2026-10-05T18:15");
    expect(slotDepartAt("2026-10-05T23:59")).toBe("2026-10-05T23:45");
  });
});

describe("vtDriveLeg", () => {
  const day = new Date(2026, 9, 5, 12, 0);

  it("northbound: station → vt-location, at the scheduled arrival", () => {
    expect(vtDriveLeg(row(), JONES, day)).toEqual({
      stationCode: "RUD",
      place: JONES,
      toStation: false,
      departAt: "2026-10-05T20:40",
    });
  });

  it("northbound: rolls to the next day for trains that arrive after midnight", () => {
    const late = row({ stationCode: "ALB", scheduledDeparture: "22:50", scheduledArrival: "01:56" });
    expect(vtDriveLeg(late, JONES, day).departAt).toBe("2026-10-06T01:56");
  });

  it("southbound: vt-location → station, leaving drive + buffer before departure", () => {
    // Jones Donuts → Albany is ~110 min straight-line, + 15 buffer = 125 min before 10:00.
    const south = row({ direction: "S", stationCode: "ALB", scheduledDeparture: "10:00" });
    expect(vtDriveLeg(south, JONES, day)).toEqual({
      stationCode: "ALB",
      place: JONES,
      toStation: true,
      departAt: "2026-10-05T07:55",
    });
  });

  it("southbound: rolls back to the previous evening for an early-morning train", () => {
    const early = row({ direction: "S", stationCode: "ALB", scheduledDeparture: "00:30" });
    expect(vtDriveLeg(early, JONES, day).departAt).toBe("2026-10-04T22:25");
  });
});
