import {
  matchesDay,
  pickNorthboundRecommendation,
  pickSouthboundRecommendation,
  type Coordinate,
  type Direction,
  type ScheduleRow,
  type TrainStatus,
} from "@gme/shared";
import { useMemo } from "react";
import { useDoorLegs } from "../hooks/useDoorLegs.js";
import { computeRowBands } from "../lib/rowBands.js";
import { formatTripHash, isTripRow, type TripRoute } from "../lib/tripRoute.js";
import { hasDeparted } from "../lib/trainStatus.js";
import { BoardHeader } from "./BoardHeader.js";
import { GoogleCredit } from "./GoogleCredit.js";
import { TrainRow } from "./TrainRow.js";
import { TripDetail } from "./TripDetail.js";

function statusFor(statuses: TrainStatus[], trainNumber: number): TrainStatus | undefined {
  return statuses.find((s) => s.trainNumber === trainNumber);
}

export function TodayBoard({
  rows,
  direction,
  statuses,
  vtLocation,
  nycLocation,
  placeLabels,
  openTrip,
  onOpenTrip,
  onCloseTrip,
}: {
  rows: ScheduleRow[];
  direction: Direction;
  statuses: TrainStatus[];
  vtLocation: Coordinate;
  nycLocation: Coordinate;
  /** What to call the two ends on the detail page. */
  placeLabels: { vt: string; nyc: string };
  /** The trip whose detail page is open, if it's on this board. */
  openTrip: TripRoute | null;
  onOpenTrip: (route: TripRoute) => void;
  onCloseTrip: () => void;
}) {
  const routeFor = (row: ScheduleRow): TripRoute => ({
    tab: `${direction}_TODAY`,
    trainNumber: row.trainNumber,
    stationCode: row.stationCode,
  });
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

  // Every row today, not just the upcoming ones: which rows are still
  // catchable depends on these door legs in the first place.
  const doorLegs = useDoorLegs(todaysRows, vtLocation, nycLocation, () => now);

  const recommended = useMemo(() => {
    if (direction === "N") {
      const rec = pickNorthboundRecommendation(
        todaysRows,
        nowMinutes,
        (r) => doorLegs(r).nycTransitMinutes,
      );
      return rec?.trainNumber ?? null;
    }
    const rec = pickSouthboundRecommendation(
      todaysRows,
      nowMinutes,
      (r) => doorLegs(r).vtDriveMinutes,
    );
    return rec ? { trainNumber: rec.row.trainNumber, stationCode: rec.row.stationCode } : null;
  }, [todaysRows, direction, doorLegs, nowMinutes]);

  // Keep each trip up until its train leaves the station, so one you're
  // already on your way to stays on the board (styled as underway once its
  // leave-by time passes). The Timetable tabs remain the full reference view.
  const upcomingRows = todaysRows.filter(
    (r) =>
      !hasDeparted(r, r.mode === "flight" ? undefined : statusFor(statuses, r.trainNumber), nowMinutes),
  );

  // Found among all of today's rows, so a shared link still opens after the
  // train has gone.
  const detailRow = todaysRows.find((r) => isTripRow(openTrip, r));
  const detail = detailRow && (
    <TripDetail
      row={detailRow}
      status={detailRow.mode === "flight" ? undefined : statusFor(statuses, detailRow.trainNumber)}
      doorLegs={doorLegs(detailRow)}
      vtLocation={vtLocation}
      nycLocation={nycLocation}
      vtLabel={placeLabels.vt}
      nycLabel={placeLabels.nyc}
      nowMinutes={nowMinutes}
      onClose={onCloseTrip}
    />
  );

  if (todaysRows.length === 0) {
    return <p className="board-empty">No trains running today.</p>;
  }

  if (upcomingRows.length === 0) {
    return (
      <>
        <p className="board-empty">No more trains today.</p>
        {detail}
      </>
    );
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
            status={row.mode === "flight" ? undefined : statusFor(statuses, row.trainNumber)}
            highlighted={isRecommended}
            band={bands[i]}
            live
            doorLegs={doorLegs(row)}
            nowMinutes={nowMinutes}
            href={formatTripHash(routeFor(row))}
            onOpen={() => onOpenTrip(routeFor(row))}
          />
        );
      })}
      <GoogleCredit show={upcomingRows.some((r) => doorLegs(r).nycLines !== null)} />
      {detail}
    </div>
  );
}
