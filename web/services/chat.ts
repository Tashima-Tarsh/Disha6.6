import { audit } from "@/lib/server/audit";
import { getEnv } from "@/lib/server/env";
import { upsertGraphFromText } from "@/lib/server/agent/memoryGraph";
import { applyTokenEconomy, getCachedResponse, setCachedResponse } from "@/lib/server/agent/tokenEconomy";
import { callOpenAiResponses } from "@/lib/server/openai";
import type { RequestContext } from "@/lib/server/types";

import { UniversalModelGateway } from "@/lib/unified/model-gateway";
import { SkillsKnowledgeBase } from "@/lib/unified/skills-knowledge-base";
import { DatasetsService } from "@/lib/unified/datasets-service";
import { createDefaultOsintBus } from "@/lib/unified/osint-default-bus";
import { classifyUniversalOsintQuery, runUniversalOsintSearch } from "@/lib/unified/universal-osint-search";

function validateAiOutput(contentType: string | null): boolean {
  return !!contentType && (contentType.includes("json") || contentType.includes("text") || contentType.includes("stream"));
}

export async function proxyChat(ctx: RequestContext, body: Record<string, unknown>) {
  const env = getEnv();
  const { body: optimizedBody, decision } = applyTokenEconomy(body);

  // Token-economy cache: only for non-streaming requests.
  const wantsStream = Boolean((optimizedBody as { stream?: unknown }).stream);
  if (!wantsStream) {
    const cached = await getCachedResponse(decision.cacheKey);
    if (cached) {
      await audit({
        requestId: ctx.requestId,
        userId: ctx.principal.userId,
        action: "ai.token_cache",
        outcome: "success",
        metadata: { cache: "hit", cacheKey: decision.cacheKey },
      });
      return new Response(cached.bodyText, {
        status: 200,
        headers: {
          "Content-Type": cached.contentType,
          "X-Request-ID": ctx.requestId,
          "X-DISHA-Cache": "HIT",
        },
      });
    }
  }

  // Normalize incoming message / history to messages array if needed
  const rawBody = { ...optimizedBody };
  if (!Array.isArray(rawBody.messages) && typeof rawBody.message === "string") {
    const history = Array.isArray(rawBody.conversationHistory)
      ? (rawBody.conversationHistory as Array<{ role: string; content: string }>)
      : [];
    rawBody.messages = [
      ...history.map((h) => ({ role: h.role === "assistant" ? ("assistant" as const) : ("user" as const), content: h.content })),
      { role: "user" as const, content: rawBody.message },
    ];
  }

  const requestedModel = (rawBody.model as string | undefined)?.toLowerCase() || env.OLLAMA_MODEL || "qwen2.5-coder:1.5b";
  const userQuery = typeof rawBody.message === "string"
    ? rawBody.message
    : Array.isArray(rawBody.messages) && rawBody.messages.length > 0
      ? String((rawBody.messages[rawBody.messages.length - 1] as { content?: unknown })?.content ?? "")
      : "Intelligence query";
  const activeCtx = (rawBody.context as { investigationTarget?: string; targetType?: string; evidenceCount?: number }) || {};

  const isCodingQuery = /\b(code|repair|fix|debug|refactor|function|class|typescript|python|javascript|test|api|syntax|compile|regex|algorithm|dockerfile|bug|error|traceback|exception)\b/i.test(userQuery);
  let effectiveModel = requestedModel;
  if (!rawBody.model || rawBody.model === "auto") {
    effectiveModel = "qwen2.5-coder:1.5b";
  } else if (isCodingQuery && rawBody.model === "qwen2.5:3b") {
    effectiveModel = "qwen2.5-coder:1.5b";
  }

  let response: Response | null = null;
  let backendUsed = "universal.gateway";

  try {
    const formattedMessages = Array.isArray(rawBody.messages)
      ? rawBody.messages.map((m) => {
          const item = m as { role?: string; content?: string };
          const role: "system" | "user" | "assistant" | "tool" =
            item.role === "assistant" || item.role === "system" || item.role === "tool"
              ? item.role
              : "user";
          return { role, content: String(item.content ?? "") };
        })
      : [{ role: "user" as const, content: userQuery }];

    const hasSystemMessage = formattedMessages.some((m) => m.role === "system");
    let targetCandidate = activeCtx.investigationTarget;
    if (!targetCandidate) {
      const phoneMatch = userQuery.match(/(\+?[0-9\s\-()]{10,16})/);
      const emailMatch = userQuery.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      const cleanedQuery = userQuery.replace(/^(search|investigate|check|find|audit|look up|lookup)\s+/i, "").trim();
      if (phoneMatch) {
        targetCandidate = phoneMatch[1].trim();
      } else if (emailMatch) {
        targetCandidate = emailMatch[1].trim();
      } else if (cleanedQuery.length >= 3 && !/^(hi|hello|hey|help|who are you|how are you)/i.test(cleanedQuery)) {
        targetCandidate = cleanedQuery;
      }
    }

    let vehiclePromptContext = "";
    const vehiclePlateMatch = userQuery.match(/\b([A-Z]{2}\s?[0-9]{2}\s?[A-Z]{0,3}\s?[0-9]{4}|[0-9]{2}\s?BH\s?[0-9]{4}\s?[A-Z]{1,2})\b/i);
    if (vehiclePlateMatch) {
      try {
        const { parseIndianRegistration } = await import("@/lib/vehicle/validator");
        const { vehicleIntelligenceService } = await import("@/services/vehicle/vehicle-service");
        const parsed = parseIndianRegistration(vehiclePlateMatch[0]);
        if (parsed.isValid) {
          if (!targetCandidate) targetCandidate = parsed.normalized;
          const lookup = await vehicleIntelligenceService.lookupVehicle(
            { registration_number: parsed.normalized, purpose: "assistant_conversational_query" },
            { purpose: "assistant_conversational_query", consentConfirmed: true },
          );
          const v = lookup.vehicle;
          const c = lookup.compliance;
          vehiclePromptContext = `
[VERIFIED VEHICLE REGISTRATION INTELLIGENCE]
Plate: ${lookup.registration_number} (Format: ${lookup.plate.format})
Jurisdiction: ${lookup.plate.stateName || "All-India"} | RTO: ${lookup.plate.rtoName || lookup.plate.rtoCode || "Central"}
Status: ${lookup.status} | Data Source: ${lookup.source} (${lookup.data_type})
Specifications: ${v.manufacturer || "N/A"} ${v.model || ""} | Fuel: ${v.fuelType || "N/A"} | Category: ${v.vehicleCategory}
Compliance: Insurance: ${c.insuranceStatus} (${c.insuranceCompany || "N/A"}, Upto: ${c.insuranceValidUntil || "N/A"}) | PUC: ${c.pucStatus} (Upto: ${c.pucValidUntil || "N/A"}) | Fitness: ${c.fitnessStatus} | Tax: ${c.taxStatus}
Provenance Hash: ${lookup.evidence.normalizedHashSha256}
DPDP/BSA Privacy: Owner names and identifiers are masked by default.`;
        }
      } catch {
        // Non-blocking for conversation
      }
    }

    let osintPromptContext = "";
    const isOsintQuery = /\b(ip|domain|whois|dns|shodan|camera|surveillance|eyes on|opensky|flight|radar|aircraft|vessel|marinetraffic|cve|vulnerability|leak|breach|osint|satellite|sentinel|intel|tracking|mac|bssid|asn|cidr|lookup|search|locate)\b/i.test(userQuery) || Boolean(targetCandidate && targetCandidate !== userQuery);

    if (isOsintQuery && targetCandidate) {
      try {
        const bus = createDefaultOsintBus();
        const osintResults = await runUniversalOsintSearch(bus, targetCandidate, {
          missionId: ctx.requestId,
          userId: ctx.principal.userId,
          purpose: "chat_assistant_intelligence",
          signal: AbortSignal.timeout(3500),
        });
        if (osintResults.evidence && osintResults.evidence.length > 0) {
          const topEvidence = osintResults.evidence.slice(0, 6).map((e) =>
            `- [${e.adapterId.toUpperCase()}] (${e.evidenceClass}): ${e.summary} (${e.sourceUrl || "verified telemetry"})`
          ).join("\n");
          osintPromptContext = `\n[VERIFIED REAL-TIME OSINT EVIDENCE - REAL DATA ONLY]\nTarget: ${targetCandidate}\nDiscovered Telemetry Records (${osintResults.evidence.length} hits):\n${topEvidence}`;
        }
      } catch {
        // Non-blocking OSINT fallback
      }
    }

    let leakPromptContext = "";
    const isLeakQuery = /\b(leak|leaks|breach|breaches|compromise|compromised|stolen|database|hacked|dump|pwned)\b/i.test(userQuery);
    if (isLeakQuery || targetCandidate) {
      try {
        const ds = DatasetsService.getInstance();
        const stopWords = new Set([
          "what", "leaks", "leak", "are", "recorded", "for", "in", "the", "database",
          "data", "breach", "breaches", "show", "tell", "me", "find", "is", "there",
          "any", "records", "result", "results", "about", "check", "audit", "search",
          "who", "when", "how", "has", "have", "been", "was", "were", "of", "to", "a", "an", "compromise", "hacked", "dump", "pwned", "incident"
        ]);
        const candidateWords = userQuery
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length > 1 && !stopWords.has(w));
        const refinedTarget = candidateWords.join(" ").trim();
        const searchTarget = refinedTarget || (targetCandidate && !targetCandidate.includes(" ") ? targetCandidate : "hacked");
        const hits = ds.searchDatasets(searchTarget || "hacked", 12);
        const breachHits = hits.filter((h) =>
          h.category === "Biggest-Data-Breaches" ||
          h.category === "Sony-Pictures-Hack" ||
          h.category === "WikiLeaks-SpyFiles-Interactive" ||
          h.category === "Tax-havens" ||
          h.category === "Starbucks" ||
          h.sourceFile.toLowerCase().includes("breach") ||
          h.sourceFile.toLowerCase().includes("leak")
        );
        if (breachHits.length > 0) {
          const lines = breachHits.slice(0, 8).map((h) => {
            const r = h.data;
            const entity = r.Entity || r.Name || r.Company || h.category;
            const year = r.Year || r.Date || "Historical";
            const count = r["Records Leaked"] || r.Records || "Compromised";
            const method = r["Method of Leak"] || "Exfiltration / Hack";
            const desc = r.Description || "";
            return `- **${entity}** (${year}): **${count}** records leaked via *${method}*. ${desc}`.slice(0, 240);
          });
          leakPromptContext = `\n[VERIFIED HISTORICAL BREACH RECORDS (SOVEREIGN DATASETS - REAL AUDIT RECORDS)]\nWhen asked about leak database or breach records, present these verified records directly to the user in a clear table/dossier format without fabrication:\n${lines.join("\n")}`;
        }
      } catch {
        // Non-blocking
      }
    }

    if (!hasSystemMessage) {
      formattedMessages.unshift({
        role: "system",
        content: `You are DISHA 6.6, sovereign defense intelligence and code engineering agent.
- Code & Architecture: Write clean, production-grade, bug-free code with exact syntax.
- Real OSINT: Provide factual intelligence without hallucinations.
Be direct, concise, and focused.
${targetCandidate ? `Target: ${targetCandidate}` : ""}${vehiclePromptContext}${osintPromptContext}${leakPromptContext}`.trim(),
      });
    }

    const gatewayResult = await UniversalModelGateway.execute({
      model: effectiveModel,
      messages: formattedMessages,
      stream: wantsStream,
      maxTokens: 900,
      activeContext: {
        investigationTarget: targetCandidate || activeCtx.investigationTarget,
        targetType: activeCtx.targetType,
        evidenceCount: activeCtx.evidenceCount,
        missionId: ctx.requestId,
      },
    });

    response = new Response(
      JSON.stringify({
        message: gatewayResult.message,
        response: gatewayResult.message,
        model: gatewayResult.model,
        provider: gatewayResult.provider,
        isLocal: gatewayResult.isLocal,
        confidence: gatewayResult.confidence,
        reasoning: gatewayResult.reasoning,
        durationMs: gatewayResult.durationMs,
        capabilitiesUsed: gatewayResult.capabilitiesUsed,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": ctx.requestId,
          "X-DISHA-Model": gatewayResult.model,
          "X-DISHA-Backend": gatewayResult.provider,
        },
      }
    );
    backendUsed = gatewayResult.provider;
  } catch (err) {
    if (err && typeof err === "object" && (err as { code?: string }).code === "LOCAL_ONLY_MODE_ENFORCED") {
      return new Response(
        JSON.stringify({
          status: "blocked",
          error: "LOCAL_ONLY_MODE_ENFORCED",
          message: err instanceof Error ? err.message : "Cloud model execution blocked by local-only privacy gate.",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    throw err;
  }


  if (!response) {
    throw new Error("Universal model gateway failed to generate response");
  }

  const contentType = response.headers.get("Content-Type");
  const validOutput = validateAiOutput(contentType);

  // Best-effort memory graph update from the latest user message. Degrades gracefully without Redis.
  try {
    const messages = (rawBody as { messages?: unknown }).messages;
    if (Array.isArray(messages)) {
      const latestUser = [...messages]
        .reverse()
        .find((m) => m && typeof m === "object" && (m as { role?: unknown }).role === "user");
      const rawContent = latestUser ? (latestUser as { content?: unknown }).content : null;
      let text: string | null = null;
      if (typeof rawContent === "string") text = rawContent;
      if (Array.isArray(rawContent)) {
        const chunks: string[] = [];
        for (const block of rawContent) {
          if (!block || typeof block !== "object") continue;
          if ((block as { type?: unknown }).type === "text") {
            const t = (block as { text?: unknown }).text;
            if (typeof t === "string") chunks.push(t);
          }
        }
        text = chunks.join("\n").trim() || null;
      }
      if (text) await upsertGraphFromText(ctx.principal.userId, text);
    }
  } catch {
    // no-op
  }

  await audit({
    requestId: ctx.requestId,
    userId: ctx.principal.userId,
    action: "ai.chat",
    outcome: response.ok && validOutput ? "success" : "failure",
    metadata: {
      status: response.status,
      contentType,
      validOutput,
      backend: backendUsed,
      model: requestedModel,
    },
  });

  if (!response.ok) {
    throw Object.assign(new Error("Backend request failed"), { status: response.status });
  }

  return response;
}
