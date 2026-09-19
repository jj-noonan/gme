import type { StationStatus, TrainStatus } from "./types.js";

/** Minimal shape of what we read off Amtraker's `/v3/trains` response. */
export interface AmtrakerStationStop {
  code: string;
  schArr: string | null;
  schDep: string | null;
  estArr: string | null;
  estDep: string | null;
  postArr: string | null;
  postDep: string | null;
  arrCmnt: string | null;
  depCmnt: string | null;
}

export interface AmtrakerTrain {
  trainNum: string;
  stations: AmtrakerStationStop[];
}

/** Keyed by train number (as a string) → active journeys for that number today. */
export type AmtrakerResponse = Record<string, AmtrakerTrain[]>;

function toStationStatus(stop: AmtrakerStationStop): StationStatus {
  return {
    stationCode: stop.code,
    scheduled: stop.schArr ?? stop.schDep ?? null,
    estimated: stop.estArr ?? stop.estDep ?? null,
    actual: stop.postArr ?? stop.postDep ?? null,
    comment: stop.arrCmnt ?? stop.depCmnt ?? null,
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
