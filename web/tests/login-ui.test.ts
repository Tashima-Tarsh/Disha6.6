import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LoginClient } from "../app/login/login-client";
import { readAssistantReply } from "../components/shell/AstraAnalystDrawer";

const loginSource = fs.readFileSync(path.resolve(__dirname, "../app/login/login-client.tsx"), "utf8");

describe("DISHA sign-in and assistant boundaries", () => {
  it("renders an accessible sign-in form without a WebGL dependency", () => {
    const html = renderToStaticMarkup(createElement(LoginClient, { returnUrl: "/investigate" }));
    expect(html).toContain("Authorised operators only. Every session is evidence-logged.");
    expect(html).toContain('autoComplete="username"');
    expect(html).toContain('autoComplete="current-password"');
    expect(html).toContain('type="password"');
    expect(html).toContain("show password");
    expect(html).toContain("disabled");
    expect(html).toContain("canvas");
    expect(loginSource).not.toContain("DishaIdentityScene3D");
  });

  it("renders a safe, readable session-expired error", () => {
    const html = renderToStaticMarkup(createElement(LoginClient, { returnUrl: "/investigate", authError: "session-expired" }));
    expect(html).toContain('role="alert"');
    expect(html).toContain("Session has expired");
    const untrusted = renderToStaticMarkup(createElement(LoginClient, { returnUrl: "/investigate", authError: "<script>alert(1)</script>" }));
    expect(untrusted).not.toContain("<script>alert(1)</script>");
    expect(untrusted).toContain("Authentication error encountered.");
  });

  it("retains the real password and OIDC endpoints without a local bypass", () => {
    expect(loginSource).toContain('fetch("/api/auth/login"');
    expect(loginSource).toContain('credentials: "same-origin"');
    expect(loginSource).toContain("/api/auth/oidc/start?");
    expect(loginSource).toContain('provider: "meri-pehchan"');
    expect(loginSource).toContain("show password");
    expect(loginSource).not.toContain("/api/auth/god-admin");
    expect(loginSource).not.toContain("localStorage");
    expect(loginSource).not.toContain('href="/forgot-password"');
    expect(loginSource).not.toContain('href="/register"');
  });

  it.each([
    ["Plain response", "Plain response"],
    [{ response: "Source-backed reply", model: "local" }, "Source-backed reply"],
    [{ message: "Fallback status" }, "Fallback status"],
    [{ reply: "Alternate supported reply" }, "Alternate supported reply"],
    [{ response: { arbitrary: "object" }, message: "Readable message" }, "Readable message"],
  ])("accepts textual assistant replies: %j", (input, expected) => {
    expect(readAssistantReply(input)).toBe(expected);
  });

  it.each([null, undefined, {}, { response: {} }, { message: 12 }, "", "   "])("rejects unreadable assistant responses: %j", payload => {
    expect(() => readAssistantReply(payload)).toThrow("no readable reply");
  });
});
