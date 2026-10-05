import { describe, expect, it } from "vitest";
import { subwayLine } from "./subwayLines.js";

describe("subwayLine", () => {
  it("reduces Google's line names to the route letter or number", () => {
    expect(subwayLine("C Line")).toBe("C");
    expect(subwayLine("7 line")).toBe("7");
    expect(subwayLine("g")).toBe("G");
  });

  it("is null for anything that isn't a subway route", () => {
    expect(subwayLine("B25")).toBeNull();
    expect(subwayLine("PATH")).toBeNull();
    expect(subwayLine("WALK")).toBeNull();
  });
});
