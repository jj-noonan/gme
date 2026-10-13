import { nextRunningDay, type Coordinate, type Direction, type ScheduleRow } from "@gme/shared";
import { useMemo } from "react";
import { useDoorLegs } from "../hooks/useDoorLegs.js";
import { computeRowBands } from "../lib/rowBands.js";
import { isTripRow, type TripRoute } from "../lib/tripRoute.js";
import { BoardHeader } from "./BoardHeader.js";
import { GoogleCredit } from "./GoogleCredit.js";
import { TrainRow } from "./TrainRow.js";
import { TripDetail } from "./TripDetail.js";

export function TimetableBoard({
  rows,
  direction,
  vtLocation,
  nycLocation,
  placeLabels,
  openTrip,
  onCloseTrip,
}: {
  rows: ScheduleRow[];
  direction: Direction;
  vtLocation: Coordinate;
  nycLocation: Coordinate;
  /** What to call the two ends on the detail page. */
  placeLabels: { vt: string; nyc: string };
  /** The trip whose detail page is open, if it's on this board. */
  openTrip: TripRoute | null;
  onCloseTrip: () => void;
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

  const detailRow = sorted.find((r) => isTripRow(openTrip, r));

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
          vtLocation={vtLocation}
          nycLocation={nycLocation}
        />
      ))}
      <GoogleCredit show={sorted.some((r) => doorLegs(r).nycLines !== null)} />
      {detailRow && (
        <TripDetail
          row={detailRow}
          doorLegs={doorLegs(detailRow)}
          vtLocation={vtLocation}
          nycLocation={nycLocation}
          vtLabel={placeLabels.vt}
          nycLabel={placeLabels.nyc}
          onClose={onCloseTrip}
        />
      )}
    </div>
  );
}
