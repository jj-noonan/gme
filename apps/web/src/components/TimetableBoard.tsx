import { nextRunningDay, type Coordinate, type Direction, type ScheduleRow } from "@gme/shared";
import { useMemo } from "react";
import { useDoorLegs } from "../hooks/useDoorLegs.js";
import { computeRowBands } from "../lib/rowBands.js";
import { matchesSearch, searchableTrip, type SearchTerm } from "../lib/search.js";
import { formatTripHash, isTripRow, type TripRoute } from "../lib/tripRoute.js";
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
  query,
  searchTerms,
  onOpenTrip,
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
  /** The search box's text, and what it parsed to; only matching trips show. */
  query: string;
  searchTerms: SearchTerm[];
  onOpenTrip: (route: TripRoute) => void;
  onCloseTrip: () => void;
}) {
  const routeFor = (row: ScheduleRow): TripRoute => ({
    tab: `${direction}_TIMETABLE`,
    trainNumber: row.trainNumber,
    stationCode: row.stationCode,
  });
  const sorted = useMemo(
    () =>
      rows
        .filter((r) => r.direction === direction)
        .sort((a, b) => a.scheduledDeparture.localeCompare(b.scheduledDeparture)),
    [rows, direction],
  );


  // A timetable row has no date, so each door leg is planned for the next
  // day that train runs: typical traffic and that day's subway schedule.
  const today = new Date();
  const doorLegs = useDoorLegs(sorted, vtLocation, nycLocation, (row) =>
    nextRunningDay(row.daysRaw, today),
  );

  const detailRow = sorted.find((r) => isTripRow(openTrip, r));
  const shownRows = sorted.filter((r) => matchesSearch(searchTerms, searchableTrip(r, doorLegs(r), 0)));
  const bands = computeRowBands(shownRows);

  return (
    <div className="board-list">
      <BoardHeader />
      {shownRows.length === 0 && <p className="board-empty">No trips match “{query.trim()}”.</p>}
      {shownRows.map((row, i) => (
        <TrainRow
          key={`${row.trainNumber}-${row.stationCode}-${i}`}
          row={row}
          showDays
          band={bands[i]}
          doorLegs={doorLegs(row)}
          href={formatTripHash(routeFor(row))}
          onOpen={() => onOpenTrip(routeFor(row))}
        />
      ))}
      <GoogleCredit show={shownRows.some((r) => doorLegs(r).nycLines !== null)} />
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
