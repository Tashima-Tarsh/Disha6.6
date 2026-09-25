import type { GovernedExtension } from "./contracts";
import { listGovernedExtensionManifests } from "./catalog";
import { cognitiveEngineExtension } from "./cognitive-engine";
import { dishaBrainExtension } from "./disha-brain";
import { honeypotEvidenceExtension } from "./honeypot-evidence";
import { memoryGraphExtension } from "./memory-graph";
import { physicsSimulationExtension } from "./physics-simulation";
import { surveillanceIntelligenceExtension } from "./surveillance-intelligence";
import { vyuhaDefenseExtension } from "./vyuha-defense";

export const governedExtensionRegistry: Record<string, GovernedExtension> = {
  [vyuhaDefenseExtension.id]: vyuhaDefenseExtension,
  [dishaBrainExtension.id]: dishaBrainExtension,
  [cognitiveEngineExtension.id]: cognitiveEngineExtension,
  [memoryGraphExtension.id]: memoryGraphExtension,
  [honeypotEvidenceExtension.id]: honeypotEvidenceExtension,
  [physicsSimulationExtension.id]: physicsSimulationExtension,
  [surveillanceIntelligenceExtension.id]: surveillanceIntelligenceExtension,
};

export function listGovernedExtensions(): GovernedExtension[] {
  return Object.values(governedExtensionRegistry);
}

export { listGovernedExtensionManifests };
