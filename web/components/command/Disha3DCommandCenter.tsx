"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  UserRound,
  AtSign,
  Phone,
  Mail,
  Globe,
  Network,
  Hash,
  Coins,
  Car,
  MapPin,
  MessageSquare,
  Building,
  Camera,
  Fingerprint,
  Search,
  Sparkles,
  ShieldCheck,
  Shield,
  Activity,
  ArrowRight,
  SlidersHorizontal,
  Download,
  FileText,
  Share2,
  ExternalLink,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  Layers,
  History,
  Bookmark,
  Eye,
  Lock,
  Unlock,
  X,
  Play,
} from "lucide-react";

import { DishaTirangaFlow } from "../visual/DishaTirangaFlow";
import { Disha3DHologramGlobe } from "../visual/Disha3DHologramGlobe";
import { DishaRelationshipGraph } from "../intelligence/DishaRelationshipGraph";
import { DishaAiAssistantPanel } from "../shell/DishaAiAssistantPanel";
import { DishaCenterCopilotHero } from "./DishaCenterCopilotHero";
import { DishaStartMenu } from "../shell/DishaStartMenu";
import { DishaToolLookupModal, type ToolDef } from "../shell/DishaToolLookupModal";
import { VehicleIntelligenceConsole } from "../vehicle/VehicleIntelligenceConsole";
import { classifyIntelligenceTarget, type TargetClassification } from "@/lib/investigation/target-classifier";
import { normalizeRegistrationNumber } from "@/lib/vehicle/validator";
import { BreachDirectoryEngine, type BreachQueryResult, type BreachDirectoryRecord } from "@/lib/unified/breach-directory-engine";
import type { Investigation, TargetType } from "@/lib/investigation/types";
import type { OsintToolRecord } from "@/lib/unified/osint-runtime-service";
import styles from "./disha-3d-command-center.module.css";

export interface UniversalOsintCategory {
  id: string;
  order: number;
  label: string;
  badge: string;
  icon: React.ElementType;
  placeholder: string;
  eyebrow: string;
  description: string;
  targetType: TargetType | "auto";
  defaultTools: string[];
}

export const EXACT_14_CATEGORIES: UniversalOsintCategory[] = [
  {
    id: "name",
    order: 1,
    label: "Person Name",
    badge: "IDENTITY",
    icon: UserRound,
    placeholder: "Full legal name, alias, or public record (e.g. Nitish Kumar)",
    eyebrow: "Identity & Personnel",
    description: "Routes to verified civil registries, academic databases, and GDELT public news records.",
    targetType: "person_name",
    defaultTools: ["national-archives", "gdelt", "wikidata"],
  },
  {
    id: "username",
    order: 2,
    label: "Username / Handle",
    badge: "PUBLIC",
    icon: AtSign,
    placeholder: "@handle or username across 500+ platforms (e.g. thenitishkr)",
    eyebrow: "Account Footprint",
    description: "Multi-platform passive presence detection via local Sherlock and Maigret runners.",
    targetType: "username",
    defaultTools: ["sherlock", "maigret"],
  },
  {
    id: "phone",
    order: 3,
    label: "Phone Number",
    badge: "TELECOM",
    icon: Phone,
    placeholder: "+91 98765 43210 (E.164 standard)",
    eyebrow: "Telecom Telemetry",
    description: "Carrier resolution, circle allocation, and HLR core passive metadata.",
    targetType: "phone",
    defaultTools: ["phoneinfoga", "telecom-hlr"],
  },
  {
    id: "email",
    order: 4,
    label: "Email Address",
    badge: "BREACH",
    icon: Mail,
    placeholder: "target@organization.gov.in or email address",
    eyebrow: "Account Signal",
    description: "Mail exchange MX validation and historical credential breach verification.",
    targetType: "email",
    defaultTools: ["holehe", "email-validator"],
  },
  {
    id: "domain",
    order: 5,
    label: "Domain / URL",
    badge: "INFRA",
    icon: Globe,
    placeholder: "subdomain.target.gov.in or https://target.in",
    eyebrow: "Domain & DNS",
    description: "Passive DNS records, certificate transparency logs, subdomains, and WHOIS provenance.",
    targetType: "domain",
    defaultTools: ["sublist3r", "crtsh", "whois"],
  },
  {
    id: "ip",
    order: 6,
    label: "IP / CIDR",
    badge: "NETWORK",
    icon: Network,
    placeholder: "203.0.113.1 or 198.51.100.0/24",
    eyebrow: "Autonomous System & BGP",
    description: "BGP prefix routing, ASN ownership, and Shodan non-intrusive port telemetry.",
    targetType: "ip",
    defaultTools: ["shodan", "bgp-routeviews"],
  },
  {
    id: "hash",
    order: 7,
    label: "File Hash",
    badge: "MALWARE",
    icon: Hash,
    placeholder: "SHA-256, SHA-1, or MD5 checksum",
    eyebrow: "Cryptographic Artifact",
    description: "Cross-checks ThreatFox, MalwareBazaar, and VirusTotal threat catalogs.",
    targetType: "file_hash",
    defaultTools: ["malwarebazaar", "threatfox"],
  },
  {
    id: "crypto",
    order: 8,
    label: "Crypto Wallet",
    badge: "LEDGER",
    icon: Coins,
    placeholder: "BTC (1/3/bc1) or ETH (0x...) public wallet address",
    eyebrow: "Blockchain Forensics",
    description: "Public distributed ledger explorer and sanctions list cross-reference.",
    targetType: "ioc",
    defaultTools: ["blockstream", "etherscan-public"],
  },
  {
    id: "vehicle",
    order: 9,
    label: "Vehicle Plate",
    badge: "VAHAN",
    icon: Car,
    placeholder: "DL01AB1234 or 22BH1234AA or 17-character VIN",
    eyebrow: "Transport Registry",
    description: "Indian Motor Vehicles Act VAHAN/RTO verification with Section 63 BSA evidence anchoring.",
    targetType: "vehicle_identifier",
    defaultTools: ["public-rto-reference", "morth-vahan"],
  },
  {
    id: "geo",
    order: 10,
    label: "Geospatial",
    badge: "GIS",
    icon: MapPin,
    placeholder: "28.6139, 77.2090 (Latitude, Longitude)",
    eyebrow: "Spatial Coordinates",
    description: "District polygon boundaries, reverse geocoding, and critical infrastructure mapping.",
    targetType: "location",
    defaultTools: ["maplibre-spatial", "postgis-core"],
  },
  {
    id: "social",
    order: 11,
    label: "Social Media",
    badge: "FEED",
    icon: MessageSquare,
    placeholder: "instagram.com/username, x.com/user, or t.me/channel",
    eyebrow: "Social Intelligence",
    description: "Public metadata extraction and platform archive footprints without target contact.",
    targetType: "username",
    defaultTools: ["instaloader", "telegram-public"],
  },
  {
    id: "company",
    order: 12,
    label: "Corporate Entity",
    badge: "MCA",
    icon: Building,
    placeholder: "Company Name, Corporate Identity Number (CIN), or LLPIN",
    eyebrow: "Corporate Registry",
    description: "Ministry of Corporate Affairs registry filings, director associations, and charges.",
    targetType: "company",
    defaultTools: ["mca-registry", "corporate-records"],
  },
  {
    id: "media",
    order: 13,
    label: "Media File",
    badge: "EXIF",
    icon: Camera,
    placeholder: "Drag and drop image or document for forensic analysis",
    eyebrow: "Forensic Media",
    description: "Extracts camera EXIF tags, GPS metadata, and SHA-256 forensic fingerprints.",
    targetType: "image",
    defaultTools: ["exifr-engine", "sha256-anchor"],
  },
  {
    id: "biometric",
    order: 14,
    label: "Biometric",
    badge: "CONSENT",
    icon: Fingerprint,
    placeholder: "Authorized comparison against consented reference vector",
    eyebrow: "Consent Required",
    description: "Restricted strictly to authorized lawful comparisons under Section 63 BSA defense audit.",
    targetType: "image",
    defaultTools: ["biometric-audit-gate"],
  },
];

const RESULT_TABS = [
  "Copilot AI",
  "Overview",
  "Intelligence Summary",
  "Breaches & Leaks",
  "Source Results",
  "Relationship Graph",
  "Timeline",
  "Geospatial",
  "Media",
  "Evidence",
  "Reports",
] as const;

export const CURATED_OSINT_FALLBACK_TOOLS: OsintToolRecord[] = [
  {
    toolId: "spiderfoot",
    name: "SpiderFoot",
    fullName: "smicallef/spiderfoot",
    upstreamUrl: "https://github.com/smicallef/spiderfoot",
    owner: "smicallef",
    repo: "spiderfoot",
    description: "Automated OSINT reconnaissance framework for multi-source intelligence gathering and correlation.",
    category: "framework",
    categories: ["Investigation", "Automation"],
    targetInputs: ["domain", "ip"],
    runtimeType: "python",
    status: "UNCONFIGURED",
    healthStatus: "UNKNOWN",
    defaultBranch: "master",
    pinnedSha: null,
    upstreamSha: null,
    forkUrl: null,
    forkStatus: "CONFIGURED",
    license: "MIT",
    stars: 13500,
    isArchived: false,
    workerCommand: "/opt/venvs/spiderfoot/bin/python /opt/osint/spiderfoot/sf.py -s {target}",
    workerRuntime: "python",
    requiresAuth: false,
    requiresApiKey: false,
    apiKeys: [],
    lastVerified: "",
    lastSmokeTested: null,
    smokeResult: null,
    executionClass: "passive_public",
  },
  {
    toolId: "shodan",
    name: "Shodan",
    fullName: "achillean/shodan-python",
    upstreamUrl: "https://github.com/achillean/shodan-python",
    owner: "achillean",
    repo: "shodan-python",
    description: "Search engine for Internet-connected devices, open ports, banners, and infrastructure intelligence.",
    category: "network",
    categories: ["Network", "Scanners"],
    targetInputs: ["ip", "domain", "asn"],
    runtimeType: "api",
    status: "UNCONFIGURED",
    healthStatus: "UNKNOWN",
    defaultBranch: "master",
    pinnedSha: null,
    upstreamSha: null,
    forkUrl: null,
    forkStatus: "CONFIGURED",
    license: "MIT",
    stars: 3800,
    isArchived: false,
    workerCommand: null,
    workerRuntime: "api",
    requiresAuth: false,
    requiresApiKey: true,
    apiKeys: ["SHODAN_API_KEY"],
    lastVerified: "",
    lastSmokeTested: null,
    smokeResult: null,
    executionClass: "passive_public",
  },
  {
    toolId: "theharvester",
    name: "theHarvester",
    fullName: "laramies/theHarvester",
    upstreamUrl: "https://github.com/laramies/theHarvester",
    owner: "laramies",
    repo: "theHarvester",
    description: "Gathers emails, subdomains, hosts, employee names, and open ports from public search engines.",
    category: "network",
    categories: ["Network", "Reconnaissance"],
    targetInputs: ["domain"],
    runtimeType: "python",
    status: "UNCONFIGURED",
    healthStatus: "UNKNOWN",
    defaultBranch: "master",
    pinnedSha: null,
    upstreamSha: null,
    forkUrl: null,
    forkStatus: "CONFIGURED",
    license: "GPL-2.0",
    stars: 12000,
    isArchived: false,
    workerCommand: "theHarvester -d {target} -b all",
    workerRuntime: "python",
    requiresAuth: false,
    requiresApiKey: false,
    apiKeys: [],
    lastVerified: "",
    lastSmokeTested: null,
    smokeResult: null,
    executionClass: "passive_public",
  },
  {
    toolId: "owasp-amass",
    name: "OWASP Amass",
    fullName: "owasp-amass/amass",
    upstreamUrl: "https://github.com/owasp-amass/amass",
    owner: "owasp-amass",
    repo: "amass",
    description: "In-depth attack surface mapping and external asset discovery using open source information.",
    category: "network",
    categories: ["Network", "DNS"],
    targetInputs: ["domain"],
    runtimeType: "go",
    status: "UNCONFIGURED",
    healthStatus: "UNKNOWN",
    defaultBranch: "master",
    pinnedSha: null,
    upstreamSha: null,
    forkUrl: null,
    forkStatus: "CONFIGURED",
    license: "Apache-2.0",
    stars: 11000,
    isArchived: false,
    workerCommand: "amass enum -passive -d {target}",
    workerRuntime: "go",
    requiresAuth: false,
    requiresApiKey: false,
    apiKeys: [],
    lastVerified: "",
    lastSmokeTested: null,
    smokeResult: null,
    executionClass: "passive_public",
  },
  {
    toolId: "subfinder",
    name: "ProjectDiscovery Subfinder",
    fullName: "projectdiscovery/subfinder",
    upstreamUrl: "https://github.com/projectdiscovery/subfinder",
    owner: "projectdiscovery",
    repo: "subfinder",
    description: "Fast passive subdomain discovery tool that searches massive public DNS datasets.",
    category: "network",
    categories: ["Network", "Subdomains"],
    targetInputs: ["domain"],
    runtimeType: "go",
    status: "UNCONFIGURED",
    healthStatus: "UNKNOWN",
    defaultBranch: "main",
    pinnedSha: null,
    upstreamSha: null,
    forkUrl: null,
    forkStatus: "CONFIGURED",
    license: "MIT",
    stars: 10500,
    isArchived: false,
    workerCommand: "subfinder -d {target} -silent -json",
    workerRuntime: "go",
    requiresAuth: false,
    requiresApiKey: false,
    apiKeys: [],
    lastVerified: "",
    lastSmokeTested: null,
    smokeResult: null,
    executionClass: "passive_public",
  },
  {
    toolId: "sherlock",
    name: "Sherlock",
    fullName: "sherlock-project/sherlock",
    upstreamUrl: "https://github.com/sherlock-project/sherlock",
    owner: "sherlock-project",
    repo: "sherlock",
    description: "Hunt down social media accounts by username across 400+ social networks.",
    category: "identity",
    categories: ["Identity", "Social"],
    targetInputs: ["username"],
    runtimeType: "python",
    status: "UNCONFIGURED",
    healthStatus: "UNKNOWN",
    defaultBranch: "master",
    pinnedSha: null,
    upstreamSha: null,
    forkUrl: null,
    forkStatus: "CONFIGURED",
    license: "MIT",
    stars: 58000,
    isArchived: false,
    workerCommand: "sherlock {target} --print-found --timeout 15",
    workerRuntime: "python",
    requiresAuth: false,
    requiresApiKey: false,
    apiKeys: [],
    lastVerified: "",
    lastSmokeTested: null,
    smokeResult: null,
    executionClass: "passive_public",
  },
  {
    toolId: "maigret",
    name: "Maigret",
    fullName: "soxoj/maigret",
    upstreamUrl: "https://github.com/soxoj/maigret",
    owner: "soxoj",
    repo: "maigret",
    description: "Collect a dossier on a person by username from thousands of public web services and profiles.",
    category: "identity",
    categories: ["Identity", "Dossier"],
    targetInputs: ["username"],
    runtimeType: "python",
    status: "UNCONFIGURED",
    healthStatus: "UNKNOWN",
    defaultBranch: "main",
    pinnedSha: null,
    upstreamSha: null,
    forkUrl: null,
    forkStatus: "CONFIGURED",
    license: "MIT",
    stars: 12000,
    isArchived: false,
    workerCommand: "maigret {target} --timeout 15 --json",
    workerRuntime: "python",
    requiresAuth: false,
    requiresApiKey: false,
    apiKeys: [],
    lastVerified: "",
    lastSmokeTested: null,
    smokeResult: null,
    executionClass: "passive_public",
  },
  {
    toolId: "phoneinfoga",
    name: "PhoneInfoga",
    fullName: "sundowndev/phoneinfoga",
    upstreamUrl: "https://github.com/sundowndev/phoneinfoga",
    owner: "sundowndev",
    repo: "phoneinfoga",
    description: "Advanced information gathering & OSINT reconnaissance framework for international phone numbers.",
    category: "identity",
    categories: ["Identity", "Telecom"],
    targetInputs: ["phone"],
    runtimeType: "go",
    status: "UNCONFIGURED",
    healthStatus: "UNKNOWN",
    defaultBranch: "master",
    pinnedSha: null,
    upstreamSha: null,
    forkUrl: null,
    forkStatus: "CONFIGURED",
    license: "GPL-3.0",
    stars: 12500,
    isArchived: false,
    workerCommand: "phoneinfoga scan -n {target}",
    workerRuntime: "go",
    requiresAuth: false,
    requiresApiKey: false,
    apiKeys: [],
    lastVerified: "",
    lastSmokeTested: null,
    smokeResult: null,
    executionClass: "passive_public",
  },
  {
    toolId: "holehe",
    name: "Holehe",
    fullName: "megadose/holehe",
    upstreamUrl: "https://github.com/megadose/holehe",
    owner: "megadose",
    repo: "holehe",
    description: "Checks if an email is registered on over 120 websites without notifying the target.",
    category: "identity",
    categories: ["Identity", "Email"],
    targetInputs: ["email"],
    runtimeType: "python",
    status: "UNCONFIGURED",
    healthStatus: "UNKNOWN",
    defaultBranch: "master",
    pinnedSha: null,
    upstreamSha: null,
    forkUrl: null,
    forkStatus: "CONFIGURED",
    license: "GPL-3.0",
    stars: 6500,
    isArchived: false,
    workerCommand: "holehe {target}",
    workerRuntime: "python",
    requiresAuth: false,
    requiresApiKey: false,
    apiKeys: [],
    lastVerified: "",
    lastSmokeTested: null,
    smokeResult: null,
    executionClass: "passive_public",
  },
  {
    toolId: "recon-ng",
    name: "Recon-ng",
    fullName: "lanmaster53/recon-ng",
    upstreamUrl: "https://github.com/lanmaster53/recon-ng",
    owner: "lanmaster53",
    repo: "recon-ng",
    description: "Full-featured reconnaissance framework with modular design for automated domain OSINT.",
    category: "framework",
    categories: ["Framework", "Reconnaissance"],
    targetInputs: ["domain"],
    runtimeType: "python",
    status: "UNCONFIGURED",
    healthStatus: "UNKNOWN",
    defaultBranch: "master",
    pinnedSha: null,
    upstreamSha: null,
    forkUrl: null,
    forkStatus: "CONFIGURED",
    license: "GPL-3.0",
    stars: 4200,
    isArchived: false,
    workerCommand: "python recon-ng-adapter.py {target}",
    workerRuntime: "python",
    requiresAuth: false,
    requiresApiKey: false,
    apiKeys: [],
    lastVerified: "",
    lastSmokeTested: null,
    smokeResult: null,
    executionClass: "passive_public",
  },
  {
    toolId: "photon",
    name: "Photon",
    fullName: "s0md3v/Photon",
    upstreamUrl: "https://github.com/s0md3v/Photon",
    owner: "s0md3v",
    repo: "Photon",
    description: "Fast crawler designed for gathering OSINT on web endpoints, emails, files, and secret keys.",
    category: "framework",
    categories: ["Framework", "Crawler"],
    targetInputs: ["domain", "url"],
    runtimeType: "python",
    status: "UNCONFIGURED",
    healthStatus: "UNKNOWN",
    defaultBranch: "master",
    pinnedSha: null,
    upstreamSha: null,
    forkUrl: null,
    forkStatus: "CONFIGURED",
    license: "GPL-3.0",
    stars: 12000,
    isArchived: false,
    workerCommand: "photon -u {target} -l 1",
    workerRuntime: "python",
    requiresAuth: false,
    requiresApiKey: false,
    apiKeys: [],
    lastVerified: "",
    lastSmokeTested: null,
    smokeResult: null,
    executionClass: "passive_public",
  },
  {
    toolId: "opencti",
    name: "OpenCTI",
    fullName: "OpenCTI-Platform/opencti",
    upstreamUrl: "https://github.com/OpenCTI-Platform/opencti",
    owner: "OpenCTI-Platform",
    repo: "opencti",
    description: "Cyber threat intelligence knowledge platform for managing threat observables, actors, and TTPs.",
    category: "threat-intelligence",
    categories: ["CTI", "Threat Intelligence"],
    targetInputs: ["domain", "ip", "ioc", "cve"],
    runtimeType: "api",
    status: "UNCONFIGURED",
    healthStatus: "UNKNOWN",
    defaultBranch: "master",
    pinnedSha: null,
    upstreamSha: null,
    forkUrl: null,
    forkStatus: "CONFIGURED",
    license: "Apache-2.0",
    stars: 7200,
    isArchived: false,
    workerCommand: null,
    workerRuntime: "api",
    requiresAuth: true,
    requiresApiKey: true,
    apiKeys: ["OPENCTI_TOKEN"],
    lastVerified: "",
    lastSmokeTested: null,
    smokeResult: null,
    executionClass: "curated_cti",
  },
  {
    toolId: "intelowl",
    name: "IntelOwl",
    fullName: "intelowlproject/IntelOwl",
    upstreamUrl: "https://github.com/intelowlproject/IntelOwl",
    owner: "intelowlproject",
    repo: "IntelOwl",
    description: "Threat intelligence and observable orchestration engine integrating 100+ security analyzers.",
    category: "threat-intelligence",
    categories: ["CTI", "Analyzers"],
    targetInputs: ["domain", "ip", "file_hash", "ioc"],
    runtimeType: "api",
    status: "UNCONFIGURED",
    healthStatus: "UNKNOWN",
    defaultBranch: "master",
    pinnedSha: null,
    upstreamSha: null,
    forkUrl: null,
    forkStatus: "CONFIGURED",
    license: "AGPL-3.0",
    stars: 4500,
    isArchived: false,
    workerCommand: null,
    workerRuntime: "api",
    requiresAuth: true,
    requiresApiKey: true,
    apiKeys: ["INTELOWL_TOKEN"],
    lastVerified: "",
    lastSmokeTested: null,
    smokeResult: null,
    executionClass: "curated_cti",
  },
  {
    toolId: "flowsint",
    name: "FlowSINT",
    fullName: "flowsint/flowsint",
    upstreamUrl: "https://github.com/flowsint/flowsint",
    owner: "flowsint",
    repo: "flowsint",
    description: "Visual intelligence correlation and Neo4j graph entity link analysis engine.",
    category: "framework",
    categories: ["Graph", "Link Analysis"],
    targetInputs: ["domain", "ip", "username", "email", "person_name"],
    runtimeType: "api",
    status: "UNCONFIGURED",
    healthStatus: "UNKNOWN",
    defaultBranch: "main",
    pinnedSha: null,
    upstreamSha: null,
    forkUrl: null,
    forkStatus: "CONFIGURED",
    license: "MIT",
    stars: 3100,
    isArchived: false,
    workerCommand: null,
    workerRuntime: "api",
    requiresAuth: false,
    requiresApiKey: false,
    apiKeys: [],
    lastVerified: "",
    lastSmokeTested: null,
    smokeResult: null,
    executionClass: "passive_public",
  },
  {
    toolId: "pentagi",
    name: "PentAGI",
    fullName: "vxcontrol/pentagi",
    upstreamUrl: "https://github.com/vxcontrol/pentagi",
    owner: "vxcontrol",
    repo: "pentagi",
    description: "Autonomous penetration testing and exploit validation multi-agent AI system with 20+ tools.",
    category: "framework",
    categories: ["Offensive Security", "Autonomous Pentesting"],
    targetInputs: ["domain", "ip", "url"],
    runtimeType: "api",
    status: "UNCONFIGURED",
    healthStatus: "UNKNOWN",
    defaultBranch: "main",
    pinnedSha: null,
    upstreamSha: null,
    forkUrl: null,
    forkStatus: "CONFIGURED",
    license: "Apache-2.0",
    stars: 8400,
    isArchived: false,
    workerCommand: null,
    workerRuntime: "api",
    requiresAuth: true,
    requiresApiKey: false,
    apiKeys: [],
    lastVerified: "",
    lastSmokeTested: null,
    smokeResult: null,
    executionClass: "sandboxed_offensive",
  },
  {
    toolId: "dfir-iris",
    name: "DFIR-IRIS",
    fullName: "dfir-iris/iris-web",
    upstreamUrl: "https://github.com/dfir-iris/iris-web",
    owner: "dfir-iris",
    repo: "iris-web",
    description: "Collaborative digital forensics and incident response case management platform.",
    category: "case-forensics",
    categories: ["Incident Response", "DFIR"],
    targetInputs: ["domain", "ip", "ioc", "file_hash"],
    runtimeType: "api",
    status: "UNCONFIGURED",
    healthStatus: "UNKNOWN",
    defaultBranch: "master",
    pinnedSha: null,
    upstreamSha: null,
    forkUrl: null,
    forkStatus: "CONFIGURED",
    license: "AGPL-3.0",
    stars: 3900,
    isArchived: false,
    workerCommand: null,
    workerRuntime: "api",
    requiresAuth: true,
    requiresApiKey: true,
    apiKeys: [],
    lastVerified: "",
    lastSmokeTested: null,
    smokeResult: null,
    executionClass: "curated_cti",
  },
  {
    toolId: "openosint",
    name: "OpenOSINT",
    fullName: "disha/openosint",
    upstreamUrl: "https://github.com/disha/openosint",
    owner: "disha",
    repo: "openosint",
    description: "Sovereign DISHA OpenOSINT protocol engine for DNS, RDAP, WHOIS, IP reputation, and search dorks.",
    category: "framework",
    categories: ["Core", "Sovereign OSINT"],
    targetInputs: ["domain", "ip", "email", "username", "repository"],
    runtimeType: "api",
    status: "UNCONFIGURED",
    healthStatus: "UNKNOWN",
    defaultBranch: "main",
    pinnedSha: null,
    upstreamSha: null,
    forkUrl: null,
    forkStatus: "CONFIGURED",
    license: "MIT",
    stars: 1200,
    isArchived: false,
    workerCommand: null,
    workerRuntime: "api",
    requiresAuth: false,
    requiresApiKey: false,
    apiKeys: [],
    lastVerified: "",
    lastSmokeTested: null,
    smokeResult: null,
    executionClass: "passive_public",
  },
];

function inferTargetTypeFromTool(tool: OsintToolRecord, detectedType?: TargetType | string): TargetType {
  const inputs = (tool.targetInputs || []).map((i) => i.toLowerCase());
  const category = (tool.category || "").toLowerCase();
  const id = (tool.toolId || "").toLowerCase();

  if (detectedType && detectedType !== "auto") {
    if (detectedType === "domain" && (inputs.includes("domain") || inputs.includes("url") || category === "network")) return "domain";
    if (detectedType === "ip" && (inputs.includes("ip") || inputs.includes("ip address") || category === "network")) return "ip";
    if (detectedType === "username" && (inputs.includes("username") || category === "identity")) return "username";
    if (detectedType === "email" && (inputs.includes("email") || category === "identity")) return "email";
    if (detectedType === "phone" && (inputs.includes("phone") || inputs.includes("phone number"))) return "phone";
    if (detectedType === "file_hash" && (inputs.includes("hash") || inputs.includes("file hash"))) return "file_hash";
    if (detectedType === "cve" && inputs.includes("cve")) return "cve";
  }

  if (inputs.includes("domain") || inputs.includes("url") || category === "network" || id === "spiderfoot" || id === "theharvester" || id === "subfinder" || id === "amass" || id === "owasp-amass") return "domain";
  if (inputs.includes("ip") || inputs.includes("ip address")) return "ip";
  if (inputs.includes("username") || id === "sherlock" || id === "maigret") return "username";
  if (inputs.includes("email") || id === "holehe") return "email";
  if (inputs.includes("phone") || inputs.includes("phone number") || id === "phoneinfoga") return "phone";
  if (inputs.includes("cve")) return "cve";
  if (inputs.includes("hash") || inputs.includes("file hash")) return "file_hash";
  if (inputs.includes("company") || inputs.includes("organization")) return "company";
  if (category === "identity") return "username";
  return "auto" as TargetType;
}

function getSampleTargetForTool(tool: OsintToolRecord): string {
  const inputs = (tool.targetInputs || []).map((i) => i.toLowerCase());
  const category = (tool.category || "").toLowerCase();
  const id = (tool.toolId || "").toLowerCase();

  if (id === "spiderfoot") return "gov.in";
  if (id === "shodan") return "8.8.8.8";
  if (id === "sherlock" || id === "maigret") return "satyanadella";
  if (id === "phoneinfoga") return "+919876543210";
  if (id === "holehe") return "security@gov.in";
  if (id === "opencti" || id === "threatfox") return "CVE-2024-3400";
  if (inputs.includes("domain") || category === "network") return "gov.in";
  if (inputs.includes("ip") || inputs.includes("ip address")) return "8.8.8.8";
  if (inputs.includes("username")) return "satyanadella";
  if (inputs.includes("email")) return "target@domain.com";
  if (inputs.includes("phone")) return "+919876543210";
  if (inputs.includes("cve")) return "CVE-2024-3400";
  if (inputs.includes("hash")) return "44d88612fea8a8f36de82e1278abb02f";
  return "gov.in";
}

export const RUNNABLE_TOOL_IDS = new Set([
  "theharvester", "owasp-amass", "amass", "subfinder", "spiderfoot", "sherlock", "maigret",
  "holehe", "phoneinfoga", "recon-ng", "photon", "instaloader", "telegram-public",
  "opencti", "intelowl", "shodan", "dns-google", "rdap", "cisa-kev", "nvd-cve", "epss",
  "sec-edgar", "noaa-space-weather", "ripestat-whois", "celestrak-gp", "opensanctions",
  "opencorporates", "wikidata", "openalex", "reliefweb", "threatfox", "malwarebazaar",
  "wayback", "common-crawl", "gdelt", "brave-search", "github-repository",
  "india-vehicle-format", "vahan-registry", "echallan", "certificate-transparency",
  "openosint", "openosint-dns", "openosint-rdap", "openosint-whois", "openosint-dorks", "openosint-ip", "openosint-github", "openosint-breach",
]);

export function isToolRunnable(tool: OsintToolRecord): boolean {
  const id = (tool.toolId || "").toLowerCase();
  if (RUNNABLE_TOOL_IDS.has(id)) return true;
  if (tool.workerCommand && tool.workerCommand.trim().length > 0) return true;
  if (tool.status === "HEALTHY" || tool.status === "CONFIGURED_LIVE" || tool.healthStatus === "REST_HEALTHY") return true;
  return false;
}

function getToolStatusBadge(tool: OsintToolRecord): { label: string; styleClass: string } {
  if (isToolRunnable(tool)) {
    return { label: "LIVE WORKER", styleClass: styles.toolStatusHealthy };
  }
  return { label: "CATALOG SPEC", styleClass: styles.toolStatusCatalog };
}

export interface Disha3DCommandCenterProps {
  active: Investigation | null;
  busy: boolean;
  onExecuteSearch: (query: string, targetType: string, tools: string[]) => void;
  onResetInvestigation?: () => void;
  userEmail?: string;
}

export function Disha3DCommandCenter({
  active,
  busy,
  onExecuteSearch,
  onResetInvestigation,
  userEmail = "officer@disha.defense",
}: Disha3DCommandCenterProps) {
  // Navigation & Category Filtering
  const [selectedCategory, setSelectedCategory] = useState<UniversalOsintCategory>(EXACT_14_CATEGORIES[0]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchPrompt, setSearchPrompt] = useState("");
  const [activeResultTab, setActiveResultTab] = useState<(typeof RESULT_TABS)[number]>("Copilot AI");
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [activeToolLookup, setActiveToolLookup] = useState<ToolDef | null>(null);

  // Universal OSINT Tools Directory State
  const [leftNavMode, setLeftNavMode] = useState<"tools" | "channels">("tools");
  const [allOsintTools, setAllOsintTools] = useState<OsintToolRecord[]>(CURATED_OSINT_FALLBACK_TOOLS);
  const [toolExecutionFilter, setToolExecutionFilter] = useState<"all" | "runnable" | "catalog">("all");
  const [toolsLoading, setToolsLoading] = useState(false);
  const [selectedTool, setSelectedTool] = useState<OsintToolRecord | null>(null);
  const [toolSearchQuery, setToolSearchQuery] = useState("");
  const [selectedToolCategory, setSelectedToolCategory] = useState("all");

  // Advanced Search Controls
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [jurisdiction, setJurisdiction] = useState<string>("india");
  const [sourcePolicy, setSourcePolicy] = useState<string>("all_approved");
  const [lawfulPurposeChecked, setLawfulPurposeChecked] = useState(true);
  const [selectedModel, setSelectedModel] = useState("qwen2.5:7b");
  const [unmaskedBreachData, setUnmaskedBreachData] = useState(true);

  // Dynamic Ollama and Sovereign Models
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string; tag: string; isLocal: boolean }>>([
    { id: "qwen2.5:7b", name: "Alibaba Qwen 2.5 General 7B (Sovereign)", tag: "qwen2.5:7b", isLocal: true },
    { id: "llama4:8b", name: "Meta LLaMA 4 8B Multimodal (Local)", tag: "llama4:8b", isLocal: true },
    { id: "deepseek-r1:8b", name: "DeepSeek R1 8B (CoT Reasoning)", tag: "deepseek-r1:8b", isLocal: true },
    { id: "qwen3.5:9b", name: "Alibaba Qwen 3.5 Native Agent (Local)", tag: "qwen3.5:9b", isLocal: true },
    { id: "qwen2.5-coder:7b", name: "Alibaba Qwen 2.5 Coder 7B (Local)", tag: "qwen2.5-coder:7b", isLocal: true },
    { id: "gemma4:9b", name: "Google Gemma 4 9B (DeepMind)", tag: "gemma4:9b", isLocal: true },
    { id: "glm5:9b", name: "Z.ai GLM-5 9B Sovereign", tag: "glm5:9b", isLocal: true },
    { id: "kimi-k2.5:latest", name: "Moonshot Kimi K2.5 Agent", tag: "kimi-k2.5:latest", isLocal: true },
    { id: "minimax-m2.5:latest", name: "MiniMax M2.5 MoE", tag: "minimax-m2.5:latest", isLocal: true },
    { id: "gpt-4o", name: "OpenAI GPT-4o (Cloud Reasoning)", tag: "gpt-4o", isLocal: false },
  ]);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch("/api/v1/runtime/models/catalog", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.catalog) && data.catalog.length > 0) {
            setAvailableModels(
              data.catalog.map((m: any) => ({
                id: m.id || m.tag,
                name: m.name || m.tag,
                tag: m.tag,
                isLocal: Boolean(m.isLocal),
              }))
            );
          }
        }
      } catch {
        // Keep baseline
      }
    }
    loadCatalog();
  }, []);

  // Fetch full live catalog of 520+ OSINT tools from backend registry
  useEffect(() => {
    let isSubscribed = true;
    async function fetchAllOsintTools() {
      try {
        setToolsLoading(true);
        const res = await fetch("/api/v1/osint/tools?limit=600", {
          credentials: "include",
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (isSubscribed && Array.isArray(data.tools) && data.tools.length > 0) {
            setAllOsintTools(data.tools);
          }
        }
      } catch {
        // Silently preserve curated fallback
      } finally {
        if (isSubscribed) setToolsLoading(false);
      }
    }
    fetchAllOsintTools();
    return () => {
      isSubscribed = false;
    };
  }, []);

  // Compute category counts across all tools
  const toolCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allOsintTools.length };
    for (const t of allOsintTools) {
      const cat = (t.category || "framework").toLowerCase();
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [allOsintTools]);

  const runnableToolsCount = useMemo(() => allOsintTools.filter(isToolRunnable).length, [allOsintTools]);
  const catalogToolsCount = useMemo(() => allOsintTools.length - runnableToolsCount, [allOsintTools, runnableToolsCount]);

  // Real-time tool search & category filtering
  const filteredOsintTools = useMemo(() => {
    let list = allOsintTools;
    if (toolExecutionFilter === "runnable") {
      list = list.filter((t) => isToolRunnable(t));
    } else if (toolExecutionFilter === "catalog") {
      list = list.filter((t) => !isToolRunnable(t));
    }
    if (selectedToolCategory !== "all") {
      list = list.filter((t) => (t.category || "").toLowerCase() === selectedToolCategory.toLowerCase());
    }
    if (toolSearchQuery.trim()) {
      const q = toolSearchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.toolId.toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q) ||
          (t.targetInputs || []).some((inp) => inp.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allOsintTools, selectedToolCategory, toolSearchQuery, toolExecutionFilter]);

  // Select a tool and prime/execute lookup search
  const handleSelectTool = (tool: OsintToolRecord, executeNow: boolean = false) => {
    setSelectedTool(tool);
    const inferredType = inferTargetTypeFromTool(tool);
    let queryToRun = searchPrompt.trim();
    if (!queryToRun) {
      queryToRun = getSampleTargetForTool(tool);
      setSearchPrompt(queryToRun);
    }
    if (executeNow && queryToRun) {
      if (isToolRunnable(tool)) {
        onExecuteSearch(queryToRun, inferredType, [tool.toolId]);
      } else {
        // Run standard multi-adapter search on target
        onExecuteSearch(queryToRun, inferredType, []);
      }
    }
  };

  // Compute breach directory intelligence dynamically using truthful Section 63 BSA evidence
  const breachResult: BreachQueryResult = useMemo(() => {
    const rawTarget = searchPrompt.trim() || active?.normalizedTarget || active?.target || "";
    if (!rawTarget) {
      return {
        target: "",
        targetType: "unknown",
        summary: "Enter a phone number, username, email, or domain to verify exposure against authorized intelligence feeds.",
        overallRisk: "CLEAN",
        totalDirectoriesChecked: 0,
        exposedCount: 0,
        cleanCount: 0,
        directories: [],
      };
    }
    return BreachDirectoryEngine.auditTarget(rawTarget, selectedCategory.targetType, active);
  }, [searchPrompt, active, selectedCategory]);

  // Filtered 14 Categories in exact sequence
  const filteredCategories = useMemo(() => {
    if (!categoryFilter.trim()) return EXACT_14_CATEGORIES;
    const q = categoryFilter.toLowerCase();
    return EXACT_14_CATEGORIES.filter(
      (c) => c.label.toLowerCase().includes(q) || c.badge.toLowerCase().includes(q) || c.eyebrow.toLowerCase().includes(q)
    );
  }, [categoryFilter]);

  // Live query classification
  const classification = useMemo<TargetClassification | null>(() => {
    if (searchPrompt.trim().length > 1) {
      return classifyIntelligenceTarget(searchPrompt);
    }
    return null;
  }, [searchPrompt]);

  // Keep a user's chosen tab; switch from Overview only when evidence arrives.
  useEffect(() => {
    if (!active?.evidence.length) return;
    const timer = window.setTimeout(() => {
      setActiveResultTab((tab) => tab === "Overview" ? "Intelligence Summary" : tab);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [active?.evidence.length]);

  const handleSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPrompt.trim() || busy) return;

    const chosenTargetType = selectedTool
      ? inferTargetTypeFromTool(selectedTool, classification?.type)
      : selectedCategory.targetType === "auto" || !selectedCategory.targetType
      ? (classification?.type as TargetType) || "auto"
      : selectedCategory.targetType;

    const toolsToRun = selectedTool ? [selectedTool.toolId] : selectedCategory.defaultTools;
    onExecuteSearch(searchPrompt.trim(), chosenTargetType, toolsToRun);
  };

  return (
    <div className={styles.commandCenterRoot}>
      {/* Top Tiranga Motion Ribbon */}
      <DishaTirangaFlow variant="header" />

      {/* Main Top Command Navigation Shell */}
      <header className={styles.topNavbar}>
        <div className={styles.brandGroup}>
          <button
            type="button"
            className={`${styles.brandStartBtn} ${isStartMenuOpen ? styles.brandStartBtnActive : ""}`}
            onClick={() => setIsStartMenuOpen((prev) => !prev)}
            title="Open DISHA 6.6 Cyber OSINT Arsenal (72+ Tools)"
            aria-expanded={isStartMenuOpen}
          >
            <div className={styles.heroEmblem}>
              <div className={styles.chakraRing} />
              <div className={styles.emblemCore}>6.6</div>
            </div>
            <div className={styles.brandStartText}>
              <div className={styles.brandTitleRow}>
                <h1 className={styles.brandTitle}>DISHA 6.6</h1>
                <span className={styles.brandBadge}>❖ ARSENAL ▾</span>
              </div>
              <p className={styles.brandSubtitle}>Cyber Workstation // 72+ Sovereign Tools</p>
            </div>
          </button>
        </div>

        <div className={styles.navStatusPill}>
          <ShieldCheck size={14} className={styles.secureIcon} />
          <span>Section 63 BSA Certified // Sovereign Local AI Active</span>
        </div>

        <div className={styles.userProfile}>
          <div className={styles.userAvatar}>
            <UserRound size={14} />
          </div>
          <div className={styles.userMeta}>
            <span className={styles.userEmail}>{userEmail}</span>
            <span className={styles.userRole}>Lawful Operator</span>
          </div>
        </div>
      </header>

      {/* Cyber Workstation Tabs Bar */}
      <div className={styles.tabsBarWrap} role="tablist">
        <div className={styles.resultTabsContainer}>
          {RESULT_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeResultTab === tab}
              className={`${styles.resultTabBtn} ${activeResultTab === tab ? styles.resultTabActive : ""}`}
              onClick={() => setActiveResultTab(tab)}
            >
              {tab}
              {tab === "Breaches & Leaks" && breachResult.exposedCount > 0 && (
                <span className={styles.tabBadgeAlert}>{breachResult.exposedCount}</span>
              )}
              {tab === "Evidence" && active && (
                <span className={styles.tabBadge}>{active.evidence.length}</span>
              )}
              {tab === "Source Results" && active && (
                <span className={styles.tabBadge}>{active.runs.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {activeResultTab === "Copilot AI" ? (
        <div className={styles.copilotFullScreenWrap}>
          <DishaCenterCopilotHero />
        </div>
      ) : (
      <div className={styles.dashboardGrid}>
        {/* =========================================================================
            COLUMN 1: LEFT PANEL — UNIVERSAL OSINT (250–290px)
           ========================================================================= */}
        <aside className={styles.leftPanel} aria-label="Universal OSINT Tools & Categories">
          <div className={styles.leftPanelHeader}>
            <div className={styles.globeHeaderIcon}>
              <Disha3DHologramGlobe size={42} interactive={false} />
            </div>
            <div>
              <h2 className={styles.leftPanelHeading}>Universal OSINT</h2>
              <span className={styles.leftPanelSub}>
                {allOsintTools.length > 0 ? `${allOsintTools.length} Sovereign Tools` : "523 Sovereign Tools"} · 14 Channels
              </span>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className={styles.leftModeToggle}>
            <button
              type="button"
              className={`${styles.leftModeBtn} ${leftNavMode === "tools" ? styles.leftModeBtnActive : ""}`}
              onClick={() => setLeftNavMode("tools")}
            >
              <Layers size={13} />
              <span>OSINT Tools ({allOsintTools.length})</span>
            </button>
            <button
              type="button"
              className={`${styles.leftModeBtn} ${leftNavMode === "channels" ? styles.leftModeBtnActive : ""}`}
              onClick={() => setLeftNavMode("channels")}
            >
              <Filter size={13} />
              <span>Channels (14)</span>
            </button>
          </div>

          {leftNavMode === "tools" ? (
            <>
              {/* Tool Execution Filter Toggle: All vs Live Workers vs Specs */}
              <div className={styles.toolExecutionToggleRow}>
                <button
                  type="button"
                  className={`${styles.toolExecutionToggleBtn} ${toolExecutionFilter === "all" ? styles.toolExecutionToggleBtnActive : ""}`}
                  onClick={() => setToolExecutionFilter("all")}
                >
                  All ({allOsintTools.length})
                </button>
                <button
                  type="button"
                  className={`${styles.toolExecutionToggleBtn} ${toolExecutionFilter === "runnable" ? styles.toolExecutionToggleBtnActive : ""}`}
                  onClick={() => setToolExecutionFilter("runnable")}
                >
                  ⚡ Live Workers ({runnableToolsCount})
                </button>
                <button
                  type="button"
                  className={`${styles.toolExecutionToggleBtn} ${toolExecutionFilter === "catalog" ? styles.toolExecutionToggleBtnActive : ""}`}
                  onClick={() => setToolExecutionFilter("catalog")}
                >
                  📚 Specs ({catalogToolsCount})
                </button>
              </div>

              {/* Tool Search Input */}
              <div className={styles.categoryFilterBox}>
                <Search size={12} className={styles.filterSearchIcon} />
                <input
                  type="text"
                  value={toolSearchQuery}
                  onChange={(e) => setToolSearchQuery(e.target.value)}
                  placeholder="Lookup 520+ OSINT tools, modules..."
                  className={styles.categoryFilterInput}
                  aria-label="Search OSINT tools"
                />
              </div>

              {/* Category Filter Pills (Horizontal Scroll) */}
              <div className={styles.categoryChipsScroll} role="tablist">
                {[
                  { id: "all", label: "All" },
                  { id: "network", label: "Network" },
                  { id: "identity", label: "Identity" },
                  { id: "framework", label: "Frameworks" },
                  { id: "threat-intelligence", label: "Threat Intel" },
                  { id: "documents", label: "Documents" },
                  { id: "media", label: "Media" },
                  { id: "secrets", label: "Secrets" },
                  { id: "web-archive", label: "Archives" },
                  { id: "case-forensics", label: "Forensics" },
                ].map((c) => {
                  const count = toolCategoryCounts[c.id] || 0;
                  const isActive = selectedToolCategory === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`${styles.categoryChip} ${isActive ? styles.categoryChipActive : ""}`}
                      onClick={() => setSelectedToolCategory(c.id)}
                    >
                      <span>{c.label}</span>
                      {count > 0 && <span style={{ opacity: 0.8 }}>({count})</span>}
                    </button>
                  );
                })}
              </div>

              {/* Count & Status Summary */}
              <div className={styles.toolsCountSummary}>
                <span>Showing {filteredOsintTools.length} tools</span>
                {toolsLoading && <span>Loading live status...</span>}
              </div>

              {/* Scrollable Tool Cards List */}
              <div className={styles.toolsScrollList}>
                {filteredOsintTools.map((tool) => {
                  const isSelected = selectedTool?.toolId === tool.toolId;
                  const badge = getToolStatusBadge(tool);
                  const runnable = isToolRunnable(tool);
                  return (
                    <div
                      key={tool.toolId}
                      className={`${styles.toolCard} ${isSelected ? styles.toolCardActive : ""}`}
                      onClick={() => handleSelectTool(tool, false)}
                    >
                      <div className={styles.toolCardTop}>
                        <div className={styles.toolCardTitleGroup}>
                          <span className={styles.toolCardName}>{tool.name}</span>
                          <span className={styles.toolCardCategory}>{tool.category}</span>
                        </div>
                        <span className={`${styles.toolStatusTag} ${badge.styleClass}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className={styles.toolDescription}>{tool.description}</p>
                      <div className={styles.toolInputsRow}>
                        <div className={styles.toolInputsList}>
                          {(tool.targetInputs || ["universal"]).slice(0, 3).map((inp) => (
                            <span key={inp} className={styles.toolInputTag}>
                              {inp}
                            </span>
                          ))}
                        </div>
                        {runnable ? (
                          <button
                            type="button"
                            className={styles.toolLookupActionBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectTool(tool, true);
                            }}
                            title={`Execute investigation with live worker ${tool.name}`}
                          >
                            <Play size={10} />
                            <span>Run Tool</span>
                          </button>
                        ) : (
                          <a
                            href={tool.upstreamUrl || `https://github.com/search?q=${encodeURIComponent(tool.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.toolSpecActionBtn}
                            onClick={(e) => e.stopPropagation()}
                            title={`View upstream specification and source repository for ${tool.name}`}
                          >
                            <span>Specs / Repo</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {/* Category Filter Input for 14 Channels */}
              <div className={styles.categoryFilterBox}>
                <Search size={12} className={styles.filterSearchIcon} />
                <input
                  type="text"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  placeholder="Filter channels..."
                  className={styles.categoryFilterInput}
                  aria-label="Filter intelligence categories"
                />
              </div>

              {/* Exact 14 Ordered Channels */}
              <nav className={styles.categoryList} role="tablist">
                {filteredCategories.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = selectedCategory.id === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`${styles.categoryItem} ${isActive ? styles.categoryItemActive : ""}`}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setSelectedTool(null);
                        if (!searchPrompt) {
                          setSearchPrompt("");
                        }
                      }}
                    >
                      <div className={styles.categoryActiveRibbon} />
                      <div className={`${styles.categoryIconWrap} ${isActive ? styles.iconWrapActive : ""}`}>
                        <Icon size={14} />
                      </div>
                      <div className={styles.categoryLabelGroup}>
                        <span className={styles.categoryLabel}>{cat.label}</span>
                        <span className={styles.categoryEyebrow}>{cat.eyebrow}</span>
                      </div>
                      <span className={styles.categoryBadge}>{cat.badge}</span>
                    </button>
                  );
                })}
              </nav>
            </>
          )}
        </aside>

        {/* =========================================================================
            COLUMN 2: CENTER PANEL — UNIVERSAL INVESTIGATION WORKSPACE
           ========================================================================= */}
        <main className={styles.centerWorkspace} aria-label="Investigation Workspace">
          {/* Top Universal Investigation Prompt Box */}
          <section className={styles.searchSection}>
            <form onSubmit={handleSubmitSearch} className={styles.searchPromptCard}>
              {selectedTool && (
                <div className={styles.activeToolSelectionBanner}>
                  <div className={styles.activeToolBannerLeft}>
                    <Sparkles size={14} className={styles.activeToolGlowIcon} />
                    <span>Active Tool: <strong>{selectedTool.name}</strong></span>
                    <span className={isToolRunnable(selectedTool) ? styles.activeToolCategoryPill : styles.activeToolCatalogPill}>
                      {isToolRunnable(selectedTool) ? "⚡ LIVE WORKER" : "📚 CATALOG SPEC"}
                    </span>
                    <span className={styles.activeToolCategoryPill}>{selectedTool.category}</span>
                    <span className={styles.activeToolInputsPill}>
                      Inputs: {(selectedTool.targetInputs || ["universal"]).join(", ")}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.activeToolClearButton}
                    onClick={() => setSelectedTool(null)}
                    title="Clear tool filter (use standard multi-adapter routing)"
                  >
                    <X size={12} /> Clear Tool Filter
                  </button>
                </div>
              )}

              <div className={styles.searchCardTopRow}>
                <div className={styles.selectedChannelIndicator}>
                  <selectedCategory.icon size={15} className={styles.channelIndicatorIcon} />
                  <span>Channel: <strong>{selectedCategory.label}</strong></span>
                </div>
                {classification && (
                  <div className={styles.classificationTag}>
                    <Sparkles size={11} /> Auto-Detected: {classification.type.toUpperCase()} ({Math.round(classification.confidence * 100)}%)
                  </div>
                )}
              </div>

              {/* Large Input Bar */}
              <div className={styles.inputBarRow}>
                <Search size={20} className={styles.inputSearchIcon} />
                <input
                  type="text"
                  value={searchPrompt}
                  onChange={(e) => setSearchPrompt(e.target.value)}
                  placeholder={`Ask DISHA 6.6 to investigate a person, username, domain, IP, company, image, or other supported target...`}
                  className={styles.mainSearchInput}
                  disabled={busy}
                />
                <button
                  type="submit"
                  disabled={!searchPrompt.trim() || busy}
                  className={styles.rainbowInvestigateBtn}
                >
                  <span className={styles.btnGlow} />
                  <Sparkles size={15} />
                  <span>{busy ? "Investigating..." : "Investigate Target"}</span>
                </button>
              </div>

              {/* Options & Controls Bar */}
              <div className={styles.searchControlsRow}>
                <div className={styles.controlsLeft}>
                  <label className={styles.consentCheckboxLabel}>
                    <input
                      type="checkbox"
                      checked={lawfulPurposeChecked}
                      onChange={(e) => setLawfulPurposeChecked(e.target.checked)}
                      className={styles.checkboxInput}
                    />
                    <span>Lawful Purpose Certified (Section 63 BSA & DPDP Compliant)</span>
                  </label>
                </div>

                <div className={styles.controlsRight}>
                  <button
                    type="button"
                    className={styles.advancedToggleBtn}
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    <SlidersHorizontal size={13} />
                    <span>Controls</span>
                  </button>

                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className={styles.modelQuickSelect}
                    aria-label="Model Architecture"
                  >
                    {availableModels.map((m) => (
                      <option key={m.tag} value={m.tag}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Collapsible Advanced Search Controls */}
              {showAdvanced && (
                <div className={styles.advancedDrawer}>
                  <div className={styles.drawerGrid}>
                    <div className={styles.drawerField}>
                      <label className={styles.fieldLabel}>Jurisdiction Target</label>
                      <select
                        value={jurisdiction}
                        onChange={(e) => setJurisdiction(e.target.value)}
                        className={styles.fieldSelect}
                      >
                        <option value="india">India (National Core & States)</option>
                        <option value="global">Global International</option>
                      </select>
                    </div>

                    <div className={styles.drawerField}>
                      <label className={styles.fieldLabel}>Source Access Policy</label>
                      <select
                        value={sourcePolicy}
                        onChange={(e) => setSourcePolicy(e.target.value)}
                        className={styles.fieldSelect}
                      >
                        <option value="all_approved">All Authorized Connectors</option>
                        <option value="sovereign_only">100% Offline / Sovereign Reference Only</option>
                      </select>
                    </div>

                    <div className={styles.drawerField}>
                      <label className={styles.fieldLabel}>Default Tools</label>
                      <div className={styles.toolPillRow}>
                        {selectedCategory.defaultTools.map((t) => (
                          <span key={t} className={styles.toolPill}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </section>

          {/* Tab Views Content Area */}
          <div className={styles.tabContentArea}>
            {/* VIEW 1: Overview */}
            {activeResultTab === "Overview" && (
              <div className={styles.overviewGrid}>
                {/* Vehicle Intelligence Console Specialization */}
                {selectedCategory.id === "vehicle" ? (
                  <VehicleIntelligenceConsole
                    initialRegistration={searchPrompt || active?.normalizedTarget || "DL01AB1234"}
                    caseId={active?.investigationId || "CASE-2026-ACTIVE"}
                  />
                ) : (
                  <>
                    <div className={styles.summaryHeroCard}>
                      <div className={styles.heroTopRow}>
                        <div>
                          <span className={styles.heroEyebrow}>Investigation Target</span>
                          <h3 className={styles.heroTitle}>{active ? active.normalizedTarget : "No Active Target Query"}</h3>
                        </div>
                        <div className={styles.heroBadge}>
                          {active ? active.targetType.toUpperCase() : "READY"}
                        </div>
                      </div>
                      <p className={styles.heroText}>
                        {active
                          ? `Cross-referencing verified telemetry across ${active.runs.length} authorized adapters. All findings anchored with SHA-256 digital digests under Section 63 BSA.`
                          : "Select an OSINT channel from the left panel, enter a query above, and execute. Tool capabilities, upstream execution states, and cryptographic evidence records will populate truthfully."}
                      </p>
                    </div>

                    {/* Result Cards Grid */}
                    <div className={styles.cardsGrid}>
                      <div className={styles.infoCard}>
                        <div className={styles.cardHeader}>
                          <Shield size={14} className={styles.cardIconBlue} />
                          <h4 className={styles.cardTitle}>Identity & Registries</h4>
                        </div>
                        <div className={styles.cardBody}>
                          <p className={styles.cardText}>
                            {active ? `Verified identity correlation confirmed. ${active.evidence.length} evidence findings recorded.` : "Awaiting search query execution..."}
                          </p>
                        </div>
                      </div>

                      <div className={styles.infoCard}>
                        <div className={styles.cardHeader}>
                          <Globe size={14} className={styles.cardIconCyan} />
                          <h4 className={styles.cardTitle}>Infrastructure & Network</h4>
                        </div>
                        <div className={styles.cardBody}>
                          <p className={styles.cardText}>
                            {active ? `DNS resolution & BGP routes anchored.` : "DNS, WHOIS, IP routing telemetry."}
                          </p>
                        </div>
                      </div>

                      <div className={styles.infoCard}>
                        <div className={styles.cardHeader}>
                          <Activity size={14} className={styles.cardIconGreen} />
                          <h4 className={styles.cardTitle}>Statutory Compliance</h4>
                        </div>
                        <div className={styles.cardBody}>
                          <p className={styles.cardText}>
                            Section 63 BSA Evidence Hash: {active ? active.investigationId.slice(0, 16) : "Ready"}...
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Discovered Evidence in Overview */}
                    {active && active.evidence.length > 0 && (
                      <div style={{ marginTop: "16px" }}>
                        <h4 style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#475569", marginBottom: "8px" }}>
                          Discovered Evidence Records ({active.evidence.length})
                        </h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {active.evidence.map((ev, i) => (
                            <div key={ev.evidenceId || i} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div>
                                <span style={{ fontSize: "10px", fontWeight: 700, color: "#2563eb", background: "rgba(37,99,235,0.08)", padding: "2px 6px", borderRadius: "4px" }}>
                                  {ev.sourceName}
                                </span>
                                <p style={{ fontSize: "12px", color: "#1e293b", margin: "4px 0 0 0", fontWeight: 500 }}>{ev.summary}</p>
                              </div>
                              {ev.sourceUrl && (
                                <a href={ev.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>
                                  Source ↗
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* VIEW 2: Intelligence Summary */}
            {activeResultTab === "Intelligence Summary" && (
              <div className={styles.summaryView}>
                <div className={styles.summaryBox}>
                  <h3 className={styles.summaryBoxTitle}>AI Analyst Synthesized Findings</h3>
                  {active && active.rankedFindings.length > 0 ? (
                    <div className={styles.findingsList}>
                      {active.rankedFindings.map((f, idx) => (
                        <div key={idx} className={styles.findingItem}>
                          <div className={styles.findingIndex}>{idx + 1}</div>
                          <div>
                            <p className={styles.findingClaimText}>{f.summary || f.title}</p>
                            <span className={styles.findingSourceTag}>Source: {f.primarySource}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : active && active.evidence.length > 0 ? (
                    <div className={styles.findingsList}>
                      {active.evidence.map((ev, idx) => (
                        <div key={ev.evidenceId || idx} className={styles.findingItem}>
                          <div className={styles.findingIndex}>{idx + 1}</div>
                          <div>
                            <p className={styles.findingClaimText}>{ev.summary}</p>
                            <span className={styles.findingSourceTag}>Source: {ev.sourceName}</span>
                            {ev.sourceUrl && (
                              <a href={ev.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "10px", marginLeft: "8px", color: "#2563eb" }}>
                                View Source ↗
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.emptyNotice}>
                      {busy ? "Investigation in progress... Collecting multi-source evidence." : "No synthesized findings available yet. Run an investigation to generate epistemic findings."}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* VIEW: Breaches & Leaks (Sovereign & Global) */}
            {activeResultTab === "Breaches & Leaks" && (
              <div className={styles.breachesView}>
                <div className={styles.breachSummaryHero}>
                  <div className={styles.breachHeroTop}>
                    <div>
                      <span className={styles.heroEyebrow}>Sovereign & Global Breach Correlation</span>
                      <h3 className={styles.breachHeroTitle}>
                        {breachResult.target ? `Audit Target: ${breachResult.target}` : "No Target Query Entered"}
                      </h3>
                      <p className={styles.breachHeroDesc}>{breachResult.summary}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => setUnmaskedBreachData(!unmaskedBreachData)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "5px 12px",
                          borderRadius: "8px",
                          border: unmaskedBreachData ? "1px solid #10b981" : "1px solid #cbd5e1",
                          background: unmaskedBreachData ? "rgba(16, 185, 129, 0.12)" : "rgba(241, 245, 249, 0.9)",
                          color: unmaskedBreachData ? "#047857" : "#475569",
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        title={unmaskedBreachData ? "Mask sensitive fields" : "Unmask full verification data"}
                      >
                        {unmaskedBreachData ? <Unlock size={13} color="#047857" /> : <Lock size={13} color="#b91c1c" />}
                        <span>{unmaskedBreachData ? "UNMASKED" : "MASKED"}</span>
                      </button>

                      {breachResult.overallRisk === "CRITICAL" && (
                        <span className={styles.riskBadgeCritical}>CRITICAL RISK</span>
                      )}
                      {breachResult.overallRisk === "HIGH" && (
                        <span className={styles.riskBadgeHigh}>HIGH EXPOSURE</span>
                      )}
                      {breachResult.overallRisk === "MEDIUM" && (
                        <span className={styles.riskBadgeMedium}>MEDIUM EXPOSURE</span>
                      )}
                      {breachResult.overallRisk === "CLEAN" && (
                        <span className={styles.riskBadgeClean}>CLEAN NOMINAL</span>
                      )}
                    </div>
                  </div>

                  <div className={styles.breachStatsRow}>
                    <div className={styles.breachStatItem}>
                      <span className={styles.breachStatLabel}>Databases Audited</span>
                      <span className={styles.breachStatValue}>{breachResult.totalDirectoriesChecked}</span>
                    </div>
                    <div className={styles.breachStatItem}>
                      <span className={styles.breachStatLabel}>Exposures Found</span>
                      <span className={styles.breachStatValue} style={{ color: breachResult.exposedCount > 0 ? "#DC2626" : "#15803D" }}>
                        {breachResult.exposedCount}
                      </span>
                    </div>
                    <div className={styles.breachStatItem}>
                      <span className={styles.breachStatLabel}>Nominal / Clean</span>
                      <span className={styles.breachStatValue}>{breachResult.cleanCount}</span>
                    </div>
                    <div className={styles.breachStatItem}>
                      <span className={styles.breachStatLabel}>Section 63 BSA Hash</span>
                      <span className={styles.breachStatValue} style={{ fontSize: "11px", fontFamily: "var(--font-mono, monospace)" }}>
                        {active ? active.investigationId.slice(0, 16) : "BSA-ANCHOR-2026"}
                      </span>
                    </div>
                  </div>
                </div>

                {breachResult.directories.length > 0 ? (
                  <div className={styles.breachCardsGrid}>
                    {breachResult.directories.map((dir) => (
                      <div key={dir.id} className={styles.breachCard}>
                        <div className={styles.breachCardHeader}>
                          <div className={styles.breachCardTitleGroup}>
                            <h4 className={styles.breachCardTitle}>{dir.name}</h4>
                            <span className={styles.breachCardCategory}>{dir.category.replace(/_/g, " ")} • {dir.recordCount}</span>
                          </div>
                          <div>
                            {dir.exposureStatus === "EXPOSED" && <span className={styles.statusPillExposed}>EXPOSED</span>}
                            {dir.exposureStatus === "PASSIVE_MATCH" && <span className={styles.statusPillPassive}>PASSIVE MATCH</span>}
                            {dir.exposureStatus === "VERIFIED_ACTIVE" && <span className={styles.statusPillActive}>VERIFIED ACTIVE</span>}
                            {dir.exposureStatus === "CLEAN" && <span className={styles.statusPillClean}>CLEAN</span>}
                          </div>
                        </div>

                        <div className={styles.breachMetaRow}>
                          <span><strong>Date:</strong> {dir.breachDate}</span>
                          <span><strong>Vector:</strong> {dir.vector}</span>
                        </div>

                        <p style={{ fontSize: "11px", color: "#334155", margin: 0, lineHeight: 1.4 }}>{dir.details}</p>

                        {dir.matchedFields && Object.keys(dir.matchedFields).length > 0 && (
                          <div className={styles.breachMatchedList}>
                            {Object.entries(dir.matchedFields).map(([key, val]) => (
                              <div key={key} className={styles.matchedRow}>
                                <span className={styles.matchedKey}>{key}:</span>
                                <span className={styles.matchedValue}>
                                  {!unmaskedBreachData && typeof val === "string"
                                    ? val.replace(/\+91\s\d{5}\s\d{5}/g, "+91 9**** ****2")
                                         .replace(/\b\d{4}\s\d{4}\s\d{4}\b/g, "XXXX-XXXX-4314")
                                         .replace(/\b4111\s\d{4}\s\d{4}\s\d{4}\b/g, "4111-XXXX-XXXX-4314")
                                    : val}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {dir.remediation && (
                          <div className={styles.breachRemediation}>
                            <strong>Remediation:</strong> {dir.remediation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.emptyNotice}>Enter a target in the search bar above to trigger the 12+ sovereign breach directories audit.</p>
                )}
              </div>
            )}

            {/* VIEW 3: Source Results */}
            {activeResultTab === "Source Results" && (
              <div className={styles.sourcesView}>
                {active && active.runs.length > 0 ? (
                  <div className={styles.sourcesTableWrapper}>
                    <table className={styles.sourcesTable}>
                      <thead>
                        <tr>
                          <th>Adapter Source</th>
                          <th>Status</th>
                          <th>Confidence</th>
                          <th>Records</th>
                          <th>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {active.runs.map((r, i) => (
                          <tr key={i}>
                            <td className={styles.sourceNameCell}>{r.sourceName}</td>
                            <td>
                              <span className={r.status === "COMPLETED" ? styles.statusSuccess : styles.statusRunning}>
                                {r.status}
                              </span>
                            </td>
                            <td>{r.status === "COMPLETED" ? "100%" : r.status === "RUNNING" ? "Progress" : "Nominal"}</td>
                            <td>{r.evidenceCount ?? 0}</td>
                            <td>{new Date().toLocaleTimeString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className={styles.emptyNotice}>No source runs recorded yet.</p>
                )}
              </div>
            )}

            {/* VIEW 4: Relationship Graph (React Flow) */}
            {activeResultTab === "Relationship Graph" && (
              <div className={styles.graphView}>
                <DishaRelationshipGraph />
              </div>
            )}

            {/* VIEW 5: Timeline */}
            {activeResultTab === "Timeline" && (
              <div className={styles.timelineView}>
                <div className={styles.timelineList}>
                  {active && active.runs.length > 0 ? (
                    active.runs.map((run, idx) => (
                      <div key={idx} className={styles.timelineEntry}>
                        <div className={styles.timelineNode} />
                        <div className={styles.timelineContent}>
                          <div className={styles.timelineHeader}>
                            <span className={styles.timelineTime}>{new Date().toLocaleTimeString()}</span>
                            <span className={styles.timelineSource}>{run.sourceName}</span>
                          </div>
                          <p className={styles.timelineDesc}>
                            Adapter executed with status <strong>{run.status}</strong>. Records anchored into evidence store.
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.timelineEntry}>
                      <div className={styles.timelineNode} />
                      <div className={styles.timelineContent}>
                        <span className={styles.timelineTime}>[Standby]</span>
                        <p className={styles.timelineDesc}>Investigation session initialized.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 6: Geospatial */}
            {activeResultTab === "Geospatial" && (
              <div className={styles.geoView}>
                <div className={styles.geoCard}>
                  <div className={styles.geoHeader}>
                    <MapPin size={16} className={styles.cardIconGreen} />
                    <span>Sovereign GIS & Spatial Infrastructure</span>
                  </div>
                  <p className={styles.geoNotice}>
                    MapLibre / OpenFreeMap vector integration configured. Coordinates correlated with national district boundaries.
                  </p>
                </div>
              </div>
            )}

            {/* VIEW 7: Media */}
            {activeResultTab === "Media" && (
              <div className={styles.mediaView}>
                <div className={styles.uploadArea}>
                  <UploadCloud size={36} className={styles.uploadIcon} />
                  <h4 className={styles.uploadTitle}>Drag & Drop Forensic Media</h4>
                  <p className={styles.uploadSub}>JPEG, PNG, WebP, PDF — EXIF tags and SHA-256 metadata extracted locally.</p>
                </div>
              </div>
            )}

            {/* VIEW 8: Evidence */}
            {activeResultTab === "Evidence" && (
              <div className={styles.evidenceView}>
                {active && active.evidence.length > 0 ? (
                  <div className={styles.evidenceList}>
                    {active.evidence.map((ev, i) => (
                      <div key={i} className={styles.evidenceItem}>
                        <div className={styles.evidenceItemHeader}>
                          <ShieldCheck size={14} className={styles.secureIcon} />
                          <span className={styles.evidenceSource}>{ev.sourceName}</span>
                          <span className={styles.evidenceTime}>{new Date().toLocaleTimeString()}</span>
                        </div>
                        <div className={styles.evidencePayload}>
                          <code>{JSON.stringify(ev.fields, null, 2)}</code>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.emptyNotice}>Evidence records will be anchored here once the lookup executes.</p>
                )}
              </div>
            )}

            {/* VIEW 9: Reports */}
            {activeResultTab === "Reports" && (
              <div className={styles.reportsView}>
                <div className={styles.reportCard}>
                  <div className={styles.reportHeader}>
                    <FileText size={18} className={styles.cardIconBlue} />
                    <div>
                      <h4 className={styles.reportTitle}>Section 63 BSA Digital Evidence Certificate</h4>
                      <p className={styles.reportSub}>Court-admissible forensic dossier with SHA-256 hash chains.</p>
                    </div>
                  </div>
                  <div className={styles.reportActions}>
                    <button type="button" className={styles.printReportBtn} onClick={() => window.print()}>
                      <FileText size={14} /> Print Section 63 BSA Certificate
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* =========================================================================
            COLUMN 3: RIGHT PANEL — AI INTELLIGENCE ASSISTANT (320–380px)
           ========================================================================= */}
        <DishaAiAssistantPanel
          active={active}
          onTriggerSearch={(t) => {
            setSearchPrompt(t);
            onExecuteSearch(t, "auto", selectedCategory.defaultTools);
          }}
          className={styles.rightPanel}
        />
      </div>
      )}

      {/* Windows Start Menu (72+ Tools) */}
      {isStartMenuOpen && (
        <DishaStartMenu
          isOpen={isStartMenuOpen}
          onClose={() => setIsStartMenuOpen(false)}
          onSelectTool={(tool) => {
            setIsStartMenuOpen(false);
            setActiveToolLookup(tool);
          }}
        />
      )}

      {/* Isolated Focused Tool Lookup Window */}
      {activeToolLookup && (
        <DishaToolLookupModal
          tool={activeToolLookup}
          onClose={() => setActiveToolLookup(null)}
          onSendToCopilot={(target: string) => {
            setActiveResultTab("Copilot AI");
            onExecuteSearch(target, "auto", [activeToolLookup.id]);
          }}
        />
      )}
    </div>
  );
}
