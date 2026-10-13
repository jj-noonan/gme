import type { ScheduleRow } from "@gme/shared";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { RowDoorLegs } from "../hooks/useDoorLegs.js";
import { TrainRow } from "./TrainRow.js";

const ETHAN_ALLEN: ScheduleRow = {
  trainNumber: 290,
  service: "ETHAN ALLEN",
  direction: "S",
  daysRaw: "DAILY",
  stationCode: "RUD",
  scheduledDeparture: "11:06",
  scheduledArrival: "16:27",
};

const LEGS: RowDoorLegs = { vtDriveMinutes: 18, nycTransitMinutes: 32, nycLines: ["A", "C"] };
const PLACE = { lat: 43.6, lon: -72.97 };

// Split-flap text renders one tile per character; read it back as a string.
function text(el: Element): string {
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

afterEach(cleanup);

describe("TrainRow", () => {
  it("shows leave-by, the route, and the door arrival", () => {
    const { container } = render(
      <TrainRow row={ETHAN_ALLEN} doorLegs={LEGS} vtLocation={PLACE} nycLocation={PLACE} />,
    );
    const legs = container.querySelectorAll(".trip__leg");
    // 11:06 − 18 min drive − 20 min buffer.
    expect(text(legs[0])).toContain("10:28A");
    expect(text(legs[1])).toContain("RUD");
    expect(text(legs[1])).toContain("NYP");
    // 16:27 + 32 min subway.
    expect(text(legs[2])).toContain("4:59P");
    // The time under leave-by is the drive alone; the 20-minute buffer isn't in it.
    expect(text(legs[0])).toContain("18M");
    // Door to door still counts the buffer: 18 + 20 + 5h21 train + 32.
    expect(text(legs[2])).toContain("6H 31M");
  });

  it("marks a trip underway once its leave-by time has passed", () => {
    const { container } = render(
      <TrainRow
        row={ETHAN_ALLEN}
        doorLegs={LEGS}
        vtLocation={PLACE}
        nycLocation={PLACE}
        nowMinutes={10 * 60 + 30}
      />,
    );
    expect(container.querySelector(".trip")?.classList.contains("trip--underway")).toBe(true);
  });
});
