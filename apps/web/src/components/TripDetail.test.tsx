import type { ScheduleRow, TrainStatus } from "@gme/shared";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RowDoorLegs } from "../hooks/useDoorLegs.js";
import { comparedToUsual, dayOffsets, TripDetail } from "./TripDetail.js";

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
      "4:17P Bishop Loughlin HS",
    ]);
    expect(screen.getByText("Door to door 5H 21M")).toBeTruthy();
  });

  it("spells out the buffers the board leaves unexplained", () => {
    renderDetail();
    expect(screen.getByText("20 min to park and get to the platform (buffer)")).toBeTruthy();
    expect(screen.getByText("10 min off the train to the subway (buffer)")).toBeTruthy();
  });

  it("compares the drive to usual", () => {
    renderDetail();
    expect(screen.getByText("Drive 1H 49M")).toBeTruthy();
    const usual = screen.getByText("8 min slower than usual");
    expect(usual.querySelector(".traffic-dot--slower")).toBeTruthy();
  });

  it("shows live status, track, and where the train is coming from", () => {
    const { container } = renderDetail({ status: LATE });
    const statusLine = screen.getByText("+12 MIN (ETD 1:17P) · TRACK 2");
    // With its status icon in front, and the Status link at the end of the same line.
    expect(statusLine.querySelector("svg")).toBeTruthy();
    expect(statusLine.parentElement?.textContent).toContain("Status ›");
    expect(screen.getByText("From Niagara Falls · left Schenectady 12 min late · your stop is next")).toBeTruthy();
    // A late train pushes back everything after it.
    expect(stops(container)[2]).toBe("3:47P New York Penn (NYP)");
  });

  it("names links by what they're for", () => {
    renderDetail();
    const links = screen.getAllByRole("link").map((a) => a.textContent);
    // The train's name is the tickets link.
    expect(links).toEqual(["Directions ›", "EMPIRE 284", "Status ›", "Directions ›"]);
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
    // Penn Station's buffer going in, and the transfer to the car getting out.
    expect(screen.getByText("10 min to get to the platform (buffer)")).toBeTruthy();
    expect(screen.getByText("10 min off the train to the car (buffer)")).toBeTruthy();
  });

  it("says nothing about where the train comes from when you board where it starts", () => {
    const fromHere: TrainStatus = { ...LATE, perStation: LATE.perStation.slice(2) };
    renderDetail({ status: fromHere });
    expect(screen.queryByText(/Starts|From /)).toBeNull();
  });

  it("marks each stop with its place: Vermont, the stations, New York", () => {
    const { container } = renderDetail();
    const markers = Array.from(container.querySelectorAll(".detail-stop__marker svg path"));
    expect(markers.length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".detail-stop__marker")).toHaveLength(4);
  });

  it("draws a divider where the trip crosses midnight", () => {
    // Empire 245: leave 10:25p, train 11:25p, into Albany 1:56a.
    const late = { ...EMPIRE, direction: "N" as const, scheduledDeparture: "23:25", scheduledArrival: "01:56" };
    const { container } = renderDetail({ row: late, nowMinutes: undefined });
    const items = Array.from(container.querySelectorAll(".detail-timeline > li")).map((li) => li.className);
    const divider = items.indexOf("detail-day");
    expect(container.querySelector(".detail-day")?.textContent).toBe("Next day");
    // Between the train and the stop it gets into.
    expect(items[divider - 1]).toBe("detail-segment");
    expect(items[divider + 1]).toBe("detail-stop");
    expect(container.querySelectorAll(".detail-day")).toHaveLength(1);
  });

  it("no divider for a trip within one day", () => {
    const { container } = renderDetail();
    expect(container.querySelector(".detail-day")).toBeNull();
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
    expect(comparedToUsual(102, 100)).toEqual({ text: "about usual", tone: "usual" });
    expect(comparedToUsual(92, 100)).toEqual({ text: "8 min faster than usual", tone: "faster" });
    expect(comparedToUsual(108, 100)).toEqual({ text: "8 min slower than usual", tone: "slower" });
  });
});

describe("dayOffsets", () => {
  it("counts a day each time the clock goes backwards", () => {
    expect(dayOffsets([600, 785, 935, 967])).toEqual([0, 0, 0, 0]);
    expect(dayOffsets([1345, 1405, 116, 226])).toEqual([0, 0, 1, 1]);
    expect(dayOffsets([1410, 30, 200, 260])).toEqual([0, 1, 1, 1]);
  });
});
