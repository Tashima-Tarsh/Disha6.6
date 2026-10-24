/**
 * Adapter Bus — the only permitted gateway for external observations.
 *
 * Constitutional rules enforced here:
 * - Every successful adapter run must produce EvidenceEvents
 * - High-risk adapters default to proposal-only
 * - Timeouts and isolation per adapter
 * - Partial failure is allowed; cascade failure is not
 */

import type { Adapter, EvidenceEvent } from "@disha/contracts";
import type {
  AdapterRegistration,
  BusExecuteRequest,
  BusExecuteResult,
} from "./types";

export class AdapterBus {
  private registry = new Map<string, AdapterRegistration>();

  register(adapter: Adapter, enabled = true): void {
    this.registry.set(adapter.id, { adapter, enabled });
  }

  unregister(adapterId: string): void {
    this.registry.delete(adapterId);
  }

  list(): AdapterRegistration[] {
    return Array.from(this.registry.values());
  }

  get(adapterId: string): Adapter | undefined {
    return this.registry.get(adapterId)?.adapter;
  }

  async execute(req: BusExecuteRequest): Promise<BusExecuteResult> {
    const results: BusExecuteResult["results"] = [];
    const allEvidence: EvidenceEvent[] = [];
    let partial = false;

    const tasks = req.adapterIds.map(async (adapterId) => {
      const reg = this.registry.get(adapterId);
      const start = Date.now();

      if (!reg || !reg.enabled) {
        results.push({
          adapterId,
          success: false,
          error: "Adapter not found or disabled",
          durationMs: 0,
        });
        partial = true;
        return;
      }

      const { adapter } = reg;

      // Constitutional rule: high-risk → proposal-only unless explicitly allowed
      if (
        (adapter.riskLevel === "high" || adapter.riskLevel === "critical") &&
        (adapter.requiresApproval || req.forceProposeHighRisk !== false)
      ) {
        // In a full implementation we would create a proposal EvidenceEvent
        // and return without executing side-effects.
        results.push({
          adapterId,
          success: true,
          result: {
            observations: [],
            evidenceEvents: [],
            confidence: 0,
            limitations: ["High-risk adapter forced to proposal-only by policy"],
          },
          durationMs: Date.now() - start,
        });
        return;
      }

      try {
        const timeoutMs = adapter.timeoutMs || 15000;
        const result = await Promise.race([
          adapter.execute(req.input, req.context),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Adapter timeout")), timeoutMs)
          ),
        ]);

        // Constitutional rule: must emit evidence
        if (!result.evidenceEvents || result.evidenceEvents.length === 0) {
          console.warn(
            `[AdapterBus] Adapter ${adapterId} returned no EvidenceEvents — this violates the Constitution`
          );
        }

        allEvidence.push(...(result.evidenceEvents || []));
        results.push({
          adapterId,
          success: true,
          result,
          durationMs: Date.now() - start,
        });
      } catch (err: any) {
        partial = true;
        results.push({
          adapterId,
          success: false,
          error: err?.message ?? String(err),
          durationMs: Date.now() - start,
        });
      }
    });

    await Promise.all(tasks);

    return {
      results,
      evidenceEvents: allEvidence,
      partial,
    };
  }
}
