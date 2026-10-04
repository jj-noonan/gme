import {
  classifyRegion,
  NYP_COORDINATE,
  RUTLAND_CLUSTER_CENTROID,
  DEFAULT_VT_LOCATION,
  type Coordinate,
  type Region,
} from "@gme/shared";
import { useEffect, useState } from "react";
import { resolveUserLocation } from "../lib/location.js";

// Assumed location until (or unless) geolocation gives something more
// precise, so there is always a sensible recommendation rather than a
// blank state. Shares the shared-package constant so the two can't drift.

export interface UserLocationState {
  location: Coordinate;
  region: Region;
  /** False while still waiting on geolocation/IP lookup; `location` is a placeholder until then. */
  resolved: boolean;
}

export function useUserLocation(): UserLocationState {
  const [state, setState] = useState<UserLocationState>({
    location: DEFAULT_VT_LOCATION,
    region: "RUTLAND",
    resolved: false,
  });

  useEffect(() => {
    let cancelled = false;
    resolveUserLocation().then((location) => {
      if (cancelled) return;
      const resolvedLocation = location ?? DEFAULT_VT_LOCATION;
      setState({
        location: resolvedLocation,
        region: classifyRegion(resolvedLocation, NYP_COORDINATE, RUTLAND_CLUSTER_CENTROID),
        resolved: location !== null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
