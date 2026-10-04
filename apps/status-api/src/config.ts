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
// enough). Unset means /drive-home answers with nothing and the web app keeps
// its straight-line estimate.
export const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN ?? "";
export const MAPBOX_DIRECTIONS_URL = "https://api.mapbox.com/directions/v5/mapbox/driving-traffic";

// Future slots are predicted from typical traffic and barely move; near-term
// ones follow live traffic, so nothing is cached for long.
export const DRIVE_CACHE_TTL_MS = 10 * 60_000;

// Upper bound on legs per /drive-home request — a day's northbound board is ~a dozen.
export const MAX_DRIVE_LEGS = 40;
