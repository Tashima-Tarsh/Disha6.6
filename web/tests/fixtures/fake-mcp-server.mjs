// Fake MCP stdio server for DISHA governed-tool tests.
// Implements JSON-RPC 2.0 over stdio: initialize, initialized, tools/list, tools/call.
// Exposed tools:
//   - echo.read (read class): returns the input target back.
//   - nuclei.scan (read class): normalizes nuclei-like JSON output.
//   - pentagi.run_task (execute class): requires mayMutate.
//   - hexstrike.exploit (exploit class): requires explicit mayMutate + admin.

import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";

const rl = createInterface({ input: stdin });

function respond(obj) {
  stdout.write(JSON.stringify(obj) + "\n");
}

let initialized = false;

function handleMessage(line) {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  const { id, method, params } = msg;

  if (method === "initialize") {
    respond({
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "fake-mcp-test-server", version: "1.0.0" },
      },
    });
    return;
  }
  if (method === "initialized") {
    initialized = true;
    respond({ id, result: null });
    return;
  }
  if (!initialized) {
    respond({ id, error: { code: -32002, message: "not initialized" } });
    return;
  }
  if (method === "tools/list") {
    respond({
      id,
      result: {
        tools: [
          {
            name: "echo.read",
            description: "Read-only echo of the supplied target.",
            inputSchema: {
              type: "object",
              properties: { target: { type: "string" } },
              required: ["target"],
            },
            outputSchema: { type: "object", properties: { echo: { type: "string" } } },
            annotations: { readOnlyHint: true, title: "Echo read" },
          },
          {
            name: "nuclei.scan",
            description: "Nuclei-like vulnerability scan result.",
            inputSchema: {
              type: "object",
              properties: { target: { type: "string" }, templates: { type: "array" } },
              required: ["target"],
            },
            outputSchema: { type: "object" },
            annotations: { readOnlyHint: true, title: "Nuclei scan" },
          },
          {
            name: "pentagi.run_task",
            description: "Autonomous agent task (execute class).",
            inputSchema: { type: "object", properties: { task: { type: "string" } }, required: ["task"] },
            outputSchema: { type: "object", properties: { agentSummary: { type: "string" } } },
            annotations: { readOnlyHint: false, title: "Pentagi run task" },
          },
          {
            name: "hexstrike.exploit",
            description: "Exploit validation (exploit class, may mutate target).",
            inputSchema: { type: "object", properties: { target: { type: "string" }, module: { type: "string" } }, required: ["target", "module"] },
            outputSchema: { type: "object", properties: { poc: { type: "string" } } },
            annotations: { destructiveHint: true, title: "HexStrike exploit" },
          },
        ],
      },
    });
    return;
  }
  if (method === "tools/call") {
    const p = params;
    const name = p && p.name;
    const args = p && p.arguments ? p.arguments : {};

    if (name === "echo.read") {
      respond({ id, result: { ok: true, structuredContent: { echo: args.target || "" } } });
      return;
    }
    if (name === "nuclei.scan") {
      const target = args.target || "";
      respond({
        id,
        result: {
          ok: true,
          structuredContent: {
            target,
            "matched-at": "https://" + target,
            info: { name: "misconfig-header", severity: "medium" },
            extracted_results: ["X-Frame-Options missing"],
          },
        },
      });
      return;
    }
    if (name === "pentagi.run_task") {
      respond({
        id,
        result: { ok: true, structuredContent: { agentSummary: "Task completed autonomously", task: args.task } },
      });
      return;
    }
    if (name === "hexstrike.exploit") {
      respond({
        id,
        result: { ok: true, structuredContent: { poc: "validated", module: args.module } },
      });
      return;
    }
    respond({ id, error: { code: -32601, message: "method not found: " + name } });
  }
}

rl.on("line", handleMessage);
stdout.write("READY\n");
