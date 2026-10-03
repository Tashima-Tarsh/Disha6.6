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

  it("uses the native Astra 6 Three.js scene instead of flattening the login into reference artwork", () => {
    const source = fs.readFileSync(loginClient, "utf8");
    const css = fs.readFileSync(loginStyles, "utf8");

    expect(source).toContain("SovereignCyberMatrix3D");
    expect(css).not.toContain('url("/disha66-login-reference.webp")');
    expect(css).not.toContain('url("/disha66-login-reference.avif")');
    expect(source).not.toContain("data:image/avif;base64,");
    expect(source).not.toContain("/disha-login-hero.webp");
  });

  it("keeps the page fixed to the viewport without page scrolling and enforces spatial gateway architecture", () => {
    const css = fs.readFileSync(loginStyles, "utf8");

    expect(css).toContain("height: 100dvh");
    expect(css).toContain("width: 100vw");
    expect(css).toContain("position: fixed");
    expect(css).toContain("overflow: hidden");
    expect(css).toContain("max-width: 420px");
    expect(css).toContain("backdrop-filter: blur(28px)");
    expect(css).not.toContain("overflow: auto");
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

    expect(source).toContain("Signed<br />session");
    expect(source).toContain("CSRF<br />protected");
    expect(source).toContain("Audit<br />logged");
  });
});
