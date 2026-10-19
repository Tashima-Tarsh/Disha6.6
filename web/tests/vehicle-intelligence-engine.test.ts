import { describe, expect, it } from "vitest";
import { parseIndianRegistration, normalizePlateString } from "../lib/vehicle/validator";
import { resolveRto, resolveBharatSeries, INDIAN_STATES_AND_UTS, RTO_DIRECTORY } from "../lib/vehicle/rto-directory";
import { VehicleIntelligenceService, vehicleIntelligenceService } from "../services/vehicle/vehicle-service";
import { PublicRTOReferenceProvider } from "../lib/vehicle/providers/public-rto-provider";

describe("Indian Vehicle Registration Intelligence Engine", () => {
  describe("Registration Number Normalization & Validation", () => {
    it("normalizes spaced and hyphenated standard state plates", () => {
      const p1 = parseIndianRegistration("dl-01-ab-1234");
      expect(p1.isValid).toBe(true);
      expect(p1.normalized).toBe("DL01AB1234");
      expect(p1.format).toBe("standard_state");
      expect(p1.stateCode).toBe("DL");
      expect(p1.stateName).toBe("Delhi");
      expect(p1.rtoCode).toBe("DL01");
      expect(p1.rtoName).toContain("Mall Road");

      const p2 = parseIndianRegistration("MH 12 DE 1433");
      expect(p2.isValid).toBe(true);
      expect(p2.normalized).toBe("MH12DE1433");
      expect(p2.format).toBe("standard_state");
      expect(p2.stateCode).toBe("MH");
      expect(p2.stateName).toBe("Maharashtra");
      expect(p2.rtoCode).toBe("MH12");
      expect(p2.rtoName).toContain("Pune");
    });

    it("parses Bharat Series (BH) registrations correctly", () => {
      const bh = parseIndianRegistration("22-BH-1234-AA");
      expect(bh.isValid).toBe(true);
      expect(bh.normalized).toBe("22BH1234AA");
      expect(bh.format).toBe("bharat_series");
      expect(bh.stateCode).toBe("BH");
      expect(bh.bhYear).toBe(2022);
      expect(bh.series).toBe("AA");
      expect(bh.serialNumber).toBe("1234");
    });

    it("identifies diplomatic, vintage, and military plates", () => {
      const cd = parseIndianRegistration("77 CD 1234");
      expect(cd.isValid).toBe(true);
      expect(cd.format).toBe("diplomatic");

      const va = parseIndianRegistration("DLVA01AB1234");
      expect(va.isValid).toBe(true);
      expect(va.format).toBe("vintage");

      const mil = parseIndianRegistration("99D123456X");
      expect(mil.isValid).toBe(true);
      expect(mil.format).toBe("military");
    });

    it("rejects invalid or too short plate strings", () => {
      const inv1 = parseIndianRegistration("INVALID123");
      expect(inv1.isValid).toBe(false);
      expect(inv1.error).toBeDefined();

      const inv2 = parseIndianRegistration("XX99ZZ9999");
      expect(inv2.isValid).toBe(false);
    });
  });

  describe("RTO Directory & Bharat Series Resolution", () => {
    it("contains authoritative coverage of all 36 Indian States and Union Territories", () => {
      expect(Object.keys(INDIAN_STATES_AND_UTS).length).toBeGreaterThanOrEqual(36);
      expect(INDIAN_STATES_AND_UTS.DL.name).toBe("Delhi");
      expect(INDIAN_STATES_AND_UTS.MH.name).toBe("Maharashtra");
      expect(INDIAN_STATES_AND_UTS.KA.name).toBe("Karnataka");
      expect(INDIAN_STATES_AND_UTS.TN.name).toBe("Tamil Nadu");
      expect(INDIAN_STATES_AND_UTS.UP.name).toBe("Uttar Pradesh");
    });

    it("resolves specific RTO offices and transport district information", () => {
      const dl04 = resolveRto("DL", 4);
      expect(dl04.rtoCode).toBe("DL04");
      expect(dl04.rto?.officeName).toContain("Janakpuri");

      const ka05 = resolveRto("KA", 5);
      expect(ka05.rtoCode).toBe("KA05");
      expect(ka05.rto?.officeName).toContain("Jayanagar");

      const mh01 = resolveRto("MH", 1);
      expect(mh01.rtoCode).toBe("MH01");
      expect(mh01.rto?.officeName).toContain("Tardeo");
    });

    it("resolves Bharat Series legal background and national scope", () => {
      const bhMeta = resolveBharatSeries(22);
      expect(bhMeta.series).toBe("BH");
      expect(bhMeta.nationalScope).toBe(true);
      expect(bhMeta.registrationYear).toBe(2022);
      expect(bhMeta.description).toContain("MoRTH Notification G.S.R. 594(E)");
    });
  });

  describe("Provider Engine & Offline Sovereign Reference Fallback", () => {
    it("PublicRTOReferenceProvider yields truthful PUBLIC_REFERENCE results", async () => {
      const provider = new PublicRTOReferenceProvider();
      const health = await provider.health();
      expect(health.status).toBe("healthy");
      expect(health.configured).toBe(true);

      const plate = parseIndianRegistration("KA01AB1234");
      const lookup = await provider.verifyRegistration(plate, { purpose: "unit_test" });
      expect(lookup.success).toBe(true);
      expect(lookup.result).toBeDefined();

      const res = lookup.result!;
      expect(res.status).toBe("PUBLIC_REFERENCE");
      expect(res.data_type).toBe("public_reference");
      expect(res.plate.stateName).toBe("Karnataka");
      expect(res.plate.rtoCode).toBe("KA01");
      expect(res.plate.rtoName).toContain("Koramangala");
    });

    it("masks sensitive owner details by default under Section 63 BSA & DPDP", async () => {
      const res = await vehicleIntelligenceService.lookupVehicle(
        { registration_number: "DL01AB1234", purpose: "audit_privacy" },
        { purpose: "audit_privacy", consentConfirmed: true },
      );

      expect(res.owner_info.isMasked).toBe(true);
      expect(res.owner_info.ownerName).toContain("[PROTECTED");
      if (res.owner_info.chassisNumber) {
        expect(res.owner_info.chassisNumber).toContain("[MASKED");
      }
    });

    it("generates 64-character SHA-256 cryptographic provenance hashes", async () => {
      const res = await vehicleIntelligenceService.lookupVehicle(
        { registration_number: "22BH1234AA", purpose: "crypto_anchor" },
        { purpose: "crypto_anchor", consentConfirmed: true },
      );

      expect(res.evidence.normalizedHashSha256).toMatch(/^[a-f0-9]{64}$/i);
      expect(res.evidence.rawResponseHashSha256).toMatch(/^[a-f0-9]{64}$/i);
      expect(res.evidence.retrievedAtIst).toBeDefined();
    });

    it("generates a printable forensic HTML report with Section 63 compliance disclaimer", async () => {
      const res = await vehicleIntelligenceService.lookupVehicle(
        { registration_number: "MH12DE1433", purpose: "report_test" },
        { purpose: "report_test", consentConfirmed: true },
      );

      const html = vehicleIntelligenceService.generateForensicReportHtml(res);
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("DISHA 6.6 // Indian Vehicle Intelligence Dossier");
      expect(html).toContain("SECTION 63 BSA COMPLIANT");
      expect(html).toContain("MH12DE1433");
      expect(html).toContain(res.evidence.normalizedHashSha256);
    });

    it("exposes all registered providers and their live health status truthfully", async () => {
      const providers = vehicleIntelligenceService.getProviders();
      expect(providers.length).toBeGreaterThanOrEqual(5);

      const providerIds = providers.map((p) => p.id);
      expect(providerIds).toContain("apisetu_vahan");
      expect(providerIds).toContain("cashfree_verification");
      expect(providerIds).toContain("surepass_verification");
      expect(providerIds).toContain("public_rto_reference");

      const health = await vehicleIntelligenceService.getProvidersHealth();
      expect(health.length).toBe(providers.length);
      const offlineProviderHealth = health.find((h) => h.id === "public_rto_reference");
      expect(offlineProviderHealth?.status).toBe("healthy");
    });
  });
});
