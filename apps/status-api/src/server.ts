import { createServer } from "node:http";
import { parseDriveLeg, type HomeDriveLeg } from "@gme/shared";
import { ALLOWED_ORIGINS, MAX_DRIVE_LEGS, PORT } from "./config.js";
import { getDriveHomeMinutes } from "./driveHome.js";
import { getTrainStatuses } from "./statusCache.js";

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

  // ?legs=ALB@2026-10-05T18:00,FED@2026-10-05T17:30 → { minutes: { "ALB@…": 97.4, … } }
  if (url.pathname === "/drive-home" && req.method === "GET") {
    const raw = (url.searchParams.get("legs") ?? "").split(",").filter(Boolean);
    const legs = raw.map(parseDriveLeg);
    if (raw.length === 0 || raw.length > MAX_DRIVE_LEGS || legs.includes(null)) {
      res.writeHead(400, { ...headers, "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "bad legs" }));
      return;
    }

    try {
      const minutes = await getDriveHomeMinutes(legs as HomeDriveLeg[]);
      res.writeHead(200, { ...headers, "Content-Type": "application/json" });
      res.end(JSON.stringify({ minutes, generatedAt: new Date().toISOString() }));
    } catch (error) {
      console.error("Unexpected error serving /drive-home:", error);
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
