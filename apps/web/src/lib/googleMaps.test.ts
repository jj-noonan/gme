import { describe, expect, it } from "vitest";
import { drivingDirectionsUrl, transitDirectionsUrl } from "./googleMaps.js";

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

describe("drivingDirectionsUrl", () => {
  const jones = { lat: 43.6089, lon: -72.9781 };

  it("drives from the vt-location to the named station heading out", () => {
    const url = new URL(drivingDirectionsUrl(jones, "CNV", true));
    expect(url.searchParams.get("origin")).toBe("43.6089,-72.9781");
    expect(url.searchParams.get("destination")).toBe("Castleton, VT Amtrak station");
    expect(url.searchParams.get("travelmode")).toBe("driving");
  });

  it("drives from the station to the vt-location heading home", () => {
    const url = new URL(drivingDirectionsUrl(jones, "ALB", false));
    expect(url.searchParams.get("origin")).toBe("Albany-Rensselaer, NY Amtrak station");
    expect(url.searchParams.get("destination")).toBe("43.6089,-72.9781");
  });

  it("asks for the airport, not an Amtrak station, for Cape Air", () => {
    const url = new URL(drivingDirectionsUrl(jones, "LEB", true));
    expect(url.searchParams.get("destination")).toBe("Lebanon Municipal Airport, West Lebanon, NH");
  });
});
