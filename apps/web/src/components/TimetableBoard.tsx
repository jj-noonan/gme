import type { Direction, ScheduleRow } from "@gme/shared";
import { useMemo } from "react";
import { computeRowBands } from "../lib/rowBands.js";
import { BoardHeader } from "./BoardHeader.js";
import { TrainRow } from "./TrainRow.js";

export function TimetableBoard({ rows, direction }: { rows: ScheduleRow[]; direction: Direction }) {
  const sorted = useMemo(
    () =>
      rows
        .filter((r) => r.direction === direction)
        .sort((a, b) => a.scheduledDeparture.localeCompare(b.scheduledDeparture)),
    [rows, direction],
  );
  const bands = computeRowBands(sorted);

  return (
    <div className="board-list">
      <BoardHeader />
      {sorted.map((row, i) => (
        <TrainRow key={`${row.trainNumber}-${row.stationCode}-${i}`} row={row} showDays band={bands[i]} />
      ))}
    </div>
  );
}
