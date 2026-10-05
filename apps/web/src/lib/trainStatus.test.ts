import type { ScheduleRow, TrainStatus } from "@gme/shared";
import { describe, expect, it } from "vitest";
import { abbreviateService, describeStatus } from "./trainStatus.js";

const ROW: ScheduleRow = {
  trainNumber: 290,
  service: "ETHAN ALLEN",
  direction: "S",
  daysRaw: "DAILY",
  stationCode: "RUD",
  scheduledDeparture: "11:06",
  scheduledArrival: "16:27",
};

function statusWith(delayMinutes: number | null, stopStatus: string | null = "Enroute"): TrainStatus {
  return {
    trainNumber: 290,
    isTracked: true,
    stale: false,
    perStation: [
      {
        stationCode: "RUD",
        scheduledDeparture: null,
        expectedDeparture: null,
        delayMinutes,
        stopStatus,
        track: null,
      },
    ],
  };
}

describe("describeStatus", () => {
  it("late: the delay and estimated departure, shortened to just the delay", () => {
    expect(describeStatus(ROW, statusWith(12))).toEqual({
      icon: "delayed",
      full: "+12 MIN (ETD 11:18A)",
      short: "+12 MIN",
    });
  });

  it("early", () => {
    expect(describeStatus(ROW, statusWith(-5))).toEqual({
      icon: "scheduled",
      full: "-5 MIN (ETD 11:01A)",
      short: "-5 MIN",
    });
  });

  it("wraps the estimated departure past midnight", () => {
    const late = { ...ROW, scheduledDeparture: "23:50" };
    expect(describeStatus(late, statusWith(20)).full).toBe("+20 MIN (ETD 12:10A)");
  });

  it("calls a couple of minutes either way on time", () => {
    expect(describeStatus(ROW, statusWith(2)).full).toBe("ON TIME");
  });

  it("falls back to the stop status, spotting cancellations", () => {
    expect(describeStatus(ROW, statusWith(null, "Cancelled"))).toEqual({
      icon: "cancelled",
      full: "CANCELLED",
      short: "CANCELLED",
    });
  });

  it("says SCHEDULED or NO LIVE DATA without usable live data", () => {
    expect(describeStatus(ROW, undefined).full).toBe("SCHEDULED");
    expect(describeStatus(ROW, { ...statusWith(12), stale: true }).full).toBe("NO LIVE DATA");
  });
});

describe("abbreviateService", () => {
  it("shortens the long names and leaves the rest", () => {
    expect(abbreviateService("ETHAN ALLEN")).toBe("ETHN ALN");
    expect(abbreviateService("ADIRONDACK")).toBe("ADK");
    expect(abbreviateService("EMPIRE")).toBe("EMPIRE");
  });
});
