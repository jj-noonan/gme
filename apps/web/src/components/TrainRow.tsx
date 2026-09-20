import {
  arrivalLegMinutes,
  boardingStationCode,
  changeStationCode,
  computeLeaveBy,
  doorArrivalMinutes,
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
  // `== null` (not `=== null`) and the finite check both matter: if the API
  // ever drifts out of shape again, this must degrade to "SCHEDULED" rather
  // than rendering "NAN MIN EARLY" on the board.
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
  live,
  band,
  userLocation,
  nowMinutes,
}: {
  row: ScheduleRow;
  status?: TrainStatus;
  highlighted?: boolean;
  showDays?: boolean;
  /** Today tabs only — the timetable is a static reference with no live data. */
  live?: boolean;
  band?: boolean;
  userLocation: Coordinate;
  /** Omit on the timetable tabs — nothing is "missed" on a reference schedule. */
  nowMinutes?: number;
}) {
  const leaveBy = computeLeaveBy(row, userLocation, nowMinutes ?? -Infinity);
  const trainMinutes = minutesBetweenClockTimes(row.scheduledDeparture, row.scheduledArrival);
  const lastLeg = arrivalLegMinutes(row);
  const doorArrival = doorArrivalMinutes(row, lastLeg);

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
        {/* Leave the door; catch this train at this station. */}
        <div className="trip__leg">
          <FlapText text={formatClockFromMinutes(leaveBy.minutes)} />
          <div className="trip__sub">
            {boardingStationCode(row)} {formatClock(row.scheduledDeparture)}
          </div>
        </div>

        {/* Get off the train here, and what the ride cost you. */}
        <div className="trip__leg">
          <FlapText text={changeStationCode(row)} />
          <div className="trip__sub">
            {formatClock(row.scheduledArrival)} {"·"} {formatDuration(trainMinutes)}
          </div>
        </div>

        {/* Through the far door, and what the last leg cost. */}
        <div className="trip__leg">
          <FlapText text={formatClockFromMinutes(doorArrival)} />
          <div className="trip__sub">+{formatDuration(lastLeg)}</div>
        </div>
      </div>

      <div className="trip__meta">
        <span className="trip__train">
          <FlapText text={`${row.service} ${row.trainNumber}`} />
        </span>
        {showDays && <span className="trip__days">{row.daysRaw}</span>}
        {live && (
          <span className="trip__status">
            <FlapText text={statusLabel(row, status)} />
          </span>
        )}
      </div>
    </article>
  );
}
