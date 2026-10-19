import { afterEach, describe, expect, it, vi } from "vitest";
import { executeProvider } from "../services/investigation/providers";
import { normalizeRecords } from "../services/investigation/normalize";
import { runFailure } from "../services/investigation/service";
import { safePublicFetch } from "../lib/server/safe-public-fetch";
import type { AdapterPlan } from "../lib/investigation/types";
vi.mock("../lib/server/safe-public-fetch", () => ({ safePublicFetch: vi.fn() }));
const fetcher = vi.mocked(safePublicFetch);
const plan: AdapterPlan = { adapterId: "passive-shodan", sourceName: "Shodan", input: { target: "8.8.8.8", type: "ip" }, reason: "passive lookup" };
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });
describe("official configured providers", () => {
  it("does not call Shodan without a key", async () => { vi.stubEnv("SHODAN_API_KEY", ""); const result = await executeProvider(plan, "owner", "inv", new AbortController().signal); expect(result.error).toBe("not_configured"); expect(fetcher).not.toHaveBeenCalled(); });
  it("checks API info, preserves provider timestamps, and excludes secrets and raw service banners", async () => {
    vi.stubEnv("SHODAN_API_KEY", "test-secret-do-not-expose"); fetcher.mockResolvedValueOnce(Response.json({ query_credits: 3 })).mockResolvedValueOnce(Response.json({ ip_str: "8.8.8.8", last_update: "2026-10-03T00:00:00Z", ports: [53], data: [{ port: 53, transport: "udp", product: "DNS", data: "raw banner must be excluded" }] }));
    const result = await executeProvider(plan, "owner", "inv", new AbortController().signal); const evidence = normalizeRecords(plan, result);
    expect(String(fetcher.mock.calls[0][0])).toContain("/api-info"); expect(String(fetcher.mock.calls[1][0])).toContain("/shodan/host/8.8.8.8"); expect(fetcher.mock.calls[1][1]?.redirect).toBe("error");
    expect(evidence).toHaveLength(1); expect(evidence[0].observedAt).toBe("2026-10-03T00:00:00Z"); expect(JSON.stringify(result)).not.toContain("test-secret"); expect(JSON.stringify(evidence)).not.toContain("raw banner"); expect(JSON.stringify(result)).toContain("REST_HEALTHY"); expect(JSON.stringify(result)).not.toContain("STREAM_HEALTHY");
  });
  it("respects exhausted search credits without issuing a host search", async () => {
    vi.stubEnv("SHODAN_API_KEY", "test-key"); fetcher.mockResolvedValue(Response.json({ query_credits: 0 }));
    await expect(executeProvider({ ...plan, input: { type: "domain", target: "example.com" } }, "owner", "inv", new AbortController().signal)).rejects.toThrow("credits_exhausted"); expect(fetcher).toHaveBeenCalledOnce(); expect(runFailure("provider_query_credits_exhausted").status).toBe("RATE_LIMITED");
  });
});
