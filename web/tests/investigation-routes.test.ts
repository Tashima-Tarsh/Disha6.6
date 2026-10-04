import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createSession } from "../lib/server/auth";
import { investigations } from "../services/investigation/service";
import { POST as create } from "../app/api/v1/osint/investigations/route";
import { POST as upload } from "../app/api/v1/osint/investigations/image/route";
import { DELETE as close, GET as read } from "../app/api/v1/osint/investigations/[id]/route";
vi.mock("../lib/server/audit", () => ({ audit: vi.fn(async () => {}) }));
vi.mock("../lib/server/redis", () => ({ getRedisClient: vi.fn(async () => null) }));
afterEach(() => vi.restoreAllMocks());
const url = "https://disha.test/api/v1/osint/investigations";
async function headers() { const session = await createSession("analyst@example.com"); return { authorization: `Bearer ${session.accessToken}` }; }
describe("authenticated investigation transport", () => {
  it("requires authentication on create, status and cleanup", async () => {
    expect((await create(new NextRequest(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ target: "example.com" }) }))).status).toBe(401);
    const params = { params: Promise.resolve({ id: "unknown" }) };
    expect((await read(new NextRequest(`${url}/unknown`), params)).status).toBe(401);
    expect((await close(new NextRequest(`${url}/unknown`, { method: "DELETE" }), params)).status).toBe(401);
  });
  it("sends text to the service with authenticated ownership and disables response caching", async () => {
    const spy = vi.spyOn(investigations, "create").mockResolvedValue({ investigationId: "test" } as Awaited<ReturnType<typeof investigations.create>>);
    const response = await create(new NextRequest(url, { method: "POST", headers: { ...await headers(), "content-type": "application/json" }, body: JSON.stringify({ target: "Nitish Kumar" }) }));
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toContain("no-store"); expect(response.headers.has("x-request-id")).toBe(true); expect(spy.mock.calls[0][0]).toEqual({ target: "Nitish Kumar" }); expect(spy.mock.calls[0][1].principal.userId).toBe("analyst@example.com");
  });
  it("rejects oversized JSON before service execution", async () => {
    const spy = vi.spyOn(investigations, "create"); const response = await create(new NextRequest(url, { method: "POST", headers: { ...await headers(), "content-type": "application/json" }, body: JSON.stringify({ target: "x".repeat(5000) }) })); expect(response.status).toBe(413); expect(spy).not.toHaveBeenCalled();
  });
  it("passes multipart image bytes through the backend upload endpoint", async () => {
    const spy = vi.spyOn(investigations, "create").mockImplementation(async (_body, _ctx, image) => { expect(image?.type).toBe("image/png"); expect(image?.bytes.length).toBe(3); return { investigationId: "test-image" } as Awaited<ReturnType<typeof investigations.create>>; });
    const form = new FormData(); form.set("image", new File([new Uint8Array([1, 2, 3])], "test.png", { type: "image/png" })); const response = await upload(new NextRequest(`${url}/image`, { method: "POST", headers: await headers(), body: form })); expect(response.status).toBe(200); expect(spy).toHaveBeenCalledOnce();
  });
});
