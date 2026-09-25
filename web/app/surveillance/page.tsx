import { listOperationalGeoFeatures } from "@/lib/geospatial/spatial-query";
import { SurveillanceClient } from "./surveillance-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "disha6.6 | God's Eye Cyber Surveillance Command",
  description: "Governed real-time geospatial OSINT, packet telemetry intercept, and Vyuha cyber defense operations center.",
};

export default async function SurveillanceIntelligencePage() {
  const geo = await listOperationalGeoFeatures({ limit: 600 });
  return <SurveillanceClient initialGeo={geo} />;
}
