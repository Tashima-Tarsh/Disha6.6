import { describe, expect, it, vi } from "vitest";
import { SkillResultCache } from "../lib/skills/skill-cache";

describe("bounded offline skill computation cache", () => {
  it("creates opaque, input-sensitive cache keys", () => {
    const a = SkillResultCache.makeKey("skill-a", "prompt", { data: [1, 2] });
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(a).not.toContain("prompt");
    expect(a).not.toBe(SkillResultCache.makeKey("skill-a", "prompt", { data: [2, 1] }));
    expect(a).not.toBe(SkillResultCache.makeKey("skill-b", "prompt", { data: [1, 2] }));
  });

  it("expires old entries and evicts least recently used entries", () => {
    const now = vi.spyOn(Date, "now");
    try {
      now.mockReturnValue(1000);
      const cache = new SkillResultCache(2, 100);
      cache.set("a", { score: 1 });
      cache.set("b", { score: 2 });
      expect(cache.get<{ score: number }>("a")?.score).toBe(1);
      cache.set("c", { score: 3 });
      expect(cache.get("b")).toBeUndefined();
      now.mockReturnValue(1100);
      expect(cache.get("a")).toBeUndefined();
      expect(cache.get("c")).toBeUndefined();
    } finally {
      now.mockRestore();
    }
  });

  it("does not expose mutable references to cached artifacts", () => {
    const cache = new SkillResultCache();
    cache.set("k", { values: [1] });
    const result = cache.get<{ values: number[] }>("k")!;
    result.values.push(99);
    expect(cache.get<{ values: number[] }>("k")?.values).toEqual([1]);
  });
});
