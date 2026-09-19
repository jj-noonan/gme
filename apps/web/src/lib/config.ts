export const STATUS_API_URL = import.meta.env.VITE_STATUS_API_URL ?? "http://localhost:8080";

// Free, CORS-friendly IP geolocation lookup used only as a fallback when the
// browser Geolocation API is denied or unavailable. No key required.
export const IP_GEOLOCATION_URL = "https://ipapi.co/json/";

export const STATUS_POLL_INTERVAL_MS = 60_000;
