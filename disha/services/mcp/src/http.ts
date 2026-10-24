import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer, SRC_ROOT } from "./server.js";
import { randomUUID } from "crypto";

/**
 * Constitutional MCP HTTP entrypoint.
 * Authentication fails closed. No optional open mode.
 */

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.MCP_API_KEY;

const mcpServer = createServer();
const sessions = new Map<string, SSEServerTransport>();

const auth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!API_KEY) {
    res.status(503).json({
      error: "MCP service is not configured with MCP_API_KEY. Refusing to operate open.",
    });
    return;
  }
  const authHeader = req.headers.authorization;
  if (authHeader === `Bearer ${API_KEY}`) return next();
  res.status(401).json({ error: "Unauthorized" });
};

app.get("/sse", auth, async (req, res) => {
  const sessionId = (req.query.sessionId as string) || randomUUID();
  const transport = new SSEServerTransport("/messages", res);
  sessions.set(sessionId, transport);
  res.on("close", () => sessions.delete(sessionId));
  await mcpServer.connect(transport);
});

app.post("/messages", auth, express.json(), async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = sessionId ? sessions.get(sessionId) : undefined;
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).json({ error: "No active SSE connection for this session" });
  }
});

app.post("/mcp", auth, express.json(), async (_req, res) => {
  res.status(501).json({
    error: "Streamable HTTP not fully implemented. Use /sse instead.",
  });
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    root: SRC_ROOT,
    authRequired: true,
    configured: Boolean(API_KEY),
  });
});

app.listen(PORT, () => {
  console.log(`DISHA MCP (HTTP) listening on port ${PORT}`);
  if (!API_KEY) {
    console.warn("WARNING: MCP_API_KEY not set. Authenticated routes will return 503.");
  }
});
