export const SEARCH_TARGET_TYPES = [
  "person_name",
  "vehicle_identifier",
  "phone",
  "email",
  "username",
  "company",
  "domain",
  "ip",
  "asn",
  "url",
  "cve",
  "file_hash",
  "ioc",
  "certificate",
  "repository",
  "location",
  "norad_id",
  "topic",
  "document",
  "image",
] as const;

export type SearchTargetType = (typeof SEARCH_TARGET_TYPES)[number];

export const TEXT_SEARCH_TARGET_TYPES = [
  "person_name",
  "vehicle_identifier",
  "phone",
  "email",
  "username",
  "company",
  "domain",
  "ip",
  "asn",
  "url",
  "cve",
  "file_hash",
  "ioc",
  "certificate",
  "repository",
  "location",
  "norad_id",
  "topic",
] as const satisfies readonly SearchTargetType[];

export const INVESTIGATION_TARGET_INPUT_TYPES = [
  "auto",
  ...TEXT_SEARCH_TARGET_TYPES,
] as const;

export type InvestigationTargetInputType = (typeof INVESTIGATION_TARGET_INPUT_TYPES)[number];

export const SEARCH_TARGET_CHOICES = [
  ["auto", "AUTO"],
  ["person_name", "NAME"],
  ["vehicle_identifier", "VEHICLE"],
  ["phone", "MOBILE"],
  ["email", "EMAIL"],
  ["username", "USERNAME"],
  ["company", "COMPANY"],
  ["domain", "DOMAIN"],
  ["ip", "IP"],
  ["asn", "ASN"],
  ["url", "URL"],
  ["cve", "CVE"],
  ["file_hash", "HASH"],
  ["ioc", "IOC"],
  ["certificate", "CERTIFICATE"],
  ["repository", "REPOSITORY"],
  ["location", "LOCATION"],
  ["norad_id", "NORAD ID"],
  ["topic", "TOPIC"],
] as const satisfies readonly (readonly [InvestigationTargetInputType, string])[];
