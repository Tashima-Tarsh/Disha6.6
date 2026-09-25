import { NextResponse } from "next/server";

import {
  nationalDataCoverage,
  nationalDataSources,
} from "@/lib/national-data-registry";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    notice:
      "disha6.6 national data registry. Sources are official/public references; unverified or incomplete layers are explicitly marked.",
    coverage: nationalDataCoverage(),
    sources: nationalDataSources,
  });
}
