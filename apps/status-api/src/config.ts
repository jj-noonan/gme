export const PORT = Number(process.env.PORT ?? 8080);

// Comma-separated list of allowed CORS origins, e.g. "https://you.github.io,http://localhost:5173".
export const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173").split(",");

export const AMTRAKER_URL = "https://api.amtraker.com/v3/trains";
export const AMTRAKER_STALE_URL = "https://api.amtraker.com/v3/stale";
// Same response shape as AMTRAKER_URL — used if the primary is unreachable.
export const AMTRAKER_MIRROR_URL = "https://amtrak-api.marcmap.app/get-trains";

// How long a fetched response is served from cache before refetching.
// A single flat value for now; easy to make this shrink as departure nears later.
export const CACHE_TTL_MS = 60_000;

export const FETCH_TIMEOUT_MS = 8_000;

// Mapbox token for traffic-aware drive times (a public-scope `pk.` token is
// enough). Unset means /drive answers with nothing and the web app keeps its
// straight-line estimate.
export const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN ?? "";
export const MAPBOX_DIRECTIONS_URL = "https://api.mapbox.com/directions/v5/mapbox/driving-traffic";
export const MAPBOX_GEOCODE_URL = "https://api.mapbox.com/search/geocode/v6/forward";

// Slots within DRIVE_NEAR_WINDOW_MINUTES follow live traffic, so they're
// cached briefly. Further-out slots are predicted from typical traffic and
// barely move — and the timetable asks for dozens of them — so they're kept
// for hours.
export const DRIVE_CACHE_TTL_MS = 10 * 60_000;
export const DRIVE_FAR_CACHE_TTL_MS = 6 * 60 * 60_000;
export const DRIVE_NEAR_WINDOW_MINUTES = 120;

// Upper bound on legs per /drive request — the biggest board (the full
// southbound timetable) is a few dozen rows.
export const MAX_DRIVE_LEGS = 80;

// Per-client cap on /drive requests, as a backstop for the Mapbox quota. A
// viewer polls every 10 minutes; this leaves lots of room for tab-switching.
export const DRIVE_RATE_LIMIT = { requests: 60, windowMs: 10 * 60_000 };

// Per-client cap on /geocode. A page load looks up at most two saved
// addresses; this leaves room for someone typing a few attempts.
export const GEOCODE_RATE_LIMIT = { requests: 20, windowMs: 10 * 60_000 };
