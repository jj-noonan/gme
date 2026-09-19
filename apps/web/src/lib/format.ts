import { STATIONS, type StationCode } from "@gme/shared";

export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "P" : "A";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")}${suffix}`;
}

/** Same as formatClock, but from minutes-since-midnight. */
export function formatClockFromMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return formatClock(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
}

export function stationName(code: StationCode): string {
  return STATIONS.find((s) => s.code === code)?.name ?? code;
}

/** Matches the original timetable's own duration notation, e.g. "5H 10M". */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}H ${minutes}M`;
}
