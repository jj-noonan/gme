import type { StationStatus, TrainStatus } from "./types.js";

/**
 * What Amtraker's `/v3/trains` actually returns per station stop.
 *
 * Note this differs from the project handoff notes, which described
 * `estArr`/`estDep`/`postArr`/`postDep` and plain-English `*Cmnt` strings.
 * None of those exist in the live feed: timing is `schArr`/`schDep`
 * (scheduled) vs `arr`/`dep` (actual once past, estimated while upcoming),
 * and the comment fields are always empty in practice.
 */
export interface AmtrakerStationStop {
  code: string;
  schArr: string | null;
  schDep: string | null;
  arr: string | null;
  dep: string | null;
  /** "Departed" | "Enroute" | "Station" */
  status: string | null;
  /** Track/platform. Rarely populated — Amtrak assigns it close to departure. */
  platform: string | null;
}

export interface AmtrakerTrain {
  trainNum: string;
  stations: AmtrakerStationStop[];
}

/** Keyed by train number (as a string) → active journeys for that number today. */
export type AmtrakerResponse = Record<string, AmtrakerTrain[]>;

/** Whole minutes between two ISO timestamps, or null if either is missing. */
export function minutesBetweenISO(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const a = Date.parse(from);
  const b = Date.parse(to);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 60_000);
}

function toStationStatus(stop: AmtrakerStationStop): StationStatus {
  // Departure timing is what matters where you board; fall back to arrival
  // for terminal stops, which have no departure.
  const delayMinutes =
    minutesBetweenISO(stop.schDep, stop.dep) ?? minutesBetweenISO(stop.schArr, stop.arr);

  return {
    stationCode: stop.code,
    scheduledDeparture: stop.schDep ?? stop.schArr ?? null,
    expectedDeparture: stop.dep ?? stop.arr ?? null,
    delayMinutes,
    stopStatus: stop.status || null,
    track: stop.platform || null,
  };
}

/**
 * Reduces a raw Amtraker response down to just the train numbers this site tracks.
 * Only pass the NYP-facing numbers here (e.g. 48/49, never 448/449) — Lake Shore
 * Limited's Boston section is excluded by simply never being in `trackedTrainNumbers`.
 */
export function reshapeAmtrakerResponse(
  raw: AmtrakerResponse,
  trackedTrainNumbers: number[],
  stale: boolean,
): TrainStatus[] {
  return trackedTrainNumbers.map((trainNumber) => {
    const journeys = raw[String(trainNumber)] ?? [];
    const journey = journeys[0];

    if (!journey) {
      return { trainNumber, isTracked: false, stale, perStation: [] };
    }

    return {
      trainNumber,
      isTracked: true,
      stale,
      perStation: journey.stations.map(toStationStatus),
    };
  });
}
