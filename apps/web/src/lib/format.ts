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

/**
 * Timetable-style duration, e.g. "5H 10M". Drops an empty half so a round
 * hour reads "1H" rather than "1H 0M", and under an hour reads "45M".
 */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  if (hours === 0) return `${minutes}M`;
  if (minutes === 0) return `${hours}H`;
  return `${hours}H ${minutes}M`;
}
