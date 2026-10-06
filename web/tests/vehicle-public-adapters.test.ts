import { describe, expect, it } from "vitest";

import {
  createIndiaVehicleFormatAdapter,
  createNhtsaVinAdapter,
} from "../lib/unified/vehicle-public-adapters";

const context = {
  missionId: "mission-test",
  userId: "analyst-test",
  purpose: "Authorized public vehicle research",
};

describe("public vehicle adapters", () => {
  it("decodes a VIN from the official vPIC response shape", async () => {
    const fetcher = async () => new Response(JSON.stringify({
      Results: [{
        VIN: "1HGCM82633A004352",
        Make: "HONDA",
        Model: "Accord",
        ModelYear: "2003",
        Manufacturer: "AMERICAN HONDA MOTOR CO., INC.",
        VehicleType: "PASSENGER CAR",
        BodyClass: "Sedan/Saloon",
        FuelTypePrimary: "Gasoline",
        ErrorCode: "0",
        ErrorText: "0 - VIN decoded clean. Check Digit (9th position) is correct",
      }],
    }), { status: 200, headers: { "content-type": "application/json" } });

    const adapter = createNhtsaVinAdapter(fetcher);
    const output = await adapter.execute({ vin: "1HGCM82633A004352" }, context);
    expect(output.data.records).toHaveLength(1);
    expect(output.data.records[0]).toMatchObject({
      vin: "1HGCM82633A004352",
      make: "HONDA",
      model: "Accord",
      modelYear: "2003",
    });
    expect(output.evidence[0]?.sourceId).toBe("nhtsa-vpic");
  });

  it("rejects malformed VINs without making a provider call", async () => {
    let called = false;
    const fetcher = async () => {
      called = true;
      return new Response("{}", { status: 200 });
    };
    const adapter = createNhtsaVinAdapter(fetcher);
    await expect(adapter.execute({ vin: "INVALID" }, context)).rejects.toThrow("invalid_vin");
    expect(called).toBe(false);
  });

  it("normalizes Indian registrations but never claims owner lookup", async () => {
    const adapter = createIndiaVehicleFormatAdapter();
    const output = await adapter.execute({ registration: "dl-01-ab-1234" }, context);
    expect(output.data.records[0]).toEqual({
      registration: "DL01AB1234",
      statePrefix: "DL",
      registrySystem: "VAHAN",
      ownerDataQueried: false,
      officialPortal: "https://parivahan.gov.in/",
    });
  });
});
