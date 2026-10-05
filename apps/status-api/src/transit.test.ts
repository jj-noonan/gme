import type { TransitLeg } from "@gme/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTransitTrips, tripFromRoute } from "./transit.js";

const BISHOP_LOUGHLIN = { lat: 40.687, lon: -73.969 };

// Train leaves NYP 15:15 EDT; arrive by 15:05 EDT = 19:05Z.
const OUT: TransitLeg = { place: BISHOP_LOUGHLIN, toNyp: true, at: "2026-10-05T15:05" };
// Train gets into NYP 16:27 EDT = 20:27Z.
const HOME: TransitLeg = { place: BISHOP_LOUGHLIN, toNyp: false, at: "2026-10-05T16:27" };

function walk(seconds: number) {
  return { travelMode: "WALK", staticDuration: `${seconds}s` };
}

function ride(line: string, departs: string, arrives: string, seconds: number) {
  return {
    travelMode: "TRANSIT",
    staticDuration: `${seconds}s`,
    transitDetails: {
      stopDetails: { departureTime: departs, arrivalTime: arrives },
      transitLine: { nameShort: line, name: `${line} line` },
    },
  };
}

function routeOf(...steps: object[]) {
  return { routes: [{ duration: "1s", legs: [{ steps }] }] };
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("tripFromRoute", () => {
  it("heading out: from leaving the door to the arrive-by time, early arrival included", () => {
    // Walk 5 min, C at 18:30Z, A arrives 18:55Z, walk 3 min → at NYP 18:58Z, 7 min early.
    const body = routeOf(
      walk(300),
      ride("C", "2026-10-05T18:30:00Z", "2026-10-05T18:40:00Z", 600),
      ride("A", "2026-10-05T18:44:00Z", "2026-10-05T18:55:00Z", 660),
      walk(180),
    );
    // Leave 18:25Z; arrive-by 19:05Z → 40 minutes.
    expect(tripFromRoute(OUT, body)).toEqual({ minutes: 40, lines: ["C", "A"] });
  });

  it("heading home: from the train getting in to reaching the door, first wait included", () => {
    // Walk 4 min, wait, C leaves 20:40Z arrives 21:00Z, walk 6 min → home 21:06Z.
    const body = routeOf(walk(240), ride("C", "2026-10-05T20:40:00Z", "2026-10-05T21:00:00Z", 1200), walk(360));
    expect(tripFromRoute(HOME, body)).toEqual({ minutes: 39, lines: ["C"] });
  });

  it("uses the route's duration for a walk-only trip", () => {
    const body = { routes: [{ duration: "1500s", legs: [{ steps: [walk(1500)] }] }] };
    expect(tripFromRoute(OUT, body)).toEqual({ minutes: 25, lines: [] });
  });

  it("falls back to the long line name when there's no short one", () => {
    const step = ride("x", "2026-10-05T20:40:00Z", "2026-10-05T21:00:00Z", 1200);
    step.transitDetails.transitLine = { name: "Q train" } as typeof step.transitDetails.transitLine;
    expect(tripFromRoute(HOME, routeOf(step))?.lines).toEqual(["Q train"]);
  });

  it("is null with no route", () => {
    expect(tripFromRoute(OUT, { routes: [] })).toBeNull();
  });
});

describe("getTransitTrips", () => {
  function googleReturning(body: unknown, status = 200) {
    return vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => Response.json(body, { status }));
  }
  const homeRoute = routeOf(ride("C", "2026-10-05T20:40:00Z", "2026-10-05T21:00:00Z", 1200));

  it("asks Google for a subway/bus trip pinned at the Penn Station end", async () => {
    const fetchImpl = googleReturning(homeRoute);
    await getTransitTrips([OUT, HOME], { apiKey: "test", fetchImpl });

    const [outCall, homeCall] = fetchImpl.mock.calls.map((c) => ({
      init: c[1] as RequestInit,
      body: JSON.parse(String((c[1] as RequestInit).body)),
    }));
    expect((outCall.init.headers as Record<string, string>)["X-Goog-Api-Key"]).toBe("test");
    expect(outCall.body.arrivalTime).toBe("2026-10-05T19:05:00.000Z");
    expect(outCall.body.origin.location.latLng).toEqual({ latitude: 40.687, longitude: -73.969 });
    expect(outCall.body.transitPreferences.allowedTravelModes).toEqual(["SUBWAY", "BUS"]);
    expect(homeCall.body.departureTime).toBe("2026-10-05T20:27:00.000Z");
    expect(homeCall.body.destination.location.latLng).toEqual({ latitude: 40.687, longitude: -73.969 });
  });

  it("answers each leg keyed by its wire form, leaving out failures", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(Response.json(homeRoute))
      .mockResolvedValueOnce(new Response("nope", { status: 500 }));
    const result = await getTransitTrips([HOME, OUT], { apiKey: "test", fetchImpl });
    // C gets in 21:00Z, 33 minutes after the train's 20:27Z arrival.
    expect(result).toEqual({ "NYP>40.687,-73.969@2026-10-05T16:27": { minutes: 33, lines: ["C"] } });
  });

  it("answers nothing, without calling out, when no key is configured", async () => {
    const fetchImpl = googleReturning(homeRoute);
    expect(await getTransitTrips([HOME], { apiKey: "", fetchImpl })).toEqual({});
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
