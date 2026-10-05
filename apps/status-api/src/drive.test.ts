import type { DriveLeg } from "@gme/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearDriveCache, getDriveMinutes } from "./drive.js";

// 2026-10-05 12:00 Eastern (EDT, UTC-4).
const NOON_EASTERN = new Date("2026-10-05T16:00:00Z");

const JONES = { lat: 43.609, lon: -72.978 };

function mapboxReturning(seconds: number) {
  return vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
    Response.json({ code: "Ok", routes: [{ duration: seconds }] }),
  );
}

function deps(fetchImpl: typeof fetch, token = "pk.test") {
  return { token, fetchImpl, now: () => NOON_EASTERN };
}

function leg(overrides: Partial<DriveLeg> = {}): DriveLeg {
  return { stationCode: "ALB", place: JONES, toStation: false, departAt: "2026-10-05T18:07", ...overrides };
}

function requestedUrl(fetchImpl: ReturnType<typeof mapboxReturning>): URL {
  return new URL(String(fetchImpl.mock.calls[0][0]));
}

beforeEach(() => {
  clearDriveCache();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("getDriveMinutes", () => {
  it("answers each leg in minutes, keyed by the leg as requested", async () => {
    const result = await getDriveMinutes([leg()], deps(mapboxReturning(5400)));
    expect(result).toEqual({ "ALB>43.609,-72.978@2026-10-05T18:07": 90 });
  });

  it("routes station → place heading home, at the slotted future time", async () => {
    const fetchImpl = mapboxReturning(600);
    await getDriveMinutes([leg()], deps(fetchImpl));
    const url = requestedUrl(fetchImpl);
    expect(url.pathname).toContain("/driving-traffic/-73.7423,42.6339;-72.978,43.609");
    expect(url.searchParams.get("depart_at")).toBe("2026-10-05T18:00");
  });

  it("routes place → station heading out", async () => {
    const fetchImpl = mapboxReturning(600);
    await getDriveMinutes([leg({ toStation: true })], deps(fetchImpl));
    expect(requestedUrl(fetchImpl).pathname).toContain("/-72.978,43.609;-73.7423,42.6339");
  });

  it("uses live traffic (no depart_at) once the slot has started", async () => {
    const fetchImpl = mapboxReturning(600);
    await getDriveMinutes([leg({ departAt: "2026-10-05T11:50" })], deps(fetchImpl));
    expect(requestedUrl(fetchImpl).searchParams.has("depart_at")).toBe(false);
  });

  it("shares one call between legs in the same slot, and caches it", async () => {
    const fetchImpl = mapboxReturning(600);
    const legs = [leg({ departAt: "2026-10-05T17:31" }), leg({ departAt: "2026-10-05T17:44" })];
    const result = await getDriveMinutes(legs, deps(fetchImpl));
    await getDriveMinutes(legs, deps(fetchImpl));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(Object.keys(result)).toHaveLength(2);
  });

  it("doesn't share a call between the two directions", async () => {
    const fetchImpl = mapboxReturning(600);
    await getDriveMinutes([leg(), leg({ toStation: true })], deps(fetchImpl));
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("leaves out legs Mapbox can't answer", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 500 }));
    expect(await getDriveMinutes([leg()], deps(fetchImpl))).toEqual({});
  });

  it("answers nothing, without calling out, when no token is configured", async () => {
    const fetchImpl = mapboxReturning(600);
    expect(await getDriveMinutes([leg()], deps(fetchImpl, ""))).toEqual({});
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("drive cache lifetime", () => {
  afterEach(() => vi.useRealTimers());

  async function callsAfter(departAt: string, elapsedMs: number): Promise<number> {
    vi.useFakeTimers({ now: NOON_EASTERN });
    const fetchImpl = mapboxReturning(600);
    await getDriveMinutes([leg({ departAt })], deps(fetchImpl));
    vi.setSystemTime(NOON_EASTERN.getTime() + elapsedMs);
    await getDriveMinutes([leg({ departAt })], deps(fetchImpl));
    return fetchImpl.mock.calls.length;
  }

  it("refreshes a near-term slot after 10 minutes, for live traffic", async () => {
    expect(await callsAfter("2026-10-05T13:00", 11 * 60_000)).toBe(2);
  });

  it("keeps a slot hours ahead for much longer", async () => {
    expect(await callsAfter("2026-10-05T18:00", 3 * 60 * 60_000)).toBe(1);
  });
});
