import { createMalwareBazaarAdapter, createThreatFoxAdapter } from "./abusech-public-adapters";
import { createOpenCorporatesAdapter, createOpenSanctionsAdapter } from "./entity-public-adapters";
import {
  createCelestrakGpAdapter,
  createEpssAdapter,
  createNoaaSpaceWeatherAdapter,
  createNvdCveAdapter,
  createRipeStatWhoisAdapter,
  createReliefWebAdapter,
} from "./cross-domain-public-adapters";
import { astra6Adapters } from "./astra6-governed-adapters";
import { createIntelOwlServiceAdapter, createOpenCtiServiceAdapter } from "./osint-service-connectors";
import { OsintAdapterBus, type AdapterBusOptions } from "./osint-adapter-bus";
import { createDynamicPublicSourceAdapter } from "./dynamic-public-source";
import { createIndiaVehicleFormatAdapter, createNhtsaVinAdapter } from "./vehicle-public-adapters";
import {
  createCertificateTransparencyAdapter,
  createCisaKevAdapter,
  createGdeltNewsAdapter,
  createGithubRepositoryAdapter,
  createOfficialPublicSourceProbeAdapter,
  createPassiveDnsAdapter,
  createRdapAdapter,
  createWaybackAdapter,
  createCommonCrawlAdapter,
  createSecEdgarAdapter,
  createOpenAlexAdapter,
  createWorldBankAdapter,
  createWikidataSearchAdapter,
} from "./public-osint-adapters";

export function createDefaultOsintBus(options: AdapterBusOptions = {}): OsintAdapterBus {
  const bus = new OsintAdapterBus(options);
  bus.register(createPassiveDnsAdapter());
  bus.register(createCertificateTransparencyAdapter());
  bus.register(createRdapAdapter());
  bus.register(createWaybackAdapter());
  bus.register(createGdeltNewsAdapter());
  bus.register(createCisaKevAdapter());
  bus.register(createGithubRepositoryAdapter());
  bus.register(createOfficialPublicSourceProbeAdapter());
  bus.register(createCommonCrawlAdapter());
  bus.register(createSecEdgarAdapter());
  bus.register(createOpenAlexAdapter());
  bus.register(createWorldBankAdapter());
  bus.register(createWikidataSearchAdapter());
  bus.register(createDynamicPublicSourceAdapter());
  bus.register(createNvdCveAdapter());
  bus.register(createEpssAdapter());
  bus.register(createRipeStatWhoisAdapter());
  bus.register(createCelestrakGpAdapter());
  bus.register(createNoaaSpaceWeatherAdapter());
  bus.register(createReliefWebAdapter());
  bus.register(createNhtsaVinAdapter());
  bus.register(createIndiaVehicleFormatAdapter());
  bus.register(createThreatFoxAdapter());
  bus.register(createMalwareBazaarAdapter());
  bus.register(createOpenSanctionsAdapter());
  bus.register(createOpenCorporatesAdapter());
  bus.register(createOpenCtiServiceAdapter());
  bus.register(createIntelOwlServiceAdapter());
  for (const adapter of astra6Adapters) bus.register(adapter);
  return bus;
}
