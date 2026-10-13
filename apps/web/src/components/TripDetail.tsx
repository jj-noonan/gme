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

/** The buffer before the train, on one line: "20 min to park and get to the platform (buffer)". */
function bufferText(row: ScheduleRow, minutes: number): string {
  const what =
    row.mode === "flight"
      ? "to check in"
      : row.direction === "N"
        ? "to get to the platform"
        : "to park and get to the platform";
  return `${minutes} min ${what} (buffer)`;
}

/** The buffer after it: "10 min off the train to the subway (buffer)". */
function transferText(row: ScheduleRow, minutes: number): string {
  const off = row.mode === "flight" ? (row.direction === "N" ? "the plane" : "the shuttle") : "the train";
  return `${minutes} min off ${off} to the ${row.direction === "N" ? "car" : "subway"} (buffer)`;
}

/**
 * "From Montreal · left Saratoga Springs on time · 2 stops away", or similar;
 * null when you board where it starts, so there's nothing inbound to say.
 */
export function inboundText(progress: TrainProgress): string | null {
  if (progress.startsHere) return null;
  const origin = progress.origin.stationName ?? progress.origin.stationCode;
  const away = progress.stopsAway === 0 ? "your stop is next" : `${progress.stopsAway} stops away`;
  if (!progress.lastDeparted) return `Starts at ${origin} · hasn't left yet`;
  const last = progress.lastDeparted.stationName ?? progress.lastDeparted.stationCode;
  const delay = progress.lastDeparted.delayMinutes;
  const timing = delay == null || Math.abs(delay) <= 2 ? "on time" : delay > 0 ? `${delay} min late` : `${-delay} min early`;
  return `From ${origin} · left ${last} ${timing} · ${away}`;
}

function OutLink({ link, children, className = "detail-link" }: { link: LinkOut; children: ReactNode; className?: string }) {
  return (
    <a className={className} href={link.href} target="_blank" rel="noopener noreferrer" data-link-out={link.linkOut}>
      {children}
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

/** One line of a leg: what it says, and the link for it at the end of the same line. */
interface SegmentLine {
  content: ReactNode;
  link?: ReactNode;
}

function Segment({ lines, dashed }: { lines: (SegmentLine | null)[]; dashed?: boolean }) {
  return (
    <li className={`detail-segment${dashed ? " detail-segment--buffer" : ""}`}>
      {lines.filter((line): line is SegmentLine => line !== null).map((line, i) => (
        <div key={i} className={`detail-segment__line${i === 0 ? " detail-segment__line--title" : ""}`}>
          <span className="detail-segment__content">{line.content}</span>
          {line.link}
        </div>
      ))}
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

  const drive = (minutes: number, toStation: boolean) => {
    const usual = comparedToUsual(doorLegs.vtDriveMinutes, doorLegs.vtDriveTypicalMinutes);
    return (
      <Segment
        lines={[
          {
            content: (
              <>
                <Icon name="drive" size={16} />
                Drive {formatDuration(minutes)}
              </>
            ),
            link: (
              <OutLink
                link={{
                  href: drivingDirectionsUrl(vtLocation, row.stationCode, toStation),
                  linkOut: "driving directions in Google Maps",
                }}
              >
                Directions ›
              </OutLink>
            ),
          },
          usual ? { content: usual } : null,
        ]}
      />
    );
  };

  const subway = (minutes: number, toNyp: boolean) => {
    const mode =
      doorLegs.nycLines === null ? "Subway, about" : doorLegs.nycLines.length === 0 ? "Walk" : "Subway";
    return (
      <Segment
        lines={[
          {
            content: (
              <>
                <TransitBadges lines={doorLegs.nycLines} />
                {mode} {formatDuration(minutes)}
              </>
            ),
            link: (
              <OutLink
                link={{
                  href: transitDirectionsUrl(nycLocation, toNyp),
                  linkOut: "subway directions in Google Maps",
                }}
              >
                Directions ›
              </OutLink>
            ),
          },
        ]}
      />
    );
  };

  const statusText = describeStatus(row, status);
  const track = boardingStop(row, status)?.track;
  const progress = trainProgress(row, status);
  const inbound = progress && inboundText(progress);
  const train = (
    <Segment
      lines={[
        {
          // The name is the way to buy tickets.
          content: (
            <>
              <Icon name={flight ? "plane" : "train"} size={16} />
              <OutLink link={ticketsLink(row)} className="detail-train-link">
                {flight ? "Cape Air" : row.service} {row.trainNumber}
              </OutLink>
              · {formatDuration(trip.trainMinutes)}
            </>
          ),
        },
        live
          ? {
              content: (
                <>
                  <Icon name={flight ? "scheduled" : statusText.icon} size={16} />
                  {(flight ? "SCHEDULED" : statusText.full) + (track ? ` · TRACK ${track}` : "")}
                </>
              ),
              link: !flight && <OutLink link={statusLink(row)}>Status ›</OutLink>,
            }
          : { content: row.daysRaw },
        inbound ? { content: inbound } : null,
      ]}
    />
  );

  const buffer = <Segment dashed lines={[{ content: bufferText(row, trip.bufferMinutes) }]} />;
  const transfer = <Segment dashed lines={[{ content: transferText(row, trip.transferMinutes) }]} />;

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
        {transfer}
        {northbound ? drive(trip.lastLegMinutes, false) : subway(trip.lastLegMinutes, false)}
        <Stop time={trip.arriveDoor} place={endLabel} final />
      </ol>

      <p className="trip-detail__total">
        <Icon name="leave-by" size={16} /> Door to door {formatDuration(trip.totalMinutes)}
      </p>
    </div>
  );
}
