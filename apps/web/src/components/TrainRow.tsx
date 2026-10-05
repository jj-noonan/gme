import {
  arrivalLegMinutes,
  boardingStationCode,
  changeStationCode,
  computeLeaveBy,
  minutesBetweenClockTimes,
  parseHHMM,
  type Coordinate,
  type ScheduleRow,
  type TrainStatus,
} from "@gme/shared";
import type { RowDoorLegs } from "../hooks/useDoorLegs.js";
import { formatClock, formatClockFromMinutes, formatDuration } from "../lib/format.js";
import { abbreviateService, describeStatus, liveDelayMinutes } from "../lib/trainStatus.js";
import { DriveLink } from "./DriveLink.js";
import { FlapText } from "./FlapText.js";
import { Icon } from "./Icon.js";
import { TransitLink } from "./TransitLink.js";

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
  doorLegs,
  vtLocation,
  nycLocation,
  nowMinutes,
}: {
  row: ScheduleRow;
  status?: TrainStatus;
  highlighted?: boolean;
  showDays?: boolean;
  /** Today tabs only — the timetable is a static reference with no live data. */
  live?: boolean;
  band?: boolean;
  /** The row's door-side legs: the VT drive and the NYC transit trip. */
  doorLegs: RowDoorLegs;
  /** For the drive's and the badges' Google Maps links. */
  vtLocation: Coordinate;
  nycLocation: Coordinate;
  /** Omit on the timetable tabs — nothing is "missed" on a reference schedule. */
  nowMinutes?: number;
}) {
  const statusText = describeStatus(row, status);
  const leaveBy = computeLeaveBy(row, doorLegs, nowMinutes ?? -Infinity);
  const trainMinutes = minutesBetweenClockTimes(row.scheduledDeparture, row.scheduledArrival);
  const lastLeg = arrivalLegMinutes(row, doorLegs);

  // The door arrival tracks the live delay; the leave-by time and the train's
  // own times stay on the schedule (the status carries the live estimate), so
  // a late train grows the total rather than moving your alarm.
  const delay = liveDelayMinutes(row, status);
  const doorArrival = wrapMinutes(parseHHMM(row.scheduledArrival) + delay + lastLeg);
  const totalMinutes = leaveBy.leadMinutes + delay + trainMinutes + lastLeg;

  // The NYC leg is where you start northbound and where you finish southbound;
  // the VT drive is the other end.
  const northbound = row.direction === "N";
  // Each leg — its icon or badges and its duration — links to that leg in Google Maps.
  const nycLeg = (minutes: number) => (
    <TransitLink lines={doorLegs.nycLines} nycLocation={nycLocation} toNyp={northbound}>
      {formatDuration(minutes)}
    </TransitLink>
  );
  const vtLeg = (minutes: number) => (
    <DriveLink vtLocation={vtLocation} stationCode={row.stationCode} toStation={!northbound}>
      {formatDuration(minutes)}
    </DriveLink>
  );

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
        {/* Leave the door, and how long it takes to get to the train. */}
        <div className="trip__leg">
          <FlapText text={formatClockFromMinutes(leaveBy.minutes)} />
          <div className="trip__sub">
            {northbound ? nycLeg(leaveBy.leadMinutes) : vtLeg(leaveBy.leadMinutes)}
          </div>
        </div>

        {/* The train itself, and how long from getting off it to the far door. */}
        <div className="trip__leg">
          <div className="trip__route">
            <FlapText text={boardingStationCode(row)} />
            <Icon name="arrow-right" size={20} />
            <FlapText text={changeStationCode(row)} />
          </div>
          <div className="trip__sub">{northbound ? vtLeg(lastLeg) : nycLeg(lastLeg)}</div>
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
          <span className="only-wide">
            <FlapText text={`${row.service} ${row.trainNumber}`} />
          </span>
          <span className="only-narrow">
            <FlapText text={`${abbreviateService(row.service)} ${row.trainNumber}`} />
          </span>
        </span>
        <span className="trip__times">
          {formatClock(row.scheduledDeparture)} / {formatClock(row.scheduledArrival)}
        </span>
        {showDays && <span className="trip__days">{row.daysRaw}</span>}
        {live && (
          <a
            className="trip__status"
            href={`https://amtraker.com/trains/${row.trainNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            data-link-out={`live status for train ${row.trainNumber} on Amtraker`}
          >
            <Icon name={statusText.icon} size={16} />
            <span className="only-wide">
              <FlapText text={statusText.full} />
            </span>
            <span className="only-narrow">
              <FlapText text={statusText.short} />
            </span>
          </a>
        )}
      </div>
    </article>
  );
}
