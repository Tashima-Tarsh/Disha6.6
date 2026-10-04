import { afterEach, describe, expect, it, vi } from "vitest";
import { InvestigationSession, type Requester } from "../lib/investigation/session";
import type { Investigation } from "../lib/investigation/types";
const snapshot = (status: Investigation["status"] = "COMPLETED"): Investigation => ({ investigationId: "00000000-0000-4000-8000-000000000001", revision: 0, target: "example.com", normalizedTarget: "example.com", targetType: "domain", createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60000).toISOString(), status, plannedAdapters: [], runs: [], evidence: [], candidateClusters: [], edges: [] });
afterEach(() => vi.useRealTimers());
describe("investigation browser lifecycle", () => {
  it.each(["Nitish Kumar", "person@example.com", "+12025550123"])("sends %s to the backend and clears only after cleanup confirmation", async target => {
    const update = vi.fn(); const request = vi.fn(async (_url: string, init?: RequestInit) => init?.method === "DELETE" ? { cleanupConfirmed: true } : snapshot());
    const session = new InvestigationSession(update, vi.fn(), request as Requester);
    await session.start({ target, targetType: "auto" }); expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toEqual({ target, targetType: "auto" });
    await session.close(); expect(request.mock.calls[1][0]).toMatch(/\/investigations\/.*$/); expect(request.mock.calls[1][1]?.method).toBe("DELETE"); expect(update).toHaveBeenLastCalledWith(null); expect(session.active).toBeNull();
  });
  it("uploads the selected image as multipart data", async () => {
    const request = vi.fn(async () => snapshot()); const session = new InvestigationSession(vi.fn(), vi.fn(), request as Requester);
    const file = new File([new Uint8Array([1, 2, 3])], "test.png", { type: "image/png" }); await session.start(file);
    const calls = request.mock.calls as unknown as [string, RequestInit][];
    expect(calls[0][0]).toBe("/api/v1/osint/investigations/image"); expect(calls[0][1].body).toBeInstanceOf(FormData); expect((calls[0][1].body as FormData).get("image")).toBeInstanceOf(File);
  });
  it("retains visible state and stops polling when cleanup fails", async () => {
    vi.useFakeTimers(); const update = vi.fn(); const request = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") throw new Error("Cleanup pending");
      if (_url.endsWith("/run")) return new Promise<Investigation>((_, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))));
      return snapshot("RUNNING");
    });
    const session = new InvestigationSession(update, vi.fn(), request as Requester); await session.start({ target: "example.com", targetType: "auto" }); await expect(session.close()).rejects.toThrow("Cleanup pending");
    const count = request.mock.calls.length; await vi.advanceTimersByTimeAsync(10000); expect(request).toHaveBeenCalledTimes(count); expect(session.active).not.toBeNull(); expect(update).not.toHaveBeenCalledWith(null);
  });
  it("ignores results that arrive after close and isolates subsequent searches", async () => {
    vi.useFakeTimers(); let finish!: (value: Investigation) => void; const update = vi.fn(); let starts = 0;
    const request = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") return { cleanupConfirmed: true };
      if (url.endsWith("/run")) return new Promise<Investigation>(resolve => { finish = resolve; });
      return snapshot(starts++ === 0 ? "RUNNING" : "COMPLETED");
    });
    const session = new InvestigationSession(update, vi.fn(), request as Requester); await session.start({ target: "example.com", targetType: "auto" }); await session.close(); finish({ ...snapshot(), revision: 99 }); await Promise.resolve();
    expect(update).toHaveBeenLastCalledWith(null); await session.start({ target: "second.example", targetType: "auto" }); expect(session.active?.evidence).toEqual([]); const count = request.mock.calls.length; await vi.advanceTimersByTimeAsync(5000); expect(request).toHaveBeenCalledTimes(count);
  });
});
