import {
  computeLeaveBy,
  matchesDay,
  pickNorthboundRecommendation,
  pickSouthboundRecommendation,
  type Coordinate,
  type Direction,
  type ScheduleRow,
  type TrainStatus,
} from "@gme/shared";
import { useMemo } from "react";
import { computeRowBands } from "../lib/rowBands.js";
import { BoardHeader } from "./BoardHeader.js";
import { TrainRow } from "./TrainRow.js";

function statusFor(statuses: TrainStatus[], trainNumber: number): TrainStatus | undefined {
  return statuses.find((s) => s.trainNumber === trainNumber);
}

export function TodayBoard({
  rows,
  direction,
  statuses,
  userLocation,
}: {
  rows: ScheduleRow[];
  direction: Direction;
  statuses: TrainStatus[];
  userLocation: Coordinate;
}) {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const todaysRows = useMemo(
    () =>
      rows
        .filter((r) => r.direction === direction && matchesDay(r.daysRaw, now))
        .sort((a, b) => a.scheduledDeparture.localeCompare(b.scheduledDeparture)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, direction],
  );

  const recommended = useMemo(() => {
    if (direction === "N") {
      return pickNorthboundRecommendation(todaysRows, nowMinutes)?.trainNumber ?? null;
    }
    const rec = pickSouthboundRecommendation(todaysRows, userLocation, nowMinutes);
    return rec ? { trainNumber: rec.row.trainNumber, stationCode: rec.row.stationCode } : null;
  }, [todaysRows, direction, userLocation, nowMinutes]);

  // Show only trips you could still actually make: a train you can no longer
  // reach in time is no more useful than one that already left. This filters
  // strictly more than "hasn't departed yet" — southbound leads are long
  // (a ~2h drive to Albany), so those drop off well before departure.
  // The Timetable tabs remain the full reference view.
  const upcomingRows = todaysRows.filter(
    (r) => !computeLeaveBy(r, userLocation, nowMinutes).missed,
  );

  if (todaysRows.length === 0) {
    return <p className="board-empty">No trains running today.</p>;
  }

  if (upcomingRows.length === 0) {
    return <p className="board-empty">No more trains today.</p>;
  }

  const bands = computeRowBands(upcomingRows);

  return (
    <div className="board-list">
      <BoardHeader />
      {upcomingRows.map((row, i) => {
        const isRecommended =
          direction === "N"
            ? recommended === row.trainNumber
            : typeof recommended === "object" &&
              recommended !== null &&
              recommended.trainNumber === row.trainNumber &&
              recommended.stationCode === row.stationCode;

        return (
          <TrainRow
            key={`${row.trainNumber}-${row.stationCode}-${i}`}
            row={row}
            status={statusFor(statuses, row.trainNumber)}
            highlighted={isRecommended}
            band={bands[i]}
            showTrack
            userLocation={userLocation}
            nowMinutes={nowMinutes}
          />
        );
      })}
    </div>
  );
}
