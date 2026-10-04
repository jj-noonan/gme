import { nextRunningDay, type Coordinate, type Direction, type ScheduleRow } from "@gme/shared";
import { useMemo } from "react";
import { useVtDriveMinutes } from "../hooks/useVtDriveMinutes.js";
import { computeRowBands } from "../lib/rowBands.js";
import { BoardHeader } from "./BoardHeader.js";
import { TrainRow } from "./TrainRow.js";

export function TimetableBoard({
  rows,
  direction,
  vtLocation,
}: {
  rows: ScheduleRow[];
  direction: Direction;
  vtLocation: Coordinate;
}) {
  const sorted = useMemo(
    () =>
      rows
        .filter((r) => r.direction === direction)
        .sort((a, b) => a.scheduledDeparture.localeCompare(b.scheduledDeparture)),
    [rows, direction],
  );
  const bands = computeRowBands(sorted);

  // A timetable row has no date, so each drive is priced for the next day
  // that train runs: typical traffic for that weekday and time.
  const today = new Date();
  const vtDriveMinutes = useVtDriveMinutes(sorted, vtLocation, (row) =>
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
          vtDriveMinutes={vtDriveMinutes(row)}
        />
      ))}
    </div>
  );
}
