import {
  boardingStationCode,
  changeStationCode,
  tripTimeline,
  type Coordinate,
  type ScheduleRow,
  type TrainStatus,
} from "@gme/shared";
import type { RowDoorLegs } from "../hooks/useDoorLegs.js";
import { formatClock, formatClockFromMinutes, formatDuration } from "../lib/format.js";
import { statusLink, ticketsLink } from "../lib/links.js";
import { abbreviateService, describeStatus, liveDelayMinutes } from "../lib/trainStatus.js";
import { DriveLink } from "./DriveLink.js";
import { FlapText } from "./FlapText.js";
import { Icon } from "./Icon.js";
import { TransitLink } from "./TransitLink.js";

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
  /** Omit on the timetable tabs — nothing is underway on a reference schedule. */
  nowMinutes?: number;
}) {
  const statusText = describeStatus(row, status);
  const trip = tripTimeline(row, doorLegs, liveDelayMinutes(row, status), nowMinutes ?? -Infinity);

  // The NYC leg is where you start northbound and where you finish southbound;
  // the VT drive is the other end.
  const northbound = row.direction === "N";
  const flight = row.mode === "flight";
  // Cape Air sells its Penn Station shuttle as "ZYP"; show that on flight
  // rows (the subway leg still runs to Penn Station either way).
  const routeCode = (code: string) => (flight && code === "NYP" ? "ZYP" : code);
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

  const tickets = ticketsLink(row);
  const statusPage = statusLink(row);

  const classes = [
    "trip",
    highlighted && "trip--recommended",
    band && "trip--band",
    // Past its leave-by time but the train hasn't left: you're on your way (or late).
    trip.underway && "trip--underway",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classes}>
      <div className="trip__legs">
        {/* Leave the door, and how long it takes to get to the train. The
            station buffer is the unexplained gap; the detail page spells it out. */}
        <div className="trip__leg">
          <FlapText text={formatClockFromMinutes(trip.leaveDoor)} />
          <div className="trip__sub">
            {northbound ? nycLeg(trip.firstLegMinutes) : vtLeg(trip.firstLegMinutes)}
          </div>
        </div>

        {/* The train itself, and how long from getting off it to the far door. */}
        <div className="trip__leg">
          <div className="trip__route">
            <FlapText text={routeCode(boardingStationCode(row))} />
            <Icon name={flight ? "plane" : "arrow-right"} size={20} />
            <FlapText text={routeCode(changeStationCode(row))} />
          </div>
          <div className="trip__sub">
            {northbound ? vtLeg(trip.lastLegMinutes) : nycLeg(trip.lastLegMinutes)}
          </div>
        </div>

        {/* Through the far door, and what the whole trip cost. */}
        <div className="trip__leg">
          <FlapText text={formatClockFromMinutes(trip.arriveDoor)} />
          <div className="trip__sub">
            <Icon name="leave-by" size={16} />
            {formatDuration(trip.totalMinutes)}
          </div>
        </div>
      </div>

      <div className="trip__meta">
        <a
          className="trip__train"
          href={tickets.href}
          target="_blank"
          rel="noopener noreferrer"
          data-link-out={tickets.linkOut}
          title={flight ? "Buy tickets on Cape Air" : "Buy tickets on Amtrak"}
        >
          <span className="only-wide">
            <FlapText text={`${row.service} ${row.trainNumber}`} />
          </span>
          <span className="only-narrow">
            <FlapText text={`${abbreviateService(row.service)} ${row.trainNumber}`} />
          </span>
        </a>
        <span className="trip__times">
          {formatClock(row.scheduledDeparture)} / {formatClock(row.scheduledArrival)}
        </span>
        {showDays && <span className="trip__days">{row.daysRaw}</span>}
        {/* Flights have no Amtrak live status: just say they're on the schedule. */}
        {live && flight && (
          <span className="trip__status">
            <Icon name="scheduled" size={16} />
            <FlapText text="SCHEDULED" />
          </span>
        )}
        {live && !flight && (
          <a
            className="trip__status"
            href={statusPage.href}
            target="_blank"
            rel="noopener noreferrer"
            data-link-out={statusPage.linkOut}
          >
            <Icon name={statusText.icon} size={16} />
            <span className="status-full">
              <FlapText text={statusText.full} />
            </span>
            <span className="status-short">
              <FlapText text={statusText.short} />
            </span>
          </a>
        )}
      </div>
    </article>
  );
}
