import type { Coordinate } from "@gme/shared";
import { IP_GEOLOCATION_URL } from "./config.js";

function fromBrowserGeolocation(): Promise<Coordinate | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8_000, maximumAge: 5 * 60_000 },
    );
  });
}

async function fromIpGeolocation(): Promise<Coordinate | null> {
  try {
    const response = await fetch(IP_GEOLOCATION_URL);
    if (!response.ok) return null;
    const data = (await response.json()) as { latitude?: number; longitude?: number };
    if (typeof data.latitude !== "number" || typeof data.longitude !== "number") return null;
    return { lat: data.latitude, lon: data.longitude };
  } catch {
    return null;
  }
}

/** Browser Geolocation (precise) first, falling back to coarse IP-based location. */
export async function resolveUserLocation(): Promise<Coordinate | null> {
  const precise = await fromBrowserGeolocation();
  if (precise) return precise;
  return fromIpGeolocation();
}
