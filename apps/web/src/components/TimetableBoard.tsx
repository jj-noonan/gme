import { nextRunningDay, type Coordinate, type Direction, type ScheduleRow } from "@gme/shared";
import { useMemo } from "react";
import { useDoorLegs } from "../hooks/useDoorLegs.js";
import { computeRowBands } from "../lib/rowBands.js";
import { BoardHeader } from "./BoardHeader.js";
import { GoogleCredit } from "./GoogleCredit.js";
import { TrainRow } from "./TrainRow.js";

export function TimetableBoard({
  rows,
  direction,
  vtLocation,
  nycLocation,
}: {
  rows: ScheduleRow[];
  direction: Direction;
  vtLocation: Coordinate;
  nycLocation: Coordinate;
}) {
  const sorted = useMemo(
    () =>
      rows
        .filter((r) => r.direction === direction)
        .sort((a, b) => a.scheduledDeparture.localeCompare(b.scheduledDeparture)),
    [rows, direction],
  );
  const bands = computeRowBands(sorted);

  // A timetable row has no date, so each door leg is planned for the next
  // day that train runs: typical traffic and that day's subway schedule.
  const today = new Date();
  const doorLegs = useDoorLegs(sorted, vtLocation, nycLocation, (row) =>
    nextRunningDay(row.daysRaw, today),
  );

  return (
    <div className="board-list">
      <BoardHeader />
      {sorted.map((row, i) => (
        <TrainRow
          key={`${row.trainNumber}-${row.stationCode}-${i}`}
          row={row}
          showDays
          band={bands[i]}
          doorLegs={doorLegs(row)}
          nycLocation={nycLocation}
        />
      ))}
      <GoogleCredit show={sorted.some((r) => doorLegs(r).nycLines !== null)} />
    </div>
  );
}
