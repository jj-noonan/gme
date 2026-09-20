import {
  boardingStationCode,
  computeLeaveBy,
  minutesBetweenClockTimes,
  type Coordinate,
  type ScheduleRow,
  type StationStatus,
  type TrainStatus,
} from "@gme/shared";
import { formatClock, formatClockFromMinutes, formatDuration } from "../lib/format.js";
import { FlapText } from "./FlapText.js";

/** The stop where you actually board — NYP northbound, the tracked station southbound. */
function boardingStop(row: ScheduleRow, status: TrainStatus | undefined): StationStatus | undefined {
  return status?.perStation.find((s) => s.stationCode === boardingStationCode(row));
}

function statusLabel(row: ScheduleRow, status: TrainStatus | undefined): string {
  if (!status) return "SCHEDULED";
  if (status.stale) return "NO LIVE DATA";
  if (!status.isTracked) return "SCHEDULED";

  const stop = boardingStop(row, status);
  if (!stop) return "SCHEDULED";
  if (stop.stopStatus === "Departed") return "DEPARTED";

  const delay = stop.delayMinutes;
  // `== null` (not `=== null`) and the NaN guard both matter: if the API ever
  // drifts out of shape again, this must degrade to "SCHEDULED" rather than
  // rendering "NAN MIN EARLY" on the board.
  if (delay == null || !Number.isFinite(delay)) {
    return stop.stopStatus?.toUpperCase() ?? "SCHEDULED";
  }
  if (Math.abs(delay) <= 2) return "ON TIME";
  return delay > 0 ? `${delay} MIN LATE` : `${-delay} MIN EARLY`;
}

export function TrainRow({
  row,
  status,
  highlighted,
  showDays,
  showTrack,
  band,
  userLocation,
  nowMinutes,
}: {
  row: ScheduleRow;
  status?: TrainStatus;
  highlighted?: boolean;
  showDays?: boolean;
  /** Track only exists on live data, so it's a Today-tab concern. */
  showTrack?: boolean;
  band?: boolean;
  userLocation: Coordinate;
  /** Omit on the timetable tabs — nothing is "missed" on a reference schedule. */
  nowMinutes?: number;
}) {
  const leaveBy = computeLeaveBy(row, userLocation, nowMinutes ?? -Infinity);
  const trainMinutes = minutesBetweenClockTimes(row.scheduledDeparture, row.scheduledArrival);
  const stop = showTrack ? boardingStop(row, status) : undefined;

  const boardCode = boardingStationCode(row);
  const arriveCode = row.direction === "N" ? row.stationCode : "NYP";
  const approach = row.direction === "N" ? "Subway" : "Drive";

  const classes = [
    "trip",
    highlighted && "trip--recommended",
    band && "trip--band",
    leaveBy.missed && "trip--missed",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classes}>
      <div className="trip__legs">
        <div className="trip__leg">
          <FlapText text={formatClockFromMinutes(leaveBy.minutes)} />
          <div className="trip__sub">
            {approach} {formatDuration(leaveBy.leadMinutes)}
          </div>
        </div>

        <div className="trip__leg">
          <FlapText text={boardCode} />
          <div className="trip__sub">Board {formatClock(row.scheduledDeparture)}</div>
        </div>

        <div className="trip__leg">
          <FlapText text={formatClock(row.scheduledArrival)} />
          <div className="trip__sub">
            {arriveCode} {"·"} {formatDuration(trainMinutes)}
          </div>
        </div>
      </div>

      <div className="trip__meta">
        <span className="trip__train">
          <FlapText text={`${row.service} ${row.trainNumber}`} />
        </span>
        {showTrack && (
          <span className="trip__track">
            <span className="trip__label">Trk</span>
            <FlapText text={stop?.track ?? "—"} width={2} />
          </span>
        )}
        {showDays && <span className="trip__days">{row.daysRaw}</span>}
        {/* Status is a live-data concern, same as track. On the timetable it
            would be a constant "SCHEDULED" on every row. */}
        {showTrack && (
          <span className="trip__status">
            <FlapText text={statusLabel(row, status)} />
          </span>
        )}
      </div>
    </article>
  );
}
