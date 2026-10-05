import type { Coordinate } from "./geo.js";

// Wire-format pieces shared by drive and transit legs.

/** Places are rounded to 3 decimals (~100m) on the wire — plenty for a trip, and cacheable. */
const PLACE_DECIMALS = 3;

const PLACE_PATTERN = /^(-?\d{1,2}\.\d{1,3}),(-?\d{1,3}\.\d{1,3})$/;
const TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export function formatPlace(place: Coordinate): string {
  return `${place.lat.toFixed(PLACE_DECIMALS)},${place.lon.toFixed(PLACE_DECIMALS)}`;
}

export function parsePlace(text: string): Coordinate | null {
  const match = PLACE_PATTERN.exec(text);
  return match ? { lat: Number(match[1]), lon: Number(match[2]) } : null;
}

/** Whether `text` is a real "YYYY-MM-DDTHH:MM" time. */
export function isValidLocalTime(text: string): boolean {
  const match = TIME_PATTERN.exec(text);
  if (!match) return false;
  const [, year, month, day, hour, minute] = match.map(Number);
  // Round-trip through Date to reject impossible dates like 2026-02-30 or 25:00.
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute
  );
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** `day`'s date at `minutes` past its midnight (may spill into a neighboring day), as "YYYY-MM-DDTHH:MM". */
export function localTimeOn(day: Date, minutes: number): string {
  const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes);
  const date = `${at.getFullYear()}-${pad2(at.getMonth() + 1)}-${pad2(at.getDate())}`;
  return `${date}T${pad2(at.getHours())}:${pad2(at.getMinutes())}`;
}
