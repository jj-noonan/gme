import { describe, expect, it } from "vitest";
import { minutesBetweenISO, reshapeAmtrakerResponse, type AmtrakerResponse } from "./statusReshape.js";

/** Shaped like a real Amtraker station stop (see statusReshape.ts for field notes). */
function stop(code: string, overrides: Partial<Record<string, string | null>> = {}) {
  return {
    code,
    schArr: null,
    schDep: null,
    arr: null,
    dep: null,
    status: null,
    platform: null,
    ...overrides,
  };
}

describe("minutesBetweenISO", () => {
  it("returns null when either side is missing", () => {
    expect(minutesBetweenISO(null, "2026-09-19T09:00:00-05:00")).toBeNull();
    expect(minutesBetweenISO("2026-09-19T09:00:00-05:00", null)).toBeNull();
  });

  it("computes a positive delta for a late train", () => {
    expect(minutesBetweenISO("2026-09-19T13:55:00-05:00", "2026-09-19T14:06:00-05:00")).toBe(11);
  });

  it("computes a negative delta for an early train", () => {
    expect(minutesBetweenISO("2026-09-19T15:48:00-05:00", "2026-09-19T15:13:00-05:00")).toBe(-35);
  });

  it("handles differing timezone offsets", () => {
    expect(minutesBetweenISO("2026-09-19T12:00:00-05:00", "2026-09-19T13:00:00-04:00")).toBe(0);
  });
});

describe("reshapeAmtrakerResponse", () => {
  it("derives lateness from scheduled vs expected departure", () => {
    const response: AmtrakerResponse = {
      "69": [
        {
          trainNum: "69",
          stations: [
            stop("NYP", {
              schDep: "2026-09-19T08:15:00-04:00",
              dep: "2026-09-19T08:27:00-04:00",
              status: "Departed",
              platform: "7",
            }),
          ],
        },
      ],
    };
    const [status] = reshapeAmtrakerResponse(response, [69], false);
    expect(status.perStation[0]).toMatchObject({
      stationCode: "NYP",
      delayMinutes: 12,
      stopStatus: "Departed",
      track: "7",
    });
  });

  it("falls back to arrival timing for a terminal stop with no departure", () => {
    const response: AmtrakerResponse = {
      "68": [
        {
          trainNum: "68",
          stations: [
            stop("NYP", {
              schArr: "2026-09-19T22:15:00-04:00",
              arr: "2026-09-19T22:10:00-04:00",
              status: "Enroute",
            }),
          ],
        },
      ],
    };
    const [status] = reshapeAmtrakerResponse(response, [68], false);
    expect(status.perStation[0].delayMinutes).toBe(-5);
  });

  it("treats an empty platform string as no track assigned yet", () => {
    const response: AmtrakerResponse = {
      "69": [{ trainNum: "69", stations: [stop("NYP", { platform: "" })] }],
    };
    const [status] = reshapeAmtrakerResponse(response, [69], false);
    expect(status.perStation[0].track).toBeNull();
  });

  it("marks a tracked train not yet in the feed as untracked-today rather than dropping it", () => {
    const [status] = reshapeAmtrakerResponse({}, [69], false);
    expect(status).toEqual({ trainNumber: 69, isTracked: false, stale: false, perStation: [] });
  });

  it("never surfaces the Boston-section train numbers even if present in the raw feed", () => {
    const response: AmtrakerResponse = {
      "48": [{ trainNum: "48", stations: [stop("ALB"), stop("NYP")] }],
      "448": [{ trainNum: "448", stations: [stop("ALB"), stop("BOS")] }],
    };
    const statuses = reshapeAmtrakerResponse(response, [48], false);
    expect(statuses.map((s) => s.trainNumber)).toEqual([48]);
  });

  it("propagates the stale flag as given", () => {
    const [status] = reshapeAmtrakerResponse({}, [69], true);
    expect(status.stale).toBe(true);
  });
});
