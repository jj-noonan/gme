import { describe, expect, it } from "vitest";
import { formatTransitLeg, nycTransitLeg, parseTransitLeg } from "./transitLegs.js";
import type { ScheduleRow } from "./types.js";

const BISHOP_LOUGHLIN = { lat: 40.6871, lon: -73.9691 };

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

describe("formatTransitLeg / parseTransitLeg", () => {
  it("puts Penn Station last heading out, first heading home", () => {
    const out = { place: BISHOP_LOUGHLIN, toNyp: true, at: "2026-10-05T15:05" };
    expect(formatTransitLeg(out)).toBe("40.687,-73.969>NYP@2026-10-05T15:05");
    expect(formatTransitLeg({ ...out, toNyp: false })).toBe("NYP>40.687,-73.969@2026-10-05T15:05");
  });

  it("round-trips, with the place rounded to ~100m", () => {
    for (const toNyp of [true, false]) {
      const leg = { place: BISHOP_LOUGHLIN, toNyp, at: "2026-10-05T15:05" };
      expect(parseTransitLeg(formatTransitLeg(leg))).toEqual({
        ...leg,
        place: { lat: 40.687, lon: -73.969 },
      });
    }
  });

  it("requires Penn Station at exactly one end", () => {
    expect(parseTransitLeg("40.687,-73.969>40.751,-73.994@2026-10-05T15:05")).toBeNull();
    expect(parseTransitLeg("NYP>NYP@2026-10-05T15:05")).toBeNull();
    expect(parseTransitLeg("ALB>40.687,-73.969@2026-10-05T15:05")).toBeNull();
    expect(parseTransitLeg("40.687,-73.969>NYP@2026-10-05T25:05")).toBeNull();
  });
});

describe("nycTransitLeg", () => {
  const day = new Date(2026, 9, 5, 12, 0);

  it("northbound: arrive at Penn Station the buffer before the train leaves", () => {
    expect(nycTransitLeg(row(), BISHOP_LOUGHLIN, day)).toEqual({
      place: BISHOP_LOUGHLIN,
      toNyp: true,
      at: "2026-10-05T15:05",
    });
  });

  it("northbound: rolls back to the previous evening for a just-after-midnight train", () => {
    expect(nycTransitLeg(row({ scheduledDeparture: "00:05" }), BISHOP_LOUGHLIN, day).at).toBe(
      "2026-10-04T23:55",
    );
  });

  it("southbound: leave Penn Station when the train gets in", () => {
    const south = row({ direction: "S", scheduledDeparture: "11:06", scheduledArrival: "16:27" });
    expect(nycTransitLeg(south, BISHOP_LOUGHLIN, day)).toEqual({
      place: BISHOP_LOUGHLIN,
      toNyp: false,
      at: "2026-10-05T16:27",
    });
  });

  it("southbound: rolls to the next day for trains that arrive after midnight", () => {
    const late = row({ direction: "S", scheduledDeparture: "20:00", scheduledArrival: "00:40" });
    expect(nycTransitLeg(late, BISHOP_LOUGHLIN, day).at).toBe("2026-10-06T00:40");
  });

  it("gives every stop of the same train the same leg", () => {
    const rud = row({ direction: "S", stationCode: "RUD", scheduledDeparture: "11:06", scheduledArrival: "16:27" });
    const cnv = row({ direction: "S", stationCode: "CNV", scheduledDeparture: "11:11", scheduledArrival: "16:27" });
    expect(formatTransitLeg(nycTransitLeg(rud, BISHOP_LOUGHLIN, day))).toBe(
      formatTransitLeg(nycTransitLeg(cnv, BISHOP_LOUGHLIN, day)),
    );
  });
});
