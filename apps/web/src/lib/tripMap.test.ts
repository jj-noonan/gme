import type { ScheduleRow } from "@gme/shared";
import { NYP_COORDINATE } from "@gme/shared";
import { describe, expect, it } from "vitest";
import { tripMapShape } from "./tripMap.js";

const VT = { lat: 43.6, lon: -72.97 };
const NYC = { lat: 40.68, lon: -73.96 };
const ROW: ScheduleRow = {
  trainNumber: 284,
  service: "EMPIRE",
  direction: "S",
  daysRaw: "DAILY",
  stationCode: "ALB",
  scheduledDeparture: "13:05",
  scheduledArrival: "15:35",
};

describe("tripMapShape", () => {
  it("southbound: VT door, the station, Penn Station, NYC door", () => {
    const shape = tripMapShape(ROW, VT, NYC);
    expect(shape.points).toEqual([VT, { lat: 42.641, lon: -73.7411 }, NYP_COORDINATE, NYC]);
    expect(shape.legs).toEqual(["drive", "train", "subway"]);
  });

  it("northbound runs the other way", () => {
    const shape = tripMapShape({ ...ROW, direction: "N" }, VT, NYC);
    expect(shape.points[0]).toEqual(NYC);
    expect(shape.points[3]).toEqual(VT);
    expect(shape.legs).toEqual(["subway", "train", "drive"]);
  });

  it("flights fly the middle leg", () => {
    expect(tripMapShape({ ...ROW, stationCode: "LEB", mode: "flight" }, VT, NYC).legs[1]).toBe("flight");
  });
});
