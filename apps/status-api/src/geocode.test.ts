import { VT_REGION } from "@gme/shared";
import { describe, expect, it, vi } from "vitest";
import { geocode } from "./geocode.js";

function mapboxReturning(body: unknown, status = 200) {
  return vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
    Response.json(body, { status }),
  );
}

const JONES_FEATURE = {
  geometry: { coordinates: [-72.9781, 43.6089] },
  properties: { full_address: "23 West Street, Rutland, Vermont 05701, United States" },
};

describe("geocode", () => {
  it("returns the top match's coordinate and full address", async () => {
    const fetchImpl = mapboxReturning({ features: [JONES_FEATURE] });
    expect(await geocode("23 West St, Rutland", VT_REGION, { token: "pk.test", fetchImpl })).toEqual({
      lat: 43.6089,
      lon: -72.9781,
      label: "23 West Street, Rutland, Vermont 05701, United States",
    });
  });

  it("asks for one US address match inside the region", async () => {
    const fetchImpl = mapboxReturning({ features: [JONES_FEATURE] });
    await geocode("23 West St, Rutland", VT_REGION, { token: "pk.test", fetchImpl });
    const url = new URL(String(fetchImpl.mock.calls[0][0]));
    expect(url.searchParams.get("q")).toBe("23 West St, Rutland");
    expect(url.searchParams.get("limit")).toBe("1");
    expect(url.searchParams.get("country")).toBe("us");
    expect(url.searchParams.get("bbox")).toBe("-74.6,42,-71.4,45.1");
  });

  it("is null when nothing matches, or the match is outside the region", async () => {
    const deps = (body: unknown) => ({ token: "pk.test", fetchImpl: mapboxReturning(body) });
    expect(await geocode("nowhere", VT_REGION, deps({ features: [] }))).toBeNull();
    const brooklyn = { geometry: { coordinates: [-73.9691, 40.6871] }, properties: {} };
    expect(await geocode("brooklyn", VT_REGION, deps({ features: [brooklyn] }))).toBeNull();
  });

  it("throws when Mapbox fails, so callers can tell that apart from no match", async () => {
    const fetchImpl = mapboxReturning({ message: "nope" }, 500);
    await expect(geocode("x", VT_REGION, { token: "pk.test", fetchImpl })).rejects.toThrow();
  });

  it("throws, without calling out, when no token is configured", async () => {
    const fetchImpl = mapboxReturning({ features: [JONES_FEATURE] });
    await expect(geocode("x", VT_REGION, { token: "", fetchImpl })).rejects.toThrow();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
