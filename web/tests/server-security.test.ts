import { afterEach, describe, expect, it, vi } from "vitest";
import { hashSecret, signJson, verifySecret, verifySignedJson } from "../lib/server/crypto";
import { getEnv, resetEnvForTests } from "../lib/server/env";
import { can, assertCan } from "../lib/server/policy";
import { createShareSchema, fileWriteSchema, loginSchema, oidcStartSchema } from "../lib/server/schemas/api";
import type { Principal } from "../lib/server/types";

afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvForTests();
});

const analyst: Principal = {
  userId: "analyst@example.com",
  email: "analyst@example.com",
  roles: ["analyst"],
};

describe("policy", () => {
  it("allows analyst reads and denies writes", () => {
    expect(can(analyst, "file:read")).toBe(true);
    expect(can(analyst, "file:write")).toBe(false);
    expect(() => assertCan(analyst, "file:write")).toThrow("Insufficient privileges");
  });

  it("allows admin audit access", () => {
    expect(can({ ...analyst, roles: ["admin"] }, "audit:read")).toBe(true);
  });
});

describe("crypto", () => {
  it("hashes secrets with verification", () => {
    const encoded = hashSecret("correct horse battery staple");
    expect(verifySecret("correct horse battery staple", encoded)).toBe(true);
    expect(verifySecret("wrong horse battery staple", encoded)).toBe(false);
  });

  it("signs and verifies JSON tokens", () => {
    const token = signJson({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 60 }, "a".repeat(32));
    expect(verifySignedJson(token, "a".repeat(32))).toMatchObject({ sub: "u1" });
  });

  it("rejects malformed signatures without throwing a length error", () => {
    const token = signJson({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 60 }, "a".repeat(32));
    expect(() => verifySignedJson(`${token}x`, "a".repeat(32))).toThrow("Invalid token signature");
  });
});

describe("schemas", () => {
  it("requires strong login password shape", () => {
    expect(() => loginSchema.parse({ email: "a@b.com", password: "short" })).toThrow();
  });

  it("bounds file write content", () => {
    expect(() => fileWriteSchema.parse({ path: "a.txt", content: "x".repeat(2_000_001) })).toThrow();
  });

  it("requires passwords for password-protected shares", () => {
    expect(() =>
      createShareSchema.parse({
        conversation: { id: "c1", title: "t", messages: [], createdAt: 1, updatedAt: 1 },
        visibility: "password",
        expiry: "1h",
      }),
    ).toThrow();
  });

  it("accepts only the verified Meri Pehchaan OIDC provider", () => {
    expect(oidcStartSchema.parse({ provider: "meri-pehchan" }).provider).toBe("meri-pehchan");
    expect(() => oidcStartSchema.parse({ provider: "intra-id" })).toThrow();
  });
});

describe("development admin configuration", () => {
  it("accepts development admin identities only from environment configuration", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DISHA_DEV_ADMIN_EMAILS", "admin@example.com,ops@example.com");
    resetEnvForTests();
    expect(getEnv().DISHA_DEV_ADMIN_EMAILS).toContain("admin@example.com");
  });

  it("does not invent privileged development identities", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DISHA_DEV_ADMIN_EMAILS", "");
    resetEnvForTests();
    expect(getEnv().DISHA_DEV_ADMIN_EMAILS).toBeUndefined();
  });
});

describe("production environment hardening", () => {
  it("does not use dev fallback configuration in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DISHA_AUTH_MODE", "dev-jwt");
    vi.stubEnv("DISHA_JWT_SECRET", "a".repeat(32));
    vi.stubEnv("DATABASE_URL", "postgres://user:pass@localhost:5432/disha");
    resetEnvForTests();
    expect(() => getEnv()).toThrow("dev-jwt is not allowed");
  });

  it("requires Meri Pehchaan credentials in oidc mode", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DISHA_AUTH_MODE", "oidc");
    vi.stubEnv("DISHA_JWT_SECRET", "a".repeat(32));
    vi.stubEnv("DATABASE_URL", "postgres://user:pass@localhost:5432/disha");
    vi.stubEnv("DISHA_WORKER_TOKEN", "worker-token-that-is-at-least-24-chars");
    vi.stubEnv("DISHA_MERI_PEHCHAN_CLIENT_ID", "");
    vi.stubEnv("DISHA_MERI_PEHCHAN_CLIENT_SECRET", "");
    resetEnvForTests();
    expect(() => getEnv()).toThrow("DISHA_MERI_PEHCHAN_CLIENT_ID");
  });

  it("accepts hybrid auth while Meri Pehchaan onboarding is pending", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DISHA_AUTH_MODE", "hybrid");
    resetEnvForTests();
    expect(getEnv().DISHA_AUTH_MODE).toBe("hybrid");
  });

  it("requires DATABASE_URL in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DISHA_AUTH_MODE", "oidc");
    vi.stubEnv("DISHA_JWT_SECRET", "a".repeat(32));
    vi.stubEnv("DISHA_MERI_PEHCHAN_CLIENT_ID", "client");
    vi.stubEnv("DISHA_MERI_PEHCHAN_CLIENT_SECRET", "secret");
    vi.stubEnv("DATABASE_URL", "");
    resetEnvForTests();
    expect(() => getEnv()).toThrow("DATABASE_URL is required");
  });
});
