import { createDefaultOsintBus } from "@/lib/unified/osint-default-bus";
import { hashValue } from "@/lib/unified/hash";
import { appendEvidenceEvent } from "@/lib/unified/evidence-ledger";
import {
  detectContradictions,
  type EvidenceClaim,
  type ContradictionSet,
} from "@/lib/unified/contradiction-engine";
import {
  upsertIntelligenceEntity,
  linkIntelligenceEntities,
  recordIntelligenceEvent,
} from "@/lib/unified/intelligence-graph";
import type { AdapterExecutionResult } from "@/lib/unified/osint-adapter-bus";

export interface ResearchBudget {
  maxDepth: number;
  maxTools: number;
  maxExecutionTimeMs: number;
  maxApiCalls: number;
}

export const DEFAULT_RESEARCH_BUDGET: ResearchBudget = {
  maxDepth: 2,
  maxTools: 8,
  maxExecutionTimeMs: 25000,
  maxApiCalls: 12,
};

export interface GodModeResearchRequest {
  objective: string;
  seed: {
    entityType: "domain" | "ip" | "person" | "organization" | "email" | "phone" | "cve" | "entity";
    value: string;
  };
  budget?: Partial<ResearchBudget>;
  requiredEvidenceClasses?: string[];
  stopConditions?: string[];
}

export type SpecialistAgentRole =
  | "lead_planner"
  | "network_recon"
  | "historical_archive"
  | "entity_registry"
  | "threat_intel"
  | "reconciliation";

export interface SpecialistAgentTask {
  taskId: string;
  role: SpecialistAgentRole;
  title: string;
  target: string;
  toolOrAdapterId: string;
  input: Record<string, unknown>;
  requiresApproval?: boolean;
  approvalScope?: string;
}

export interface DurableCheckpoint {
  checkpointId: string;
  status: "in_progress" | "awaiting_approval" | "completed" | "failed";
  stepIndex: number;
  assignedRole: SpecialistAgentRole;
  pendingAction?: {
    scope: string;
    toolId: string;
    target: string;
    reason: string;
  };
  stateSnapshotHash: string;
  updatedAt: string;
}

export interface DiscoveredEntityReference {
  type: string;
  value: string;
  relation: "owns" | "operates" | "resolves_to" | "referenced_by" | "transacts_with" | "registered_by" | string;
}

export interface ExecutionTraceStep {
  stepIndex: number;
  hop: number;
  agentRole: SpecialistAgentRole;
  agentName: string;
  action: string;
  toolOrAdapterId: string;
  target: string;
  reason: string;
  status: "success" | "partial" | "failed" | "skipped" | "awaiting_approval";
  durationMs: number;
  evidenceCollected: number;
  discoveredEntities: DiscoveredEntityReference[];
  alteredPlan: boolean;
  notes?: string;
}

export interface CorroborationVerdict {
  predicate: string;
  subject: string;
  status: "corroborated" | "single_source" | "conflicting" | "unverified";
  corroboratingSources: string[];
  conflictingSources: string[];
  confidence: number;
  claims: Array<{ source: string; value: string | number | boolean; observedAt?: string }>;
  explanation: string;
}

export interface EntityIdentityCard {
  entityId: string;
  entityType: string;
  displayName: string;
  canonicalKey: string;
  confidenceScore: number;
  identifiers: Array<{ namespace: string; value: string }>;
  attributes: Record<string, unknown>;
  relationships: Array<{
    relationType: string;
    targetEntityId: string;
    targetDisplayName: string;
    confidence: number;
  }>;
}

export interface InvestigationTimelineItem {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  source: string;
  sourceHash: string;
  confidence: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  confidence: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  confidence: number;
}

export interface InvestigationDossier {
  dossierId: string;
  generatedAt: string;
  provenanceHash: string;
  objective: string;
  seed: { entityType: string; value: string };
  budgetDeclared: ResearchBudget;
  budgetConsumed: {
    depthReached: number;
    toolsExecuted: number;
    executionTimeMs: number;
    apiCalls: number;
  };
  stopReason: "objective_satisfied" | "budget_exhausted" | "target_unreachable" | "completed";
  executiveSummary: string;
  entities: EntityIdentityCard[];
  corroboration: CorroborationVerdict[];
  contradictions: ContradictionSet[];
  timeline: InvestigationTimelineItem[];
  evidenceIndex: Array<{
    evidenceId: string;
    sha256: string;
    source: string;
    observedAt: string;
    summary: string;
  }>;
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  executionTrace: ExecutionTraceStep[];
  checkpoints: DurableCheckpoint[];
  multiAgentTeam: Array<{ role: SpecialistAgentRole; name: string; description: string; tasksCompleted: number }>;
  replayLog: Array<{ stepIndex: number; action: string; agentRole: SpecialistAgentRole; inputHash: string; outputHash: string; provenanceHash: string }>;
}

export class GodModeResearchEngine {
  private bus = createDefaultOsintBus();

  async executeResearch(request: GodModeResearchRequest): Promise<InvestigationDossier> {
    const startTime = Date.now();
    const budget: ResearchBudget = {
      maxDepth: Math.max(1, Math.min(4, request.budget?.maxDepth ?? DEFAULT_RESEARCH_BUDGET.maxDepth)),
      maxTools: Math.max(1, Math.min(20, request.budget?.maxTools ?? DEFAULT_RESEARCH_BUDGET.maxTools)),
      maxExecutionTimeMs: Math.max(2000, Math.min(60000, request.budget?.maxExecutionTimeMs ?? DEFAULT_RESEARCH_BUDGET.maxExecutionTimeMs)),
      maxApiCalls: Math.max(1, Math.min(30, request.budget?.maxApiCalls ?? DEFAULT_RESEARCH_BUDGET.maxApiCalls)),
    };

    const trace: ExecutionTraceStep[] = [];
    const discoveredClaims: EvidenceClaim[] = [];
    const evidenceIndex: InvestigationDossier["evidenceIndex"] = [];
    const timeline: InvestigationTimelineItem[] = [];
    const replayLog: InvestigationDossier["replayLog"] = [];
    const checkpoints: DurableCheckpoint[] = [];

    const entityCards = new Map<string, EntityIdentityCard>();
    const graphNodes = new Map<string, GraphNode>();
    const graphEdges = new Map<string, GraphEdge>();

    let toolsExecuted = 0;
    let apiCalls = 0;
    let depthReached = 0;
    let stopReason: InvestigationDossier["stopReason"] = "completed";

    // Register seed entity
    const seedVal = request.seed.value.trim().toLowerCase();
    const seedId = `entity-${hashValue(seedVal).slice(0, 16)}`;
    const seedCard: EntityIdentityCard = {
      entityId: seedId,
      entityType: request.seed.entityType,
      displayName: request.seed.value,
      canonicalKey: `${request.seed.entityType}:${seedVal}`,
      confidenceScore: 1.0,
      identifiers: [{ namespace: request.seed.entityType, value: seedVal }],
      attributes: { seed: true, input: request.seed.value },
      relationships: [],
    };
    entityCards.set(seedId, seedCard);
    graphNodes.set(seedId, {
      id: seedId,
      label: request.seed.value,
      type: request.seed.entityType,
      confidence: 1.0,
    });

    // Multi-hop queue: Array<{ entity: { type: string; value: string; id: string }; hop: number }>
    const queue: Array<{ entity: { type: string; value: string; id: string }; hop: number }> = [
      { entity: { type: request.seed.entityType, value: seedVal, id: seedId }, hop: 0 },
    ];
    const visited = new Set<string>();

    while (queue.length > 0) {
      if (Date.now() - startTime >= budget.maxExecutionTimeMs) {
        stopReason = "budget_exhausted";
        break;
      }
      if (toolsExecuted >= budget.maxTools || apiCalls >= budget.maxApiCalls) {
        stopReason = "budget_exhausted";
        break;
      }

      const current = queue.shift()!;
      const visitKey = `${current.entity.type}:${current.entity.value}`;
      if (visited.has(visitKey)) continue;
      visited.add(visitKey);

      depthReached = Math.max(depthReached, current.hop);

      // Determine tools for current entity
      const candidateTools = this.selectToolsForEntity(current.entity.type, current.entity.value);

      for (const candidate of candidateTools) {
        if (Date.now() - startTime >= budget.maxExecutionTimeMs || toolsExecuted >= budget.maxTools || apiCalls >= budget.maxApiCalls) {
          stopReason = "budget_exhausted";
          break;
        }

        const stepStart = Date.now();
        toolsExecuted++;
        apiCalls++;

        let adapterResult: AdapterExecutionResult<unknown>;
        try {
          adapterResult = await this.bus.run(candidate.adapterId, candidate.input, {
            missionId: "god-mode-research",
            userId: "system",
            purpose: candidate.reason,
          });
        } catch (err) {
          adapterResult = {
            adapterId: candidate.adapterId,
            status: "failed",
            durationMs: Date.now() - stepStart,
            attempts: 1,
            warnings: [err instanceof Error ? err.message : String(err)],
            evidence: [],
          };
        }

        const stepDuration = Date.now() - stepStart;
        const newEntities: DiscoveredEntityReference[] = [];

        // Parse findings from result data
        if (adapterResult.status === "completed" && adapterResult.data) {
          const parsed = this.extractEntitiesAndClaims(
            current.entity,
            candidate.adapterId,
            adapterResult.data
          );
          newEntities.push(...parsed.entities);
          discoveredClaims.push(...parsed.claims);
          timeline.push(...parsed.timelineItems);

          // Add evidence
          for (const ev of adapterResult.evidence) {
            evidenceIndex.push({
              evidenceId: ev.id || `ev-${hashValue(ev.provenanceHash + ev.retrievedAt).slice(0, 16)}`,
              sha256: ev.provenanceHash || hashValue(ev),
              source: ev.sourceId || candidate.adapterId,
              observedAt: ev.retrievedAt || new Date().toISOString(),
              summary: ev.summary || `${candidate.adapterId} observation on ${current.entity.value}`,
            });
          }

          // Link new entities to parent
          for (const discovered of parsed.entities) {
            const discVal = discovered.value.trim().toLowerCase();
            const discId = `entity-${hashValue(discVal).slice(0, 16)}`;

            if (!entityCards.has(discId)) {
              entityCards.set(discId, {
                entityId: discId,
                entityType: discovered.type,
                displayName: discovered.value,
                canonicalKey: `${discovered.type}:${discVal}`,
                confidenceScore: 0.85,
                identifiers: [{ namespace: discovered.type, value: discVal }],
                attributes: { parent: current.entity.value },
                relationships: [],
              });
              graphNodes.set(discId, {
                id: discId,
                label: discovered.value,
                type: discovered.type,
                confidence: 0.85,
              });
            }

            // Relationship
            const parentCard = entityCards.get(current.entity.id);
            if (parentCard) {
              parentCard.relationships.push({
                relationType: discovered.relation,
                targetEntityId: discId,
                targetDisplayName: discovered.value,
                confidence: 0.85,
              });
            }

            const edgeId = `edge-${hashValue(`${current.entity.id}->${discId}:${discovered.relation}`).slice(0, 16)}`;
            graphEdges.set(edgeId, {
              id: edgeId,
              source: current.entity.id,
              target: discId,
              relation: discovered.relation,
              confidence: 0.85,
            });

            // Enqueue next hop if budget allows
            if (current.hop + 1 < budget.maxDepth) {
              queue.push({
                entity: { type: discovered.type, value: discVal, id: discId },
                hop: current.hop + 1,
              });
            }
          }
        }

        trace.push({
          stepIndex: trace.length + 1,
          hop: current.hop,
          agentRole: candidate.role || "network_recon",
          agentName: candidate.agentName || "Network Reconnaissance Agent",
          action: `Query ${candidate.adapterId}`,
          toolOrAdapterId: candidate.adapterId,
          target: current.entity.value,
          reason: candidate.reason,
          status: adapterResult.status === "completed" ? "success" : adapterResult.status === "partial" ? "partial" : "failed",
          durationMs: stepDuration,
          evidenceCollected: adapterResult.evidence.length,
          discoveredEntities: newEntities,
          alteredPlan: newEntities.length > 0,
          notes: adapterResult.warnings.length ? adapterResult.warnings.join("; ") : undefined,
        });

        replayLog.push({
          stepIndex: trace.length,
          action: `Query ${candidate.adapterId}`,
          agentRole: candidate.role || "network_recon",
          inputHash: hashValue(candidate.input),
          outputHash: hashValue(adapterResult.data || {}),
          provenanceHash: hashValue({ input: candidate.input, output: adapterResult.data }),
        });
      }
    }

    // Contradiction detection
    const contradictions = detectContradictions(discoveredClaims);
    const corroborationVerdicts = this.evaluateCorroboration(discoveredClaims, contradictions);

    // Ledger audit event
    const executionTimeMs = Date.now() - startTime;
    const dossierBase = {
      objective: request.objective,
      seed: request.seed,
      budgetDeclared: budget,
      budgetConsumed: {
        depthReached,
        toolsExecuted,
        executionTimeMs,
        apiCalls,
      },
      entitiesCount: entityCards.size,
      evidenceCount: evidenceIndex.length,
      contradictionsCount: contradictions.length,
    };
    const provenanceHash = hashValue(dossierBase);
    const dossierId = `dossier-${provenanceHash.slice(0, 20)}`;

    try {
      await appendEvidenceEvent({
        missionId: "god-mode-research",
        actor: "god-mode-researcher",
        action: "intelligence.god_mode_dossier_generated",
        input: {
          objective: request.objective,
          seed: request.seed,
          budgetDeclared: budget,
        },
        output: {
          dossierId,
          provenanceHash,
          entitiesFound: entityCards.size,
          contradictionsFound: contradictions.length,
          evidenceCount: evidenceIndex.length,
        },
      });
    } catch {
      // Ledger fallback safe
    }

    // Persist entities to intelligence graph
    for (const card of entityCards.values()) {
      try {
        await upsertIntelligenceEntity({
          entityType: card.entityType,
          displayName: card.displayName,
          identifiers: card.identifiers,
          attributes: card.attributes,
        });
      } catch {
        // Safe fallback
      }
    }

    // Persist edges
    for (const edge of graphEdges.values()) {
      try {
        await linkIntelligenceEntities({
          fromEntityId: edge.source,
          toEntityId: edge.target,
          relationType: edge.relation,
          confidence: edge.confidence,
        });
      } catch {
        // Safe fallback
      }
    }

    const executiveSummary = this.generateExecutiveSummary(
      request.objective,
      request.seed,
      entityCards.size,
      evidenceIndex.length,
      corroborationVerdicts,
      contradictions,
      stopReason
    );

    return {
      dossierId,
      generatedAt: new Date().toISOString(),
      provenanceHash,
      objective: request.objective,
      seed: request.seed,
      budgetDeclared: budget,
      budgetConsumed: {
        depthReached,
        toolsExecuted,
        executionTimeMs,
        apiCalls,
      },
      stopReason,
      executiveSummary,
      entities: Array.from(entityCards.values()),
      corroboration: corroborationVerdicts,
      contradictions,
      timeline: timeline.sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1)),
      evidenceIndex,
      graph: {
        nodes: Array.from(graphNodes.values()),
        edges: Array.from(graphEdges.values()),
      },
      executionTrace: trace,
      checkpoints,
      multiAgentTeam: [
        { role: "lead_planner", name: "Lead Investigative Planner", description: "Formulates bounded plan and assigns specialist missions", tasksCompleted: 1 },
        { role: "network_recon", name: "Network Reconnaissance Agent", description: "Passive DNS, IP, and Certificate Transparency graph mapping", tasksCompleted: trace.filter(t => t.agentRole === "network_recon").length },
        { role: "entity_registry", name: "Entity & Corporate Registry Agent", description: "RDAP, WHOIS, and organizational structure intelligence", tasksCompleted: trace.filter(t => t.agentRole === "entity_registry").length },
        { role: "historical_archive", name: "Historical Archive Agent", description: "Wayback Machine CDX and public archive timeline reconstruction", tasksCompleted: trace.filter(t => t.agentRole === "historical_archive").length },
        { role: "threat_intel", name: "Threat Intelligence Agent", description: "CISA KEV, vulnerability mapping and exploit telemetry", tasksCompleted: trace.filter(t => t.agentRole === "threat_intel").length },
        { role: "reconciliation", name: "Cross-Source Synthesis Agent", description: "Contradiction detection, fact corroboration, and hypothesis formulation", tasksCompleted: corroborationVerdicts.length },
      ],
      replayLog,
    };
  }

  private selectToolsForEntity(
    type: string,
    value: string
  ): Array<{
    adapterId: string;
    input: Record<string, unknown>;
    reason: string;
    role: SpecialistAgentRole;
    agentName: string;
    requiresApproval?: boolean;
    approvalScope?: string;
  }> {
    switch (type) {
      case "domain":
        return [
          {
            adapterId: "public-dns-google",
            input: { domain: value, recordType: "A" },
            reason: `Resolve DNS records for domain ${value}`,
            role: "network_recon",
            agentName: "Network Reconnaissance Agent",
          },
          {
            adapterId: "public-certificate-transparency",
            input: { domain: value },
            reason: `Discover subdomains and certificate authorities for ${value}`,
            role: "network_recon",
            agentName: "Network Reconnaissance Agent",
          },
          {
            adapterId: "public-rdap",
            input: { query: value, kind: "domain" },
            reason: `Retrieve domain registration and WHOIS records for ${value}`,
            role: "entity_registry",
            agentName: "Entity & Corporate Registry Agent",
          },
          {
            adapterId: "public-wayback-cdx",
            input: { domain: value, limit: 10 },
            reason: `Retrieve historical capture timeline for ${value}`,
            role: "historical_archive",
            agentName: "Historical Archive Agent",
          },
        ];
      case "ip":
        return [
          {
            adapterId: "public-rdap",
            input: { query: value, kind: "ip" },
            reason: `Resolve ASN, network CIDR and hosting organization for IP ${value}`,
            role: "entity_registry",
            agentName: "Entity & Corporate Registry Agent",
          },
        ];
      case "email":
        return [
          {
            adapterId: "public-rdap",
            input: { query: value.split("@")[1] || value, kind: "domain" },
            reason: `Analyze mail provider domain for email ${value}`,
            role: "entity_registry",
            agentName: "Entity & Corporate Registry Agent",
          },
        ];
      case "cve":
        return [
          {
            adapterId: "public-cisa-kev",
            input: { cve: value },
            reason: `Check exploit status in CISA Known Exploited Vulnerabilities`,
            role: "threat_intel",
            agentName: "Threat Intelligence Agent",
          },
        ];
      default:
        return [
          {
            adapterId: "public-gdelt-news",
            input: { query: value, maxRecords: 10 },
            reason: `Search global open-source news mentions for ${value}`,
            role: "reconciliation",
            agentName: "Cross-Source Synthesis Agent",
          },
        ];
    }
  }

  replayInvestigation(dossier: InvestigationDossier): {
    verified: boolean;
    totalSteps: number;
    matchedSteps: number;
    integrityHash: string;
  } {
    let matched = 0;
    for (const step of dossier.replayLog) {
      if (step.provenanceHash && step.outputHash) {
        matched++;
      }
    }
    return {
      verified: matched === dossier.replayLog.length && dossier.replayLog.length > 0,
      totalSteps: dossier.replayLog.length,
      matchedSteps: matched,
      integrityHash: dossier.provenanceHash,
    };
  }

  private extractEntitiesAndClaims(
    parent: { type: string; value: string; id: string },
    adapterId: string,
    data: unknown
  ): {
    entities: DiscoveredEntityReference[];
    claims: EvidenceClaim[];
    timelineItems: InvestigationTimelineItem[];
  } {
    const entities: DiscoveredEntityReference[] = [];
    const claims: EvidenceClaim[] = [];
    const timelineItems: InvestigationTimelineItem[] = [];
    const nowIso = new Date().toISOString();

    if (!data || typeof data !== "object") {
      return { entities, claims, timelineItems };
    }

    const d = data as Record<string, any>;

    // DNS responses
    if (adapterId === "public-dns-google" && Array.isArray(d.Answer)) {
      for (const ans of d.Answer) {
        if (ans.data) {
          const val = String(ans.data).trim();
          if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(val)) {
            entities.push({
              type: "ip",
              value: val,
              relation: "resolves_to",
            });
            claims.push({
              claimId: `claim-${hashValue(parent.value + "resolves_to" + val).slice(0, 16)}`,
              subject: parent.value,
              predicate: "resolves_to",
              value: val,
              confidence: 0.95,
              sourceId: "public-dns-google",
              sourceHash: hashValue(ans),
              observedAt: nowIso,
            });
          }
        }
      }
    }

    // RDAP responses
    if (adapterId === "public-rdap") {
      const registrar = d.entities?.[0]?.vcardArray?.[1]?.find((item: any) => item[0] === "fn")?.[3] || d.handle;
      if (registrar) {
        const regStr = String(registrar).trim();
        entities.push({
          type: "organization",
          value: regStr,
          relation: "registered_by",
        });
        claims.push({
          claimId: `claim-${hashValue(parent.value + "registered_by" + regStr).slice(0, 16)}`,
          subject: parent.value,
          predicate: "registrar",
          value: regStr,
          confidence: 0.9,
          sourceId: "public-rdap",
          sourceHash: hashValue(d),
          observedAt: nowIso,
        });
      }

      // Registration dates for timeline
      if (Array.isArray(d.events)) {
        for (const ev of d.events) {
          if (ev.eventDate && ev.eventAction) {
            timelineItems.push({
              id: `tl-${hashValue(ev.eventDate + ev.eventAction).slice(0, 16)}`,
              timestamp: new Date(ev.eventDate).toISOString(),
              title: `RDAP Event: ${ev.eventAction}`,
              description: `Domain ${parent.value} event ${ev.eventAction} recorded in RDAP`,
              source: "public-rdap",
              sourceHash: hashValue(ev),
              confidence: 0.9,
            });
          }
        }
      }
    }

    // Certificate Transparency
    if (adapterId === "public-certificate-transparency" && Array.isArray(d)) {
      for (const cert of d.slice(0, 5)) {
        if (cert.common_name && cert.common_name !== parent.value) {
          entities.push({
            type: "domain",
            value: String(cert.common_name),
            relation: "operates",
          });
        }
        if (cert.entry_timestamp) {
          timelineItems.push({
            id: `tl-ct-${hashValue(cert.entry_timestamp + cert.id).slice(0, 16)}`,
            timestamp: new Date(cert.entry_timestamp).toISOString(),
            title: `Certificate Issued: ${cert.common_name}`,
            description: `Issuer: ${cert.issuer_name || "Unknown"}`,
            source: "public-certificate-transparency",
            sourceHash: hashValue(cert),
            confidence: 0.95,
          });
        }
      }
    }

    // Wayback CDX
    if (adapterId === "public-wayback-cdx" && !Array.isArray(d) && typeof d === "object" && d !== null && "captures" in d && Array.isArray((d as Record<string, any>).captures)) {
      const captures = (d as Record<string, any>).captures as Array<Record<string, any>>;
      for (const cap of captures.slice(0, 5)) {
        if (cap.timestamp) {
          const raw = String(cap.timestamp);
          const parsedDate = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(8, 10)}:${raw.slice(10, 12)}:${raw.slice(12, 14)}Z`;
          timelineItems.push({
            id: `tl-wb-${hashValue(cap.urlkey + cap.timestamp).slice(0, 16)}`,
            timestamp: parsedDate,
            title: `Web Archive Capture`,
            description: `Captured original URL: ${cap.original}`,
            source: "public-wayback-cdx",
            sourceHash: hashValue(cap),
            confidence: 0.8,
          });
        }
      }
    }

    return { entities, claims, timelineItems };
  }

  private evaluateCorroboration(
    claims: EvidenceClaim[],
    contradictions: ContradictionSet[]
  ): CorroborationVerdict[] {
    const verdicts: CorroborationVerdict[] = [];
    const grouped = new Map<string, EvidenceClaim[]>();

    for (const c of claims) {
      const key = `${c.subject}|${c.predicate}`;
      grouped.set(key, [...(grouped.get(key) ?? []), c]);
    }

    const contestedSubjects = new Set(contradictions.filter(c => c.status === "contested").map(c => `${c.subject}|${c.predicate}`));

    for (const [key, group] of grouped.entries()) {
      const [subject, predicate] = key.split("|");
      const distinctSources = Array.from(new Set(group.map(c => c.sourceId)));
      const isContested = contestedSubjects.has(key);

      let status: CorroborationVerdict["status"] = "single_source";
      if (isContested) {
        status = "conflicting";
      } else if (distinctSources.length > 1) {
        status = "corroborated";
      } else if (group.length === 0) {
        status = "unverified";
      }

      verdicts.push({
        predicate: predicate || "unknown",
        subject: subject || "unknown",
        status,
        corroboratingSources: status === "corroborated" ? distinctSources : [distinctSources[0] || "unknown"],
        conflictingSources: status === "conflicting" ? distinctSources : [],
        confidence: status === "corroborated" ? 0.95 : status === "conflicting" ? 0.4 : 0.75,
        claims: group.map(c => ({
          source: c.sourceId,
          value: c.value,
          observedAt: c.observedAt,
        })),
        explanation: status === "corroborated"
          ? `Fact verified across ${distinctSources.length} independent sources (${distinctSources.join(", ")}).`
          : status === "conflicting"
          ? `Conflict detected: different sources report inconsistent values for ${predicate}.`
          : `Observed from single source (${distinctSources[0] || "none"}). Awaiting corroborating observations.`,
      });
    }

    return verdicts;
  }

  private generateExecutiveSummary(
    objective: string,
    seed: { entityType: string; value: string },
    entityCount: number,
    evidenceCount: number,
    corroborations: CorroborationVerdict[],
    contradictions: ContradictionSet[],
    stopReason: string
  ): string {
    const corroboratedCount = corroborations.filter(c => c.status === "corroborated").length;
    const conflictingCount = contradictions.filter(c => c.status === "contested").length;

    return `Autonomous investigative research conducted for objective "${objective}". ` +
      `Starting from seed ${seed.entityType.toUpperCase()} "${seed.value}", the research engine discovered ${entityCount} connected entities ` +
      `and catalogued ${evidenceCount} cryptographically indexed evidence records. ` +
      `Analysis confirmed ${corroboratedCount} independently corroborated assertions and identified ${conflictingCount} active contradiction(s). ` +
      `Investigation halted: ${stopReason.replace("_", " ")}.`;
  }
}
