import { createServer } from "node:http";
import { ALLOWED_ORIGINS, PORT } from "./config.js";
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

  if (req.url === "/status" && req.method === "GET") {
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

  if (req.url === "/health" && req.method === "GET") {
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
