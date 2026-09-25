import type { GovernedExtensionManifest } from "./contracts";
import { cognitiveEngineExtension } from "./cognitive-engine";
import { dishaBrainExtension } from "./disha-brain";
import { honeypotEvidenceExtension } from "./honeypot-evidence";
import { memoryGraphExtension } from "./memory-graph";
import { physicsSimulationExtension } from "./physics-simulation";
import { surveillanceIntelligenceExtension } from "./surveillance-intelligence";
import { vyuhaDefenseExtension } from "./vyuha-defense";

const activeExtensionManifests: GovernedExtensionManifest[] = [
  vyuhaDefenseExtension.manifest,
  dishaBrainExtension.manifest,
  cognitiveEngineExtension.manifest,
  memoryGraphExtension.manifest,
  honeypotEvidenceExtension.manifest,
  physicsSimulationExtension.manifest,
  surveillanceIntelligenceExtension.manifest,
];

export function listGovernedExtensionManifests(): GovernedExtensionManifest[] {
  return activeExtensionManifests;
}
