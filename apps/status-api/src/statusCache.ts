import { reshapeAmtrakerResponse, TRACKED_TRAIN_NUMBERS, type TrainStatus } from "@gme/shared";
import { fetchIsStale, fetchRawTrains } from "./amtraker.js";
import { CACHE_TTL_MS } from "./config.js";

let cache: { statuses: TrainStatus[]; fetchedAt: number } | null = null;

export async function getTrainStatuses(): Promise<TrainStatus[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.statuses;
  }

  try {
    const [raw, stale] = await Promise.all([fetchRawTrains(), fetchIsStale()]);
    const statuses = reshapeAmtrakerResponse(raw, TRACKED_TRAIN_NUMBERS, stale);
    cache = { statuses, fetchedAt: Date.now() };
    return statuses;
  } catch (error) {
    // Both the primary and mirror feeds are down. Serve the last known-good
    // cache (marked stale) rather than erroring the whole endpoint — the
    // frontend always has the static schedule to fall back on regardless.
    console.error("Amtraker fully unreachable:", error);
    if (cache) return cache.statuses.map((s) => ({ ...s, stale: true }));
    return reshapeAmtrakerResponse({}, TRACKED_TRAIN_NUMBERS, true);
  }
}
