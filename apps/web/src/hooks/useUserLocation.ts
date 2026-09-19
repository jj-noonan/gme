import { classifyRegion, NYP_COORDINATE, RUTLAND_CLUSTER_CENTROID, type Coordinate, type Region } from "@gme/shared";
import { useEffect, useState } from "react";
import { resolveUserLocation } from "../lib/location.js";

// Jones Donuts, Rutland VT — used as the assumed location on the Rutland
// side until (or unless) we get something more precise, so there's always a
// sensible recommendation to show rather than a blank state.
const DEFAULT_RUTLAND_SIDE_LOCATION: Coordinate = { lat: 43.6089, lon: -72.9781 };

export interface UserLocationState {
  location: Coordinate;
  region: Region;
  /** False while still waiting on geolocation/IP lookup; `location` is a placeholder until then. */
  resolved: boolean;
}

export function useUserLocation(): UserLocationState {
  const [state, setState] = useState<UserLocationState>({
    location: DEFAULT_RUTLAND_SIDE_LOCATION,
    region: "RUTLAND",
    resolved: false,
  });

  useEffect(() => {
    let cancelled = false;
    resolveUserLocation().then((location) => {
      if (cancelled) return;
      const resolvedLocation = location ?? DEFAULT_RUTLAND_SIDE_LOCATION;
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
