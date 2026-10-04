import { createServer } from "node:http";
import { parseDriveLeg, type DriveLeg } from "@gme/shared";
import {
  ALLOWED_ORIGINS,
  DRIVE_RATE_LIMIT,
  MAX_DRIVE_LEGS,
  PORT,
  VT_REGION,
} from "./config.js";
import { getDriveMinutes } from "./drive.js";
import { createRateLimiter } from "./rateLimit.js";
import { getTrainStatuses } from "./statusCache.js";

const allowDriveRequest = createRateLimiter(DRIVE_RATE_LIMIT);

/** A parsed leg whose place is inside the area this app serves, or null. */
function parseRegionalDriveLeg(text: string): DriveLeg | null {
  const leg = parseDriveLeg(text);
  if (!leg) return null;
  const { lat, lon } = leg.place;
  const inRegion =
    lat >= VT_REGION.minLat &&
    lat <= VT_REGION.maxLat &&
    lon >= VT_REGION.minLon &&
    lon <= VT_REGION.maxLon;
  return inRegion ? leg : null;
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
    // Fly's proxy sets Fly-Client-IP; the socket address is the proxy itself.
    const client = String(req.headers["fly-client-ip"] ?? req.socket.remoteAddress ?? "unknown");
    if (!allowDriveRequest(client)) {
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
