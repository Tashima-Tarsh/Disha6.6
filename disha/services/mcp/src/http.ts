import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer, SRC_ROOT } from "./server.js";

/**
 * HTTP / SSE entrypoint — for remote use.
 *
 * Constitutional requirement (Article V):
 *   Authentication fails closed. No optional open mode.
 *
 * Environment variables:
 *   PORT            — Port to listen on (default: 3000)
 *   DISHA_SRC_ROOT  — Path to DISHA monorepo root
 *   MCP_API_KEY     — Bearer token for authentication (REQUIRED)
 */

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.MCP_API_KEY;

const mcpServer = createServer();

// Per-client session isolation (no shared mutable transport)
const sessions = new Map<string, SSEServerTransport>();

// Auth middleware — FAIL CLOSED
const auth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!API_KEY) {
    res.status(503).json({
      error: "MCP service is not configured with MCP_API_KEY. Refusing to operate open.",
    });
    return;
  }
  const authHeader = req.headers.authorization;
  if (authHeader === `Bearer ${API_KEY}`) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
};

// SSE transport setup — one transport per session
app.get("/sse", auth, async (req, res) => {
  const sessionId = req.query.sessionId as string || crypto.randomUUID();
  const transport = new SSEServerTransport("/messages", res);
  sessions.set(sessionId, transport);
  res.on("close", () => {
    sessions.delete(sessionId);
  });
  await mcpServer.connect(transport);
});

// Messages endpoint (for SSE)
app.post("/messages", auth, express.json(), async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = sessionId ? sessions.get(sessionId) : undefined;
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).json({ error: "No active SSE connection for this session" });
  }
});

// Streamable HTTP endpoint (for modern clients)
app.post("/mcp", auth, express.json(), async (req, res) => {
  res.status(501).json({
    error: "Streamable HTTP not fully implemented in this wrapper yet. Use /sse instead.",
  });
});

// Health check (intentionally unauthenticated for probes)
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    root: SRC_ROOT,
    authRequired: true,
    configured: Boolean(API_KEY),
  });
});

app.listen(PORT, () => {
  console.log(`DISHA Intelligence Explorer MCP (HTTP) listening on port ${PORT}`);
  console.log(`Source root: ${SRC_ROOT}`);
  if (!API_KEY) {
    console.warn("WARNING: MCP_API_KEY is not set. All authenticated routes will return 503.");
  }
});
