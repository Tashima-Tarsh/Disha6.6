export type SurveillanceToolStatus = "planned" | "adapter_ready" | "external_runtime_required";

export type SurveillanceTool = {
  id: string;
  name: string;
  upstream: string;
  category: "geospatial_osint" | "mobile_privacy" | "mobile_forensics" | "network_tracking" | "threat_intelligence";
  integrationMode: "api_adapter" | "external_runtime" | "evidence_import";
  status: SurveillanceToolStatus;
  purpose: string;
  safetyBoundary: string;
};

export const surveillanceTools: SurveillanceTool[] = [
  {
    id: "gods-eye-view",
    name: "God's Eye View",
    upstream: "bilawalsidhu/gods-eye-view",
    category: "geospatial_osint",
    integrationMode: "external_runtime",
    status: "external_runtime_required",
    purpose: "Public-source spatial intelligence visualization for flights, satellites, weather, cameras and related feeds.",
    safetyBoundary: "Public-source observation only; no private targeting or credential/data acquisition.",
  },
  {
    id: "mobsf",
    name: "MobSF",
    upstream: "MobSF/Mobile-Security-Framework-MobSF",
    category: "mobile_privacy",
    integrationMode: "api_adapter",
    status: "planned",
    purpose: "Static and dynamic mobile application security and privacy analysis.",
    safetyBoundary: "Analyze owned, authorized or lawfully obtained application packages only.",
  },
  {
    id: "exodus",
    name: "Exodus Privacy",
    upstream: "Exodus-Privacy/exodus",
    category: "mobile_privacy",
    integrationMode: "evidence_import",
    status: "planned",
    purpose: "Identify known trackers and privacy-relevant SDKs in Android applications.",
    safetyBoundary: "Tracker identification and privacy analysis only; findings require provenance.",
  },
  {
    id: "tracker-control",
    name: "TrackerControl",
    upstream: "TrackerControl/tracker-control-android",
    category: "network_tracking",
    integrationMode: "evidence_import",
    status: "planned",
    purpose: "Observe tracker-related network destinations from consented Android-device testing.",
    safetyBoundary: "Local/owned-device analysis only; no interception of third-party communications.",
  },
  {
    id: "mvt",
    name: "Mobile Verification Toolkit",
    upstream: "mvt-project/mvt",
    category: "mobile_forensics",
    integrationMode: "external_runtime",
    status: "external_runtime_required",
    purpose: "Consent-based forensic checks for mobile compromise indicators.",
    safetyBoundary: "Device-owner consent and defensive forensic use only.",
  },
  {
    id: "mvt-indicators",
    name: "MVT Indicators",
    upstream: "mvt-project/mvt-indicators",
    category: "threat_intelligence",
    integrationMode: "evidence_import",
    status: "planned",
    purpose: "Versioned indicators used for defensive mobile-forensics correlation.",
    safetyBoundary: "Indicators are evidence references, not proof of compromise by themselves.",
  },
  {
    id: "androidqf",
    name: "AndroidQF",
    upstream: "mvt-project/androidqf",
    category: "mobile_forensics",
    integrationMode: "external_runtime",
    status: "external_runtime_required",
    purpose: "Collect forensic artifacts from consented Android devices for later analysis.",
    safetyBoundary: "Collection must be explicitly authorized by the device owner.",
  },
  {
    id: "bugbane",
    name: "Bugbane",
    upstream: "osservatorionessuno/bugbane",
    category: "mobile_forensics",
    integrationMode: "evidence_import",
    status: "planned",
    purpose: "Defensive Android triage and evidence export for suspected spyware or stalkerware.",
    safetyBoundary: "Victim-assistance and owned-device defensive analysis only.",
  },
];

export function getSurveillanceTool(id: string): SurveillanceTool | undefined {
  return surveillanceTools.find((tool) => tool.id === id);
}
