import { listOperationalGeoFeatures } from "@/lib/geospatial/spatial-query";
import { osintSourceUniverse, getOsintSourceUniverseSummary } from "@/lib/unified/osint-source-universe";
import { osintToolCatalog } from "@/lib/unified/osint-tool-catalog";
import { SurveillanceClient } from "./surveillance-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "DISHA 6.6 | Governed OSINT Analysis",
  description: "Governed public-source intelligence analysis, 3D OSINT source universe, authenticated evidence events, and policy-gated defensive review.",
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
