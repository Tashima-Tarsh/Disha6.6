/**
 * Visual-only formation catalog, aligned with backend/vyuha_formations.py.
 * The live VYUHA APIs require operator authorization; this public cinematic
 * presentation never invokes activation endpoints or represents telemetry.
 */
export const VYUHA_FORMATIONS = [
  {
    id: "chakra_vyuha",
    name: "CHAKRA VYUHA",
    title: "Rotating perimeter",
    purpose: "Layered perimeter awareness and defensive telemetry",
    geometry: "chakra",
    color: "#fb6266",
    signal: "PERIMETER · CYBER",
    narration: "DISHA detects a probing signal. Chakra constructs rotating defensive perimeters.",
  },
  {
    id: "padma_vyuha",
    name: "PADMA VYUHA",
    title: "Concentric containment",
    purpose: "Segmented identity resolution and containment boundaries",
    geometry: "padma",
    color: "#bf8aff",
    signal: "IDENTITY · ANALYSIS",
    narration: "DISHA isolates relationships into evidence-preserving concentric layers.",
  },
  {
    id: "garuda_vyuha",
    name: "GARUDA VYUHA",
    title: "Aerial reconnaissance",
    purpose: "Air, maritime and orbital signal correlation",
    geometry: "garuda",
    color: "#f7b967",
    signal: "RECON · SIGNALS",
    narration: "Garuda deploys its twin sensor wings and surveys the observation field.",
  },
  {
    id: "suryavyuha",
    name: "SURYA VYUHA",
    title: "Macro pattern recognition",
    purpose: "Graph topology, temporal anomaly and cluster analysis",
    geometry: "surya",
    color: "#f7d26d",
    signal: "PATTERNS · CORRELATION",
    narration: "Surya expands a radial field to reveal connected signals and anomalies.",
  },
  {
    id: "nakshatra_mandala",
    name: "NAKSHATRA MANDALA",
    title: "Orbital observation",
    purpose: "Satellite and spatial-coverage evidence review",
    geometry: "nakshatra",
    color: "#7aaaff",
    signal: "ORBITAL · SENSORS",
    narration: "Nakshatra aligns a constellation of observation nodes across three dimensions.",
  },
  {
    id: "sarvatobhadra",
    name: "SARVATOBHADRA",
    title: "Omnidirectional shield",
    purpose: "Encircling, policy-governed infrastructure defense",
    geometry: "sarvatobhadra",
    color: "#64e1b1",
    signal: "DEFENSE · BOUNDARY",
    narration: "Sarvatobhadra locks a symmetric protective boundary around the core.",
  },
  {
    id: "nyaya_audit",
    name: "NYAYA AUDIT",
    title: "Evidence admissibility",
    purpose: "Source provenance, contradiction review and human verification",
    geometry: "nyaya",
    color: "#70e8ee",
    signal: "EVIDENCE · REVIEW",
    narration: "NYAYA separates observations from findings and prepares a review record.",
  },
  {
    id: "setu_varuna",
    name: "SETU-VARUNA",
    title: "Resilience bridge",
    purpose: "Maritime infrastructure context and recovery planning",
    geometry: "setu",
    color: "#7bc9f9",
    signal: "RESILIENCE · RECOVERY",
    narration: "SETU-VARUNA establishes redundant corridors for resilience planning.",
  },
] as const;

export type VyuhaFormation = (typeof VYUHA_FORMATIONS)[number];
export type VyuhaFormationId = VyuhaFormation["id"];
export type VyuhaGeometry = VyuhaFormation["geometry"];

export function getVyuhaFormation(id: string): VyuhaFormation {
  return VYUHA_FORMATIONS.find((formation) => formation.id === id) ?? VYUHA_FORMATIONS[0];
}
