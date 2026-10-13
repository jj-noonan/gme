import { describe, expect, it } from "vitest";
import { estimatedDoorLegs } from "./leaveBy.js";
import { tripTimeline } from "./tripTimeline.js";
import type { ScheduleRow } from "./types.js";

const at = (h: number, m: number) => h * 60 + m;

function row(overrides: Partial<ScheduleRow> = {}): ScheduleRow {
  return {
    trainNumber: 284,
    service: "EMPIRE",
    direction: "S",
    daysRaw: "DAILY",
    stationCode: "ALB",
    scheduledDeparture: "13:05",
    scheduledArrival: "15:35",
    ...overrides,
  };
}

const legs = (vtDriveMinutes: number, nycTransitMinutes: number) => ({
  vtDriveMinutes,
  nycTransitMinutes,
});

describe("tripTimeline", () => {
  it("southbound: drive, station buffer, train, transfer buffer, subway", () => {
    const t = tripTimeline(row(), legs(109, 32), 0, at(9, 0));
    expect(t).toEqual({
      leaveDoor: at(10, 56),
      firstLegMinutes: 109,
      reachStation: at(12, 45),
      bufferMinutes: 20,
      trainDeparts: at(13, 5),
      trainArrives: at(15, 35),
      trainMinutes: 150,
      transferMinutes: 10,
      leaveStation: at(15, 45),
      lastLegMinutes: 32,
      arriveDoor: at(16, 17),
      totalMinutes: 109 + 20 + 150 + 10 + 32,
      underway: false,
    });
  });

  it("northbound: subway with Penn Station's buffer, then the drive home", () => {
    const t = tripTimeline(
      row({ direction: "N", scheduledDeparture: "08:15", scheduledArrival: "10:45" }),
      legs(109, 41.6),
      0,
      at(6, 0),
    );
    expect(t.firstLegMinutes).toBe(42);
    expect(t.bufferMinutes).toBe(10);
    expect(t.leaveDoor).toBe(at(7, 23));
    expect(t.lastLegMinutes).toBe(109);
    expect(t.arriveDoor).toBe(at(12, 44));
  });

  it("flights use the airport's buffer", () => {
    const t = tripTimeline(row({ stationCode: "LEB", mode: "flight" }), legs(30, 30), 0, 0);
    expect(t.bufferMinutes).toBe(30);
  });

  it("a live delay moves arrival and the total, not the leave time", () => {
    const onTime = tripTimeline(row(), legs(109, 32), 0, at(9, 0));
    const late = tripTimeline(row(), legs(109, 32), 12, at(9, 0));
    expect(late.leaveDoor).toBe(onTime.leaveDoor);
    expect(late.trainDeparts).toBe(onTime.trainDeparts);
    expect(late.trainArrives).toBe(onTime.trainArrives + 12);
    expect(late.arriveDoor).toBe(onTime.arriveDoor + 12);
    expect(late.totalMinutes).toBe(onTime.totalMinutes + 12);
  });

  it("the pieces always add up: leave + leg + buffer lands on departure", () => {
    const t = tripTimeline(estimatedRow(), estimatedDoorLegs(17.4), 0, 0);
    expect(t.leaveDoor + t.firstLegMinutes + t.bufferMinutes).toBe(t.trainDeparts);
  });

  it("is underway once the leave-by time passes", () => {
    expect(tripTimeline(row(), legs(109, 32), 0, at(10, 56)).underway).toBe(false);
    expect(tripTimeline(row(), legs(109, 32), 0, at(10, 57)).underway).toBe(true);
  });
});

function estimatedRow(): ScheduleRow {
  return row({ stationCode: "RUD", scheduledDeparture: "11:06" });
}
