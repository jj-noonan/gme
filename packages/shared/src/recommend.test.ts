import { describe, expect, it } from "vitest";
import { minutesBetweenClockTimes, pickNorthboundRecommendation, pickSouthboundRecommendation } from "./recommend.js";
import { STATIONS } from "./stations.js";
import type { ScheduleRow } from "./types.js";

describe("minutesBetweenClockTimes", () => {
  it("computes a same-day duration (Adirondack 69, NYP-ALB)", () => {
    expect(minutesBetweenClockTimes("08:15", "11:45")).toBe(3 * 60 + 30);
  });

  it("wraps past midnight (Empire 245, NYP 11:25P - ALB 1:56A)", () => {
    expect(minutesBetweenClockTimes("23:25", "01:56")).toBe(2 * 60 + 31);
  });

  it("is zero for identical times", () => {
    expect(minutesBetweenClockTimes("10:00", "10:00")).toBe(0);
  });
});

function row(overrides: Partial<ScheduleRow>): ScheduleRow {
  return {
    trainNumber: 290,
    service: "ETHAN ALLEN",
    direction: "S",
    daysRaw: "DAILY",
    stationCode: "RUD",
    scheduledDeparture: "11:06",
    scheduledArrival: "16:27",
    ...overrides,
  };
}

describe("pickNorthboundRecommendation", () => {
  const rows: ScheduleRow[] = [
    row({ trainNumber: 69, direction: "N", scheduledDeparture: "08:15", scheduledArrival: "11:45" }),
    row({ trainNumber: 291, direction: "N", scheduledDeparture: "14:19", scheduledArrival: "17:04" }),
  ];

  it("picks the next train reachable given the assumed transit time", () => {
    // 9:00am + 50min transit = 9:50, so the 8:15 has already left but 2:19pm is fine.
    const result = pickNorthboundRecommendation(rows, 9 * 60, 50);
    expect(result?.trainNumber).toBe(291);
  });

  it("returns null when nothing is catchable today", () => {
    const result = pickNorthboundRecommendation(rows, 23 * 60, 50);
    expect(result).toBeNull();
  });
});

describe("pickSouthboundRecommendation", () => {
  const rud = STATIONS.find((s) => s.code === "RUD")!;
  const cnv = STATIONS.find((s) => s.code === "CNV")!;

  // Same train, boarded a few stops apart: CNV is a couple minutes closer to
  // NYP (slightly shorter ride) but requires a real drive from Rutland.
  const rows: ScheduleRow[] = [
    row({ trainNumber: 290, stationCode: "RUD", scheduledDeparture: "11:06", scheduledArrival: "16:27" }),
    row({ trainNumber: 290, stationCode: "CNV", scheduledDeparture: "11:11", scheduledArrival: "16:27" }),
  ];

  it("recommends the nearer station for a train stopping at multiple candidates", () => {
    // Standing at Castleton: CNV wins on both drive time and total trip time.
    const result = pickSouthboundRecommendation(rows, cnv, 8 * 60);
    expect(result?.row.stationCode).toBe("CNV");
  });

  it("recommends Rutland when starting from right there, since the extra drive to Castleton isn't worth the shorter ride", () => {
    const result = pickSouthboundRecommendation(rows, rud, 8 * 60);
    expect(result?.row.stationCode).toBe("RUD");
  });

  it("skips a train once even its best station is no longer reachable in time", () => {
    const result = pickSouthboundRecommendation(rows, cnv, 11 * 60);
    expect(result).toBeNull();
  });
});
