import type { TrainStatus } from "@gme/shared";
import { useEffect, useState } from "react";
import { STATUS_API_URL, STATUS_POLL_INTERVAL_MS } from "../lib/config.js";

export function useTrainStatuses(enabled: boolean) {
  const [statuses, setStatuses] = useState<TrainStatus[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const fetchStatuses = () => {
      fetch(`${STATUS_API_URL}/status`)
        .then((res) => {
          if (!res.ok) throw new Error(`status-api responded ${res.status}`);
          return res.json();
        })
        .then((data: { statuses: TrainStatus[] }) => {
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
