import {
  boardingStationCode,
  computeLeaveBy,
  minutesBetweenClockTimes,
  type Coordinate,
  type ScheduleRow,
  type StationStatus,
  type TrainStatus,
} from "@gme/shared";
import { formatClock, formatClockFromMinutes, formatDuration, stationName } from "../lib/format.js";
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
  if (delay === null) return stop.stopStatus?.toUpperCase() ?? "SCHEDULED";
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
  /** Alternating band per train number, echoing the original sheet's row banding. */
  band?: boolean;
  userLocation: Coordinate;
  /** Omit on the timetable tabs — nothing is "missed" on a reference schedule. */
  nowMinutes?: number;
}) {
  const durationMinutes = minutesBetweenClockTimes(row.scheduledDeparture, row.scheduledArrival);
  const leaveBy = computeLeaveBy(row, userLocation, nowMinutes ?? -Infinity);
  const track = showTrack ? boardingStop(row, status)?.track : undefined;

  const classes = [
    "board-row",
    highlighted && "board-row--recommended",
    band && "board-row--band",
    leaveBy.missed && "board-row--missed",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <div className="board-row__leave">
        <span className="board-row__minilabel">Leave</span>
        <FlapText text={formatClockFromMinutes(leaveBy.minutes)} width={6} />
      </div>

      <div className="board-row__time">
        <span className="board-row__minilabel">Depart</span>
        <FlapText text={formatClock(row.scheduledDeparture)} width={6} />
        <div className="board-row__arrival">
          {formatClock(row.scheduledArrival)} {"·"} {formatDuration(durationMinutes)}
        </div>
      </div>

      <div className="board-row__main">
        <div className="board-row__train">
          {/* 16 covers the longest service name in the data ("ETHAN ALLEN 291"). */}
          <FlapText text={`${row.service} ${row.trainNumber}`} width={16} />
        </div>
        <div className="board-row__meta">
          <span className="board-row__station">{stationName(row.stationCode)}</span>
          {showDays && <span className="board-row__days">{row.daysRaw}</span>}
        </div>
      </div>

      {showTrack && (
        <div className="board-row__track">
          <span className="board-row__minilabel">Trk</span>
          <FlapText text={track ?? "—"} width={2} />
        </div>
      )}

      <div className="board-row__status">
        {/* 13 covers the longest label ("NO LIVE DATA", "300 MIN LATE"). */}
        <FlapText text={statusLabel(row, status)} width={13} />
      </div>
    </div>
  );
}
