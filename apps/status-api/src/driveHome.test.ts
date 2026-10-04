import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearDriveHomeCache, easternNowLocal, getDriveHomeMinutes } from "./driveHome.js";

// 2026-10-05 12:00 Eastern (EDT, UTC-4).
const NOON_EASTERN = new Date("2026-10-05T16:00:00Z");

function mapboxReturning(seconds: number) {
  return vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => Response.json({ code: "Ok", routes: [{ duration: seconds }] }));
}

function deps(fetchImpl: typeof fetch, token = "pk.test") {
  return { token, fetchImpl, now: () => NOON_EASTERN };
}

beforeEach(() => {
  clearDriveHomeCache();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("easternNowLocal", () => {
  it("formats the Eastern wall clock, not UTC", () => {
    expect(easternNowLocal(NOON_EASTERN)).toBe("2026-10-05T12:00");
  });
});

describe("getDriveHomeMinutes", () => {
  it("answers each leg in minutes, keyed by the leg as requested", async () => {
    const fetchImpl = mapboxReturning(5400);
    const result = await getDriveHomeMinutes(
      [{ stationCode: "ALB", departAt: "2026-10-05T18:07" }],
      deps(fetchImpl),
    );
    expect(result).toEqual({ "ALB@2026-10-05T18:07": 90 });
  });

  it("asks Mapbox for traffic at the slotted future arrival time", async () => {
    const fetchImpl = mapboxReturning(600);
    await getDriveHomeMinutes([{ stationCode: "ALB", departAt: "2026-10-05T18:07" }], deps(fetchImpl));
    const url = new URL(String(fetchImpl.mock.calls[0][0]));
    expect(url.pathname).toContain("/driving-traffic/-73.7423,42.6339;-72.9781,43.6089");
    expect(url.searchParams.get("depart_at")).toBe("2026-10-05T18:00");
  });

  it("uses live traffic (no depart_at) once the slot has started", async () => {
    const fetchImpl = mapboxReturning(600);
    await getDriveHomeMinutes([{ stationCode: "RUD", departAt: "2026-10-05T11:50" }], deps(fetchImpl));
    const url = new URL(String(fetchImpl.mock.calls[0][0]));
    expect(url.searchParams.has("depart_at")).toBe(false);
  });

  it("shares one call between legs in the same slot, and caches it", async () => {
    const fetchImpl = mapboxReturning(600);
    const legs = [
      { stationCode: "FED" as const, departAt: "2026-10-05T17:31" },
      { stationCode: "FED" as const, departAt: "2026-10-05T17:44" },
    ];
    const result = await getDriveHomeMinutes(legs, deps(fetchImpl));
    await getDriveHomeMinutes(legs, deps(fetchImpl));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(Object.keys(result)).toHaveLength(2);
  });

  it("leaves out legs Mapbox can't answer", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 500 }));
    const result = await getDriveHomeMinutes(
      [{ stationCode: "ALB", departAt: "2026-10-05T18:00" }],
      deps(fetchImpl),
    );
    expect(result).toEqual({});
  });

  it("answers nothing, without calling out, when no token is configured", async () => {
    const fetchImpl = mapboxReturning(600);
    const result = await getDriveHomeMinutes(
      [{ stationCode: "ALB", departAt: "2026-10-05T18:00" }],
      deps(fetchImpl, ""),
    );
    expect(result).toEqual({});
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
