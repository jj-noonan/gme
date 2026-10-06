import { describe, expect, it } from "vitest";
import { classifyRegion, nearerEnd } from "./regions.js";

const PLACES = {
  brooklyn: { lat: 40.6871, lon: -73.9691 },
  hoboken: { lat: 40.744, lon: -74.0324 },
  whitePlains: { lat: 41.034, lon: -73.7629 },
  rutland: { lat: 43.6106, lon: -72.9726 },
  albany: { lat: 42.6526, lon: -73.7562 },
  burlington: { lat: 44.4759, lon: -73.2121 },
  boston: { lat: 42.3601, lon: -71.0589 },
  chicago: { lat: 41.8781, lon: -87.6298 },
  philadelphia: { lat: 39.9526, lon: -75.1652 },
};

describe("classifyRegion", () => {
  it("counts the NYC metro area, not just the boroughs, as NYC", () => {
    expect(classifyRegion(PLACES.brooklyn)).toBe("NYC");
    expect(classifyRegion(PLACES.hoboken)).toBe("NYC");
    expect(classifyRegion(PLACES.whitePlains)).toBe("NYC");
  });

  it("counts anywhere within 100 miles of Rutland as RUTLAND", () => {
    expect(classifyRegion(PLACES.rutland)).toBe("RUTLAND");
    expect(classifyRegion(PLACES.albany)).toBe("RUTLAND");
    expect(classifyRegion(PLACES.burlington)).toBe("RUTLAND");
  });

  it("is AWAY anywhere else", () => {
    expect(classifyRegion(PLACES.boston)).toBe("AWAY");
    expect(classifyRegion(PLACES.chicago)).toBe("AWAY");
    expect(classifyRegion(PLACES.philadelphia)).toBe("AWAY");
  });
});

describe("nearerEnd", () => {
  it("picks whichever end is closer", () => {
    expect(nearerEnd(PLACES.philadelphia)).toBe("NYC");
    expect(nearerEnd(PLACES.boston)).toBe("RUTLAND");
  });
});
