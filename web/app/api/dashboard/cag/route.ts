import { NextRequest, NextResponse } from "next/server";

import {
  defaultCagTopics,
  fetchCagAuditRecords,
  type CagAuditTopic,
} from "@/lib/cag-audit-connector";
import { withContext } from "@/lib/unified/api";

export const dynamic = "force-dynamic";

const allowedTopics = new Set<CagAuditTopic>(defaultCagTopics.concat([
  "health_welfare_education",
  "local_bodies",
]));

export async function GET(request: NextRequest) {
  return withContext(request, "audit:read", async () => {
    const yearFrom = toBoundedYear(request.nextUrl.searchParams.get("yearFrom"), 2015);
    const yearTo = toBoundedYear(request.nextUrl.searchParams.get("yearTo"), new Date().getFullYear());
    const startPage = toBoundedNumber(request.nextUrl.searchParams.get("startPage"), 1, 1, 10000);
    const maxPages = toBoundedNumber(request.nextUrl.searchParams.get("maxPages"), 5, 1, 25);
    const topics = parseTopics(request.nextUrl.searchParams.get("topics"));

    const result = await fetchCagAuditRecords({
      yearFrom: Math.min(yearFrom, yearTo),
      yearTo: Math.max(yearFrom, yearTo),
      startPage,
      maxPages,
      topics,
    });

    return NextResponse.json(result);
  });
}

function parseTopics(value: string | null): CagAuditTopic[] {
  if (!value || value === "all") return defaultCagTopics;
  const topics = value
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is CagAuditTopic => allowedTopics.has(item as CagAuditTopic));
  return topics.length ? topics : defaultCagTopics;
}

function toBoundedYear(value: string | null, fallback: number): number {
  return toBoundedNumber(value, fallback, 2015, new Date().getFullYear());
}

function toBoundedNumber(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}
