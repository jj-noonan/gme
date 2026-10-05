import { describe, expect, it } from "vitest";
import { easternLocal, easternLocalToInstant } from "./eastern.js";

describe("easternLocal", () => {
  it("formats the Eastern wall clock, not UTC", () => {
    expect(easternLocal(new Date("2026-10-05T16:00:00Z"))).toBe("2026-10-05T12:00");
  });
});

describe("easternLocalToInstant", () => {
  it("uses EDT in summer and EST in winter", () => {
    expect(easternLocalToInstant("2026-10-05T12:00").toISOString()).toBe("2026-10-05T16:00:00.000Z");
    expect(easternLocalToInstant("2026-12-05T12:00").toISOString()).toBe("2026-12-05T17:00:00.000Z");
  });

  it("round-trips through easternLocal", () => {
    for (const local of ["2026-03-08T01:30", "2026-03-08T03:30", "2026-11-01T00:30", "2026-11-01T03:00"]) {
      expect(easternLocal(easternLocalToInstant(local))).toBe(local);
    }
  });
});
