import { buildAdapterEvidence, type AdapterContext, type GovernedOsintAdapter, type AdapterEvidence } from "./osint-adapter-bus";
import {
  phoneInfogaManifest,
  sherlockManifest,
  theHarvesterManifest,
  spiderfootManifest,
  amassManifest,
  subfinderManifest,
  validateCommandTarget,
  type DishaToolManifest,
} from "./astra6-tool-manifest";

export type Astra6DispatchInput = {
  target: string;
  targetType: string;
  options?: Record<string, string>;
};

export type Astra6DispatchOutput = {
  toolId: string;
  target: string;
  targetType: string;
  dispatchStatus: "queued" | "blocked_by_policy" | "tool_not_available";
  workerRuntime: string;
  cliCommand: string;
  estimatedTimeoutMs: number;
  policyApprovalRequired: boolean;
  options?: Record<string, string>;
};

function isToolAvailable(manifest: DishaToolManifest): boolean {
  const envKey = `DISHA_ASTRA6_${manifest.toolId.toUpperCase().replace(/-/g, "_")}_ENABLED`;
  return process.env[envKey] === "true" || process.env.DISHA_ASTRA6_ALL_TOOLS_ENABLED === "true";
}

function requiresIdentityPolicy(): boolean {
  return process.env.DISHA_IDENTITY_ENUMERATION_APPROVED === "true";
}

function createAstra6Adapter(manifest: DishaToolManifest): GovernedOsintAdapter<Astra6DispatchInput, Astra6DispatchOutput> {
  const isIdentityTool = manifest.targetTypes.includes("username") || manifest.targetTypes.includes("phone_number");

  return {
    metadata: {
      id: `astra6-${manifest.toolId}`,
      name: `ASTRA 6 ${manifest.name}`,
      version: manifest.version,
      capability: manifest.capabilities[0] ?? manifest.toolId,
      auth: "none",
      legalUse: manifest.legalUse,
      blockedUse: manifest.blockedUse,
      rateLimitPerMinute: manifest.rateLimitPerMinute,
      timeoutMs: manifest.timeoutMs,
      maxRetries: manifest.maxRetries,
      executionClass: manifest.executionClass,
      defaultEnabled: true,
      upstreamRepository: manifest.repository,
    },
    async health() {
      if (!isToolAvailable(manifest)) {
        return { status: "not_configured" as const, detail: `${manifest.name} is not enabled. Set DISHA_ASTRA6_${manifest.toolId.toUpperCase().replace(/-/g, "_")}_ENABLED=true or DISHA_ASTRA6_ALL_TOOLS_ENABLED=true.` };
      }
      if (isIdentityTool && !requiresIdentityPolicy()) {
        return { status: "degraded" as const, detail: `${manifest.name} requires DISHA_IDENTITY_ENUMERATION_APPROVED=true for identity investigation tools.` };
      }
      return { status: "healthy" as const, detail: `${manifest.name} worker dispatch ready.` };
    },
    async execute(input: Astra6DispatchInput, context: AdapterContext) {
      const target = validateCommandTarget(input.target, manifest.commandInjectionGuard);
      if (!manifest.targetTypes.includes(input.targetType)) {
        throw new Error(`target_type_mismatch: ${manifest.name} does not accept ${input.targetType}, expected ${manifest.targetTypes.join("/")}`);
      }
      if (isIdentityTool && !requiresIdentityPolicy()) {
        const data: Astra6DispatchOutput = {
          toolId: manifest.toolId,
          target,
          targetType: input.targetType,
          dispatchStatus: "blocked_by_policy",
          workerRuntime: manifest.workerRuntime,
          cliCommand: manifest.cliCommand,
          estimatedTimeoutMs: manifest.timeoutMs,
          policyApprovalRequired: true,
          options: input.options,
        };
        return {
          data,
          evidence: [buildAdapterEvidence({ sourceId: manifest.toolId, sourceName: manifest.name, summary: `${manifest.name} dispatch blocked: identity enumeration policy approval required.` })],
          warnings: [`${manifest.name} requires DISHA_IDENTITY_ENUMERATION_APPROVED=true`],
        };
      }
      const data: Astra6DispatchOutput = {
        toolId: manifest.toolId,
        target,
        targetType: input.targetType,
        dispatchStatus: "queued",
        workerRuntime: manifest.workerRuntime,
        cliCommand: manifest.cliCommand,
        estimatedTimeoutMs: manifest.timeoutMs,
        policyApprovalRequired: false,
        options: input.options,
      };
      return {
        data,
        evidence: [buildAdapterEvidence({
          sourceId: manifest.toolId,
          sourceName: manifest.name,
          sourceUrl: manifest.repository,
          summary: `${manifest.name} dispatch queued for ${input.targetType} target '${target}' via ${manifest.workerRuntime} worker.`,
        })],
      };
    },
  };
}

export const phoneInfogaAdapter = createAstra6Adapter(phoneInfogaManifest);
export const sherlockAdapter = createAstra6Adapter(sherlockManifest);
export const theHarvesterAdapter = createAstra6Adapter(theHarvesterManifest);
export const spiderfootAdapter = createAstra6Adapter(spiderfootManifest);
export const amassAdapter = createAstra6Adapter(amassManifest);
export const subfinderAdapter = createAstra6Adapter(subfinderManifest);

export const astra6Adapters = [
  phoneInfogaAdapter,
  sherlockAdapter,
  theHarvesterAdapter,
  spiderfootAdapter,
  amassAdapter,
  subfinderAdapter,
];
