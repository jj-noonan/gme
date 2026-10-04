import { DEFAULT_NYC_LOCATION, DEFAULT_VT_LOCATION, type Coordinate } from "@gme/shared";

/** The two ends of every trip: the vt-location and the nyc-location. */
export type PlaceArea = "vt" | "nyc";

/**
 * What the rider picked for one end, as saved on this device. Only the typed
 * text is kept for an address — Mapbox's geocoding results may not be stored,
 * so it's looked up again on each load.
 */
export type PlaceSetting =
  | { kind: "default" }
  | { kind: "current" }
  | { kind: "address"; text: string };

export const DEFAULT_PLACES: Record<PlaceArea, { label: string; coordinate: Coordinate }> = {
  vt: { label: "Jones Donuts", coordinate: DEFAULT_VT_LOCATION },
  nyc: { label: "Bishop Loughlin HS", coordinate: DEFAULT_NYC_LOCATION },
};

const STORAGE_KEYS: Record<PlaceArea, string> = {
  vt: "gme.vt-location",
  nyc: "gme.nyc-location",
};

function isPlaceSetting(value: unknown): value is PlaceSetting {
  if (typeof value !== "object" || value === null) return false;
  const kind = (value as { kind?: unknown }).kind;
  if (kind === "default" || kind === "current") return true;
  return kind === "address" && typeof (value as { text?: unknown }).text === "string";
}

/** The saved setting, or the default if there's none (or storage is unavailable). */
export function loadPlaceSetting(area: PlaceArea): PlaceSetting {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[area]);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isPlaceSetting(parsed) ? parsed : { kind: "default" };
  } catch {
    return { kind: "default" };
  }
}

export function savePlaceSetting(area: PlaceArea, setting: PlaceSetting): void {
  try {
    if (setting.kind === "default") localStorage.removeItem(STORAGE_KEYS[area]);
    else localStorage.setItem(STORAGE_KEYS[area], JSON.stringify(setting));
  } catch {
    // Private mode or blocked storage: the choice just won't outlive the page.
  }
}

/**
 * What typing `text` into a box means: blank or the default's own name
 * resets to the default; anything else is an address to look up.
 */
export function settingFromText(area: PlaceArea, text: string): PlaceSetting {
  const trimmed = text.trim();
  if (!trimmed || trimmed.toLowerCase() === DEFAULT_PLACES[area].label.toLowerCase()) {
    return { kind: "default" };
  }
  return { kind: "address", text: trimmed };
}
