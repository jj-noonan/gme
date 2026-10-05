import { STATUS_API_URL } from "./config.js";

// The status-api scales to zero. A cold start (observed up to ~4-5s) can
// lose the race and surface as a refused connection or a 503, sometimes
// more than once if the machine was already mid-restart. A few backed-off
// retries cover that without doing anything special for a genuinely-down
// API. Opening the board fires several requests at once, so every one of
// them needs this, not just the first.
const RETRY_DELAYS_MS = [1500, 3000, 5000];

/** A 4xx from status-api; `status` says which (404 means "not found" to some endpoints). */
export class ClientError extends Error {
  constructor(readonly status: number) {
    super(`status-api responded ${status}`);
  }
}

/**
 * GETs `path` from status-api as JSON, retrying network errors and 5xx.
 * A 4xx (a bad request, or rate limiting) won't fix itself in seconds, so
 * it fails straight away.
 */
export async function fetchStatusApi<T>(path: string, attempt = 0): Promise<T> {
  try {
    const res = await fetch(`${STATUS_API_URL}${path}`);
    if (res.status >= 400 && res.status < 500) {
      throw new ClientError(res.status);
    }
    if (!res.ok) throw new Error(`status-api responded ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ClientError || attempt >= RETRY_DELAYS_MS.length) throw err;
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    return fetchStatusApi<T>(path, attempt + 1);
  }
}
