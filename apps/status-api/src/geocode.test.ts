import { VT_REGION } from "@gme/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { geocode } from "./geocode.js";

function returning(...bodies: [unknown, number?][]) {
  const fn = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => Response.json({}));
  for (const [body, status = 200] of bodies) {
    fn.mockResolvedValueOnce(Response.json(body, { status }));
  }
  return fn;
}

const GOOGLE_JONES = {
  places: [
    {
      displayName: { text: "Jones Donuts" },
      formattedAddress: "23 West St, Rutland, VT 05701, USA",
      location: { latitude: 43.6089, longitude: -72.9781 },
    },
  ],
};

const MAPBOX_JONES = {
  features: [
    {
      geometry: { coordinates: [-72.9781, 43.6089] },
      properties: { full_address: "23 West Street, Rutland, Vermont 05701, United States" },
    },
  ],
};

function deps(fetchImpl: typeof fetch, keys: { google?: string; mapbox?: string } = {}) {
  return { googleApiKey: keys.google ?? "g", mapboxToken: keys.mapbox ?? "pk.test", fetchImpl };
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("geocode with Google Places", () => {
  it("finds places by name, labelled with name and address", async () => {
    const fetchImpl = returning([GOOGLE_JONES]);
    expect(await geocode("Jones Donuts", VT_REGION, deps(fetchImpl))).toEqual({
      lat: 43.6089,
      lon: -72.9781,
      label: "Jones Donuts, 23 West St, Rutland, VT 05701, USA",
    });
  });

  it("asks for one match restricted to the region, with only the fields used", async () => {
    const fetchImpl = returning([GOOGLE_JONES]);
    await geocode("Jones Donuts", VT_REGION, deps(fetchImpl));
    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Goog-Api-Key"]).toBe("g");
    expect(headers["X-Goog-FieldMask"]).toBe(
      "places.displayName,places.formattedAddress,places.location",
    );
    expect(JSON.parse(String(init.body))).toEqual({
      textQuery: "Jones Donuts",
      pageSize: 1,
      locationRestriction: {
        rectangle: {
          low: { latitude: 42, longitude: -74.6 },
          high: { latitude: 45.1, longitude: -71.4 },
        },
      },
    });
  });

  it("doesn't repeat the name when the match is an address", async () => {
    const fetchImpl = returning([
      {
        places: [
          {
            displayName: { text: "23 West St" },
            formattedAddress: "23 West St, Rutland, VT 05701, USA",
            location: { latitude: 43.6089, longitude: -72.9781 },
          },
        ],
      },
    ]);
    expect((await geocode("23 West St", VT_REGION, deps(fetchImpl)))?.label).toBe(
      "23 West St, Rutland, VT 05701, USA",
    );
  });

  it("is null when nothing matches, or the match is outside the region", async () => {
    expect(await geocode("nowhere", VT_REGION, deps(returning([{}])))).toBeNull();
    const brooklyn = { places: [{ location: { latitude: 40.6871, longitude: -73.9691 } }] };
    expect(await geocode("brooklyn", VT_REGION, deps(returning([brooklyn])))).toBeNull();
  });
});

describe("geocode falling back to Mapbox", () => {
  it("uses Mapbox's address match when Google fails (e.g. the API isn't enabled)", async () => {
    const fetchImpl = returning([{ error: "PERMISSION_DENIED" }, 403], [MAPBOX_JONES]);
    expect(await geocode("23 West St, Rutland", VT_REGION, deps(fetchImpl))).toEqual({
      lat: 43.6089,
      lon: -72.9781,
      label: "23 West Street, Rutland, Vermont 05701, United States",
    });
    const mapboxUrl = new URL(String(fetchImpl.mock.calls[1][0]));
    expect(mapboxUrl.searchParams.get("bbox")).toBe("-74.6,42,-71.4,45.1");
  });

  it("goes straight to Mapbox when there's no Google key", async () => {
    const fetchImpl = returning([MAPBOX_JONES]);
    await geocode("23 West St, Rutland", VT_REGION, deps(fetchImpl, { google: "" }));
    expect(String(fetchImpl.mock.calls[0][0])).toContain("api.mapbox.com");
  });

  it("throws when neither provider can answer, so callers can tell that apart from no match", async () => {
    const fetchImpl = returning([{}, 500], [{}, 500]);
    await expect(geocode("x", VT_REGION, deps(fetchImpl))).rejects.toThrow();
    await expect(geocode("x", VT_REGION, deps(returning(), { google: "", mapbox: "" }))).rejects.toThrow();
  });
});
