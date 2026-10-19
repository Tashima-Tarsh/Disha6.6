import { writeFile } from "node:fs/promises";

const base = process.env.PENTAGI_OLLAMA_URL || "http://127.0.0.1:11434";
const results = { checkedAt: new Date().toISOString(), base, checks: {} };

async function post(path, payload) {
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(body.error);
  return body;
}

try {
  const metadata = await post("/api/show", { model: "qwen2.5:3b" });
  results.checks.model = {
    parameters: metadata.details?.parameter_size,
    quantization: metadata.details?.quantization_level,
    pass: Number(metadata.model_info?.["general.parameter_count"]) > 3_000_000_000,
  };
  const started = Date.now();
  const chat = await post("/api/chat", {
    model: "qwen2.5:3b",
    messages: [{ role: "user", content: "Call the echo function with value 4." }],
    tools: [{ type: "function", function: {
      name: "echo",
      description: "Echo a number during a local installation test.",
      parameters: { type: "object", properties: { value: { type: "integer" } }, required: ["value"] },
    } }],
    stream: false,
    keep_alive: 0,
    options: { temperature: 0, num_predict: 96, num_ctx: 4096 },
  });
  const call = chat.message?.tool_calls?.find((item) => item.function?.name === "echo");
  results.checks.toolCall = {
    pass: call?.function?.arguments?.value === 4,
    durationMs: Date.now() - started,
    function: call?.function?.name ?? null,
    value: call?.function?.arguments?.value ?? null,
  };
  const embedding = await post("/api/embed", {
    model: "nomic-embed-text", input: "PentAGI local installation verification.", keep_alive: 0,
  });
  const vector = embedding.embeddings?.[0];
  results.checks.embeddings = {
    pass: Array.isArray(vector) && vector.length === 768 && vector.every(Number.isFinite),
    dimensions: vector?.length ?? 0,
  };
} catch (error) {
  results.error = error.message;
}
results.pass = !results.error && Object.values(results.checks).every((check) => check.pass);
await writeFile(new URL("../reports/pentagi-model-verification.json", import.meta.url), `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify(results, null, 2));
if (!results.pass) process.exitCode = 1;
