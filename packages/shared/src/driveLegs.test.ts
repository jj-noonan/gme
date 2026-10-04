import { describe, expect, it } from "vitest";
import { formatDriveLeg, parseDriveLeg, slotDepartAt } from "./driveLegs.js";

describe("parseDriveLeg", () => {
  it("round-trips with formatDriveLeg", () => {
    const leg = { stationCode: "ALB" as const, departAt: "2026-10-05T18:00" };
    expect(parseDriveLeg(formatDriveLeg(leg))).toEqual(leg);
  });

  it("rejects stations that aren't tracked", () => {
    expect(parseDriveLeg("NYP@2026-10-05T18:00")).toBeNull();
  });

  it("rejects malformed or impossible times", () => {
    expect(parseDriveLeg("ALB@2026-10-05 18:00")).toBeNull();
    expect(parseDriveLeg("ALB@2026-10-05T25:00")).toBeNull();
    expect(parseDriveLeg("ALB@2026-02-30T18:00")).toBeNull();
    expect(parseDriveLeg("ALB@2026-10-05T18:00&x=1")).toBeNull();
  });
});

describe("slotDepartAt", () => {
  it("floors to the start of the quarter hour", () => {
    expect(slotDepartAt("2026-10-05T18:00")).toBe("2026-10-05T18:00");
    expect(slotDepartAt("2026-10-05T18:14")).toBe("2026-10-05T18:00");
    expect(slotDepartAt("2026-10-05T18:15")).toBe("2026-10-05T18:15");
    expect(slotDepartAt("2026-10-05T23:59")).toBe("2026-10-05T23:45");
  });
});
