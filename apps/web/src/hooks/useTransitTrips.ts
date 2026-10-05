import { formatTransitLeg, type TransitLeg, type TransitTrip } from "@gme/shared";
import { useEffect, useMemo, useState } from "react";
import { fetchStatusApi } from "../lib/statusApi.js";

/**
 * NYC transit trips for `legs`, keyed by `formatTransitLeg`. Empty until (or
 * unless) status-api answers; callers fall back to the flat estimate.
 *
 * Fetched once per set of legs, not on a timer: the trips are planned on the
 * schedule, so refetching wouldn't change them, and Google bills per lookup.
 */
export function useTransitTrips(legs: TransitLeg[]): Record<string, TransitTrip> {
  const [trips, setTrips] = useState<Record<string, TransitTrip>>({});

  // A stable string, so the effect only refires when the set of legs changes.
  const legsParam = useMemo(() => [...new Set(legs.map(formatTransitLeg))].join(";"), [legs]);

  useEffect(() => {
    if (!legsParam) return;

    let cancelled = false;
    fetchStatusApi<{ trips: Record<string, TransitTrip> }>(
      `/transit?legs=${encodeURIComponent(legsParam)}`,
    )
      .then((data) => {
        if (!cancelled) setTrips(data.trips);
      })
      .catch(() => {
        // Keep whatever we last had; with nothing, rows use the flat estimate.
      });

    return () => {
      cancelled = true;
    };
  }, [legsParam]);

  return trips;
}
