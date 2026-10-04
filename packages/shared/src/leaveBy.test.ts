import { describe, expect, it } from "vitest";
import {
  arrivalLegMinutes,
  boardingStationCode,
  changeStationCode,
  computeLeaveBy,
  doorArrivalMinutes,
  leadMinutes,
  leaveByMinutes,
  straightLineDriveMinutes,
} from "./leaveBy.js";
import { DEFAULT_VT_LOCATION, STATIONS } from "./stations.js";
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

describe("arrivalLegMinutes / doorArrivalMinutes", () => {
  it("northbound: the drive from the arrival station to the vt-location, in whole minutes", () => {
    expect(arrivalLegMinutes(row({ direction: "N", stationCode: "ALB" }), 112.6)).toBe(113);
  });

  it("southbound: a flat cross-town hop, ignoring the VT drive", () => {
    expect(arrivalLegMinutes(row({ direction: "S", stationCode: "RUD" }), 2)).toBe(50);
    expect(arrivalLegMinutes(row({ direction: "S", stationCode: "ALB" }), 113)).toBe(50);
  });

  it("adds the last leg onto the train's arrival time", () => {
    const r = row({ direction: "S", scheduledArrival: "16:27" });
    expect(doorArrivalMinutes(r, 50)).toBe(17 * 60 + 17);
  });

  it("wraps past midnight", () => {
    // Empire 245 reaches ALB at 01:56; a 2h drive lands at 03:56.
    expect(doorArrivalMinutes(row({ scheduledArrival: "23:30" }), 60)).toBe(30);
  });

  it("always yields whole minutes", () => {
    for (const station of STATIONS) {
      const r = row({ direction: "N", stationCode: station.code });
      const leg = arrivalLegMinutes(r, straightLineDriveMinutes(DEFAULT_VT_LOCATION, station.code));
      expect(Number.isInteger(leg)).toBe(true);
      expect(Number.isInteger(doorArrivalMinutes(r, leg))).toBe(true);
    }
  });
});

describe("straightLineDriveMinutes", () => {
  it("is near zero at the station and grows with distance", () => {
    expect(straightLineDriveMinutes(RUD, "RUD")).toBeCloseTo(0, 5);
    // Jones Donuts: basically at Rutland; Albany is ~2h away.
    expect(straightLineDriveMinutes(DEFAULT_VT_LOCATION, "RUD")).toBeLessThan(15);
    expect(straightLineDriveMinutes(DEFAULT_VT_LOCATION, "ALB")).toBeGreaterThan(90);
  });
});

describe("boardingStationCode", () => {
  it("is NYP for northbound, since that's where you actually get on", () => {
    expect(boardingStationCode(row({ direction: "N", stationCode: "ALB" }))).toBe("NYP");
  });

  it("is the tracked station for southbound", () => {
    expect(boardingStationCode(row({ direction: "S", stationCode: "RUD" }))).toBe("RUD");
  });

  it("changeStationCode is the opposite end — where you get off", () => {
    expect(changeStationCode(row({ direction: "N", stationCode: "ALB" }))).toBe("ALB");
    expect(changeStationCode(row({ direction: "S", stationCode: "RUD" }))).toBe("NYP");
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
    const atSeven = computeLeaveBy(row({ scheduledDeparture: "08:15" }), 90, 7 * 60);
    expect(atSeven.missed).toBe(false);

    const atSevenThirty = computeLeaveBy(row({ scheduledDeparture: "08:15" }), 90, 7 * 60 + 30);
    expect(atSevenThirty.missed).toBe(true);
  });

  it("southbound: leaves the VT drive plus buffer before departure", () => {
    const result = computeLeaveBy(
      row({ direction: "S", stationCode: "CNV", scheduledDeparture: "11:11" }),
      19,
      8 * 60,
    );
    expect(result.leadMinutes).toBe(34);
    expect(result.minutes).toBe(10 * 60 + 37);
  });

  it("always yields whole minutes, even though drive estimates are fractional", () => {
    // A fractional lead used to render as "12:0.1" in the UI.
    for (const station of STATIONS) {
      const result = computeLeaveBy(
        row({ direction: "S", stationCode: station.code, scheduledDeparture: "04:55" }),
        straightLineDriveMinutes(DEFAULT_VT_LOCATION, station.code),
        0,
      );
      expect(Number.isInteger(result.minutes)).toBe(true);
      expect(Number.isInteger(result.leadMinutes)).toBe(true);
    }
  });

  it("gives a later leave time for a nearer station on the same train", () => {
    const nearby = computeLeaveBy(
      row({ direction: "S", stationCode: "RUD", scheduledDeparture: "11:06" }),
      2,
      8 * 60,
    );
    const farther = computeLeaveBy(
      row({ direction: "S", stationCode: "ALB", scheduledDeparture: "11:06" }),
      113,
      8 * 60,
    );
    expect(nearby.minutes).toBeGreaterThan(farther.minutes);
  });
});
