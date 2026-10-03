import { hashValue } from "../hash";
import { getDbPool } from "../../server/db";
import {
  type DISHACorroboration,
  dishaCorroborationSchema,
} from "./types";

const KNOWN_MEDIA_FAMILIES: Record<string, string> = {
  "indiatimes.com": "family_times_group",
  "timesofindia.com": "family_times_group",
  "economictimes.com": "family_times_group",
  "ndtv.com": "family_ndtv_group",
  "thehindu.com": "family_kasturi_group",
  "frontline.thehindu.com": "family_kasturi_group",
  "hindustantimes.com": "family_ht_media",
  "livemint.com": "family_ht_media",
  "indianexpress.com": "family_express_group",
  "financialexpress.com": "family_express_group",
  "news18.com": "family_network18",
  "firstpost.com": "family_network18",
  "moneycontrol.com": "family_network18",
  "ani.in": "wire_ani",
  "ptinews.com": "wire_pti",
  "reuters.com": "wire_reuters",
  "apnews.com": "wire_ap",
  "bloomberg.com": "wire_bloomberg",
  "afp.com": "wire_afp",
};

const WIRE_TEXT_PATTERNS: Array<{ pattern: RegExp; family: string }> = [
  { pattern: /\b(?:PTI|Press Trust of India)\b/i, family: "wire_pti" },
  { pattern: /\b(?:ANI|Asian News International)\b/i, family: "wire_ani" },
  { pattern: /\bReuters\b/i, family: "wire_reuters" },
  { pattern: /\b(?:AP|Associated Press)\b/i, family: "wire_ap" },
  { pattern: /\bBloomberg\b/i, family: "wire_bloomberg" },
  { pattern: /\b(?:AFP|Agence France-Presse)\b/i, family: "wire_afp" },
  { pattern: /\bIANS\b/i, family: "wire_ians" },
];

export function extractSourceFamilyId(urlOrSource: string, textSnippet?: string): string {
  if (textSnippet) {
    for (const { pattern, family } of WIRE_TEXT_PATTERNS) {
      if (pattern.test(textSnippet)) {
        return family;
      }
    }
  }

  const raw = urlOrSource.trim().toLowerCase();
  let hostname = raw;

  if (raw.includes("://")) {
    try {
      hostname = new URL(raw).hostname.toLowerCase();
    } catch {
      hostname = raw;
    }
  }

  hostname = hostname.replace(/^www\./, "");

  for (const [domainKey, familyId] of Object.entries(KNOWN_MEDIA_FAMILIES)) {
    if (hostname === domainKey || hostname.endsWith(`.${domainKey}`)) {
      return familyId;
    }
  }

  if (hostname.endsWith(".gov.in") || hostname.endsWith(".nic.in")) {
    const parts = hostname.split(".");
    const govSub = parts.slice(0, -2).join("_");
    return `gov_${govSub || "official"}`;
  }

  const hostClean = hostname.replace(/[^a-z0-9]/g, "_").slice(0, 32);
  return `domain_${hostClean || "unknown"}`;
}

export type CorroborationSourceInput = {
  sourceId: string;
  sourceName?: string;
  url?: string;
  content?: string;
  confidence?: number;
};

const memoryCorroborations = new Map<string, DISHACorroboration>();

export class CorroborationEngine {
  static evaluate(
    claimId: string,
    sources: CorroborationSourceInput[],
  ): DISHACorroboration {
    if (sources.length === 0) {
      throw new Error(`Cannot evaluate corroboration for claim ${claimId}: zero sources provided`);
    }

    const familiesMap = new Map<string, CorroborationSourceInput[]>();

    for (const s of sources) {
      const familyId = extractSourceFamilyId(s.url ?? s.sourceId, s.content);
      const list = familiesMap.get(familyId) ?? [];
      list.push(s);
      familiesMap.set(familyId, list);
    }

    const rawLinkCount = sources.length;
    const independentSourceCount = familiesMap.size;
    const independenceRatio = Number((independentSourceCount / rawLinkCount).toFixed(3));
    const sourceFamilyIds = [...familiesMap.keys()];

    let corroborationScore = Math.min(1, independentSourceCount * 0.25);
    if (independenceRatio < 0.5 && rawLinkCount >= 3) {
      corroborationScore = Number((corroborationScore * 0.75).toFixed(3));
    }

    const summaryParts: string[] = [
      `${independentSourceCount} independent source family/families confirmed across ${rawLinkCount} cited link(s) (independence ratio: ${(independenceRatio * 100).toFixed(1)}%).`,
    ];

    if (independentSourceCount === 1 && rawLinkCount > 1) {
      summaryParts.push(
        "WARNING: High syndication detected. All citations trace back to a single source family or news wire.",
      );
    } else if (independentSourceCount >= 3) {
      summaryParts.push(
        "STRONG: Multi-family independent corroboration verified without single-wire concentration.",
      );
    }

    const createdAt = new Date().toISOString();
    const corroborationId = `corrob_${hashValue(`${claimId}_${sourceFamilyIds.sort().join("_")}`).slice(0, 16)}`;

    return dishaCorroborationSchema.parse({
      corroborationId,
      targetClaimId: claimId,
      sourceFamilyIds,
      independentSourceCount,
      rawLinkCount,
      independenceRatio,
      corroborationScore: Number(corroborationScore.toFixed(3)),
      confidenceSummary: summaryParts.join(" "),
      createdAt,
    });
  }

  static async persistCorroboration(corrob: DISHACorroboration): Promise<DISHACorroboration> {
    const pool = getDbPool();
    if (!pool) {
      memoryCorroborations.set(corrob.corroborationId, corrob);
      return corrob;
    }

    try {
      await pool.query(
        `insert into disha_canonical_corroborations
          (corroboration_id, target_claim_id, source_family_ids, independent_source_count, raw_link_count, independence_ratio, corroboration_score, confidence_summary, created_at)
         values ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9)
         on conflict (corroboration_id) do update set
           source_family_ids = excluded.source_family_ids,
           independent_source_count = excluded.independent_source_count,
           raw_link_count = excluded.raw_link_count,
           independence_ratio = excluded.independence_ratio,
           corroboration_score = excluded.corroboration_score,
           confidence_summary = excluded.confidence_summary`,
        [
          corrob.corroborationId,
          corrob.targetClaimId,
          JSON.stringify(corrob.sourceFamilyIds),
          corrob.independentSourceCount,
          corrob.rawLinkCount,
          corrob.independenceRatio,
          corrob.corroborationScore,
          corrob.confidenceSummary,
          corrob.createdAt,
        ],
      );
      return corrob;
    } catch {
      memoryCorroborations.set(corrob.corroborationId, corrob);
      return corrob;
    }
  }

  static async getForClaim(claimId: string): Promise<DISHACorroboration | null> {
    const pool = getDbPool();
    if (!pool) {
      for (const c of memoryCorroborations.values()) {
        if (c.targetClaimId === claimId) return c;
      }
      return null;
    }

    try {
      const res = await pool.query<{
        corroboration_id: string;
        target_claim_id: string;
        source_family_ids: string[];
        independent_source_count: number;
        raw_link_count: number;
        independence_ratio: number;
        corroboration_score: number;
        confidence_summary: string;
        created_at: Date;
      }>("select * from disha_canonical_corroborations where target_claim_id = $1 limit 1", [claimId]);

      const r = res.rows[0];
      if (!r) return null;

      return {
        corroborationId: r.corroboration_id,
        targetClaimId: r.target_claim_id,
        sourceFamilyIds: r.source_family_ids,
        independentSourceCount: r.independent_source_count,
        rawLinkCount: r.raw_link_count,
        independenceRatio: Number(r.independence_ratio),
        corroborationScore: Number(r.corroboration_score),
        confidenceSummary: r.confidence_summary,
        createdAt: r.created_at.toISOString(),
      };
    } catch {
      for (const c of memoryCorroborations.values()) {
        if (c.targetClaimId === claimId) return c;
      }
      return null;
    }
  }

  static clearMemoryForTests(): void {
    memoryCorroborations.clear();
  }
}
