import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ context: vi.fn(), proxy: vi.fn() }));
vi.mock("@/lib/server/security", () => ({
  requireRequestContext: mocks.context,
  requestId: () => "chat-test",
}));
vi.mock("@/services/chat", () => ({ proxyChat: mocks.proxy }));

import { POST } from "@/app/api/chat/route";

describe("chat request authorization", () => {
  beforeEach(() => vi.resetAllMocks());

  it.each([401, 403, 429])("preserves guard rejection %s without calling a model", async (status) => {
    mocks.context.mockRejectedValue(Object.assign(new Error("Request rejected"), { status }));
    const request = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "hello" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(status);
    expect(mocks.proxy).not.toHaveBeenCalled();
  });

  it("passes the authenticated caller to the model service", async () => {
    const context = { requestId: "chat-test", principal: { userId: "analyst-1", roles: ["analyst"] } };
    mocks.context.mockResolvedValue(context);
    mocks.proxy.mockResolvedValue(Response.json({ response: "hello" }));
    const request = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "hello" }),
    });
    expect((await POST(request)).status).toBe(200);
    expect(mocks.context).toHaveBeenCalledWith(request, "chat");
    expect(mocks.proxy).toHaveBeenCalledWith(context, expect.objectContaining({ message: "hello" }));
  });
});
