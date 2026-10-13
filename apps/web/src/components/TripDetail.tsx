import {
  boardingStationCode,
  changeStationCode,
  STATIONS,
  tripTimeline,
  type Coordinate,
  type ScheduleRow,
  type TrainStatus,
} from "@gme/shared";
import { useEffect, useRef, type ReactNode } from "react";
import type { RowDoorLegs } from "../hooks/useDoorLegs.js";
import { formatClockFromMinutes, formatDuration } from "../lib/format.js";
import { drivingDirectionsUrl, transitDirectionsUrl } from "../lib/googleMaps.js";
import { statusLink, ticketsLink, type LinkOut } from "../lib/links.js";
import {
  boardingStop,
  describeStatus,
  liveDelayMinutes,
  trainProgress,
  type TrainProgress,
} from "../lib/trainStatus.js";
import { Icon } from "./Icon.js";
import { TransitBadges } from "./TransitBadges.js";

/** How far from typical a drive has to be before it's worth saying. */
const USUAL_THRESHOLD_MINUTES = 3;

function stationLabel(row: ScheduleRow, code: string): string {
  if (code === "NYP") return row.mode === "flight" ? "Penn Station (Cape Air shuttle)" : "New York Penn (NYP)";
  const station = STATIONS.find((s) => s.code === code);
  return station ? `${station.name} (${code})` : code;
}

/** "8 min slower than usual", "about usual", or null with nothing to compare to. */
export function comparedToUsual(minutes: number, typical: number | null): string | null {
  if (typical === null) return null;
  const diff = Math.round(minutes - typical);
  if (Math.abs(diff) < USUAL_THRESHOLD_MINUTES) return "about usual";
  return `${Math.abs(diff)} min ${diff > 0 ? "slower" : "faster"} than usual`;
}

function bufferReason(row: ScheduleRow): string {
  if (row.mode === "flight") return "check-in";
  return row.direction === "N" ? "getting to the platform" : "parking and getting to the platform";
}

/** "Coming from Montreal · last left Saratoga Springs · 2 stops away", or similar. */
export function inboundText(progress: TrainProgress): string {
  if (progress.startsHere) return "Starts here";
  const origin = progress.origin.stationName ?? progress.origin.stationCode;
  const away = progress.stopsAway === 0 ? "your stop is next" : `${progress.stopsAway} stops away`;
  if (!progress.lastDeparted) return `Starts at ${origin} · hasn't left yet`;
  const last = progress.lastDeparted.stationName ?? progress.lastDeparted.stationCode;
  const delay = progress.lastDeparted.delayMinutes;
  const timing = delay == null || Math.abs(delay) <= 2 ? "on time" : delay > 0 ? `${delay} min late` : `${-delay} min early`;
  return `From ${origin} · left ${last} ${timing} · ${away}`;
}

function OutLink({ link, children }: { link: LinkOut; children: ReactNode }) {
  return (
    <a
      className="detail-link"
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      data-link-out={link.linkOut}
    >
      {children} ›
    </a>
  );
}

function Stop({ time, place, final }: { time: number; place: string; final?: boolean }) {
  return (
    <li className={`detail-stop${final ? " detail-stop--final" : ""}`}>
      <span className="detail-stop__dot" aria-hidden="true" />
      <span className="detail-stop__time">{formatClockFromMinutes(time)}</span>
      <span className="detail-stop__place">{place}</span>
    </li>
  );
}

function Segment({
  icon,
  title,
  lines,
  links,
  dashed,
}: {
  icon?: ReactNode;
  title: ReactNode;
  lines?: (string | null)[];
  links?: ReactNode;
  dashed?: boolean;
}) {
  return (
    <li className={`detail-segment${dashed ? " detail-segment--buffer" : ""}`}>
      <div className="detail-segment__title">
        {icon}
        {title}
      </div>
      {lines?.filter(Boolean).map((line) => (
        <div key={line} className="detail-segment__line">
          {line}
        </div>
      ))}
      {links && <div className="detail-segment__links">{links}</div>}
    </li>
  );
}

/**
 * One trip, door to door, as a vertical timeline: each place you pass
 * through, and the leg between. Every time comes from the same
 * `tripTimeline` as the board row, so the two always agree.
 */
export function TripDetail({
  row,
  status,
  doorLegs,
  vtLocation,
  nycLocation,
  vtLabel,
  nycLabel,
  nowMinutes,
  onClose,
}: {
  row: ScheduleRow;
  /** Live status; omit on the timetable, which has none. */
  status?: TrainStatus;
  doorLegs: RowDoorLegs;
  vtLocation: Coordinate;
  nycLocation: Coordinate;
  vtLabel: string;
  nycLabel: string;
  /** Omit on the timetable — nothing is underway on a reference schedule. */
  nowMinutes?: number;
  onClose: () => void;
}) {
  const live = nowMinutes !== undefined;
  const flight = row.mode === "flight";
  const northbound = row.direction === "N";
  const trip = tripTimeline(row, doorLegs, liveDelayMinutes(row, status), nowMinutes ?? -Infinity);
  const backButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    backButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const drive = (minutes: number, toStation: boolean) => (
    <Segment
      icon={<Icon name="drive" size={16} />}
      title={`Drive ${formatDuration(minutes)}`}
      lines={[comparedToUsual(doorLegs.vtDriveMinutes, doorLegs.vtDriveTypicalMinutes)]}
      links={
        <OutLink
          link={{
            href: drivingDirectionsUrl(vtLocation, row.stationCode, toStation),
            linkOut: "driving directions in Google Maps",
          }}
        >
          Directions
        </OutLink>
      }
    />
  );

  const subway = (minutes: number, toNyp: boolean) => (
    <Segment
      icon={<TransitBadges lines={doorLegs.nycLines} />}
      title={`${doorLegs.nycLines === null ? "Subway, about" : doorLegs.nycLines.length === 0 ? "Walk" : "Subway"} ${formatDuration(minutes)}`}
      links={
        <OutLink
          link={{
            href: transitDirectionsUrl(nycLocation, toNyp),
            linkOut: "subway directions in Google Maps",
          }}
        >
          Directions
        </OutLink>
      }
    />
  );

  const statusText = describeStatus(row, status);
  const track = boardingStop(row, status)?.track;
  const progress = trainProgress(row, status);
  const train = (
    <Segment
      icon={<Icon name={flight ? "plane" : "train"} size={16} />}
      title={`${flight ? "Cape Air" : row.service} ${row.trainNumber} · ${formatDuration(trip.trainMinutes)}`}
      lines={[
        live ? (flight ? "SCHEDULED" : statusText.full) + (track ? ` · TRACK ${track}` : "") : row.daysRaw,
        progress && inboundText(progress),
      ]}
      links={
        <>
          <OutLink link={ticketsLink(row)}>Tickets</OutLink>
          {live && !flight && <OutLink link={statusLink(row)}>Status</OutLink>}
        </>
      }
    />
  );

  const buffer = (
    <Segment
      dashed
      title={`${trip.bufferMinutes} min buffer`}
      lines={[bufferReason(row)]}
    />
  );

  const [startLabel, endLabel] = northbound ? [nycLabel, vtLabel] : [vtLabel, nycLabel];

  return (
    <div className="trip-detail" role="dialog" aria-modal="true" aria-labelledby="trip-detail-title">
      <header className="trip-detail__header">
        <button ref={backButton} type="button" className="trip-detail__back" onClick={onClose}>
          ‹ Back
        </button>
        <h2 id="trip-detail-title" className="trip-detail__title">
          {flight ? "Cape Air" : row.service} {row.trainNumber}
          <span className="trip-detail__when">{live ? "Today" : row.daysRaw}</span>
        </h2>
      </header>

      <ol className="detail-timeline">
        <Stop time={trip.leaveDoor} place={startLabel} />
        {northbound ? subway(trip.firstLegMinutes, true) : drive(trip.firstLegMinutes, true)}
        {buffer}
        <Stop time={trip.trainDeparts} place={stationLabel(row, boardingStationCode(row))} />
        {train}
        <Stop time={trip.trainArrives} place={stationLabel(row, changeStationCode(row))} />
        {northbound ? drive(trip.lastLegMinutes, false) : subway(trip.lastLegMinutes, false)}
        <Stop time={trip.arriveDoor} place={endLabel} final />
      </ol>

      <p className="trip-detail__total">
        <Icon name="leave-by" size={16} /> Door to door {formatDuration(trip.totalMinutes)}
      </p>
    </div>
  );
}
