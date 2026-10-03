import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const startRoute = path.resolve(__dirname, "../app/api/auth/oidc/start/route.ts");
const callbackRoute = path.resolve(__dirname, "../app/api/auth/oidc/callback/route.ts");
const providerHelpers = path.resolve(__dirname, "../lib/server/meri-pehchaan.ts");

describe("Meri Pehchaan production authentication", () => {
  it("uses authorization code flow with PKCE and OpenID scope", () => {
    const source = fs.readFileSync(startRoute, "utf8");

    expect(source).toContain('response_type", "code"');
    expect(source).toContain('scope", "openid"');
    expect(source).toContain('code_challenge_method", "S256"');
    expect(source).toContain("DISHA_MERI_PEHCHAN_CLIENT_ID");
    expect(source).not.toContain("intra-id");
  });

  it("exchanges the code and validates the government account through the user endpoint", () => {
    const source = fs.readFileSync(callbackRoute, "utf8");

    expect(source).toContain("DISHA_MERI_PEHCHAN_TOKEN_URL");
    expect(source).toContain("DISHA_MERI_PEHCHAN_USER_URL");
    expect(source).toContain("client_secret: clientSecret");
    expect(source).not.toContain('"Basic "');
    expect(source).toContain('requiredProviderString(profile, "digilockerid")');
    expect(source).toContain("subject: `meri-pehchaan:${digilockerId}`");
    expect(source).not.toContain(".well-known/openid-configuration");
  });

  it("restricts provider requests to official Meri Pehchaan HTTPS hosts", () => {
    const source = fs.readFileSync(providerHelpers, "utf8");

    expect(source).toContain('url.protocol !== "https:"');
    expect(source).toContain("host.endsWith(MERI_PEHCHAAN_HOST_SUFFIX)");
    expect(source).toContain('redirect: "error"');
  });
});
