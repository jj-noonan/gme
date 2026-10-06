import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { STATIONS, TRACKED_TRAIN_NUMBERS } from "./stations.js";
import type { ScheduleRow } from "./types.js";

const schedule = JSON.parse(
  readFileSync(new URL("../../../data/schedule.json", import.meta.url), "utf8"),
) as { rows: ScheduleRow[] };

describe("the schedule and the station/train lists", () => {
  it("tracks live status for every train on the board", () => {
    const untracked = [...new Set(schedule.rows.map((r) => r.trainNumber))].filter(
      (n) => !TRACKED_TRAIN_NUMBERS.includes(n),
    );
    expect(untracked).toEqual([]);
  });

  it("knows every station the schedule stops at", () => {
    const known = new Set(STATIONS.map((s) => s.code));
    expect(schedule.rows.filter((r) => !known.has(r.stationCode))).toEqual([]);
  });
});
