import { isInBounds, NYC_REGION, VT_REGION, type Coordinate } from "@gme/shared";
import { useEffect, useState } from "react";
import { STATUS_API_URL } from "../lib/config.js";
import {
  DEFAULT_PLACES,
  loadPlaceSetting,
  savePlaceSetting,
  type PlaceArea,
  type PlaceSetting,
} from "../lib/places.js";
import type { UserLocationState } from "./useUserLocation.js";

const REGIONS = { vt: VT_REGION, nyc: NYC_REGION };

/**
 * How the chosen place resolved. Anything but "ready" means the timings are
 * using the default place for now (or for good, until the rider changes it).
 */
export type PlaceStatus =
  | "ready"
  | "locating"
  | "looking-up"
  | "not-found"
  | "outside-area"
  | "unavailable";

export interface PlaceState {
  setting: PlaceSetting;
  setSetting: (setting: PlaceSetting) => void;
  /** Where timings are measured from — the default place unless `status` is "ready". */
  coordinate: Coordinate;
  status: PlaceStatus;
  /** For a looked-up address: what Mapbox matched it to. */
  matchedLabel: string | null;
}

type Lookup =
  | { text: string; status: "looking-up" | "not-found" | "unavailable" }
  | { text: string; status: "ready"; coordinate: Coordinate; label: string };

/** One end of the trip — the vt-location or the nyc-location — as chosen on this device. */
export function usePlace(area: PlaceArea, user: UserLocationState): PlaceState {
  const [setting, setSettingState] = useState<PlaceSetting>(() => loadPlaceSetting(area));
  const [lookup, setLookup] = useState<Lookup | null>(null);

  const setSetting = (next: PlaceSetting) => {
    savePlaceSetting(area, next);
    setSettingState(next);
  };

  const addressText = setting.kind === "address" ? setting.text : null;

  useEffect(() => {
    if (addressText === null) return;
    let cancelled = false;
    setLookup({ text: addressText, status: "looking-up" });

    const params = new URLSearchParams({ q: addressText, area });
    fetch(`${STATUS_API_URL}/geocode?${params}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) {
          setLookup({ text: addressText, status: "not-found" });
          return;
        }
        if (!res.ok) throw new Error(`status-api responded ${res.status}`);
        const found = (await res.json()) as { lat: number; lon: number; label: string };
        if (!cancelled) {
          setLookup({
            text: addressText,
            status: "ready",
            coordinate: { lat: found.lat, lon: found.lon },
            label: found.label,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setLookup({ text: addressText, status: "unavailable" });
      });

    return () => {
      cancelled = true;
    };
  }, [area, addressText]);

  const fallback = DEFAULT_PLACES[area].coordinate;
  const resolved = { setting, setSetting, matchedLabel: null };

  if (setting.kind === "default") {
    return { ...resolved, coordinate: fallback, status: "ready" };
  }

  if (setting.kind === "current") {
    if (user.pending) return { ...resolved, coordinate: fallback, status: "locating" };
    if (!user.resolved) return { ...resolved, coordinate: fallback, status: "unavailable" };
    if (!isInBounds(user.location, REGIONS[area])) {
      return { ...resolved, coordinate: fallback, status: "outside-area" };
    }
    return { ...resolved, coordinate: user.location, status: "ready" };
  }

  // An address: ignore a lookup that belongs to a previous text.
  if (!lookup || lookup.text !== setting.text) {
    return { ...resolved, coordinate: fallback, status: "looking-up" };
  }
  if (lookup.status === "ready") {
    return { ...resolved, coordinate: lookup.coordinate, status: "ready", matchedLabel: lookup.label };
  }
  return { ...resolved, coordinate: fallback, status: lookup.status };
}
