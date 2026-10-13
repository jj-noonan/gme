import type { ScheduleRow, TrainStatus } from "@gme/shared";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RowDoorLegs } from "../hooks/useDoorLegs.js";
import { comparedToUsual, TripDetail } from "./TripDetail.js";

const EMPIRE: ScheduleRow = {
  trainNumber: 284,
  service: "EMPIRE",
  direction: "S",
  daysRaw: "DAILY",
  stationCode: "ALB",
  scheduledDeparture: "13:05",
  scheduledArrival: "15:35",
};

const LEGS: RowDoorLegs = {
  vtDriveMinutes: 109,
  vtDriveTypicalMinutes: 101,
  nycTransitMinutes: 32,
  nycLines: ["A", "C"],
};
const PLACE = { lat: 43.6, lon: -72.97 };

const LATE: TrainStatus = {
  trainNumber: 284,
  isTracked: true,
  stale: false,
  perStation: [
    stop("NFL", "Niagara Falls", "Departed", 5),
    stop("SDY", "Schenectady", "Departed", 12),
    stop("ALB", "Albany-Rensselaer", "Enroute", 12, "2"),
    stop("NYP", "New York Penn", "Enroute", 12),
  ],
};

function stop(code: string, name: string, stopStatus: string, delayMinutes: number, track: string | null = null) {
  return {
    stationCode: code,
    stationName: name,
    scheduledDeparture: null,
    expectedDeparture: null,
    delayMinutes,
    stopStatus,
    track,
  };
}

function renderDetail(props: Partial<Parameters<typeof TripDetail>[0]> = {}) {
  return render(
    <TripDetail
      row={EMPIRE}
      doorLegs={LEGS}
      vtLocation={PLACE}
      nycLocation={PLACE}
      vtLabel="Jones Donuts"
      nycLabel="Bishop Loughlin HS"
      nowMinutes={9 * 60}
      onClose={() => {}}
      {...props}
    />,
  );
}

// Each place on the rail, top to bottom, as "time place".
function stops(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll(".detail-stop")).map((el) =>
    [el.querySelector(".detail-stop__time")?.textContent, el.querySelector(".detail-stop__place")?.textContent].join(" "),
  );
}

afterEach(cleanup);

describe("TripDetail", () => {
  it("walks the trip door to door, with the same times as the board", () => {
    const { container } = renderDetail();
    expect(stops(container)).toEqual([
      "10:56A Jones Donuts",
      "1:05P Albany-Rensselaer, NY (ALB)",
      "3:35P New York Penn (NYP)",
      "4:07P Bishop Loughlin HS",
    ]);
    expect(screen.getByText("Door to door 5H 11M")).toBeTruthy();
  });

  it("spells out the buffer the board leaves unexplained", () => {
    renderDetail();
    expect(screen.getByText("20 min buffer")).toBeTruthy();
    expect(screen.getByText("parking and getting to the platform")).toBeTruthy();
  });

  it("compares the drive to usual", () => {
    renderDetail();
    expect(screen.getByText("Drive 1H 49M")).toBeTruthy();
    expect(screen.getByText("8 min slower than usual")).toBeTruthy();
  });

  it("shows live status, track, and where the train is coming from", () => {
    const { container } = renderDetail({ status: LATE });
    expect(screen.getByText("+12 MIN (ETD 1:17P) · TRACK 2")).toBeTruthy();
    expect(screen.getByText("From Niagara Falls · left Schenectady 12 min late · your stop is next")).toBeTruthy();
    // A late train pushes back everything after it.
    expect(stops(container)[2]).toBe("3:47P New York Penn (NYP)");
  });

  it("names links by what they're for", () => {
    renderDetail();
    const links = screen.getAllByRole("link").map((a) => a.textContent);
    expect(links).toEqual(["Directions ›", "Tickets ›", "Status ›", "Directions ›"]);
  });

  it("on the timetable: the days it runs, and no live status link", () => {
    renderDetail({ nowMinutes: undefined });
    expect(screen.getAllByText("DAILY").length).toBeGreaterThan(0);
    expect(screen.queryByText("Status ›")).toBeNull();
  });

  it("northbound starts in NYC with Penn Station's buffer", () => {
    const { container } = renderDetail({
      row: { ...EMPIRE, direction: "N", scheduledDeparture: "08:15", scheduledArrival: "10:45" },
    });
    expect(stops(container)[0]).toBe("7:33A Bishop Loughlin HS");
    expect(stops(container)[1]).toBe("8:15A New York Penn (NYP)");
    expect(screen.getByText("10 min buffer")).toBeTruthy();
  });

  it("closes on Back and on Escape", () => {
    const onClose = vi.fn();
    renderDetail({ onClose });
    fireEvent.click(screen.getByText("‹ Back"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe("comparedToUsual", () => {
  it("only mentions a real difference", () => {
    expect(comparedToUsual(100, null)).toBeNull();
    expect(comparedToUsual(102, 100)).toBe("about usual");
    expect(comparedToUsual(92, 100)).toBe("8 min faster than usual");
  });
});
