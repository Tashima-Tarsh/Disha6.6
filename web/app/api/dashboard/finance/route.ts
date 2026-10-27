import { NextRequest, NextResponse } from "next/server";

import { fetchFinanceBudgetRecords } from "@/lib/finance-budget-connector";
import { withContext } from "@/lib/unified/api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withContext(request, "agent:read", async () => {
    const yearFrom = toBoundedYear(request.nextUrl.searchParams.get("yearFrom"), 2015);
    const yearTo = toBoundedYear(request.nextUrl.searchParams.get("yearTo"), 2026);
    const probe = request.nextUrl.searchParams.get("probe") === "1";

    const result = await fetchFinanceBudgetRecords({
      yearFrom,
      yearTo,
      probe,
    });

    return NextResponse.json(result);
  });
}

function toBoundedYear(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), 2015), 2026);
}
