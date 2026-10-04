import { describe, expect, it } from "vitest";
import { settingFromText } from "./places.js";

describe("settingFromText", () => {
  it("treats blank or the default's own name as the default", () => {
    expect(settingFromText("vt", "  ")).toEqual({ kind: "default" });
    expect(settingFromText("vt", "jones donuts")).toEqual({ kind: "default" });
    expect(settingFromText("nyc", "Bishop Loughlin HS")).toEqual({ kind: "default" });
  });

  it("treats anything else as an address, trimmed", () => {
    expect(settingFromText("vt", " 23 West St, Rutland ")).toEqual({
      kind: "address",
      text: "23 West St, Rutland",
    });
  });
});
