import { describe, expect, it } from "vitest";

import { SEARCH_TARGET_CHOICES, TEXT_SEARCH_TARGET_TYPES } from "../lib/unified/search-targets";
import { buildTargetRoutePlan } from "../lib/unified/target-route-registry";
import { classifyUniversalTarget } from "../lib/unified/universal-target-classifier";

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

  it("surfaces worker-backed identity sources without falsely executing the missing bridge", () => {
    const phone = buildTargetRoutePlan("+919876543210", "phone");
    expect(phone.find(item => item.adapterId === "astra6-phoneinfoga")?.initialStatus).toBe("NOT_CONFIGURED");

    const username = buildTargetRoutePlan("example_user", "username");
    expect(username.find(item => item.adapterId === "astra6-sherlock")?.initialStatus).toBe("NOT_CONFIGURED");
  });

  it("keeps domain ASTRA tools visible as pending while live public adapters remain executable", () => {
    const plan = buildTargetRoutePlan("example.com", "domain");
    expect(plan.find(item => item.adapterId === "public-dns-google")?.initialStatus).toBeUndefined();
    expect(plan.find(item => item.adapterId === "astra6-subfinder")?.initialStatus).toBe("NOT_CONFIGURED");
    expect(plan.find(item => item.adapterId === "astra6-owasp-amass")?.initialStatus).toBe("NOT_CONFIGURED");
  });
});
