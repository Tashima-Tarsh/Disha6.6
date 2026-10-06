import { afterEach, describe, expect, it, vi } from "vitest";

import { SEARCH_TARGET_CHOICES, TEXT_SEARCH_TARGET_TYPES } from "../lib/unified/search-targets";
import { buildTargetRoutePlan } from "../lib/unified/target-route-registry";
import { classifyUniversalTarget } from "../lib/unified/universal-target-classifier";

afterEach(() => vi.unstubAllEnvs());

describe("canonical OSINT search targets", () => {
  it("keeps name and vehicle as the first explicit analyst choices", () => {
    expect(SEARCH_TARGET_CHOICES.slice(0, 3)).toEqual([
      ["auto", "AUTO"],
      ["person_name", "NAME"],
      ["vehicle_identifier", "VEHICLE"],
    ]);
    expect(new Set(SEARCH_TARGET_CHOICES.map(([value]) => value)).size).toBe(SEARCH_TARGET_CHOICES.length);
    expect(TEXT_SEARCH_TARGET_TYPES).toContain("file_hash");
    expect(TEXT_SEARCH_TARGET_TYPES).toContain("repository");
    expect(TEXT_SEARCH_TARGET_TYPES).toContain("location");
  });

  it("uses the same canonical names for people and companies", () => {
    expect(classifyUniversalTarget("Nitish Kumar").primaryType).toBe("person_name");
    expect(classifyUniversalTarget("Acme Pvt Ltd").primaryType).toBe("company");
  });

  it("normalizes standard and Bharat Series vehicle registrations", () => {
    const stateVehicle = classifyUniversalTarget("DL-01-AB-1234");
    expect(stateVehicle).toMatchObject({ primaryType: "vehicle_identifier", normalizedValue: "DL01AB1234" });
    expect(stateVehicle.metadata.statePrefix).toBe("DL");

    const bharat = classifyUniversalTarget("22 BH 1234 AA");
    expect(bharat).toMatchObject({ primaryType: "vehicle_identifier", normalizedValue: "22BH1234AA" });
    expect(bharat.metadata.statePrefix).toBe("BH");
  });

  it("routes vehicle search to public discovery while keeping registry access governed", () => {
    const plan = buildTargetRoutePlan("DL01AB1234", "vehicle_identifier");
    expect(plan.find(item => item.adapterId === "public-gdelt-news")).toBeDefined();
    expect(plan.find(item => item.adapterId === "authorized-vahan-registry")?.initialStatus).toBe("RESTRICTED");
    expect(plan.find(item => item.adapterId === "authorized-echallan")?.initialStatus).toBe("RESTRICTED");
  });

  it("keeps worker-backed identity sources unconfigured when prerequisites are absent", () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("DISHA_ASTRA6_ALL_TOOLS_ENABLED", "");

    const phone = buildTargetRoutePlan("+919876543210", "phone");
    expect(phone.find(item => item.adapterId === "astra6-phoneinfoga")?.initialStatus).toBe("NOT_CONFIGURED");

    const username = buildTargetRoutePlan("example_user", "username");
    expect(username.find(item => item.adapterId === "astra6-sherlock")?.initialStatus).toBe("NOT_CONFIGURED");
  });

  it("queues ASTRA identity sources only when database, tool and approval are configured", () => {
    vi.stubEnv("DATABASE_URL", "postgres://configured");
    vi.stubEnv("DISHA_ASTRA6_PHONEINFOGA_ENABLED", "true");
    vi.stubEnv("DISHA_IDENTITY_ENUMERATION_APPROVED", "true");

    const plan = buildTargetRoutePlan("+919876543210", "phone");
    expect(plan.find(item => item.adapterId === "astra6-phoneinfoga")?.initialStatus).toBeUndefined();
  });

  it("marks configured identity tools restricted until identity policy approval is present", () => {
    vi.stubEnv("DATABASE_URL", "postgres://configured");
    vi.stubEnv("DISHA_ASTRA6_SHERLOCK_ENABLED", "true");
    vi.stubEnv("DISHA_IDENTITY_ENUMERATION_APPROVED", "");

    const plan = buildTargetRoutePlan("example_user", "username");
    expect(plan.find(item => item.adapterId === "astra6-sherlock")?.initialStatus).toBe("RESTRICTED");
  });

  it("adds configured public entity providers to name and company routes", () => {
    vi.stubEnv("OPENSANCTIONS_API_KEY", "configured");
    vi.stubEnv("OPENCORPORATES_API_TOKEN", "configured");

    const name = buildTargetRoutePlan("Example Person", "person_name");
    expect(name.find(item => item.adapterId === "public-opensanctions")?.initialStatus).toBeUndefined();
    expect(name.find(item => item.adapterId === "public-opencorporates")?.input).toMatchObject({ kind: "officer" });

    const company = buildTargetRoutePlan("Example Ltd", "company");
    expect(company.find(item => item.adapterId === "public-opensanctions")?.input).toMatchObject({ schema: "Company" });
    expect(company.find(item => item.adapterId === "public-opencorporates")?.input).toMatchObject({ kind: "company" });
  });

  it("routes configured hashes into defensive CTI metadata sources", () => {
    vi.stubEnv("THREATFOX_AUTH_KEY", "configured");
    vi.stubEnv("MALWAREBAZAAR_AUTH_KEY", "configured");

    const plan = buildTargetRoutePlan("b".repeat(64), "file_hash");
    expect(plan.find(item => item.adapterId === "public-threatfox")?.initialStatus).toBeUndefined();
    expect(plan.find(item => item.adapterId === "public-malwarebazaar")?.initialStatus).toBeUndefined();
  });

  it("keeps domain ASTRA tools pending while live public adapters remain executable if workers are unconfigured", () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("DISHA_ASTRA6_ALL_TOOLS_ENABLED", "");

    const plan = buildTargetRoutePlan("example.com", "domain");
    expect(plan.find(item => item.adapterId === "public-dns-google")?.initialStatus).toBeUndefined();
    expect(plan.find(item => item.adapterId === "astra6-subfinder")?.initialStatus).toBe("NOT_CONFIGURED");
    expect(plan.find(item => item.adapterId === "astra6-owasp-amass")?.initialStatus).toBe("NOT_CONFIGURED");
  });
});
