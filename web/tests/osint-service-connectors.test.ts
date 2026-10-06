import { describe, expect, it } from "vitest";
import { getOsintServiceConnectorSummary, listOsintServiceConnectors, probeOsintServiceConnector } from "../lib/unified/osint-service-connectors";

describe("OSINT service connectors", () => {
  it("reports service-backed and ASTRA-backed runtime posture", () => {
    const connectors = listOsintServiceConnectors();
    expect(connectors.map((connector) => connector.id)).toEqual(["opencti", "intelowl", "spiderfoot", "sherlock", "maigret"]);
    expect(connectors.find((connector) => connector.id === "opencti")?.executionState).toBe("configured_live");
    expect(connectors.find((connector) => connector.id === "intelowl")?.executionState).toBe("configured_live");
    expect(connectors.find((connector) => connector.id === "spiderfoot")?.executionState).toBe("astra_worker");
    expect(connectors.find((connector) => connector.id === "sherlock")?.executionState).toBe("astra_worker");
    expect(connectors.find((connector) => connector.id === "maigret")?.executionState).toBe("astra_worker");
  });

  it("does not expose secret values in connector posture", () => {
    const previousToken = process.env.OPENCTI_TOKEN;
    process.env.OPENCTI_TOKEN = "secret-token-value";
    try {
      const serialized = JSON.stringify(listOsintServiceConnectors());
      expect(serialized).not.toContain("secret-token-value");
      expect(serialized).toContain("OPENCTI_TOKEN");
    } finally {
      if (previousToken === undefined) delete process.env.OPENCTI_TOKEN;
      else process.env.OPENCTI_TOKEN = previousToken;
    }
  });

  it("reports SpiderFoot as an ASTRA worker when configured", async () => {
    const previousDb = process.env.DATABASE_URL;
    const previousFlag = process.env.DISHA_ASTRA6_SPIDERFOOT_ENABLED;
    process.env.DATABASE_URL = "postgresql://example.invalid/disha";
    process.env.DISHA_ASTRA6_SPIDERFOOT_ENABLED = "true";
    try {
      await expect(probeOsintServiceConnector("spiderfoot")).resolves.toMatchObject({ status: "ok" });
    } finally {
      if (previousDb === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousDb;
      if (previousFlag === undefined) delete process.env.DISHA_ASTRA6_SPIDERFOOT_ENABLED;
      else process.env.DISHA_ASTRA6_SPIDERFOOT_ENABLED = previousFlag;
    }
  });

  it("allows OpenCTI and IntelOwl probes when configured", async () => {
    const previous = {
      openCtiUrl: process.env.OPENCTI_BASE_URL,
      openCtiToken: process.env.OPENCTI_TOKEN,
      intelOwlUrl: process.env.INTELOWL_BASE_URL,
      intelOwlKey: process.env.INTELOWL_API_KEY,
      intelOwlAnalyzers: process.env.INTELOWL_ANALYZERS,
    };
    process.env.OPENCTI_BASE_URL = "https://opencti.example";
    process.env.OPENCTI_TOKEN = "token";
    process.env.INTELOWL_BASE_URL = "https://intelowl.example";
    process.env.INTELOWL_API_KEY = "key";
    process.env.INTELOWL_ANALYZERS = "Classic_DNS";
    const fetcher = async () => new Response(JSON.stringify({ ok: true }), { status: 200 });
    try {
      await expect(probeOsintServiceConnector("opencti", fetcher)).resolves.toMatchObject({ status: "ok", httpStatus: 200 });
      await expect(probeOsintServiceConnector("intelowl", fetcher)).resolves.toMatchObject({ status: "ok", httpStatus: 200 });
    } finally {
      if (previous.openCtiUrl === undefined) delete process.env.OPENCTI_BASE_URL; else process.env.OPENCTI_BASE_URL = previous.openCtiUrl;
      if (previous.openCtiToken === undefined) delete process.env.OPENCTI_TOKEN; else process.env.OPENCTI_TOKEN = previous.openCtiToken;
      if (previous.intelOwlUrl === undefined) delete process.env.INTELOWL_BASE_URL; else process.env.INTELOWL_BASE_URL = previous.intelOwlUrl;
      if (previous.intelOwlKey === undefined) delete process.env.INTELOWL_API_KEY; else process.env.INTELOWL_API_KEY = previous.intelOwlKey;
      if (previous.intelOwlAnalyzers === undefined) delete process.env.INTELOWL_ANALYZERS; else process.env.INTELOWL_ANALYZERS = previous.intelOwlAnalyzers;
    }
  });

  it("summarizes live services and ASTRA workers", () => {
    const summary = getOsintServiceConnectorSummary();
    expect(summary.total).toBe(5);
    expect(summary.astraWorkers).toBe(3);
    expect(summary.blockedByPolicy).toBe(0);
  });
});
