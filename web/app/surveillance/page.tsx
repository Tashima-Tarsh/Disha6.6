import { listOperationalGeoFeatures } from "@/lib/geospatial/spatial-query";
import { osintSourceUniverse, getOsintSourceUniverseSummary } from "@/lib/unified/osint-source-universe";
import { osintToolCatalog } from "@/lib/unified/osint-tool-catalog";
import { SurveillanceClient } from "./surveillance-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "disha6.6 | 3D/4D God's Eye Cyber Space & OSINT Universe",
  description: "Governed 3D/4D tactical cyber surveillance, complete 100+ OSINT source universe, live telemetry intercept, and Vyuha defense center.",
};

export default async function SurveillanceIntelligencePage() {
  const geo = await listOperationalGeoFeatures({ limit: 600 });
  const summary = getOsintSourceUniverseSummary();

  return (
    <SurveillanceClient
      initialGeo={geo}
      sources={osintSourceUniverse}
      tools={osintToolCatalog}
      universeSummary={summary}
    />
  );
}
