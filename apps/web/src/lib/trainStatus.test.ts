import type { ScheduleRow, TrainStatus } from "@gme/shared";
import { describe, expect, it } from "vitest";
import { abbreviateService, describeStatus, hasDeparted } from "./trainStatus.js";

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
    expect(describeStatus(ROW, { ...statusWith(12), stale: true })).toMatchObject({
      full: "NO LIVE DATA",
      short: "NO DATA",
    });
  });
});

describe("abbreviateService", () => {
  it("shortens the long names and leaves the rest", () => {
    expect(abbreviateService("ETHAN ALLEN")).toBe("ETHN ALN");
    expect(abbreviateService("ADIRONDACK")).toBe("ADK");
    expect(abbreviateService("EMPIRE")).toBe("EMPIRE");
  });
});

describe("hasDeparted", () => {
  const at = (h: number, m: number) => h * 60 + m;

  it("stays up through the scheduled departure minute", () => {
    expect(hasDeparted(ROW, undefined, at(11, 6))).toBe(false);
    expect(hasDeparted(ROW, undefined, at(11, 7))).toBe(true);
  });

  it("waits out a live delay", () => {
    expect(hasDeparted(ROW, statusWith(12), at(11, 15))).toBe(false);
    expect(hasDeparted(ROW, statusWith(12), at(11, 19))).toBe(true);
  });

  it("goes as soon as the live status says the train has left", () => {
    expect(hasDeparted(ROW, statusWith(12, "Departed"), at(11, 0))).toBe(true);
  });
});
