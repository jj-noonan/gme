import { describe, expect, it } from "vitest";
import { boardingStationCode, computeLeaveBy, leadMinutes, leaveByMinutes } from "./leaveBy.js";
import { STATIONS } from "./stations.js";
import type { ScheduleRow } from "./types.js";

function row(overrides: Partial<ScheduleRow> = {}): ScheduleRow {
  return {
    trainNumber: 69,
    service: "ADIRONDACK",
    direction: "N",
    daysRaw: "DAILY",
    stationCode: "ALB",
    scheduledDeparture: "08:15",
    scheduledArrival: "11:45",
    ...overrides,
  };
}

const RUD = STATIONS.find((s) => s.code === "RUD")!;

describe("boardingStationCode", () => {
  it("is NYP for northbound, since that's where you actually get on", () => {
    expect(boardingStationCode(row({ direction: "N", stationCode: "ALB" }))).toBe("NYP");
  });

  it("is the tracked station for southbound", () => {
    expect(boardingStationCode(row({ direction: "S", stationCode: "RUD" }))).toBe("RUD");
  });
});

describe("leadMinutes", () => {
  it("uses the flat subway estimate plus buffer northbound (50 + 10)", () => {
    expect(leadMinutes("N", null)).toBe(60);
  });

  it("ignores drive time northbound — you board at NYP regardless of where you are", () => {
    expect(leadMinutes("N", 90)).toBe(60);
  });

  it("uses drive time plus buffer southbound (drive + 15)", () => {
    expect(leadMinutes("S", 18)).toBe(33);
  });
});

describe("leaveByMinutes", () => {
  it("subtracts the lead from departure", () => {
    expect(leaveByMinutes("08:15", 60)).toBe(7 * 60 + 15);
  });

  it("wraps to the previous evening for an early-morning train", () => {
    // Empire 230 departs ALB 04:55; a 35-minute lead means leaving at 04:20.
    expect(leaveByMinutes("04:55", 35)).toBe(4 * 60 + 20);
    // A 60-minute lead on a 00:30 departure means 23:30 the night before.
    expect(leaveByMinutes("00:30", 60)).toBe(23 * 60 + 30);
  });
});

describe("computeLeaveBy", () => {
  it("marks a northbound train as missed once the 60-minute window has passed", () => {
    const atSeven = computeLeaveBy(row({ scheduledDeparture: "08:15" }), RUD, 7 * 60);
    expect(atSeven.missed).toBe(false);

    const atSevenThirty = computeLeaveBy(row({ scheduledDeparture: "08:15" }), RUD, 7 * 60 + 30);
    expect(atSevenThirty.missed).toBe(true);
  });

  it("uses a real drive estimate southbound from the user's location", () => {
    const standingAtRutland = computeLeaveBy(
      row({ direction: "S", stationCode: "RUD", scheduledDeparture: "11:06" }),
      RUD,
      8 * 60,
    );
    // Standing at the station: essentially just the 15-minute buffer.
    expect(standingAtRutland.leadMinutes).toBeCloseTo(15, 0);
    expect(standingAtRutland.minutes).toBe(10 * 60 + 51);
  });

  it("always yields whole minutes, even though drive estimates are fractional", () => {
    // A fractional lead used to render as "12:0.1" in the UI.
    const albany = STATIONS.find((s) => s.code === "ALB")!;
    for (const station of STATIONS) {
      const result = computeLeaveBy(
        row({ direction: "S", stationCode: station.code, scheduledDeparture: "04:55" }),
        albany,
        0,
      );
      expect(Number.isInteger(result.minutes)).toBe(true);
      expect(Number.isInteger(result.leadMinutes)).toBe(true);
    }
  });

  it("gives a later leave time for a nearer station on the same train", () => {
    const fromRutland = { lat: RUD.lat, lon: RUD.lon };
    const nearby = computeLeaveBy(
      row({ direction: "S", stationCode: "RUD", scheduledDeparture: "11:06" }),
      fromRutland,
      8 * 60,
    );
    const farther = computeLeaveBy(
      row({ direction: "S", stationCode: "ALB", scheduledDeparture: "11:06" }),
      fromRutland,
      8 * 60,
    );
    expect(nearby.minutes).toBeGreaterThan(farther.minutes);
  });
});
