import type { TrainStatus } from "@gme/shared";
import { useEffect, useState } from "react";
import { STATUS_API_URL, STATUS_POLL_INTERVAL_MS } from "../lib/config.js";

export function useTrainStatuses(enabled: boolean) {
  const [statuses, setStatuses] = useState<TrainStatus[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const fetchOnce = () =>
      fetch(`${STATUS_API_URL}/status`).then((res) => {
        if (!res.ok) throw new Error(`status-api responded ${res.status}`);
        return res.json() as Promise<{ statuses: TrainStatus[] }>;
      });

    // The status-api scales to zero. A cold-start (observed up to ~4-5s) can
    // lose the race and surface as a 503, sometimes more than once if the
    // machine was already mid-restart. A couple of backed-off retries covers
    // that without doing anything special for a genuinely-down API.
    const RETRY_DELAYS_MS = [1500, 3000, 5000];
    const fetchWithRetries = async (attempt = 0): Promise<{ statuses: TrainStatus[] }> => {
      try {
        return await fetchOnce();
      } catch (err) {
        if (attempt >= RETRY_DELAYS_MS.length) throw err;
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
        return fetchWithRetries(attempt + 1);
      }
    };

    const fetchStatuses = () => {
      fetchWithRetries()
        .then((data) => {
          if (!cancelled) {
            setStatuses(data.statuses);
            setError(null);
          }
        })
        .catch((err: unknown) => {
          // Live status is a decoration, never fatal — the schedule still renders without it.
          if (!cancelled) setError(err instanceof Error ? err.message : String(err));
        });
    };

    fetchStatuses();
    const interval = setInterval(fetchStatuses, STATUS_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled]);

  return { statuses, error };
}
