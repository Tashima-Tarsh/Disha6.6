import { createDefaultOsintBus } from "@/lib/unified/osint-default-bus";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE_NAME, principalFromAccessToken } from "@/lib/server/auth";
import { listOperationalGeoFeatures } from "@/lib/geospatial/spatial-query";
import { osintSourceUniverse, getOsintSourceUniverseSummary } from "@/lib/unified/osint-source-universe";
import { osintToolCatalog } from "@/lib/unified/osint-tool-catalog";
import { SurveillanceClient } from "./surveillance-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "disha6.6 | Source intelligence",
  description: "Authenticated public-source observations and source catalog.",
};

export default async function SurveillanceIntelligencePage() {
  const token = (await cookies()).get(ACCESS_COOKIE_NAME)?.value;
  if (!token) redirect("/login?returnUrl=%2Fsurveillance");
  try { await principalFromAccessToken(token); } catch { redirect("/login?returnUrl=%2Fsurveillance"); }
  const geo = await listOperationalGeoFeatures({ limit: 600 });
  const summary = getOsintSourceUniverseSummary();

  return (
    <SurveillanceClient
      initialGeo={geo}
      adapters={createDefaultOsintBus().list()}
      sources={osintSourceUniverse}
      tools={osintToolCatalog}
      universeSummary={summary}
    />
  );
}
