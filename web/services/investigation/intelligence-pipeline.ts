import { createHash, randomUUID } from "node:crypto";
import type {
  Investigation,
  InvestigationContradiction,
  InvestigationCorroboration,
  InvestigationEdge,
  InvestigationEvidence,
  InvestigationFinding,
  InvestigationMapMarker,
  InvestigationTimelineEvent,
  Jurisdiction,
  SearchUniverse,
  TimeRange,
} from "../../lib/investigation/types";
import { evaluateTimeRange } from "./time-filter";

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function classifySourceQuality(sourceId: string, adapterId: string): { quality: number; sourceClass: string } {
  const s = `${sourceId} ${adapterId}`.toLowerCase();
  if (s.includes("cisa") || s.includes("nvd") || s.includes("sec-edgar") || s.includes("noaa") || s.includes("vahan") || s.includes("echallan")) {
    return { quality: 1.0, sourceClass: "government" };
  }
  if (s.includes("dns") || s.includes("rdap") || s.includes("ripestat") || s.includes("celestrak") || s.includes("epss") || s.includes("opensanctions") || s.includes("opencorporates") || s.includes("wikidata")) {
    return { quality: 0.9, sourceClass: "authoritative_registry" };
  }
  if (s.includes("threatfox") || s.includes("malwarebazaar") || s.includes("opencti") || s.includes("intelowl") || s.includes("shodan")) {
    return { quality: 0.85, sourceClass: "curated_cti" };
  }
  if (s.includes("astra6") || s.includes("theharvester") || s.includes("subfinder") || s.includes("amass") || s.includes("spiderfoot") || s.includes("sherlock") || s.includes("maigret") || s.includes("holehe") || s.includes("phoneinfoga")) {
    return { quality: 0.8, sourceClass: "worker_scanner" };
  }
  if (s.includes("wayback") || s.includes("common-crawl")) {
    return { quality: 0.7, sourceClass: "public_archive" };
  }
  return { quality: 0.65, sourceClass: "public_discovery" };
}

function extractCoordinates(fields?: Record<string, unknown>): [number, number] | undefined {
  if (!fields) return undefined;
  if (Array.isArray(fields.coordinates) && fields.coordinates.length === 2) {
    const [lng, lat] = fields.coordinates;
    if (typeof lat === "number" && typeof lng === "number" && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      return [lng, lat];
    }
  }
  if (typeof fields.latitude === "number" && typeof fields.longitude === "number") {
    return [fields.longitude, fields.latitude];
  }
  if (typeof fields.lat === "number" && typeof fields.lng === "number") {
    return [fields.lng, fields.lat];
  }
  return undefined;
}

export function executeIntelligencePipeline(investigation: Investigation): {
  rankedFindings: InvestigationFinding[];
  timeline: InvestigationTimelineEvent[];
  markers: InvestigationMapMarker[];
  contradictions: InvestigationContradiction[];
  corroborations: InvestigationCorroboration[];
  edges: InvestigationEdge[];
} {
  const evidence = investigation?.evidence ?? [];
  const target = investigation?.target ?? "";
  const normalizedTarget = investigation?.normalizedTarget ?? target;
  const targetType = investigation?.targetType ?? "topic";
  const jurisdiction = investigation?.jurisdiction ?? "global";
  const timeRange = investigation?.timeRange ?? "30d";

  if (!evidence.length) {
    return {
      rankedFindings: [],
      timeline: [],
      markers: [],
      contradictions: [],
      corroborations: [],
      edges: [],
    };
  }

  // 1 & 2. Canonicalize & Deduplicate
  const groupedByKey = new Map<string, InvestigationEvidence[]>();

  for (const ev of evidence) {
    let key: string;
    if (ev.providerRecordId) {
      key = `rec:${ev.providerRecordId.toLowerCase()}`;
    } else if (ev.sourceUrl) {
      try {
        const u = new URL(ev.sourceUrl);
        key = `url:${u.hostname.toLowerCase()}${u.pathname.replace(/\/$/, "")}`;
      } catch {
        key = `summary:${sha256(ev.summary).slice(0, 16)}`;
      }
    } else {
      key = `summary:${sha256(ev.summary).slice(0, 16)}`;
    }

    const existing = groupedByKey.get(key) ?? [];
    existing.push(ev);
    groupedByKey.set(key, existing);
  }

  const findings: InvestigationFinding[] = [];
  const timeline: InvestigationTimelineEvent[] = [];
  const markers: InvestigationMapMarker[] = [];
  const corroborations: InvestigationCorroboration[] = [];
  const contradictions: InvestigationContradiction[] = [];

  const targetLower = target.toLowerCase();
  const normalizedTargetLower = normalizedTarget.toLowerCase();

  for (const [key, evList] of groupedByKey.entries()) {
    const primaryEv = evList[0];
    const sourceSet = new Set(evList.map((e) => e.sourceName));
    const contributingSources = Array.from(sourceSet);
    const sourceClassSet = new Set<string>();
    let maxQuality = 0.5;

    for (const ev of evList) {
      const q = classifySourceQuality(ev.sourceId, ev.adapterId);
      sourceClassSet.add(q.sourceClass);
      if (q.quality > maxQuality) maxQuality = q.quality;
    }

    // Freshness & Time range
    let bestObservedAt: string | undefined;
    let timestampUnknown = true;
    let freshnessScore = 0.6;

    for (const ev of evList) {
      if (ev.observedAt) {
        bestObservedAt = ev.observedAt;
        const timeCheck = evaluateTimeRange(ev.observedAt, timeRange);
        timestampUnknown = timeCheck.timestampUnknown;
        freshnessScore = timeCheck.inRange ? 1.0 : 0.4;
        break;
      }
    }

    // Match scoring & Same-name control
    let matchState: InvestigationFinding["matchState"] = "POSSIBLE_MATCH";
    let matchScore = 0.5;
    const summaryLower = primaryEv.summary.toLowerCase();

    const isDeterministicType = [
      "domain", "ip", "url", "cve", "file_hash", "asn", "vehicle_identifier", "email", "phone",
    ].includes(targetType);

    if (isDeterministicType) {
      if (
        summaryLower.includes(targetLower) ||
        summaryLower.includes(normalizedTargetLower) ||
        primaryEv.providerRecordId?.toLowerCase() === targetLower
      ) {
        matchState = "CONFIRMED_MATCH";
        matchScore = 1.0;
      } else {
        matchState = "LIKELY_MATCH";
        matchScore = 0.8;
      }
    } else {
      // Natural language person_name / company / topic
      const isExactMatch =
        summaryLower === targetLower ||
        summaryLower.startsWith(`${targetLower} `) ||
        summaryLower.includes(`"${targetLower}"`) ||
        primaryEv.providerRecordId?.toLowerCase() === targetLower;

      if (isExactMatch) {
        if (contributingSources.length >= 2 || maxQuality >= 0.9) {
          matchState = "CONFIRMED_MATCH";
          matchScore = 0.95;
        } else {
          matchState = "LIKELY_MATCH";
          matchScore = 0.8;
        }
      } else if (summaryLower.includes(targetLower)) {
        matchState = "POSSIBLE_MATCH";
        matchScore = 0.6;
      } else {
        matchState = "AMBIGUOUS";
        matchScore = 0.4;
      }
    }

    // Jurisdiction filtering / relevance
    let findingJurisdiction: string | undefined = typeof primaryEv.fields?.country === "string" ? (primaryEv.fields.country as string) : undefined;
    if ((primaryEv.adapterId && primaryEv.adapterId.includes("india")) || (primaryEv.sourceId && (primaryEv.sourceId.includes("vahan") || primaryEv.sourceId.includes("cert-in")))) {
      findingJurisdiction = "India";
    }

    if (jurisdiction === "india" && findingJurisdiction && findingJurisdiction.toLowerCase() !== "india" && findingJurisdiction.toLowerCase() !== "in") {
      matchState = "REJECTED_MATCH";
      matchScore = 0.1;
    }

    // Corroboration score
    const isCorroborated = contributingSources.length > 1;
    const corroborationScore = isCorroborated ? 1.0 : 0.0;

    for (const ev of evList) {
      if (isCorroborated) {
        ev.corroborationState = "corroborated";
      }
    }

    // Final deterministic relevance score (0 - 100)
    const rawScore = (matchScore * 0.45) + (maxQuality * 0.25) + (freshnessScore * 0.15) + (corroborationScore * 0.15);
    const relevanceScore = Math.max(1, Math.min(100, Math.round(rawScore * 100)));

    const findingId = randomUUID();
    const finding: InvestigationFinding = {
      id: findingId,
      title: primaryEv.summary,
      canonicalKey: key,
      matchState,
      relevanceScore,
      sourceCount: contributingSources.length,
      contributingSources,
      sourceClasses: Array.from(sourceClassSet),
      primarySource: primaryEv.sourceName,
      observedAt: bestObservedAt,
      timestampUnknown,
      provenanceHash: primaryEv.provenanceHash,
      summary: primaryEv.summary,
      evidenceIds: evList.map((e) => e.evidenceId),
      jurisdiction: findingJurisdiction,
      coordinates: extractCoordinates(primaryEv.fields),
    };

    if (isCorroborated) {
      finding.corroborations = contributingSources;
      corroborations.push({
        id: randomUUID(),
        fact: primaryEv.summary,
        sources: contributingSources,
        evidenceIds: finding.evidenceIds,
        confidence: relevanceScore / 100,
      });
    }

    // Timeline extraction
    if (bestObservedAt && !timestampUnknown) {
      timeline.push({
        id: randomUUID(),
        timestamp: bestObservedAt,
        title: primaryEv.summary,
        sourceName: primaryEv.sourceName,
        evidenceId: primaryEv.evidenceId,
        summary: primaryEv.summary,
      });
    }

    // Map extraction
    if (finding.coordinates) {
      markers.push({
        id: randomUUID(),
        title: primaryEv.summary,
        coordinates: finding.coordinates,
        locationName: typeof primaryEv.fields?.location === "string" ? (primaryEv.fields.location as string) : undefined,
        sourceName: primaryEv.sourceName,
        evidenceId: primaryEv.evidenceId,
      });
    }

    findings.push(finding);
  }

  // Cross-source corroboration across distinct sources
  for (let i = 0; i < evidence.length; i++) {
    for (let j = i + 1; j < evidence.length; j++) {
      const a = evidence[i];
      const b = evidence[j];
      if (a.sourceId === b.sourceId) continue;

      const wordsA = new Set(
        a.summary.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter((w) => w.length > 3),
      );
      const commonWords = [...wordsA].filter((w) => b.summary.toLowerCase().includes(w));

      if (commonWords.length >= 2 || (a.summary.toLowerCase().includes(targetLower) && b.summary.toLowerCase().includes(targetLower))) {
        const existing = corroborations.find(
          (c) => c.sources.includes(a.sourceName) && c.sources.includes(b.sourceName),
        );
        if (!existing) {
          a.corroborationState = "corroborated";
          b.corroborationState = "corroborated";
          corroborations.push({
            id: randomUUID(),
            fact: a.summary.length < b.summary.length ? a.summary : b.summary,
            sources: [a.sourceName, b.sourceName],
            evidenceIds: [a.evidenceId, b.evidenceId],
            confidence: 0.85,
          });
        }
      }
    }
  }

  // Contradiction detection: opposing validity/reachability or mutually exclusive states
  const OPPOSING_PAIRS: [RegExp, RegExp, string][] = [
    [/\b(active|online|live|reachable|up)\b/i, /\b(inactive|offline|dead|unreachable|down)\b/i, "status"],
    [/\b(valid|verified|legitimate)\b/i, /\b(invalid|unverified|malicious|phishing|fraud)\b/i, "validity"],
    [/\b(exists|found|registered|present)\b/i, /\b(not found|absent|unregistered|does not exist)\b/i, "presence"],
  ];

  for (let i = 0; i < evidence.length; i++) {
    for (let j = i + 1; j < evidence.length; j++) {
      const a = evidence[i];
      const b = evidence[j];
      if (a.sourceId === b.sourceId) continue;

      // 1. Check opposing boolean validity
      const aValid = a.fields?.valid ?? a.fields?.exists;
      const bValid = b.fields?.valid ?? b.fields?.exists;
      let conflictTopic: string | undefined;
      let claimA = "";
      let claimB = "";

      if (typeof aValid === "boolean" && typeof bValid === "boolean" && aValid !== bValid) {
        conflictTopic = "validation status";
        claimA = `valid=${aValid}`;
        claimB = `valid=${bValid}`;
      } else {
        // 2. Check summary text opposing polarities
        for (const [posRegex, negRegex, category] of OPPOSING_PAIRS) {
          if (
            (posRegex.test(a.summary) && negRegex.test(b.summary)) ||
            (negRegex.test(a.summary) && posRegex.test(b.summary))
          ) {
            conflictTopic = `server ${category}`;
            claimA = a.summary;
            claimB = b.summary;
            break;
          }
        }
      }

      if (conflictTopic) {
        a.contradictionState = "contested";
        b.contradictionState = "contested";
        contradictions.push({
          id: randomUUID(),
          topic: conflictTopic,
          description: `Discrepancy in ${conflictTopic}: ${a.sourceName} reports '${claimA}' while ${b.sourceName} reports '${claimB}'.`,
          sourceA: a.sourceName,
          claimA,
          sourceB: b.sourceName,
          claimB,
          evidenceIds: [a.evidenceId, b.evidenceId],
        });
      }
    }
  }

  // Deterministic sort: matchState priority first, then relevanceScore descending
  const stateWeight: Record<InvestigationFinding["matchState"], number> = {
    CONFIRMED_MATCH: 600,
    LIKELY_MATCH: 500,
    POSSIBLE_MATCH: 400,
    AMBIGUOUS: 300,
    CONFLICT: 200,
    REJECTED_MATCH: 100,
  };

  findings.sort((a, b) => {
    const weightDiff = stateWeight[b.matchState] - stateWeight[a.matchState];
    if (weightDiff !== 0) return weightDiff;
    if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
    return a.title.localeCompare(b.title);
  });

  // Timeline chronological sort
  timeline.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

  // Extract Entity Chaining Edges across all evidence records
  const edges: InvestigationEdge[] = [];
  const edgeKeys = new Set<string>();

  const addEdge = (targetId: string, type: InvestigationEdge["type"], evId: string) => {
    const cleanTarget = targetId.trim();
    if (!cleanTarget || cleanTarget.toLowerCase() === normalizedTarget.toLowerCase()) return;
    const key = `${normalizedTarget}:${cleanTarget}:${type}`;
    if (!edgeKeys.has(key)) {
      edgeKeys.add(key);
      edges.push({
        id: randomUUID(),
        sourceId: normalizedTarget,
        targetId: cleanTarget,
        type,
        evidenceId: evId,
      });
    }
  };

  for (const ev of evidence) {
    // 1. IP and Host relationships
    const ip = ev.fields?.ip ?? ev.fields?.ip_str ?? ev.fields?.address;
    if (typeof ip === "string" && ip.trim()) addEdge(ip, "LOCATED_AT", ev.evidenceId);

    const domain = ev.fields?.domain ?? ev.fields?.host ?? ev.fields?.hostname;
    if (typeof domain === "string" && domain.trim()) addEdge(domain, "DERIVED_FROM", ev.evidenceId);

    // 2. Identity and Committer Email relationships
    const email = ev.fields?.email ?? ev.fields?.author_email;
    if (typeof email === "string" && email.trim()) addEdge(email, "SAME_IDENTIFIER", ev.evidenceId);

    // Cryptographic SSH Key & Machine Workstation Attribution
    const ssh = ev.fields?.ssh_fingerprint;
    if (typeof ssh === "string" && ssh.trim()) addEdge(ssh, "SAME_IDENTIFIER", ev.evidenceId);
    const machine = ev.fields?.machine_comment;
    if (typeof machine === "string" && machine.trim() && machine !== "none") addEdge(machine, "OBSERVED_BY", ev.evidenceId);

    // 3. Organization, Company and Registrar relationships
    const org = ev.fields?.org ?? ev.fields?.organization ?? ev.fields?.registrar ?? ev.fields?.company;
    if (typeof org === "string" && org.trim()) addEdge(org, "REGISTERED_TO", ev.evidenceId);

    // 4. Source Origin relationships
    if (ev.sourceUrl) {
      try {
        const u = new URL(ev.sourceUrl);
        addEdge(u.hostname, "SOURCED_FROM", ev.evidenceId);
      } catch {}
    }

    // 5. Threat Intelligence and IOC relationships
    const ioc = ev.fields?.ioc ?? ev.fields?.cveID ?? ev.fields?.sha256_hash;
    if (typeof ioc === "string" && ioc.trim()) addEdge(ioc, "OBSERVED_BY", ev.evidenceId);
  }

  // Corroboration edges
  for (const corr of corroborations) {
    if (corr.evidenceIds.length >= 2) {
      edges.push({
        id: randomUUID(),
        sourceId: corr.evidenceIds[0],
        targetId: corr.evidenceIds[1],
        type: "CORROBORATES",
        evidenceId: corr.evidenceIds[0],
      });
    }
  }

  return {
    rankedFindings: findings,
    timeline,
    markers,
    contradictions,
    corroborations,
    edges,
  };
}
