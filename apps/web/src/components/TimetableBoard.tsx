import type { Direction, ScheduleRow } from "@gme/shared";
import { useMemo } from "react";
import { TrainRow } from "./TrainRow.js";

export function TimetableBoard({ rows, direction }: { rows: ScheduleRow[]; direction: Direction }) {
  const sorted = useMemo(
    () =>
      rows
        .filter((r) => r.direction === direction)
        .sort((a, b) => a.scheduledDeparture.localeCompare(b.scheduledDeparture)),
    [rows, direction],
  );

  return (
    <div className="board-list">
      {sorted.map((row, i) => (
        <TrainRow key={`${row.trainNumber}-${row.stationCode}-${i}`} row={row} showDays />
      ))}
    </div>
  );
}
