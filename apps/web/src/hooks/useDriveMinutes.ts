import { formatDriveLeg, type DriveLeg } from "@gme/shared";
import { useEffect, useMemo, useState } from "react";
import { DRIVE_POLL_INTERVAL_MS } from "../lib/config.js";
import { fetchStatusApi } from "../lib/statusApi.js";

/**
 * Traffic-aware drive minutes for `legs`, keyed by `formatDriveLeg`. Empty
 * until (or unless) status-api answers; callers fall back to the
 * straight-line estimate for anything missing.
 */
export function useDriveMinutes(legs: DriveLeg[]): Record<string, number> {
  const [minutes, setMinutes] = useState<Record<string, number>>({});

  // A stable string, so the effect only refires when the set of legs changes.
  const legsParam = useMemo(() => [...new Set(legs.map(formatDriveLeg))].join(";"), [legs]);

  useEffect(() => {
    if (!legsParam) return;

    let cancelled = false;
    const fetchMinutes = () => {
      fetchStatusApi<{ minutes: Record<string, number> }>(
        `/drive?legs=${encodeURIComponent(legsParam)}`,
      )
        .then((data) => {
          if (!cancelled) setMinutes(data.minutes);
        })
        .catch(() => {
          // Keep whatever we last had; with nothing, rows use the straight-line estimate.
        });
    };

    fetchMinutes();
    const interval = setInterval(fetchMinutes, DRIVE_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [legsParam]);

  return minutes;
}
