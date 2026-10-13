// @vitest-environment jsdom
import type { ScheduleRow } from "@gme/shared";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

const LEGS: RowDoorLegs = {
  vtDriveMinutes: 18,
  vtDriveTypicalMinutes: null,
  nycTransitMinutes: 32,
  nycLines: ["A", "C"],
};

// Split-flap text renders one tile per character; read it back as a string.
function text(el: Element): string {
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

afterEach(cleanup);

describe("TrainRow", () => {
  it("shows leave-by, the route, and the door arrival", () => {
    const { container } = render(
      <TrainRow row={ETHAN_ALLEN} doorLegs={LEGS} href="#/trip" onOpen={() => {}} />,
    );
    const legs = container.querySelectorAll(".trip__leg");
    // 11:06 − 18 min drive − 20 min buffer.
    expect(text(legs[0])).toContain("10:28A");
    expect(text(legs[1])).toContain("RUD");
    expect(text(legs[1])).toContain("NYP");
    // 16:27 + 10 min transfer + 32 min subway.
    expect(text(legs[2])).toContain("5:09P");
    // The time under leave-by is the drive alone; the 20-minute buffer isn't in it.
    expect(text(legs[0])).toContain("18M");
    // Door to door still counts both buffers: 18 + 20 + 5h21 train + 10 + 32.
    expect(text(legs[2])).toContain("6H 41M");
  });

  it("marks a trip underway once its leave-by time has passed", () => {
    const { container } = render(
      <TrainRow
        row={ETHAN_ALLEN}
        doorLegs={LEGS}
        href="#/trip"
        onOpen={() => {}}
        nowMinutes={10 * 60 + 30}
      />,
    );
    expect(container.querySelector(".trip")?.classList.contains("trip--underway")).toBe(true);
  });

  it("the whole row opens its detail page, and has no links of its own", () => {
    const onOpen = vi.fn();
    const { container } = render(
      <TrainRow row={ETHAN_ALLEN} doorLegs={LEGS} href="#/trip/S_TODAY/290-RUD" onOpen={onOpen} />,
    );
    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe("#/trip/S_TODAY/290-RUD");
    fireEvent.click(container.querySelector(".trip__legs")!);
    expect(onOpen).toHaveBeenCalledOnce();
  });
});
