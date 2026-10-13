import { describe, expect, it } from "vitest";
import { formatTripHash, parseTripHash } from "./tripRoute.js";

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
