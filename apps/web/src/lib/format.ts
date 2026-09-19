import { STATIONS, type StationCode } from "@gme/shared";

export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "P" : "A";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")}${suffix}`;
}

export function stationName(code: StationCode): string {
  return STATIONS.find((s) => s.code === code)?.name ?? code;
}
