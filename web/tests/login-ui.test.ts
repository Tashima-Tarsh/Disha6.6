import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const loginClient = path.resolve(__dirname, "../app/login/login-client.tsx");
const loginStyles = path.resolve(__dirname, "../app/login/login.module.css");

describe("DISHA secure login UI", () => {
  it("renders a real backend-connected login instead of a flattened screenshot", () => {
    const source = fs.readFileSync(loginClient, "utf8");

    expect(source).toContain('fetch("/api/auth/login"');
    expect(source).not.toContain("/api/auth/god-admin");
    expect(source).toContain('"/api/auth/login"');
    expect(source).toContain("/api/auth/oidc/start?");
    expect(source).toContain('type={showPassword ? "text" : "password"}');
    expect(source).toContain('disabled={!formValid || state === "submitting"}');
    expect(source).not.toContain("localStorage");
  });

  it("does not expose a hard-coded privileged identity bypass", () => {
    const source = fs.readFileSync(loginClient, "utf8");

    expect(source).not.toContain("GOD_ADMIN_EMAIL");
    expect(source).not.toContain("God Admin");
    expect(source).not.toContain("/api/auth/god-admin");
  });

  it("shows only approved identity providers wired to the existing OIDC route", () => {
    const source = fs.readFileSync(loginClient, "utf8");

    expect(source).toContain('startOidc("meri-pehchan")');
    expect(source).toContain('startOidc("intra-id")');
    expect(source).not.toContain("Continue with Google");
    expect(source).not.toContain("NIC SSO");
  });

  it("does not advertise unsupported password reset or registration actions", () => {
    const source = fs.readFileSync(loginClient, "utf8");

    expect(source).not.toContain('href="/forgot-password"');
    expect(source).not.toContain('href="/register"');
    expect(source).not.toContain("Forgot Password");
    expect(source).not.toContain("Create Account");
  });

  it("uses truthful security labels for existing controls", () => {
    const source = fs.readFileSync(loginClient, "utf8");

    expect(source).toContain("Secure<br />session");
    expect(source).toContain("CSRF<br />protected");
    expect(source).toContain("Audited<br />access");
  });
});
