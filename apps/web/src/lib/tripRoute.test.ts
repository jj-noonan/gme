import { describe, expect, it } from "vitest";
import type { ScheduleRow } from "@gme/shared";
import { formatTripHash, neighbors, parseTripHash } from "./tripRoute.js";

describe("trip hash", () => {
  it("round-trips a trip", () => {
    const route = { tab: "S_TODAY", trainNumber: 284, stationCode: "ALB" } as const;
    expect(formatTripHash(route)).toBe("#/trip/S_TODAY/284-ALB");
    expect(parseTripHash(formatTripHash(route))).toEqual(route);
  });

  it("rejects anything that isn't a known tab and station", () => {
    expect(parseTripHash("")).toBeNull();
    expect(parseTripHash("#/trip/S_TOMORROW/284-ALB")).toBeNull();
    expect(parseTripHash("#/trip/S_TODAY/284-XYZ")).toBeNull();
    expect(parseTripHash("#/trip/S_TODAY/abc-ALB")).toBeNull();
  });
});

describe("neighbors", () => {
  const row = (trainNumber: number): ScheduleRow => ({
    trainNumber,
    service: "EMPIRE",
    direction: "S",
    daysRaw: "DAILY",
    stationCode: "ALB",
    scheduledDeparture: "13:05",
    scheduledArrival: "15:35",
  });
  const rows = [row(280), row(284), row(288)];
  const open = (trainNumber: number) => ({ tab: "S_TODAY" as const, trainNumber, stationCode: "ALB" as const });

  it("the trips before and after, in list order", () => {
    expect(neighbors(rows, open(284))).toEqual({ prev: rows[0], next: rows[2] });
  });

  it("nothing past either end, or for a trip not in the list", () => {
    expect(neighbors(rows, open(280)).prev).toBeNull();
    expect(neighbors(rows, open(288)).next).toBeNull();
    expect(neighbors(rows, open(999))).toEqual({ prev: null, next: null });
  });
});
