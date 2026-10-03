import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const loginClient = path.resolve(__dirname, "../app/login/login-client.tsx");
const loginStyles = path.resolve(__dirname, "../app/login/login.module.css");
const identityScene = path.resolve(__dirname, "../components/auth/DishaIdentityScene3D.tsx");

describe("DISHA secure login UI", () => {
  it("renders a real backend-connected login instead of a flattened screenshot", () => {
    const source = fs.readFileSync(loginClient, "utf8");

    expect(source).toContain('fetch("/api/auth/login"');
    expect(source).not.toContain("/api/auth/god-admin");
    expect(source).toContain('"/api/auth/login"');
    expect(source).toContain("/api/auth/oidc/start?");
    expect(source).toContain('type={showPassword ? "text" : "password"}');
    expect(source).toContain('disabled={!formValid || state === "submitting" || state === "verified"}');
    expect(source).not.toContain("localStorage");
  });

  it("uses the dedicated DishaIdentityScene3D component with real Three.js WebGL globe", () => {
    const source = fs.readFileSync(loginClient, "utf8");
    const sceneSource = fs.readFileSync(identityScene, "utf8");
    const css = fs.readFileSync(loginStyles, "utf8");

    expect(source).toContain("DishaIdentityScene3D");
    expect(sceneSource).toContain("THREE.WebGLRenderer");
    expect(sceneSource).toContain("THREE.SphereGeometry");
    expect(css).not.toContain('url("/disha66-login-reference.webp")');
    expect(css).not.toContain('url("/disha66-login-reference.avif")');
    expect(source).not.toContain("data:image/avif;base64,");
    expect(source).not.toContain("/disha-login-hero.webp");
  });

  it("centers the login card horizontally and vertically with compact spatial boundaries", () => {
    const css = fs.readFileSync(loginStyles, "utf8");

    expect(css).toContain("height: 100dvh");
    expect(css).toContain("width: 100vw");
    expect(css).toContain("position: fixed");
    expect(css).toContain("overflow: hidden");
    expect(css).toContain("justify-content: center");
    expect(css).toContain("max-width: 370px");
    expect(css).toContain("backdrop-filter: blur(28px)");
    expect(css).not.toContain("justify-content: flex-end");
  });

  it("does not expose a hard-coded privileged identity bypass", () => {
    const source = fs.readFileSync(loginClient, "utf8");

    expect(source).not.toContain("GOD_ADMIN_EMAIL");
    expect(source).not.toContain("God Admin");
    expect(source).not.toContain("/api/auth/god-admin");
  });

  it("uses Meri Pehchaan and an official government account link instead of a fictional provider", () => {
    const source = fs.readFileSync(loginClient, "utf8");

    expect(source).toContain('provider: "meri-pehchan"');
    expect(source).toContain("Meri Pehchaan");
    expect(source).toContain("https://epramaan.meripehchaan.gov.in/");
    expect(source).not.toContain("intra-id");
    expect(source).not.toContain("Intra ID");
    expect(source).not.toContain("Continue with Google");
    expect(source).not.toContain("NIC SSO");
  });

  it("does not advertise unsupported local password reset or registration actions", () => {
    const source = fs.readFileSync(loginClient, "utf8");

    expect(source).not.toContain('href="/forgot-password"');
    expect(source).not.toContain('href="/register"');
    expect(source).not.toContain("Forgot Password");
    expect(source).not.toContain("Create Account");
  });

  it("uses restrained single-line security footer and pre-auth boundary notice", () => {
    const source = fs.readFileSync(loginClient, "utf8");

    expect(source).toContain("SECURE SESSION · CSRF PROTECTED · AUDIT LOGGED");
    expect(source).toContain("PRE-AUTH VISUALIZATION · LIVE INTELLIGENCE AFTER SIGN-IN");
  });

  it("displays clean identity header and strictly rejects fake operational labels", () => {
    const source = fs.readFileSync(loginClient, "utf8");

    expect(source).toContain("SECURE ACCESS");
    expect(source).toContain("DISHA 6.6");
    expect(source).toContain("Evidence-Grade Intelligence");
    expect(source).not.toContain("CAPABILITY PREVIEW");
    expect(source).not.toContain("Runtime: Astra 6");
    expect(source).not.toContain("94 Gbps");
    expect(source).not.toContain("active threat");
    expect(source).not.toContain("intercepting traffic");
    expect(source).not.toContain("live satellite");
    expect(source).not.toContain("command center active");
    expect(source).not.toContain("SELECTED NODE");
    expect(source).not.toContain("PRESET");
  });

  it("enforces reduced-motion accessibility and WebGL fallback in DishaIdentityScene3D", () => {
    const sceneSource = fs.readFileSync(identityScene, "utf8");

    expect(sceneSource).toContain("prefers-reduced-motion");
    expect(sceneSource).toContain("fallbackScene");
    expect(sceneSource).toContain("setWebGlSupported(false)");
    expect(sceneSource).toContain("datameet-india-land-simplified.geojson");
    expect(sceneSource).toContain("world-countries.geojson");
  });

  it("configures genuine 3D perspective and depth properties on the spatial gateway card", () => {
    const css = fs.readFileSync(loginStyles, "utf8");

    expect(css).toContain("perspective: 1200px");
    expect(css).toContain("transform-style: preserve-3d");
    expect(css).toContain("translateZ");
  });
});
