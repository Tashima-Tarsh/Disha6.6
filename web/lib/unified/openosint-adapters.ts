import { openosintClient, OpenOsintMcpClient, type OpenOsintToolResult } from "../server/openosint-mcp-client";
import {
  buildAdapterEvidence,
  type AdapterContext,
  type AdapterEvidence,
  type GovernedOsintAdapter,
} from "./osint-adapter-bus";

function ensurePurpose(context: AdapterContext): void {
  if (!context.purpose || !context.purpose.trim()) {
    throw new Error("purpose_required");
  }
}

function checkIdentityAuth(context: AdapterContext, toolName: string): void {
  const deploymentApproved = process.env.DISHA_IDENTITY_ENUMERATION_APPROVED === "true";
  if (!deploymentApproved || !context.identityAuthorization) {
    throw new Error(`identity_authorization_required: ${toolName} requires deployment approval and investigation authorization.`);
  }
}

function mapResultToEvidence(
  adapterId: string,
  sourceName: string,
  result: OpenOsintToolResult,
): AdapterEvidence[] {
  if (result.records.length === 0) return [];

  const evidenceList: AdapterEvidence[] = [];
  const sourceUrl = "https://github.com/OpenOSINT/OpenOSINT";

  for (let i = 0; i < Math.min(result.records.length, 25); i++) {
    const rec = result.records[i];
    const summary = typeof rec.summary === "string"
      ? rec.summary
      : typeof rec.title === "string"
        ? rec.title
        : JSON.stringify(rec);

    evidenceList.push(
      buildAdapterEvidence({
        sourceId: adapterId,
        sourceName,
        sourceUrl,
        summary: `[${result.tool}] ${summary}`,
        }),
    );
  }

  return evidenceList;
}

export function createOpenOsintMcpAdapter(client: OpenOsintMcpClient = openosintClient): GovernedOsintAdapter<
  { tool: string; arguments?: Record<string, unknown> },
  OpenOsintToolResult
> {
  return {
    metadata: {
      id: "openosint-mcp",
      name: "OpenOSINT MCP Framework",
      version: "2.34.0",
      capability: "multi_source_osint_mcp",
      auth: "none",
      legalUse: ["Authorized security research", "Defensive intelligence", "Passive footprinting"],
      blockedUse: ["Unauthorized scanning", "Harassment", "Covert tracking"],
      rateLimitPerMinute: 60,
      timeoutMs: 30_000,
      maxRetries: 1,
    },
    async health() {
      const h = await client.checkHealth();
      return {
        status: h.status === "HEALTHY" ? "healthy" : h.status === "DEGRADED" ? "degraded" : "unavailable",
        detail: h.detail,
      };
    },
    async execute(input, context) {
      ensurePurpose(context);
      const isIdentity = ["search_username", "search_email", "search_phone"].includes(input.tool);
      if (isIdentity) checkIdentityAuth(context, input.tool);

      const res = await client.callTool(input.tool, input.arguments || {}, {
        signal: context.signal,
        timeoutMs: 30_000,
        allowActive: context.activeAuthorization === true,
      });

      if (res.status === "AUTH_REQUIRED") {
        throw new Error(`key_required: ${res.keyRequired || "API credential required"}`);
      }
      if (res.status === "BLOCKED_BY_POLICY") {
        throw new Error(`blocked_by_policy: ${res.warnings[0] || "Tool disabled in passive mode"}`);
      }

      return {
        data: res,
        evidence: mapResultToEvidence("openosint-mcp", "OpenOSINT MCP", res),
        warnings: res.warnings,
      };
    },
  };
}

export function createOpenOsintDnsAdapter(client: OpenOsintMcpClient = openosintClient): GovernedOsintAdapter<
  { domain: string },
  OpenOsintToolResult
> {
  return {
    metadata: {
      id: "openosint-dns",
      name: "OpenOSINT DNS & Email Security",
      version: "2.34.0",
      capability: "dns_email_security_analysis",
      auth: "none",
      legalUse: ["Passive DNS inspection", "SPF/DMARC/DKIM verification", "Defensive exposure review"],
      blockedUse: ["Unauthorized active scanning"],
      rateLimitPerMinute: 60,
      timeoutMs: 15_000,
      maxRetries: 1,
    },
    async health() {
      const h = await client.checkHealth();
      return { status: h.available ? "healthy" : "unavailable", detail: h.detail };
    },
    async execute(input, context) {
      ensurePurpose(context);
      const res = await client.callTool("search_dns", { domain: input.domain }, {
        signal: context.signal,
        timeoutMs: 15_000,
        allowActive: context.activeAuthorization === true,
      });

      return {
        data: res,
        evidence: mapResultToEvidence("openosint-dns", "OpenOSINT DNS", res),
        warnings: res.warnings,
      };
    },
  };
}

export function createOpenOsintRdapAdapter(client: OpenOsintMcpClient = openosintClient): GovernedOsintAdapter<
  { domain: string },
  OpenOsintToolResult
> {
  return {
    metadata: {
      id: "openosint-rdap",
      name: "OpenOSINT RDAP Registration",
      version: "2.34.0",
      capability: "structured_rdap_registration",
      auth: "none",
      legalUse: ["Domain registration discovery", "Defensive ownership audit"],
      blockedUse: ["Credential attacks", "Covert tracking"],
      rateLimitPerMinute: 60,
      timeoutMs: 15_000,
      maxRetries: 1,
    },
    async health() {
      const h = await client.checkHealth();
      return { status: h.available ? "healthy" : "unavailable", detail: h.detail };
    },
    async execute(input, context) {
      ensurePurpose(context);
      const res = await client.callTool("search_rdap", { domain: input.domain }, {
        signal: context.signal,
        timeoutMs: 15_000,
      });

      return {
        data: res,
        evidence: mapResultToEvidence("openosint-rdap", "OpenOSINT RDAP", res),
        warnings: res.warnings,
      };
    },
  };
}

export function createOpenOsintWhoisAdapter(client: OpenOsintMcpClient = openosintClient): GovernedOsintAdapter<
  { domain: string },
  OpenOsintToolResult
> {
  return {
    metadata: {
      id: "openosint-whois",
      name: "OpenOSINT WHOIS Registration",
      version: "2.34.0",
      capability: "registrar_whois_query",
      auth: "none",
      legalUse: ["Domain registration review", "Defensive cyber exposure"],
      blockedUse: ["Bulk harvesting"],
      rateLimitPerMinute: 40,
      timeoutMs: 15_000,
      maxRetries: 1,
    },
    async health() {
      const h = await client.checkHealth();
      return { status: h.available ? "healthy" : "unavailable", detail: h.detail };
    },
    async execute(input, context) {
      ensurePurpose(context);
      const res = await client.callTool("search_whois", { domain: input.domain }, {
        signal: context.signal,
        timeoutMs: 15_000,
      });

      return {
        data: res,
        evidence: mapResultToEvidence("openosint-whois", "OpenOSINT WHOIS", res),
        warnings: res.warnings,
      };
    },
  };
}

export function createOpenOsintDorksAdapter(client: OpenOsintMcpClient = openosintClient): GovernedOsintAdapter<
  { target: string },
  OpenOsintToolResult
> {
  return {
    metadata: {
      id: "openosint-dorks",
      name: "OpenOSINT Google Dorks Generator",
      version: "2.34.0",
      capability: "search_dork_generation",
      auth: "none",
      legalUse: ["Passive footprinting", "Public information discovery"],
      blockedUse: ["Automated denial of service"],
      rateLimitPerMinute: 120,
      timeoutMs: 5_000,
      maxRetries: 1,
    },
    async health() {
      const h = await client.checkHealth();
      return { status: h.available ? "healthy" : "unavailable", detail: h.detail };
    },
    async execute(input, context) {
      ensurePurpose(context);
      const res = await client.callTool("generate_dorks", { target: input.target }, {
        signal: context.signal,
        timeoutMs: 5_000,
      });

      return {
        data: res,
        evidence: mapResultToEvidence("openosint-dorks", "OpenOSINT Dorks", res),
        warnings: res.warnings,
      };
    },
  };
}

export function createOpenOsintIpAdapter(client: OpenOsintMcpClient = openosintClient): GovernedOsintAdapter<
  { ip: string },
  OpenOsintToolResult
> {
  return {
    metadata: {
      id: "openosint-ip",
      name: "OpenOSINT IP & ASN Intelligence",
      version: "2.34.0",
      capability: "ip_asn_reputation_intelligence",
      auth: "none",
      legalUse: ["Defensive IP lookup", "ASN routing review", "Abuse reputation check"],
      blockedUse: ["Active port scanning", "Target interrogation"],
      rateLimitPerMinute: 60,
      timeoutMs: 15_000,
      maxRetries: 1,
    },
    async health() {
      const h = await client.checkHealth();
      return { status: h.available ? "healthy" : "unavailable", detail: h.detail };
    },
    async execute(input, context) {
      ensurePurpose(context);
      // Run search_ip or search_abuseipdb if key is configured
      const tool = process.env.ABUSEIPDB_API_KEY ? "search_abuseipdb" : "search_ip";
      const res = await client.callTool(tool, { ip: input.ip }, {
        signal: context.signal,
        timeoutMs: 15_000,
      });

      return {
        data: res,
        evidence: mapResultToEvidence("openosint-ip", "OpenOSINT IP", res),
        warnings: res.warnings,
      };
    },
  };
}

export function createOpenOsintGithubAdapter(client: OpenOsintMcpClient = openosintClient): GovernedOsintAdapter<
  { query: string },
  OpenOsintToolResult
> {
  return {
    metadata: {
      id: "openosint-github",
      name: "OpenOSINT GitHub Reconnaissance",
      version: "2.34.0",
      capability: "public_github_intelligence",
      auth: "none",
      legalUse: ["Public repository discovery", "Developer profile research"],
      blockedUse: ["Private repository extraction", "Credential attacks"],
      rateLimitPerMinute: 60,
      timeoutMs: 20_000,
      maxRetries: 1,
    },
    async health() {
      const h = await client.checkHealth();
      return { status: h.available ? "healthy" : "unavailable", detail: h.detail };
    },
    async execute(input, context) {
      ensurePurpose(context);
      const res = await client.callTool("search_github", { query: input.query }, {
        signal: context.signal,
        timeoutMs: 20_000,
      });

      return {
        data: res,
        evidence: mapResultToEvidence("openosint-github", "OpenOSINT GitHub", res),
        warnings: res.warnings,
      };
    },
  };
}

export function createOpenOsintBreachAdapter(client: OpenOsintMcpClient = openosintClient): GovernedOsintAdapter<
  { email: string },
  OpenOsintToolResult
> {
  return {
    metadata: {
      id: "openosint-breach",
      name: "OpenOSINT HaveIBeenPwned Breach Query",
      version: "2.34.0",
      capability: "breach_status_verification",
      auth: "api_key",
      legalUse: ["Breach exposure review", "Defensive account audit"],
      blockedUse: ["Credential credential stuffing", "Password harvesting"],
      rateLimitPerMinute: 30,
      timeoutMs: 15_000,
      maxRetries: 1,
    },
    async health() {
      const configured = Boolean(process.env.HIBP_API_KEY?.trim());
      return {
        status: configured ? "healthy" : "not_configured",
        detail: configured ? "HIBP_API_KEY configured" : "HIBP_API_KEY is required for breach checks",
      };
    },
    async execute(input, context) {
      ensurePurpose(context);
      if (!process.env.HIBP_API_KEY?.trim()) {
        throw new Error("key_required: HIBP_API_KEY");
      }

      const res = await client.callTool("search_breach", { email: input.email }, {
        signal: context.signal,
        timeoutMs: 15_000,
      });

      return {
        data: res,
        evidence: mapResultToEvidence("openosint-breach", "OpenOSINT HIBP", res),
        warnings: res.warnings,
      };
    },
  };
}

export function createOpenOsintGithubForensicsAdapter(): GovernedOsintAdapter<
  { handle: string },
  any
> {
  return {
    metadata: {
      id: "openosint-github-forensics",
      name: "OpenOSINT Deep GitHub Forensics & Attribution",
      version: "2.34.0",
      capability: "deep_github_forensics",
      auth: "none",
      legalUse: ["Forensic commit attribution", "Cryptographic key extraction", "Judicial digital evidence"],
      blockedUse: ["Account harassment", "Credential attacks"],
      rateLimitPerMinute: 60,
      timeoutMs: 30_000,
      maxRetries: 1,
    },
    async health() {
      return { status: "healthy", detail: "Deep GitHub forensic analysis online" };
    },
    async execute(input, context) {
      ensurePurpose(context);
      const { deepGithubForensicEngine } = await import("./github-forensic-engine");
      try {
        const report = await deepGithubForensicEngine.analyze(input.handle);

        const evidence: AdapterEvidence[] = report.evidenceItems.map((e) => ({
          id: e.id,
          sourceId: e.sourceId,
          sourceName: e.sourceName,
          sourceUrl: e.url,
          summary: e.summary,
          retrievedAt: e.retrievedAt,
          provenanceHash: e.provenanceHash,
          fields: (e as any).fields,
        }));

        return {
          data: report,
          evidence,
          warnings: [],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/not found/i.test(msg)) {
          return {
            data: { handle: input.handle, exists: false },
            evidence: [],
            warnings: [`GitHub account "${input.handle}" does not exist`],
          };
        }
        throw err;
      }
    },
  };
}

