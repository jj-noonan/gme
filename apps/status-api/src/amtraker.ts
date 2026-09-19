import type { AmtrakerResponse } from "@gme/shared";
import { AMTRAKER_MIRROR_URL, AMTRAKER_STALE_URL, AMTRAKER_URL, FETCH_TIMEOUT_MS } from "./config.js";

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  return response.json();
}

export async function fetchRawTrains(): Promise<AmtrakerResponse> {
  try {
    return (await fetchJson(AMTRAKER_URL)) as AmtrakerResponse;
  } catch (primaryError) {
    console.error("Amtraker primary fetch failed, trying mirror:", primaryError);
    return (await fetchJson(AMTRAKER_MIRROR_URL)) as AmtrakerResponse;
  }
}

/**
 * Whether Amtrak's own feed (that Amtraker scrapes) is currently stale.
 * If we can't even determine that, we conservatively report stale=true —
 * better to say "status unavailable" than show possibly-old data as current.
 */
export async function fetchIsStale(): Promise<boolean> {
  try {
    // Despite the docs calling this field `isStale`, the live endpoint returns `stale`.
    const result = (await fetchJson(AMTRAKER_STALE_URL)) as { stale?: boolean };
    return result.stale ?? true;
  } catch (error) {
    console.error("Amtraker stale check failed, assuming stale:", error);
    return true;
  }
}
