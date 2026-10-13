import { NYC_STATION_BUFFER_MINUTES, vtBufferMinutes } from "./geo.js";
import { arrivalLegMinutes, computeLeaveBy, type DoorLegs } from "./leaveBy.js";
import { minutesBetweenClockTimes, parseHHMM } from "./recommend.js";
import type { ScheduleRow } from "./types.js";

const MINUTES_PER_DAY = 24 * 60;

function wrap(minutes: number): number {
  return ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

/**
 * One door-to-door trip, every moment of it. The single source for trip
 * times, so the list and the detail page can never disagree.
 *
 * Clock times are minutes since midnight. Leaving and reaching the station
 * stay on the schedule; a live delay pushes back the train's arrival and
 * everything after it, growing the total rather than moving your alarm.
 */
export interface TripTimeline {
  /** When to leave the door. */
  leaveDoor: number;
  /** The first leg on its own — the drive or the subway to the train, no buffer. */
  firstLegMinutes: number;
  /** When that leg gets you to the boarding station. */
  reachStation: number;
  /** Slack at the station before the train leaves. */
  bufferMinutes: number;
  /** Scheduled departure from the boarding station. */
  trainDeparts: number;
  /** Arrival where you change modes, including any live delay. */
  trainArrives: number;
  /** Time on the train, including any live delay. */
  trainMinutes: number;
  /** The last leg — from the train to the far door. */
  lastLegMinutes: number;
  /** Through the far door. */
  arriveDoor: number;
  /** Door to door, buffer included. */
  totalMinutes: number;
  /** The leave-by time has passed: you're on your way, or too late. */
  underway: boolean;
}

export function tripTimeline(
  row: ScheduleRow,
  legs: DoorLegs,
  delayMinutes: number,
  nowMinutes: number,
): TripTimeline {
  const leaveBy = computeLeaveBy(row, legs, nowMinutes);
  const bufferMinutes = row.direction === "N" ? NYC_STATION_BUFFER_MINUTES : vtBufferMinutes(row);
  const departs = parseHHMM(row.scheduledDeparture);
  const trainMinutes =
    minutesBetweenClockTimes(row.scheduledDeparture, row.scheduledArrival) + delayMinutes;
  const lastLegMinutes = arrivalLegMinutes(row, legs);

  return {
    leaveDoor: leaveBy.minutes,
    // From the rounded lead, so leave + leg + buffer lands exactly on departure.
    firstLegMinutes: leaveBy.leadMinutes - bufferMinutes,
    reachStation: wrap(departs - bufferMinutes),
    bufferMinutes,
    trainDeparts: departs,
    trainArrives: wrap(departs + trainMinutes),
    trainMinutes,
    lastLegMinutes,
    arriveDoor: wrap(departs + trainMinutes + lastLegMinutes),
    totalMinutes: leaveBy.leadMinutes + trainMinutes + lastLegMinutes,
    underway: leaveBy.missed,
  };
}
