import { createServer, type IncomingMessage } from "node:http";
import { isInBounds, NYC_REGION, parseDriveLeg, VT_REGION, type DriveLeg } from "@gme/shared";
import {
  ALLOWED_ORIGINS,
  DRIVE_RATE_LIMIT,
  GEOCODE_RATE_LIMIT,
  MAX_DRIVE_LEGS,
  PORT,
} from "./config.js";
import { getDriveMinutes } from "./drive.js";
import { geocode } from "./geocode.js";
import { createRateLimiter } from "./rateLimit.js";
import { getTrainStatuses } from "./statusCache.js";

const allowDriveRequest = createRateLimiter(DRIVE_RATE_LIMIT);
const allowGeocodeRequest = createRateLimiter(GEOCODE_RATE_LIMIT);

const GEOCODE_AREAS = { vt: VT_REGION, nyc: NYC_REGION } as const;
const MAX_GEOCODE_QUERY_LENGTH = 256;

/** Who's asking, for rate limiting. Fly's proxy sets Fly-Client-IP; the socket is the proxy itself. */
function clientKey(req: IncomingMessage): string {
  return String(req.headers["fly-client-ip"] ?? req.socket.remoteAddress ?? "unknown");
}

/** A parsed leg whose place is inside the area this app serves, or null. */
function parseRegionalDriveLeg(text: string): DriveLeg | null {
  const leg = parseDriveLeg(text);
  return leg && isInBounds(leg.place, VT_REGION) ? leg : null;
}

function corsHeaders(origin: string | undefined): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
}

const server = createServer(async (req, res) => {
  const headers = corsHeaders(req.headers.origin);

  if (req.method === "OPTIONS") {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", "http://localhost");

  if (url.pathname === "/status" && req.method === "GET") {
    try {
      const statuses = await getTrainStatuses();
      res.writeHead(200, { ...headers, "Content-Type": "application/json" });
      res.end(JSON.stringify({ statuses, generatedAt: new Date().toISOString() }));
    } catch (error) {
      console.error("Unexpected error serving /status:", error);
      res.writeHead(500, { ...headers, "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "internal error" }));
    }
    return;
  }

  // ?legs=ALB>43.609,-72.978@2026-10-05T18:00;43.609,-72.978>CNV@… (see formatDriveLeg)
  //   → { minutes: { "ALB>43.609,-72.978@2026-10-05T18:00": 112.6, … } }
  if (url.pathname === "/drive" && req.method === "GET") {
    if (!allowDriveRequest(clientKey(req))) {
      res.writeHead(429, { ...headers, "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "too many requests" }));
      return;
    }

    const raw = (url.searchParams.get("legs") ?? "").split(";").filter(Boolean);
    const legs = raw.map(parseRegionalDriveLeg);
    if (raw.length === 0 || raw.length > MAX_DRIVE_LEGS || legs.includes(null)) {
      res.writeHead(400, { ...headers, "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "bad legs" }));
      return;
    }

    try {
      const minutes = await getDriveMinutes(legs as DriveLeg[]);
      res.writeHead(200, { ...headers, "Content-Type": "application/json" });
      res.end(JSON.stringify({ minutes, generatedAt: new Date().toISOString() }));
    } catch (error) {
      console.error("Unexpected error serving /drive:", error);
      res.writeHead(500, { ...headers, "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "internal error" }));
    }
    return;
  }

  // ?q=23 West St, Rutland&area=vt → { lat, lon, label }, or 404 if nothing matches there.
  if (url.pathname === "/geocode" && req.method === "GET") {
    if (!allowGeocodeRequest(clientKey(req))) {
      res.writeHead(429, { ...headers, "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "too many requests" }));
      return;
    }

    const query = (url.searchParams.get("q") ?? "").trim();
    const area = url.searchParams.get("area");
    if (!query || query.length > MAX_GEOCODE_QUERY_LENGTH || (area !== "vt" && area !== "nyc")) {
      res.writeHead(400, { ...headers, "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "bad query" }));
      return;
    }

    try {
      const result = await geocode(query, GEOCODE_AREAS[area]);
      res.writeHead(result ? 200 : 404, { ...headers, "Content-Type": "application/json" });
      res.end(JSON.stringify(result ?? { error: "not found" }));
    } catch (error) {
      console.error("Geocoding failed:", error);
      res.writeHead(502, { ...headers, "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "geocoding unavailable" }));
    }
    return;
  }

  if (url.pathname === "/health" && req.method === "GET") {
    res.writeHead(200, headers);
    res.end("ok");
    return;
  }

  res.writeHead(404, headers);
  res.end();
});

server.listen(PORT, () => {
  console.log(`status-api listening on :${PORT}`);
});
