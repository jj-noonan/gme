import type { ScheduleRow } from "@gme/shared";
import { describe, expect, it } from "vitest";
import { matchesSearch, parseQuery, parseTime, type SearchableTrip } from "./search.js";

const at = (h: number, m = 0) => h * 60 + m;

function trip(row: Partial<ScheduleRow>, leaveDoor = at(10, 56), arriveDoor = at(16, 7)): SearchableTrip {
  return {
    row: {
      trainNumber: 284,
      service: "EMPIRE",
      direction: "S",
      daysRaw: "DAILY",
      stationCode: "ALB",
      scheduledDeparture: "13:05",
      scheduledArrival: "15:35",
      ...row,
    },
    leaveDoor,
    arriveDoor,
  };
}

const EMPIRE = trip({});
const ETHAN = trip({ trainNumber: 290, service: "ETHAN ALLEN", stationCode: "RUD", daysRaw: "MO-FR" }, at(16, 30), at(22, 0));
const CAPE_AIR = trip({ trainNumber: 1080, service: "CAPE AIR", stationCode: "LEB", mode: "flight", daysRaw: "SA,SU" }, at(6, 4), at(10, 45));
const ALL = [EMPIRE, ETHAN, CAPE_AIR];

function search(query: string): number[] {
  const terms = parseQuery(query);
  return ALL.filter((t) => matchesSearch(terms, t)).map((t) => t.row.trainNumber);
}

describe("parseTime", () => {
  it("reads 12-hour and 24-hour times", () => {
    expect(parseTime("2pm")).toBe(at(14));
    expect(parseTime("2:30p")).toBe(at(14, 30));
    expect(parseTime("12am")).toBe(0);
    expect(parseTime("12pm")).toBe(at(12));
    expect(parseTime("14:30")).toBe(at(14, 30));
    expect(parseTime("9")).toBe(at(9));
  });

  it("rejects what isn't a time", () => {
    expect(parseTime("13pm")).toBeNull();
    expect(parseTime("25")).toBeNull();
    expect(parseTime("9:75")).toBeNull();
    expect(parseTime("alb")).toBeNull();
  });
});

describe("search", () => {
  it("matches everything with an empty query", () => {
    expect(search("")).toEqual([284, 290, 1080]);
    expect(search("   ")).toEqual([284, 290, 1080]);
  });

  it("by train name, including the short name", () => {
    expect(search("ethan")).toEqual([290]);
    expect(search("ETHN")).toEqual([290]);
    expect(search("empire")).toEqual([284]);
  });

  it("by train number, from its start", () => {
    expect(search("284")).toEqual([284]);
    expect(search("28")).toEqual([284]);
    expect(search("84")).toEqual([]);
  });

  it("by station code or name, at either end", () => {
    expect(search("alb")).toEqual([284]);
    expect(search("rutland")).toEqual([290]);
    expect(search("penn")).toEqual([284, 290, 1080]);
  });

  it("flights by mode or airline", () => {
    expect(search("flight")).toEqual([1080]);
    expect(search("cape air")).toEqual([1080]);
    expect(search("amtrak")).toEqual([284, 290]);
  });

  it("by time of day, on the leave-by time", () => {
    expect(search("morning")).toEqual([284, 1080]);
    expect(search("afternoon")).toEqual([290]);
    expect(search("evening")).toEqual([]);
  });

  it("before / after a time: leave-by by default", () => {
    expect(search("after 10am")).toEqual([284, 290]);
    expect(search("before 2 pm")).toEqual([284, 1080]);
    expect(search("leave after 16:00")).toEqual([290]);
  });

  it("arrive before / after: the door arrival", () => {
    expect(search("arrive before 5pm")).toEqual([284, 1080]);
    expect(search("arrive by 11")).toEqual([1080]);
    expect(search("arriving after 9pm")).toEqual([290]);
  });

  it("by day of the week, on the days it runs", () => {
    expect(search("sat")).toEqual([284, 1080]);
    expect(search("saturdays")).toEqual([284, 1080]);
    expect(search("weekday")).toEqual([284, 290]);
    expect(search("trains on tuesday")).toEqual([284, 290]);
  });

  it("every word has to match", () => {
    expect(search("empire morning")).toEqual([284]);
    expect(search("empire afternoon")).toEqual([]);
    expect(search("weekend after 9am")).toEqual([284]);
  });

  it("ignores an unfinished time while you're still typing", () => {
    expect(search("after")).toEqual([284, 290, 1080]);
    expect(search("ethan arrive before")).toEqual([290]);
  });
});
