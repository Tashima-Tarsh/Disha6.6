import { createHash } from "node:crypto";

/**
 * Bounded, process-local cache for deterministic offline skill computation.
 *
 * The registry performs its policy check and writes new evidence for every call:
 * never store or reuse an authorization decision, principal, mission, or event ID.
 * Entries are not shared across processes and disappear on restart.
 */
export class SkillResultCache {
  private readonly entries = new Map<string, { expiresAt: number; value: unknown }>();

  constructor(
    private readonly maxEntries = 256,
    private readonly ttlMs = 5 * 60 * 1000,
  ) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1 || !Number.isFinite(ttlMs) || ttlMs <= 0) {
      throw new RangeError("Skill cache limits must be positive");
    }
  }

  static makeKey(skillId: string, taskPrompt: string, params?: Record<string, unknown>): string {
    // An opaque digest, rather than retaining prompts or supplied datasets in key strings.
    // JSON value ordering follows caller input; a different order is a safe cache miss.
    const serialized = JSON.stringify([skillId, taskPrompt, params ?? null]);
    return createHash("sha256").update(serialized).digest("hex");
  }

  get<T>(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    // Refresh LRU recency; never expose a mutable reference to a stored artifact.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return structuredClone(entry.value) as T;
  }

  set<T>(key: string, value: T): void {
    this.entries.delete(key);
    this.entries.set(key, {
      expiresAt: Date.now() + this.ttlMs,
      value: structuredClone(value),
    });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  clear(): void {
    this.entries.clear();
  }
}

export const skillResultCache = new SkillResultCache();
