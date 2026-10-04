import { describe, expect, it } from "vitest";
import { formatDriveLeg, homeDriveLeg, parseDriveLeg, slotDepartAt } from "./driveLegs.js";
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

describe("parseDriveLeg", () => {
  it("round-trips with formatDriveLeg", () => {
    const leg = { stationCode: "ALB" as const, departAt: "2026-10-05T18:00" };
    expect(parseDriveLeg(formatDriveLeg(leg))).toEqual(leg);
  });

  it("rejects stations that aren't tracked", () => {
    expect(parseDriveLeg("NYP@2026-10-05T18:00")).toBeNull();
  });

  it("rejects malformed or impossible times", () => {
    expect(parseDriveLeg("ALB@2026-10-05 18:00")).toBeNull();
    expect(parseDriveLeg("ALB@2026-10-05T25:00")).toBeNull();
    expect(parseDriveLeg("ALB@2026-02-30T18:00")).toBeNull();
    expect(parseDriveLeg("ALB@2026-10-05T18:00&x=1")).toBeNull();
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

describe("homeDriveLeg", () => {
  const day = new Date(2026, 9, 5, 12, 0);

  it("starts the drive at the scheduled arrival, on the day the train runs", () => {
    expect(homeDriveLeg(row(), day)).toEqual({ stationCode: "RUD", departAt: "2026-10-05T20:40" });
  });

  it("rolls to the next day for trains that arrive after midnight", () => {
    const late = row({ stationCode: "ALB", scheduledDeparture: "22:50", scheduledArrival: "01:56" });
    expect(homeDriveLeg(late, day)?.departAt).toBe("2026-10-06T01:56");
  });

  it("has no drive southbound", () => {
    expect(homeDriveLeg(row({ direction: "S" }), day)).toBeNull();
  });
});
