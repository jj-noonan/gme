import { describe, expect, it } from "vitest";
import { transitDirectionsUrl } from "./googleMaps.js";

describe("transitDirectionsUrl", () => {
  const place = { lat: 40.6871, lon: -73.9691 };

  it("plans from the nyc-location to Penn Station heading out", () => {
    const url = new URL(transitDirectionsUrl(place, true));
    expect(url.origin + url.pathname).toBe("https://www.google.com/maps/dir/");
    expect(url.searchParams.get("origin")).toBe("40.6871,-73.9691");
    expect(url.searchParams.get("destination")).toBe("New York Penn Station");
    expect(url.searchParams.get("travelmode")).toBe("transit");
  });

  it("plans from Penn Station to the nyc-location heading home", () => {
    const url = new URL(transitDirectionsUrl(place, false));
    expect(url.searchParams.get("origin")).toBe("New York Penn Station");
    expect(url.searchParams.get("destination")).toBe("40.6871,-73.9691");
  });
});
