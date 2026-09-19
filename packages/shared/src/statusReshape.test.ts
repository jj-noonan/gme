import { describe, expect, it } from "vitest";
import { reshapeAmtrakerResponse, type AmtrakerResponse } from "./statusReshape.js";

function stop(code: string, overrides: Partial<Record<string, string>> = {}) {
  return {
    code,
    schArr: null,
    schDep: null,
    estArr: null,
    estDep: null,
    postArr: null,
    postDep: null,
    arrCmnt: null,
    depCmnt: null,
    ...overrides,
  };
}

describe("reshapeAmtrakerResponse", () => {
  it("keeps a tracked train that is present in the feed", () => {
    const response: AmtrakerResponse = {
      "48": [{ trainNum: "48", stations: [stop("ALB", { estArr: "04:10P" }), stop("NYP")] }],
    };
    const [status] = reshapeAmtrakerResponse(response, [48], false);
    expect(status.isTracked).toBe(true);
    expect(status.perStation[0]).toMatchObject({ stationCode: "ALB", estimated: "04:10P" });
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
    // Only 48 is in the tracked list — 448 (the Boston section) is excluded by construction.
    const statuses = reshapeAmtrakerResponse(response, [48], false);
    expect(statuses.map((s) => s.trainNumber)).toEqual([48]);
  });

  it("propagates the stale flag as given", () => {
    const [status] = reshapeAmtrakerResponse({}, [69], true);
    expect(status.stale).toBe(true);
  });
});
