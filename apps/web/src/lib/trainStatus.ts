import { boardingStationCode, parseHHMM, type ScheduleRow, type StationStatus, type TrainStatus } from "@gme/shared";
import { formatClockFromMinutes } from "./format.js";
import type { IconName } from "./icons.js";

const MINUTES_PER_DAY = 24 * 60;

/** The stop where you actually board — NYP northbound, the tracked station southbound. */
export function boardingStop(
  row: ScheduleRow,
  status: TrainStatus | undefined,
): StationStatus | undefined {
  return status?.perStation.find((s) => s.stationCode === boardingStationCode(row));
}

/** Minutes the boarding stop is running late (negative = early); 0 with no usable live data. */
export function liveDelayMinutes(row: ScheduleRow, status: TrainStatus | undefined): number {
  if (!status || status.stale || !status.isTracked) return 0;
  const delay = boardingStop(row, status)?.delayMinutes;
  return delay != null && Number.isFinite(delay) ? delay : 0;
}

export interface StatusText {
  icon: IconName;
  /** e.g. "+12 MIN (ETD 11:18A)". */
  full: string;
  /** For narrow screens, e.g. "+12 MIN". */
  short: string;
}

function same(icon: IconName, text: string): StatusText {
  return { icon, full: text, short: text };
}

/** What the live status says about boarding this row's train, in both lengths. */
export function describeStatus(row: ScheduleRow, status: TrainStatus | undefined): StatusText {
  if (!status) return same("scheduled", "SCHEDULED");
  if (status.stale) return { icon: "scheduled", full: "NO LIVE DATA", short: "NO DATA" };
  if (!status.isTracked) return same("scheduled", "SCHEDULED");

  const stop = boardingStop(row, status);
  if (!stop) return same("scheduled", "SCHEDULED");
  if (stop.stopStatus === "Departed") return same("scheduled", "DEPARTED");

  const delay = stop.delayMinutes;
  // `== null` (not `=== null`) and the finite check both matter: if the API
  // ever drifts out of shape again, this must degrade to "SCHEDULED" rather
  // than rendering "+NAN MIN" on the board.
  if (delay == null || !Number.isFinite(delay)) {
    const text = stop.stopStatus?.toUpperCase() ?? "SCHEDULED";
    return same(text.includes("CANCEL") ? "cancelled" : "scheduled", text);
  }
  if (Math.abs(delay) <= 2) return same("on-time", "ON TIME");

  const minutes = delay > 0 ? `+${delay} MIN` : `-${-delay} MIN`;
  const etd = (((parseHHMM(row.scheduledDeparture) + delay) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return {
    icon: delay > 0 ? "delayed" : "scheduled",
    full: `${minutes} (ETD ${formatClockFromMinutes(etd)})`,
    short: minutes,
  };
}

/**
 * Short names for the long services, for narrow screens where the full name
 * would push into the next column. The train number after it matters more
 * than the name, so the name is what gives.
 */
const SERVICE_ABBREVIATIONS: Record<string, string> = {
  "ETHAN ALLEN": "ETHN ALN",
  "LAKE SHORE": "LK SHORE",
  ADIRONDACK: "ADK",
  VERMONTER: "VTER",
  "MAPLE LEAF": "MPL LEAF",
  "NE REGIONAL": "NE RGNL",
};

export function abbreviateService(service: string): string {
  return SERVICE_ABBREVIATIONS[service.toUpperCase()] ?? service;
}
