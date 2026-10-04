import {
  arrivalLegMinutes,
  boardingStationCode,
  changeStationCode,
  computeLeaveBy,
  doorArrivalMinutes,
  minutesBetweenClockTimes,
  parseHHMM,
  type Coordinate,
  type ScheduleRow,
  type StationStatus,
  type TrainStatus,
} from "@gme/shared";
import { formatClock, formatClockFromMinutes, formatDuration } from "../lib/format.js";
import type { IconName } from "../lib/icons.js";
import { FlapText } from "./FlapText.js";
import { Icon } from "./Icon.js";

/** The stop where you actually board — NYP northbound, the tracked station southbound. */
function boardingStop(row: ScheduleRow, status: TrainStatus | undefined): StationStatus | undefined {
  return status?.perStation.find((s) => s.stationCode === boardingStationCode(row));
}

function statusIcon(label: string): IconName {
  if (label === "ON TIME") return "on-time";
  if (label === "NO LIVE DATA") return "scheduled";
  if (label.includes("CANCEL")) return "cancelled";
  if (label.includes("LATE")) return "delayed";
  return "scheduled";
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
  const was = formatClock(row.scheduledDeparture);
  return delay > 0 ? `${delay} MIN LATE FROM ${was}` : `${-delay} MIN EARLY FROM ${was}`;
}

/** Minutes the boarding stop is running late (negative = early); 0 with no usable live data. */
function liveDelayMinutes(row: ScheduleRow, status: TrainStatus | undefined): number {
  if (!status || status.stale || !status.isTracked) return 0;
  const delay = boardingStop(row, status)?.delayMinutes;
  return delay != null && Number.isFinite(delay) ? delay : 0;
}

const MINUTES_PER_DAY = 24 * 60;

function wrapMinutes(minutes: number): number {
  return ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
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
  const label = statusLabel(row, status);
  const leaveBy = computeLeaveBy(row, userLocation, nowMinutes ?? -Infinity);
  const trainMinutes = minutesBetweenClockTimes(row.scheduledDeparture, row.scheduledArrival);
  const lastLeg = arrivalLegMinutes(row);

  // Train and door times track the live delay; the leave-by time stays on the
  // schedule, so a late train grows the total rather than moving your alarm.
  const delay = liveDelayMinutes(row, status);
  const trainDeparts = wrapMinutes(parseHHMM(row.scheduledDeparture) + delay);
  const trainArrives = wrapMinutes(parseHHMM(row.scheduledArrival) + delay);
  const doorArrival = wrapMinutes(trainArrives + lastLeg);
  const totalMinutes = leaveBy.leadMinutes + delay + trainMinutes + lastLeg;
  const firstLegIcon: IconName = row.direction === "N" ? "train" : "drive";

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
        {/* Leave the door. */}
        <div className="trip__leg">
          <FlapText text={formatClockFromMinutes(leaveBy.minutes)} />
          <div className="trip__sub">
            <Icon name={firstLegIcon} size={16} />
            {formatDuration(leaveBy.leadMinutes)}
          </div>
        </div>

        {/* The train itself: where it runs, and when it really does. */}
        <div className="trip__leg">
          <div className="trip__route">
            <FlapText text={boardingStationCode(row)} />
            <Icon name="arrow-right" size={20} />
            <FlapText text={changeStationCode(row)} />
          </div>
          <div className="trip__sub">
            {formatClockFromMinutes(trainDeparts)} / {formatClockFromMinutes(trainArrives)}
          </div>
        </div>

        {/* Through the far door, and what the whole trip cost. */}
        <div className="trip__leg">
          <FlapText text={formatClockFromMinutes(doorArrival)} />
          <div className="trip__sub">
            <Icon name="leave-by" size={16} />
            {formatDuration(totalMinutes)}
          </div>
        </div>
      </div>

      <div className="trip__meta">
        <span className="trip__train">
          <FlapText text={`${row.service} ${row.trainNumber}`} />
        </span>
        {showDays && <span className="trip__days">{row.daysRaw}</span>}
        {live && (
          <a className="trip__status" href={`https://amtraker.com/trains/${row.trainNumber}`}>
            <Icon name={statusIcon(label)} size={16} />
            <FlapText text={label} />
          </a>
        )}
      </div>
    </article>
  );
}
