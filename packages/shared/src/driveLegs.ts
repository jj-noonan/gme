import { STATIONS } from "./stations.js";
import type { StationCode } from "./types.js";

/**
 * One drive from a tracked station to the Rutland house, starting at a local
 * (Eastern) wall-clock time — when the train drops you off.
 */
export interface HomeDriveLeg {
  stationCode: StationCode;
  /** "YYYY-MM-DDTHH:MM", Eastern local time. */
  departAt: string;
}

/**
 * Drive estimates are looked up per slot, not per minute: traffic doesn't
 * change meaningfully inside a quarter hour, and it keeps routing calls cacheable.
 */
export const DRIVE_SLOT_MINUTES = 15;

const LEG_PATTERN = /^([A-Z]{3})@(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** The wire form of a leg, e.g. "ALB@2026-10-05T18:00". Also the key it's answered under. */
export function formatDriveLeg(leg: HomeDriveLeg): string {
  return `${leg.stationCode}@${leg.departAt}`;
}

/** Parses the wire form back, or null if it's malformed or names an untracked station. */
export function parseDriveLeg(text: string): HomeDriveLeg | null {
  const match = LEG_PATTERN.exec(text);
  if (!match) return null;
  const [, code, year, month, day, hour, minute] = match;
  if (!STATIONS.some((s) => s.code === code)) return null;

  // Round-trip through Date to reject impossible dates like 2026-02-30 or 25:00.
  const date = new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute));
  if (
    date.getUTCFullYear() !== +year ||
    date.getUTCMonth() !== +month - 1 ||
    date.getUTCDate() !== +day ||
    date.getUTCHours() !== +hour ||
    date.getUTCMinutes() !== +minute
  ) {
    return null;
  }

  return { stationCode: code as StationCode, departAt: text.slice(4) };
}

/** Floors a "YYYY-MM-DDTHH:MM" time to the start of its drive slot. */
export function slotDepartAt(departAt: string): string {
  const minute = Number(departAt.slice(14, 16));
  const slotted = minute - (minute % DRIVE_SLOT_MINUTES);
  return `${departAt.slice(0, 14)}${String(slotted).padStart(2, "0")}`;
}
