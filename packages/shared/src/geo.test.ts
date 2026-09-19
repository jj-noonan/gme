import { describe, expect, it } from "vitest";
import {
  classifyRegion,
  estimateDriveMinutes,
  haversineMiles,
  pickRecommendedStop,
} from "./geo.js";
import type { Station } from "./types.js";

const RUD: Station = { code: "RUD", name: "Rutland, VT", lat: 43.6106, lon: -72.9726 };
const CNV: Station = { code: "CNV", name: "Castleton, VT", lat: 43.6009, lon: -73.1731 };
const NYP = { lat: 40.7506, lon: -73.9935 };

describe("haversineMiles", () => {
  it("is zero for the same point", () => {
    expect(haversineMiles(RUD, RUD)).toBeCloseTo(0, 5);
  });

  it("matches a known rough distance (Rutland to Castleton, ~10mi as the crow flies)", () => {
    const miles = haversineMiles(RUD, CNV);
    expect(miles).toBeGreaterThan(5);
    expect(miles).toBeLessThan(15);
  });
});

describe("estimateDriveMinutes", () => {
  it("scales linearly with distance at a fixed speed", () => {
    expect(estimateDriveMinutes(42, 42)).toBeCloseTo(60, 5);
    expect(estimateDriveMinutes(21, 42)).toBeCloseTo(30, 5);
  });
});

describe("pickRecommendedStop", () => {
  const stations = [RUD, CNV];

  it("picks the station near the user even if its train leg is slower, when it wins on total time", () => {
    // User standing right at Castleton: near-zero drive to CNV, but a real drive to RUD.
    const result = pickRecommendedStop(CNV, stations, [
      { station: "RUD", trainMinutes: 300 },
      { station: "CNV", trainMinutes: 310 },
    ]);
    expect(result?.station).toBe("CNV");
  });

  it("picks the faster overall trip when the user is roughly equidistant", () => {
    const midpoint = { lat: (RUD.lat + CNV.lat) / 2, lon: (RUD.lon + CNV.lon) / 2 };
    const result = pickRecommendedStop(midpoint, stations, [
      { station: "RUD", trainMinutes: 300 },
      { station: "CNV", trainMinutes: 340 },
    ]);
    expect(result?.station).toBe("RUD");
  });

  it("returns null when no candidate matches a known station", () => {
    const result = pickRecommendedStop(RUD, stations, [{ station: "BRA", trainMinutes: 100 }]);
    expect(result).toBeNull();
  });
});

describe("classifyRegion", () => {
  it("classifies a point near NYP as NYC", () => {
    expect(classifyRegion(NYP, NYP, RUD)).toBe("NYC");
  });

  it("classifies a point near the Rutland cluster as RUTLAND", () => {
    expect(classifyRegion(RUD, NYP, RUD)).toBe("RUTLAND");
  });
});
