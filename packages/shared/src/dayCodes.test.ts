import { describe, expect, it } from "vitest";
import { matchesDay, parseDayCode } from "./dayCodes.js";

// Sun=0 Mon=1 Tue=2 Wed=3 Thu=4 Fri=5 Sat=6
const SUN = new Date("2026-09-20T12:00:00");
const MON = new Date("2026-09-21T12:00:00");
const TUE = new Date("2026-09-22T12:00:00");
const WED = new Date("2026-09-23T12:00:00");
const THU = new Date("2026-09-24T12:00:00");
const FRI = new Date("2026-09-25T12:00:00");
const SAT = new Date("2026-09-26T12:00:00");
const WEEK = { SUN, MON, TUE, WED, THU, FRI, SAT };

function daysMatching(raw: string): string[] {
  return Object.entries(WEEK)
    .filter(([, date]) => matchesDay(raw, date))
    .map(([name]) => name);
}

describe("parseDayCode", () => {
  it("DAILY matches every day", () => {
    expect(daysMatching("DAILY")).toEqual(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]);
  });

  it("a plain range matches inclusive contiguous days", () => {
    expect(daysMatching("MO-FR")).toEqual(["MON", "TUE", "WED", "THU", "FRI"]);
    expect(daysMatching("MO-WE")).toEqual(["MON", "TUE", "WED"]);
    expect(daysMatching("SU-FR")).toEqual(["SUN", "MON", "TUE", "WED", "THU", "FRI"]);
  });

  it("a single day code matches only that day", () => {
    expect(daysMatching("SA")).toEqual(["SAT"]);
  });

  it("slash-separated lists match the union", () => {
    expect(daysMatching("SA/SU")).toEqual(["SUN", "SAT"]);
    expect(daysMatching("TH/FR")).toEqual(["THU", "FRI"]);
    expect(daysMatching("FR/SU/MO")).toEqual(["SUN", "MON", "FRI"]);
  });

  it("mashed concatenations match the same union as their slash equivalent", () => {
    expect(daysMatching("SUSA")).toEqual(daysMatching("SU/SA"));
    expect(daysMatching("THFR")).toEqual(daysMatching("TH/FR"));
    expect(daysMatching("SUMOFR")).toEqual(daysMatching("SU/MO/FR"));
  });

  it("comma-joined range + single day matches the union, not an intersection", () => {
    expect(daysMatching("SU-WE,SA")).toEqual(["SUN", "MON", "TUE", "WED", "SAT"]);
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(parseDayCode(" mo-fr ")).toEqual(parseDayCode("MO-FR"));
  });

  it("rejects an unrecognized day token", () => {
    expect(() => parseDayCode("XX-FR")).toThrow();
  });
});
