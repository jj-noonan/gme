export type Direction = "N" | "S";

export type StationCode = "RUD" | "CNV" | "WHL" | "FED" | "ALB" | "BLF" | "BRA";

export interface Station {
  code: StationCode;
  name: string;
  lat: number;
  lon: number;
}

/** One train's stop at one tracked station, in one direction. */
export interface ScheduleRow {
  trainNumber: number;
  service: string;
  direction: Direction;
  /** Verbatim "Days of Operation" string from Amtrak, e.g. "SU-WE,SA". Never bucketed. */
  daysRaw: string;
  stationCode: StationCode;
  /** "HH:MM" 24h, train-only (no drive/buffer baked in). */
  scheduledDeparture: string;
  scheduledArrival: string;
}

export interface StationStatus {
  stationCode: string;
  scheduled: string | null;
  estimated: string | null;
  actual: string | null;
  comment: string | null;
}

export interface TrainStatus {
  trainNumber: number;
  isTracked: boolean;
  stale: boolean;
  perStation: StationStatus[];
}

export interface RecommendedStop {
  station: StationCode;
  driveMinutes: number;
  totalTripMinutes: number;
}
