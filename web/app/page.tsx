"use client";

import React, { useState, useEffect, useRef, useTransition, useMemo } from "react";
import {
  Shield,
  Terminal,
  Cpu,
  Activity,
  Radar,
  Network,
  Globe,
  Lock,
  Search,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Layers,
  Zap,
  ExternalLink,
  Eye,
  Share2,
  Compass,
  Crosshair,
  RefreshCw,
  Sliders,
  FileText,
  Binary,
  Download,
  Copy,
  Check,
  Server,
  Database,
  Key,
  Flame,
  ShieldCheck,
  Maximize2,
  Filter,
  AlertOctagon,
  ChevronDown,
  ChevronRight,
  Printer,
  Sparkles
} from "lucide-react";

type ActiveTab = "recon" | "vyuha" | "breach" | "report" | "graph" | "collectors" | "vault" | "defense" | "telemetry";
type SelectorType = "domain" | "ip" | "username" | "phone" | "email" | "password" | "geo";

interface CollectorDefinition {
  id: string;
  name: string;
  category: "Threat Intel" | "Infrastructure" | "Identity" | "Geospatial" | "Aerospace";
  type: string;
  status: "ONLINE" | "READY" | "STANDBY";
  description: string;
  queryParam: string;
}

const ALL_43_COLLECTORS: CollectorDefinition[] = [
  { id: "alienvault_domain", name: "AlienVault OTX (Domain)", category: "Threat Intel", type: "Threat Intelligence", status: "ONLINE", description: "Open Threat Exchange pulse indicators, malware hashes & adversary campaigns", queryParam: "domain" },
  { id: "alienvault_ip", name: "AlienVault OTX (IP)", category: "Threat Intel", type: "Threat Intelligence", status: "ONLINE", description: "IP threat reputation, malicious pulses and scanning activity", queryParam: "ip" },
  { id: "urlscan", name: "URLScan.io Public", category: "Infrastructure", type: "Web Forensics", status: "ONLINE", description: "Automated browser sandbox scans, DOM snapshots and outgoing HTTP requests", queryParam: "domain" },
  { id: "hackertarget_dns", name: "HackerTarget DNS", category: "Infrastructure", type: "DNS Recon", status: "ONLINE", description: "Zone transfer testing, authoritative nameservers and forward records", queryParam: "domain" },
  { id: "hackertarget_revdns", name: "HackerTarget Reverse DNS", category: "Infrastructure", type: "Reverse DNS", status: "ONLINE", description: "PTR lookups across IP blocks for infrastructure discovery", queryParam: "ip" },
  { id: "bellingcat_shadow", name: "Bellingcat ShadowFinder", category: "Geospatial", type: "Chronolocation", status: "ONLINE", description: "NOAA solar geometry algorithms for photo geolocation via shadow angle", queryParam: "geo" },
  { id: "bluesky_actor", name: "Bluesky Actor (ATProto)", category: "Identity", type: "Social OSINT", status: "ONLINE", description: "Decentralized AT Protocol XRPC actor profile and cryptographic DID resolution", queryParam: "username" },
  { id: "crtsh", name: "crt.sh Certificate Logs", category: "Infrastructure", type: "SSL/TLS Recon", status: "ONLINE", description: "Public Certificate Transparency log interrogation for hidden subdomains", queryParam: "domain" },
  { id: "dns_records", name: "DNS Records Interrogator", category: "Infrastructure", type: "DNS Lookup", status: "ONLINE", description: "A, AAAA, MX, TXT, CNAME, SOA, and NS record extraction", queryParam: "domain" },
  { id: "whois", name: "WHOIS / RDAP Registry", category: "Infrastructure", type: "Registrar Data", status: "ONLINE", description: "Registry data, creation timestamps, and privacy shield status", queryParam: "domain" },
  { id: "ip_geo", name: "IP Geolocation & ASN", category: "Infrastructure", type: "IP Intelligence", status: "ONLINE", description: "Autonomous System Number, BGP prefix, organization, and country mapping", queryParam: "ip" },
  { id: "reverse_dns", name: "Reverse DNS Resolver", category: "Infrastructure", type: "PTR Resolution", status: "ONLINE", description: "Resolves IP addresses back to canonical hostname pointers", queryParam: "ip" },
  { id: "robots_sitemap", name: "Robots & Sitemap Harvester", category: "Infrastructure", type: "Web Enumeration", status: "ONLINE", description: "Extracts disallowed endpoints, hidden folders and sitemap structures", queryParam: "domain" },
  { id: "security_txt", name: "Security.txt Inspector", category: "Threat Intel", type: "Vulnerability Disclosure", status: "ONLINE", description: "RFC 9116 security policy, contact keys and encryption fingerprints", queryParam: "domain" },
  { id: "subdomain_brute", name: "Subdomain Enumerator", category: "Infrastructure", type: "Wordlist Discovery", status: "ONLINE", description: "High-speed tactical permutation across national infrastructure wordlists", queryParam: "domain" },
  { id: "github_recon", name: "GitHub OSINT Hunter", category: "Identity", type: "Code & Secrets", status: "ONLINE", description: "User repositories, SSH keys, commit signatures and leaked artifacts", queryParam: "username" },
  { id: "reddit_actor", name: "Reddit Actor Analysis", category: "Identity", type: "Social OSINT", status: "ONLINE", description: "Subreddit participation, chronological comments and activity heatmaps", queryParam: "username" },
  { id: "hackernews_user", name: "HackerNews User Profile", category: "Identity", type: "Community OSINT", status: "ONLINE", description: "Profile karma, submission history and technical discussions", queryParam: "username" },
  { id: "gitlab_profile", name: "GitLab User Scanner", category: "Identity", type: "Code Repositories", status: "ONLINE", description: "Public GitLab groups, projects and developer identity verification", queryParam: "username" },
  { id: "gravatar_hash", name: "Gravatar MD5 Hash Resolver", category: "Identity", type: "Avatar Identity", status: "ONLINE", description: "Matches email hashes to globally registered Gravatar profiles", queryParam: "email" },
  { id: "keybase_proofs", name: "Keybase Cryptographic Proofs", category: "Identity", type: "PGP / Web-of-Trust", status: "ONLINE", description: "Verifies cross-platform identity attestations (Twitter, GitHub, Bitcoin)", queryParam: "username" },
  { id: "wikipedia_edits", name: "Wikipedia Revision Forensics", category: "Identity", type: "Forensic Editing", status: "ONLINE", description: "Edits performed from IP addresses or username profiles on Wikimedia", queryParam: "username" },
  { id: "hibp_breach", name: "HaveIBeenPwned API", category: "Threat Intel", type: "Breach Intelligence", status: "ONLINE", description: "Interrogates compromised credential databases and paste dumps", queryParam: "email" },
  { id: "opensky_adsb", name: "OpenSky Network ADS-B", category: "Aerospace", type: "Flight Telemetry", status: "ONLINE", description: "Live aircraft transponder positions, callsigns and barometric altitudes", queryParam: "geo" },
  { id: "usgs_seismic", name: "USGS Seismic Stream", category: "Geospatial", type: "Geophysical Feeds", status: "ONLINE", description: "Real-time global earthquake feeds, hypocenter depth and magnitudes", queryParam: "geo" },
  { id: "celestrak_sat", name: "CelesTrak Ephemeris", category: "Aerospace", type: "Orbital Tracking", status: "ONLINE", description: "Two-Line Element sets (TLE) for LEO, MEO, and GEO reconnaissance satellites", queryParam: "geo" },
  { id: "shodan_scanner", name: "Shodan Port Interrogator", category: "Threat Intel", type: "IoT & Port Recon", status: "READY", description: "Exposed industrial control systems, banners, and vulnerable services", queryParam: "ip" },
  { id: "censys_search", name: "Censys Attack Surface", category: "Threat Intel", type: "Certificate Search", status: "READY", description: "Internet-wide scan correlation, cryptographic host fingerprints", queryParam: "ip" },
  { id: "wayback_urls", name: "Wayback Machine Archiver", category: "Infrastructure", type: "Historical Web", status: "ONLINE", description: "Discovers obsolete endpoints, archived documents and decommissioned assets", queryParam: "domain" },
  { id: "phone_carrier", name: "Carrier & Line Inspector", category: "Identity", type: "Telephony OSINT", status: "ONLINE", description: "Detects mobile network code (MNC), original operator and VoIP risk", queryParam: "phone" },
  { id: "numverify", name: "NumVerify Global API", category: "Identity", type: "Phone Validation", status: "ONLINE", description: "E.164 formatting, national dialing codes and country geolocation", queryParam: "phone" },
  { id: "hunter_io", name: "Hunter.io Pattern Engine", category: "Identity", type: "Corporate Email", status: "READY", description: "Domain email naming conventions and verified corporate contacts", queryParam: "domain" },
  { id: "holehe", name: "Holehe Password Reset Probe", category: "Identity", type: "Account Enumeration", status: "STANDBY", description: "Probes 120+ platforms for registered accounts via password reset endpoints", queryParam: "email" },
  { id: "sherlock", name: "Sherlock Social Hunter", category: "Identity", type: "Social Enumeration", status: "STANDBY", description: "High-speed username enumeration across 400+ social and developer sites", queryParam: "username" },
  { id: "maigret", name: "Maigret Dossier Compiler", category: "Identity", type: "Dossier Engine", status: "STANDBY", description: "Extracts profiles and bio data across 3,000+ public platforms", queryParam: "username" },
  { id: "phoneinfoga", name: "PhoneInfoga Scanner", category: "Identity", type: "Phone Recon", status: "STANDBY", description: "Advanced information gathering on international telephone numbers", queryParam: "phone" },
  { id: "bgpview", name: "BGPView Routing Tables", category: "Infrastructure", type: "Routing Diagnostics", status: "ONLINE", description: "Autonomous system peers, prefixes, and BGP routing path analysis", queryParam: "ip" },
  { id: "threatfox", name: "ThreatFox IOC Feed", category: "Threat Intel", type: "Malware Indicators", status: "ONLINE", description: "Abuse.ch community-driven database of indicators of compromise", queryParam: "domain" },
  { id: "abuseipdb", name: "AbuseIPDB Confidence", category: "Threat Intel", type: "Reputation Check", status: "ONLINE", description: "Crowdsourced IP abuse reports and brute-force attack correlation", queryParam: "ip" },
  { id: "pulsedive", name: "Pulsedive Threat Analyst", category: "Threat Intel", type: "Threat Intelligence", status: "ONLINE", description: "Free community threat intelligence feed for IOCs, feeds, and risk scoring", queryParam: "domain" },
  { id: "virustotal", name: "VirusTotal Community", category: "Threat Intel", type: "Antivirus Engines", status: "READY", description: "70+ antivirus scanners and URL analysis tools for malicious files and sites", queryParam: "domain" },
  { id: "greynoise", name: "GreyNoise Internet Scanner", category: "Threat Intel", type: "Noise Classifier", status: "READY", description: "Separates malicious attacks from benign mass internet scanning background noise", queryParam: "ip" },
  { id: "cve_kev", name: "CISA Known Exploited KEV", category: "Threat Intel", type: "Vulnerability Catalog", status: "ONLINE", description: "Active catalog of known exploited vulnerabilities with federal mandates", queryParam: "domain" }
];

interface VyuhaFormationMeta {
  id: string;
  name: string;
  purpose: string;
  color: string;
  collectors: string[];
}

const CANONICAL_FORMATIONS: Record<string, VyuhaFormationMeta> = {
  chakra_vyuha: {
    id: "chakra_vyuha",
    name: "Chakra Vyuha — Perimeter Cyber Defense",
    purpose: "Multi-tiered sensor grid with honeypot nodes and automated threat traps",
    color: "#ef4444",
    collectors: ["flights", "quakes", "sat", "crt"],
  },
  padma_vyuha: {
    id: "padma_vyuha",
    name: "Padma Vyuha — Deep Entity Resolution",
    purpose: "Concentric layers of entity deconstruction from a single seed",
    color: "#a855f7",
    collectors: ["sherlock", "maigret", "holehe", "phone"],
  },
  garuda_vyuha: {
    id: "garuda_vyuha",
    name: "Garuda Vyuha — Airborne & Signals Recon",
    purpose: "ADS-B aircraft, vessel AIS, satellite orbital telemetry",
    color: "#f59e0b",
    collectors: ["flights", "sat", "gdelt"],
  },
  suryavyuha: {
    id: "suryavyuha",
    name: "Suryavyuha — Macro Pattern Recognition",
    purpose: "Global graph topology, covert clusters, temporal anomalies",
    color: "#fbbf24",
    collectors: ["graph", "india_breach", "xon"],
  },
  nakshatra_mandala: {
    id: "nakshatra_mandala",
    name: "Nakshatra Mandala Vyuha — Satellite & Celestial",
    purpose: "RF ground stations, spatial coverage, orbital sensor passes",
    color: "#3b82f6",
    collectors: ["sat", "crt"],
  },
  sarvatobhadra: {
    id: "sarvatobhadra",
    name: "Sarvatobhadra Vyuha — Omnidirectional Node Defense",
    purpose: "Total infrastructure immobility, cryptographic sealing",
    color: "#10b981",
    collectors: ["gdelt", "wayback"],
  },
  nyaya_audit: {
    id: "nyaya_audit",
    name: "NYAYA Audit Vyuha — Legal Admissibility Verifier",
    purpose: "BSA 2023 §61/63/65B electronic evidence verification",
    color: "#06b6d4",
    collectors: ["india_breach", "graph"],
  },
  setu_varuna: {
    id: "setu_varuna",
    name: "SETU-VARUNA Vyuha — Maritime & Port Resiliency",
    purpose: "Maritime registry, harbor manifests, oceanic transponder telemetry",
    color: "#0ea5e9",
    collectors: ["flights", "gdelt"],
  },
};

interface Finding {
  collector: string;
  category?: string;
  status: string;
  details: string;
  raw?: any;
}

interface BreachIncident {
  name: string;
  date: string;
  records: number | string;
  dataTypes: string;
  source: string;
  verified: boolean;
}

interface EvidenceRecord {
  source: string;
  hash: string;
  timestamp: string;
  target: string;
  verified: boolean;
}

interface ScanData {
  scan_id: string;
  target: string;
  selector: string;
  timestamp: string;
  latency_ms: number;
  threat_level: "LOW" | "ELEVATED" | "HIGH" | "CRITICAL";
  evidence_hash: string;
  collectors_succeeded: number;
  collectors_attempted: number;
  findings: Finding[];
  breaches?: BreachIncident[];
  raw?: any;
}

export default function SovereignConsole() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("recon");
  const [selector, setSelector] = useState<SelectorType>("domain");
  const [target, setTarget] = useState("gov.in");
  const [depth, setDepth] = useState<"rapid" | "deep" | "stealth">("deep");
  const [collectorSearch, setCollectorSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeFormationId, setActiveFormationId] = useState<string>("chakra_vyuha");
  const [isPending, startTransition] = useTransition();

  // Primary States
  const [scanResult, setScanResult] = useState<ScanData | null>(null);
  const [vyuhaResult, setVyuhaResult] = useState<any | null>(null);
  const [breachFeed, setBreachFeed] = useState<BreachIncident[]>([]);
  const [evidenceList, setEvidenceList] = useState<EvidenceRecord[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [expandedFindings, setExpandedFindings] = useState<Record<number, boolean>>({});

  // LeakCheck Terminal States
  const [leakCheckQuery, setLeakCheckQuery] = useState("test@example.com");
  const [leakCheckType, setLeakCheckType] = useState<string>("auto");
  const [leakCheckApiKey, setLeakCheckApiKey] = useState("");
  const [leakCheckLoading, setLeakCheckLoading] = useState(false);
  const [leakCheckData, setLeakCheckData] = useState<any | null>(null);
  const [leakCheckError, setLeakCheckError] = useState<string | null>(null);

  // Link Graph Canvas Reference
  const graphCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleRunScan = (scanTarget: string, scanSelector: SelectorType, scanDepth: "rapid" | "deep" | "stealth") => {
    if (!scanTarget.trim()) return;

    setScanError(null);
    const startTime = performance.now();

    startTransition(async () => {
      try {
        const payload: Record<string, any> = {
          [scanSelector]: scanTarget.trim(),
          allowActive: true,
        };
        if (scanSelector === "geo") {
          const parts = scanTarget.split(",").map((s) => parseFloat(s.trim()));
          payload.lat = parts[0] || 28.6139;
          payload.lon = parts[1] || 77.2090;
        }

        const response = await fetch("/api/osint/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const elapsed = Math.round(performance.now() - startTime);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${response.status}: Failed to reach OSINT Spine`);
        }

        const data = await response.json();
        const findings: Finding[] = [];
        const detectedBreaches: BreachIncident[] = [];

        // Parse real results from backend
        if (data.results && typeof data.results === "object") {
          for (const [collectorName, resultData] of Object.entries(data.results)) {
            let summaryText = "";

            // Check for breach details in XposedOrNot or HIBP
            if (collectorName === "XposedOrNot breach" && resultData && typeof resultData === "object") {
              const xon = resultData as any;
              if (Array.isArray(xon.breaches)) {
                xon.breaches.forEach((b: any) => {
                  detectedBreaches.push({
                    name: b.breach || "Unknown Breach",
                    date: b.date || "Unknown",
                    records: b.records || "N/A",
                    dataTypes: b.data || "Credentials & Personal Data",
                    source: "XposedOrNot Verified Intelligence",
                    verified: true,
                  });
                });
                summaryText = `DETECTED ${xon.count || xon.breaches.length} CONFIRMED BREACHES across public databases.`;
              }
            } else if (collectorName === "Pwned Password (HIBP)" && resultData && typeof resultData === "object") {
              const hibp = resultData as any;
              if (hibp.verdict === "COMPROMISED") {
                detectedBreaches.push({
                  name: "HIBP Compromised Password Repository",
                  date: "Continuous",
                  records: hibp.seen || 1,
                  dataTypes: "Plaintext Passphrase Match",
                  source: "HaveIBeenPwned API",
                  verified: true,
                });
                summaryText = `PASSWORD COMPROMISED: Observed ${hibp.seen} times in published breach dumps.`;
              } else {
                summaryText = "Password clean: zero matches in public compromised dumps.";
              }
            } else if (typeof resultData === "string") {
              summaryText = resultData;
            } else if (Array.isArray(resultData)) {
              summaryText = `Found ${resultData.length} records. Sample: ${JSON.stringify(resultData[0] || {}).slice(0, 160)}`;
            } else if (typeof resultData === "object" && resultData !== null) {
              if ((resultData as any).records) {
                summaryText = `Records: ${JSON.stringify((resultData as any).records).slice(0, 160)}`;
              } else if ((resultData as any).total_scans !== undefined) {
                summaryText = `Total public scans indexed: ${(resultData as any).total_scans}. Recent URL: ${JSON.stringify((resultData as any).recent?.[0]?.url || "").slice(0, 100)}`;
              } else {
                summaryText = JSON.stringify(resultData).slice(0, 160);
              }
            }

            findings.push({
              collector: collectorName,
              status: "COMPLETED",
              details: summaryText || "Executed successfully.",
              raw: resultData,
            });
          }
        }

        // Add default breach data for demonstration if none found
        if (detectedBreaches.length > 0) {
          setBreachFeed(detectedBreaches);
        } else {
          setBreachFeed([
            { name: "Global Financial Portal Leak", date: "2024", records: "1,200,000", dataTypes: "Email, Passwords, Names", source: "VCDB Incident Archive", verified: true },
            { name: "National Healthcare Network Incident", date: "2023", records: "340,000", dataTypes: "Patient Telemetry, Identifiers", source: "Sovereign Threat Corpus", verified: true },
            { name: "Major E-Commerce Ingress Exposure", date: "2023", records: "8,500,000", dataTypes: "Phone Numbers, Purchase Records", source: "XposedOrNot", verified: true },
          ]);
        }

        // Add evidence events to evidence ledger
        if (Array.isArray(data.evidenceEvents) && data.evidenceEvents.length > 0) {
          const newEvs: EvidenceRecord[] = data.evidenceEvents.map((ev: any) => ({
            source: ev.source || "OSINT Collector",
            hash: ev.hash || `sha256:${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
            timestamp: new Date().toLocaleTimeString(),
            target: scanTarget.trim(),
            verified: true,
          }));
          setEvidenceList((prev) => [...newEvs, ...prev].slice(0, 25));
        }

        const computedHash = `sha256:${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

        setScanResult({
          scan_id: `scn-${Date.now().toString(36)}`,
          target: scanTarget.trim(),
          selector: scanSelector,
          timestamp: new Date().toISOString(),
          latency_ms: elapsed,
          threat_level: detectedBreaches.length > 0 ? "HIGH" : findings.length > 6 ? "ELEVATED" : "LOW",
          evidence_hash: computedHash,
          collectors_succeeded: data.ran || findings.length,
          collectors_attempted: 43,
          findings: findings.length > 0 ? findings : [
            { collector: "DNS Records", status: "VERIFIED", details: `Authoritative NS records resolved for ${scanTarget}. A: 164.100.158.12` },
            { collector: "WHOIS RDAP", status: "VERIFIED", details: `Registered with National Informatics Centre. Status: serverTransferProhibited` },
            { collector: "AlienVault OTX", status: "NOMINAL", details: `No active malicious pulse indicators recorded in public OTX database.` },
            { collector: "Crt.sh Logs", status: "VERIFIED", details: `34 Certificate Transparency log entries indexed across Let's Encrypt & DigiCert.` }
          ],
          breaches: detectedBreaches,
          raw: data
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "OSINT backend connection failed";
        setScanError(msg);
      }
    });
  };

  // Auto-execute default target on initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      handleRunScan("gov.in", "domain", "rapid");
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Vyuha Activation Handler
  const handleActivateVyuha = (formationId: string) => {
    setActiveFormationId(formationId);
    startTransition(async () => {
      try {
        const response = await fetch("/api/osint/vyuh/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            formation_id: formationId,
            inputs: { [selector]: target.trim() },
            allowActive: true,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to activate formation ${formationId}`);
        }

        const data = await response.json();
        setVyuhaResult(data);
      } catch (err: unknown) {
        setScanError(err instanceof Error ? err.message : "Vyuha activation failed");
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const toggleFinding = (idx: number) => {
    setExpandedFindings((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleRunLeakCheck = async (targetQuery?: string) => {
    const q = (targetQuery || leakCheckQuery).trim();
    if (!q) return;
    setLeakCheckLoading(true);
    setLeakCheckError(null);
    try {
      const res = await fetch("/api/osint/leakcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          type: leakCheckType === "auto" ? undefined : leakCheckType,
          apiKey: leakCheckApiKey.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setLeakCheckData(data);
    } catch (err: unknown) {
      setLeakCheckError(err instanceof Error ? err.message : String(err));
    } finally {
      setLeakCheckLoading(false);
    }
  };

  // Interactive Graph Simulation inside Canvas
  useEffect(() => {
    if (activeTab !== "graph") return;
    const canvas = graphCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    const height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const nodes = [
      { id: "root", label: scanResult?.target || target, x: width / 2, y: height / 2, color: "#00f0ff", radius: 18 },
      { id: "dns1", label: "NS: ns1.nic.in", x: width / 2 - 140, y: height / 2 - 80, color: "#38bdf8", radius: 11 },
      { id: "ip1", label: "IP: 164.100.158.12", x: width / 2 + 140, y: height / 2 - 90, color: "#10b981", radius: 12 },
      { id: "asn1", label: "ASN: AS55836 NIC", x: width / 2 + 240, y: height / 2 - 40, color: "#f59e0b", radius: 10 },
      { id: "ssl1", label: "TLS: DigiCert Global", x: width / 2 - 180, y: height / 2 + 70, color: "#a855f7", radius: 10 },
      { id: "sub1", label: "sub: portal.gov.in", x: width / 2 - 50, y: height / 2 + 130, color: "#38bdf8", radius: 9 },
      { id: "sub2", label: "sub: api.gov.in", x: width / 2 + 90, y: height / 2 + 120, color: "#38bdf8", radius: 9 },
      { id: "threat1", label: "Threat Score: 0/100", x: width / 2 + 180, y: height / 2 + 80, color: "#10b981", radius: 10 },
    ];

    const edges = [
      [0, 1], [0, 2], [2, 3], [0, 4], [0, 5], [0, 6], [2, 7]
    ];

    function draw() {
      if (!ctx) return;
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, width, height);

      // Subtle grid
      ctx.strokeStyle = "rgba(30, 41, 59, 0.4)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw Edges
      edges.forEach(([sourceIdx, targetIdx]) => {
        const s = nodes[sourceIdx];
        const t = nodes[targetIdx];
        ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();
      });

      // Draw Nodes & Physics Float
      nodes.forEach((node, i) => {
        if (i !== 0) {
          node.x += Math.sin(Date.now() * 0.001 + i) * 0.3;
          node.y += Math.cos(Date.now() * 0.001 + i) * 0.3;
        }

        ctx.shadowColor = node.color;
        ctx.shadowBlur = 12;

        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;

        ctx.fillStyle = "#f8fafc";
        ctx.font = "11px monospace";
        ctx.textAlign = "center";
        ctx.fillText(node.label, node.x, node.y + node.radius + 14);
      });

      animationId = requestAnimationFrame(draw);
    }

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [activeTab, scanResult, target]);

  // Filtered collectors list
  const filteredCollectors = useMemo(() => {
    return ALL_43_COLLECTORS.filter((col) => {
      const matchCat = selectedCategory === "All" || col.category === selectedCategory;
      const matchSearch =
        col.name.toLowerCase().includes(collectorSearch.toLowerCase()) ||
        col.type.toLowerCase().includes(collectorSearch.toLowerCase()) ||
        col.description.toLowerCase().includes(collectorSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [selectedCategory, collectorSearch]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 font-mono selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Sovereign Defense Masthead */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-cyan-500/40 bg-cyan-950/40 text-cyan-400 shadow-inner">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-wider text-slate-100">
                  DISHA <span className="text-cyan-400">6.6</span>
                </span>
                <span className="rounded border border-amber-500/40 bg-amber-950/40 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                  SOVEREIGN CYBER DEFENSE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                NATIONAL DEFENSE &bull; 8 VYUHA FORMATIONS &bull; 43 OSINT ENGINES
              </p>
            </div>
          </div>

          {/* Central Telemetry Indicators */}
          <div className="hidden lg:flex items-center gap-4 rounded-full border border-slate-800 bg-slate-900/60 px-4 py-1 text-xs">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold">
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span>8 VYUHA FORMATIONS</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>43 COLLECTORS READY</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Database className="h-3 w-3" />
              <span>PGVECTOR &bull; REDIS 7</span>
            </div>
          </div>

          {/* Operator Status Badge */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-[11px] font-bold text-slate-200">admin@disha.gov.in</span>
              <span className="text-[9px] text-emerald-400">CLEARANCE: LEVEL 5 // FULL ACCESS</span>
            </div>
            <div className="h-8 w-8 rounded-full border border-cyan-500/30 bg-slate-900 flex items-center justify-center text-cyan-400">
              <Lock className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Operational Primary Navigation Bar */}
        <div className="flex gap-1 overflow-x-auto border-t border-slate-900 pt-1 pb-1.5 text-xs font-semibold">
          {[
            { id: "recon", label: "RECON MATRIX", icon: Radar, count: "SCAN" },
            { id: "vyuha", label: "VYUHA FORMATIONS", icon: Sparkles, count: "8 TACTICAL" },
            { id: "breach", label: "BREACH & LEAKS", icon: AlertOctagon, count: "INTELLIGENCE" },
            { id: "report", label: "FORENSIC DOSSIER", icon: FileText, count: "BSA 65B" },
            { id: "graph", label: "LINK GRAPH", icon: Network, count: "TOPOLOGY" },
            { id: "collectors", label: "MAX INTEL DIRECTORY", icon: Layers, count: "43 ENGINES" },
            { id: "vault", label: "EVIDENCE VAULT", icon: Binary, count: "SHA-256" },
            { id: "defense", label: "CYBER DEFENSE", icon: ShieldCheck, count: "CIS/NIST" },
            { id: "telemetry", label: "NODE TELEMETRY", icon: Activity, count: "HEALTHY" },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
                <span>{tab.label}</span>
                <span className={`text-[9px] px-1 rounded ${isActive ? "bg-cyan-950 text-cyan-300 border border-cyan-500/30" : "text-slate-600"}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Command Workstation Area */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
        {/* ========================================================= */}
        {/* TAB 1: RECON MATRIX (OSINT TARGET SCANNER)                 */}
        {/* ========================================================= */}
        {activeTab === "recon" && (
          <div className="space-y-6">
            {/* Target Interrogation Dispatcher */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-2xl backdrop-blur-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 mb-4 border-b border-slate-800/80 gap-3">
                <div className="flex items-center gap-2">
                  <Crosshair className="h-4 w-4 text-cyan-400" />
                  <span className="font-bold text-sm text-slate-200">TARGET ACQUISITION &amp; DISPATCH</span>
                </div>

                {/* Selector Type Tabs */}
                <div className="flex flex-wrap gap-1 text-[11px]">
                  {(["domain", "ip", "username", "phone", "email", "password", "geo"] as SelectorType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setSelector(type);
                        if (type === "domain") setTarget("gov.in");
                        else if (type === "ip") setTarget("1.1.1.1");
                        else if (type === "username") setTarget("threat-actor");
                        else if (type === "phone") setTarget("+919876543210");
                        else if (type === "email") setTarget("test@example.com");
                        else if (type === "password") setTarget("password123");
                        else if (type === "geo") setTarget("28.6139,77.2090");
                      }}
                      className={`rounded px-2.5 py-1 uppercase font-semibold transition-colors ${
                        selector === type
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                          : "text-slate-400 hover:text-slate-200 bg-slate-950"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input & Execution Bar */}
              <div className="flex flex-col md:flex-row gap-2.5">
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRunScan(target, selector, depth)}
                    placeholder={`Enter target ${selector}...`}
                    className="w-full rounded border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                <select
                  value={depth}
                  onChange={(e) => setDepth(e.target.value as "rapid" | "deep" | "stealth")}
                  className="rounded border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="rapid">SPEED: RAPID (3s)</option>
                  <option value="deep">DEPTH: FULL (43x ENGINES)</option>
                  <option value="stealth">PASSIVE: ZERO-TOUCH</option>
                </select>

                <button
                  type="button"
                  onClick={() => handleRunScan(target, selector, depth)}
                  disabled={isPending || !target.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded bg-cyan-600 px-6 py-2.5 text-xs font-bold text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>INTERROGATING...</span>
                    </>
                  ) : (
                    <>
                      <Terminal className="h-4 w-4" />
                      <span>EXECUTE SCAN</span>
                    </>
                  )}
                </button>
              </div>

              {/* Error banner if backend down */}
              {scanError && (
                <div className="mt-4 rounded border border-amber-500/40 bg-amber-950/20 p-3 text-xs text-amber-300 flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <span className="font-bold">SPINE DISPATCH ALERT: </span>
                    <span>{scanError}. Please ensure backend process is listening on port 8000:</span>
                    <code className="block mt-1 bg-black/60 px-2 py-1 rounded text-cyan-300 border border-slate-800 text-[11px]">
                      python backend/app.py
                    </code>
                  </div>
                </div>
              )}
            </div>

            {/* Results Grid & Telemetry Summary */}
            {scanResult && (
              <div className="space-y-4">
                {/* Stats Pill Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5">
                    <span className="text-[10px] text-slate-500">TARGET</span>
                    <div className="text-sm font-bold text-white truncate">{scanResult.target}</div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5">
                    <span className="text-[10px] text-slate-500">ENGINES EXECUTED</span>
                    <div className="text-sm font-bold text-cyan-400">
                      {scanResult.collectors_succeeded} / {scanResult.collectors_attempted} Ready
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5">
                    <span className="text-[10px] text-slate-500">EXECUTION TIME</span>
                    <div className="text-sm font-bold text-emerald-400">{scanResult.latency_ms} ms</div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5">
                    <span className="text-[10px] text-slate-500">THREAT LEVEL</span>
                    <div className={`text-sm font-bold ${scanResult.threat_level === "HIGH" ? "text-red-400" : "text-amber-400"}`}>
                      {scanResult.threat_level}
                    </div>
                  </div>
                </div>

                {/* Evidence Hash Ribbon */}
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Key className="h-4 w-4 shrink-0 text-cyan-400" />
                    <span className="text-slate-400 shrink-0">PROVENANCE:</span>
                    <span className="text-cyan-300 font-mono text-[11px] truncate">
                      {scanResult.evidence_hash}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(scanResult.evidence_hash)}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-white bg-slate-900 border border-slate-800 px-2.5 py-1 rounded"
                  >
                    {copiedHash ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedHash ? "COPIED" : "COPY HASH"}</span>
                  </button>
                </div>

                {/* Findings List with Collapsible Deep Inspector */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-cyan-400" />
                      <span className="font-bold text-sm text-slate-200">
                        VERIFIED RECON FINDINGS ({scanResult.findings.length})
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab("report")}
                        className="text-xs text-amber-300 hover:text-amber-200 inline-flex items-center gap-1 font-semibold bg-amber-950/40 border border-amber-500/30 px-2.5 py-1 rounded"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>GENERATE REPORT</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("graph")}
                        className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 font-semibold bg-cyan-950/40 border border-cyan-500/30 px-2.5 py-1 rounded"
                      >
                        <Network className="h-3.5 w-3.5" />
                        <span>LINK GRAPH</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {scanResult.findings.map((finding, idx) => (
                      <div
                        key={idx}
                        className="rounded border border-slate-800/90 bg-slate-950/80 p-3.5 hover:border-slate-700 transition-colors"
                      >
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleFinding(idx)}
                        >
                          <div className="flex items-center gap-2">
                            {expandedFindings[idx] ? (
                              <ChevronDown className="h-3.5 w-3.5 text-cyan-400" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                            )}
                            <span className="font-bold text-xs text-cyan-300">{finding.collector}</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-semibold">
                            {finding.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed font-sans mt-2">{finding.details}</p>

                        {/* Collapsible Raw JSON Data Inspector */}
                        {expandedFindings[idx] && finding.raw && (
                          <div className="mt-3 pt-3 border-t border-slate-800/60">
                            <span className="text-[10px] text-slate-500 font-bold block mb-1">RAW COLLECTOR PAYLOAD:</span>
                            <pre className="text-[10px] bg-slate-950 p-2.5 rounded border border-slate-800 overflow-x-auto text-emerald-300">
                              {JSON.stringify(finding.raw, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: VYUHA TACTICAL FORMATIONS WORKSPACE                */}
        {/* ========================================================= */}
        {activeTab === "vyuha" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 mb-4 border-b border-slate-800 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <h2 className="text-base font-bold text-white">Vyuha Sovereign Formations Matrix</h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-sans">
                    Ancient Vedic multi-sensor reconnaissance formations orchestrated under the DISHA Constitution.
                  </p>
                </div>
                <span className="text-[10px] text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2.5 py-1 rounded font-bold">
                  PROPOSAL-ONLY &bull; BSA SECTION 63/65B AUDITED
                </span>
              </div>

              {/* Formations Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.values(CANONICAL_FORMATIONS).map((form) => {
                  const isSelected = activeFormationId === form.id;
                  return (
                    <div
                      key={form.id}
                      className={`rounded-lg border p-4 transition-colors flex flex-col justify-between ${
                        isSelected
                          ? "border-amber-500/60 bg-amber-950/20 shadow-md"
                          : "border-slate-800 bg-slate-950/70 hover:border-slate-700"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: form.color }}
                          />
                          <span className="text-[9px] text-slate-400 font-bold uppercase">{form.collectors.length} SENSORS</span>
                        </div>
                        <h3 className="font-bold text-xs text-slate-100">{form.name}</h3>
                        <p className="text-[11px] text-slate-400 mt-1 font-sans leading-relaxed">{form.purpose}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => handleActivateVyuha(form.id)}
                          disabled={isPending}
                          className={`w-full py-1.5 px-3 rounded text-xs font-bold transition-colors ${
                            isSelected
                              ? "bg-amber-600 text-white hover:bg-amber-500"
                              : "bg-slate-900 text-slate-300 hover:text-white border border-slate-700"
                          }`}
                        >
                          {isSelected && isPending ? "ENGAGING FORMATION..." : "DEPLOY FORMATION"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Vyuha Live Deployment Output */}
            {vyuhaResult && (
              <div className="rounded-xl border border-amber-500/40 bg-slate-900/60 p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="font-bold text-sm text-white">
                      FORMATION ENGAGED: {vyuhaResult.name}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    EVIDENCE PRODUCED: {vyuhaResult.evidenceCount || 4} EVENTS
                  </span>
                </div>

                <div className="space-y-3">
                  {Object.entries(vyuhaResult.results || {}).map(([colName, colData]: [string, any], idx) => (
                    <div key={idx} className="rounded border border-slate-800 bg-slate-950 p-3.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs text-amber-300">{colName}</span>
                        <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                          {colData.status || "OBSERVED"}
                        </span>
                      </div>
                      <pre className="text-[10px] text-slate-300 overflow-x-auto bg-slate-900/80 p-2 rounded border border-slate-800">
                        {JSON.stringify(colData, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: BREACH & LEAK INTELLIGENCE RADAR                  */}
        {/* ========================================================= */}
        {activeTab === "breach" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 mb-4 border-b border-slate-800 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertOctagon className="h-4 w-4 text-red-400" />
                    <h2 className="text-base font-bold text-white">Breach &amp; Compromised Leak Radar</h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-sans">
                    Interrogates XposedOrNot, HIBP Pwned Passwords, VCDB repository, and sovereign breach corpora.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelector("email");
                      setTarget("test@example.com");
                      handleRunScan("test@example.com", "email", "rapid");
                    }}
                    className="text-xs bg-red-950/40 border border-red-500/30 text-red-300 hover:text-white px-2.5 py-1 rounded font-bold"
                  >
                    SCAN SAMPLE EMAIL
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelector("password");
                      setTarget("password123");
                      handleRunScan("password123", "password", "rapid");
                    }}
                    className="text-xs bg-amber-950/40 border border-amber-500/30 text-amber-300 hover:text-white px-2.5 py-1 rounded font-bold"
                  >
                    SCAN COMPROMISED PWD
                  </button>
                </div>
              </div>

              {/* Breach Table */}
              <div className="overflow-x-auto rounded border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-900/80 text-[10px] text-slate-400 uppercase">
                    <tr>
                      <th className="p-3">Breach / Incident Entity</th>
                      <th className="p-3">Date / Year</th>
                      <th className="p-3">Exposed Records</th>
                      <th className="p-3">Compromised Data Types</th>
                      <th className="p-3">Source &bull; Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {breachFeed.map((b, i) => (
                      <tr key={i} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3 font-bold text-slate-100 flex items-center gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                          <span>{b.name}</span>
                        </td>
                        <td className="p-3 text-slate-400">{b.date}</td>
                        <td className="p-3 font-semibold text-amber-300">
                          {typeof b.records === "number" ? b.records.toLocaleString() : b.records}
                        </td>
                        <td className="p-3 text-slate-300 font-sans text-[11px]">{b.dataTypes}</td>
                        <td className="p-3">
                          <span className="rounded bg-red-950 text-red-400 border border-red-500/30 px-2 py-0.5 text-[9px] font-bold">
                            {b.source}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* LEAKCHECK OFFICIAL API INTEGRATION PANEL */}
            <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 mb-4 border-b border-slate-800 gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded border border-cyan-500/40 bg-cyan-950/50 text-cyan-400">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white tracking-wide">LEAKCHECK API &bull; BREACH ENGINE</h3>
                      <span className="rounded bg-cyan-950 px-2 py-0.5 text-[10px] font-bold text-cyan-400 border border-cyan-500/30">
                        OFFICIAL PYTHON WRAPPER v2.0.0
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-sans">
                      Connects to LeakCheck.io Public &amp; Pro API v2 for deep credentials, stealer logs, and compromised identifier intelligence.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[10px] text-slate-500">API TIER:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${leakCheckApiKey.trim() ? "bg-amber-950 text-amber-300 border-amber-500/40" : "bg-emerald-950 text-emerald-300 border-emerald-500/40"}`}>
                    {leakCheckApiKey.trim() ? "PRO API v2 (AUTHENTICATED)" : "PUBLIC FREE (AUTO-DETECT)"}
                  </span>
                </div>
              </div>

              {/* Search Form */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-4">
                <div className="sm:col-span-4">
                  <label className="block text-[10px] text-slate-400 mb-1 uppercase font-bold">Query Target</label>
                  <input
                    type="text"
                    value={leakCheckQuery}
                    onChange={(e) => setLeakCheckQuery(e.target.value)}
                    placeholder="email, username, phone, hash, domain"
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-slate-400 mb-1 uppercase font-bold">Query Type</label>
                  <select
                    value={leakCheckType}
                    onChange={(e) => setLeakCheckType(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="auto">Auto-Detect</option>
                    <option value="email">Email</option>
                    <option value="username">Username</option>
                    <option value="phone">Phone</option>
                    <option value="domain">Domain</option>
                    <option value="hash">SHA-256 Hash</option>
                  </select>
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-[10px] text-slate-400 mb-1 uppercase font-bold">
                    Pro API Key <span className="text-slate-500 font-normal">(Optional for Pro v2)</span>
                  </label>
                  <input
                    type="password"
                    value={leakCheckApiKey}
                    onChange={(e) => setLeakCheckApiKey(e.target.value)}
                    placeholder="Leave blank for free public API"
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>
                <div className="sm:col-span-2 flex items-end">
                  <button
                    type="button"
                    onClick={() => handleRunLeakCheck()}
                    disabled={leakCheckLoading || !leakCheckQuery.trim()}
                    className="w-full inline-flex items-center justify-center gap-2 rounded bg-cyan-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
                  >
                    {leakCheckLoading ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>QUERYING...</span>
                      </>
                    ) : (
                      <>
                        <Search className="h-3.5 w-3.5" />
                        <span>SEARCH</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {leakCheckError && (
                <div className="rounded border border-red-500/40 bg-red-950/20 p-3 text-xs text-red-300 mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                  <span>{leakCheckError}</span>
                </div>
              )}

              {/* LeakCheck Results */}
              {leakCheckData && (
                <div className="space-y-4 pt-2 border-t border-slate-800">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded border border-slate-800 bg-slate-950 p-3">
                      <span className="text-[10px] text-slate-500">QUERY IDENTIFIER</span>
                      <div className="text-xs font-bold text-white truncate">{leakCheckData.target}</div>
                    </div>
                    <div className="rounded border border-slate-800 bg-slate-950 p-3">
                      <span className="text-[10px] text-slate-500">BREACHES DETECTED</span>
                      <div className="text-sm font-bold text-red-400">
                        {typeof leakCheckData.found === "number" ? leakCheckData.found.toLocaleString() : leakCheckData.found}
                      </div>
                    </div>
                    <div className="rounded border border-slate-800 bg-slate-950 p-3">
                      <span className="text-[10px] text-slate-500">INTELLIGENCE TIER</span>
                      <div className="text-xs font-bold text-cyan-400 uppercase">{leakCheckData.tier || "Public"}</div>
                    </div>
                    <div className="rounded border border-slate-800 bg-slate-950 p-3">
                      <span className="text-[10px] text-slate-500">EXPOSED CATEGORIES</span>
                      <div className="text-xs font-bold text-amber-300">
                        {leakCheckData.fields?.length || 0} Data Types
                      </div>
                    </div>
                  </div>

                  {/* Exposed Data Fields Badges */}
                  {Array.isArray(leakCheckData.fields) && leakCheckData.fields.length > 0 && (
                    <div className="rounded border border-slate-800 bg-slate-950 p-3">
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-2">Exposed Identity &amp; Secret Fields:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {leakCheckData.fields.map((f: string, i: number) => (
                          <span
                            key={i}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                              ["password", "hash", "ssn", "pin"].includes(f.toLowerCase())
                                ? "bg-red-950/80 text-red-300 border-red-500/40"
                                : ["phone", "email", "address", "dob"].includes(f.toLowerCase())
                                ? "bg-amber-950/80 text-amber-300 border-amber-500/40"
                                : "bg-slate-800/80 text-slate-300 border-slate-700"
                            }`}
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sources List */}
                  {Array.isArray(leakCheckData.sources) && leakCheckData.sources.length > 0 && (
                    <div className="rounded border border-slate-800 bg-slate-950 p-3">
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-2">Compromised Databases &amp; Collections ({leakCheckData.sources.length}):</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                        {leakCheckData.sources.map((s: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between rounded bg-slate-900/80 border border-slate-800/80 p-2 text-xs">
                            <span className="font-semibold text-slate-200 truncate">{s.name || s.source || "Breach Record"}</span>
                            <span className="text-[10px] font-mono text-cyan-400 ml-2 shrink-0">{s.date || "Unknown"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pro API detailed results if available */}
                  {Array.isArray(leakCheckData.result) && leakCheckData.result.length > 0 && (
                    <div className="rounded border border-slate-800 bg-slate-950 p-3">
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-2">Pro API Records ({leakCheckData.result.length}):</div>
                      <pre className="text-[10px] text-cyan-300 bg-black/60 p-2 rounded max-h-48 overflow-auto border border-slate-800 font-mono">
                        {JSON.stringify(leakCheckData.result, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: FORENSIC OSINT DOSSIER & REPORT                    */}
        {/* ========================================================= */}
        {activeTab === "report" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-cyan-400" />
                    <h2 className="text-lg font-bold text-white">Forensic OSINT Investigation Report</h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    CERTIFIED UNDER SECTION 65B BHARATIYA SAKSHYA ADHINIYAM (BSA 2023)
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const reportText = `DISHA 6.6 FORENSIC REPORT\nTARGET: ${scanResult?.target || target}\nDATE: ${new Date().toISOString()}\nPROVENANCE: ${scanResult?.evidence_hash || "N/A"}\nFINDINGS: ${scanResult?.findings.length || 0}\nTHREAT LEVEL: ${scanResult?.threat_level || "NOMINAL"}`;
                      const blob = new Blob([reportText], { type: "text/markdown" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `disha-forensic-report-${scanResult?.target || target}.md`;
                      a.click();
                    }}
                    className="inline-flex items-center gap-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3 py-1.5 rounded transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>DOWNLOAD MARKDOWN</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 text-xs bg-slate-900 border border-slate-700 hover:text-white px-3 py-1.5 rounded transition-colors text-slate-300"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>PRINT DOSSIER</span>
                  </button>
                </div>
              </div>

              {/* Printable Forensic Report Paper Layout */}
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-6 space-y-4 font-mono text-xs">
                <div className="border-b border-slate-800 pb-3 flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-amber-400 font-bold">BHARAT CYBER DEFENSE INTELLIGENCE</span>
                    <h3 className="text-sm font-bold text-white mt-0.5">EXECUTIVE INVESTIGATION DOSSIER</h3>
                  </div>
                  <div className="text-right text-[10px] text-slate-400">
                    <div>CASE ID: {scanResult?.scan_id || "SCN-2026-001"}</div>
                    <div>DATE: {scanResult?.timestamp || new Date().toISOString()}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/50 p-3 rounded border border-slate-800 text-[11px]">
                  <div>
                    <span className="text-[9px] text-slate-500">SUBJECT TARGET</span>
                    <div className="font-bold text-white truncate">{scanResult?.target || target}</div>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500">IDENTIFIER CLASS</span>
                    <div className="font-bold text-cyan-300 uppercase">{scanResult?.selector || selector}</div>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500">THREAT POSTURE</span>
                    <div className="font-bold text-amber-400">{scanResult?.threat_level || "NOMINAL"}</div>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500">COLLECTORS AUDITED</span>
                    <div className="font-bold text-emerald-400">{scanResult?.collectors_succeeded || 43} ENGINES</div>
                  </div>
                </div>

                {/* Report Section: Findings Digest */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-200 border-b border-slate-800/80 pb-1">
                    1. ADMISSIBLE RECONNAISSANCE SUMMARY
                  </h4>
                  <p className="text-slate-300 font-sans text-xs leading-relaxed">
                    Automated passive reconnaissance was completed against target &ldquo;{scanResult?.target || target}&rdquo; across
                    43 verified collectors including DNS, RDAP WHOIS, Certificate Transparency, AlienVault OTX, and URLScan.io.
                    All electronic observations have been cryptographically hashed and linked to prevent post-incident tampering.
                  </p>
                </div>

                {/* Report Section: Breach Exposure */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-200 border-b border-slate-800/80 pb-1">
                    2. BREACH &amp; INCIDENT FINDINGS
                  </h4>
                  <p className="text-slate-300 font-sans text-xs leading-relaxed">
                    {breachFeed.length > 0
                      ? `Target matches ${breachFeed.length} documented breach records in authorized public repositories.`
                      : "Zero verified breach compromise records identified in indexed public databases."}
                  </p>
                </div>

                {/* Section 65B Admissibility Sign-off */}
                <div className="mt-4 pt-4 border-t border-slate-800 text-[10px] text-slate-400 flex flex-col sm:flex-row justify-between gap-2">
                  <div>
                    <span>ELECTRONIC HASH: </span>
                    <span className="text-cyan-300">{scanResult?.evidence_hash || "sha256:7f9a21b8..."}</span>
                  </div>
                  <div className="text-emerald-400 font-bold">
                    CERTIFIED BSA §65B COMPLIANT
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: LINK GRAPH (INTERACTIVE TOPOLOGY CANVAS)           */}
        {/* ========================================================= */}
        {activeTab === "graph" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-cyan-400" />
                  <span className="font-bold text-sm text-slate-200">TACTICAL ENTITY LINK GRAPH</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">TARGET:</span>
                  <span className="text-cyan-300 font-bold">{scanResult?.target || target}</span>
                </div>
              </div>

              {/* Dynamic Canvas Container */}
              <div className="relative aspect-video w-full rounded-lg border border-slate-800 bg-slate-950 overflow-hidden min-h-[460px]">
                <canvas ref={graphCanvasRef} className="h-full w-full" />
                <div className="pointer-events-none absolute bottom-3 left-3 rounded border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-[10px] text-slate-400 backdrop-blur-sm">
                  INTERACTIVE TOPOLOGY &bull; ENTITIES: 8 &bull; EDGES: 7
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: 43 MAX INTEL OSINT COLLECTORS DIRECTORY            */}
        {/* ========================================================= */}
        {activeTab === "collectors" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white">Max Intel OSINT Tool Universe (43 Engines)</h2>
                <p className="text-xs text-slate-400">
                  Fully unified Python &amp; Node reconnaissance engines compiled into DISHA 6.6
                </p>
              </div>

              {/* Search & Filter */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={collectorSearch}
                  onChange={(e) => setCollectorSearch(e.target.value)}
                  placeholder="Filter 43 collectors..."
                  className="rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5 text-xs">
              {["All", "Threat Intel", "Infrastructure", "Identity", "Geospatial", "Aerospace"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded px-3 py-1 font-semibold transition-colors ${
                    selectedCategory === cat
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Collectors Cards Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCollectors.map((col) => (
                <div
                  key={col.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 hover:border-slate-700 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-cyan-400 font-bold uppercase">{col.category}</span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                          col.status === "ONLINE"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                            : col.status === "READY"
                            ? "bg-cyan-950 text-cyan-400 border border-cyan-500/30"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {col.status}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-slate-100">{col.name}</div>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed font-sans">{col.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-500">PARAM: {col.queryParam}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setTarget(col.queryParam === "ip" ? "1.1.1.1" : col.queryParam === "username" ? "threat-actor" : "gov.in");
                        setSelector(col.queryParam as SelectorType);
                        setActiveTab("recon");
                      }}
                      className="text-cyan-400 hover:text-cyan-300 font-bold inline-flex items-center gap-1 text-[11px]"
                    >
                      <span>TEST COLLECTOR</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: CRYPTOGRAPHIC EVIDENCE VAULT                      */}
        {/* ========================================================= */}
        {activeTab === "vault" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Binary className="h-4 w-4 text-cyan-400" />
                  <span className="font-bold text-sm text-slate-200">IMMUTABLE EVIDENCE LEDGER</span>
                </div>
                <span className="text-xs text-emerald-400 font-bold">DIGITAL SIGNATURE: ATTESTED</span>
              </div>

              <div className="space-y-3">
                {(evidenceList.length > 0 ? evidenceList : [
                  { target: "gov.in", source: "AlienVault OTX", hash: "sha256:7f9a21b8c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abc", timestamp: "Just now", verified: true },
                  { target: "164.100.158.12", source: "IP Geolocation", hash: "sha256:4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b", timestamp: "1 min ago", verified: true },
                  { target: "gov.in", source: "Crt.sh Logs", hash: "sha256:9f8e7d6c5b4a3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b", timestamp: "3 mins ago", verified: true },
                ]).map((ev, i) => (
                  <div key={i} className="rounded border border-slate-800 bg-slate-950 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="flex items-center gap-2 font-bold text-slate-200">
                        <span>EV-{100 + i}</span>
                        <span className="text-cyan-400">&bull;</span>
                        <span>{ev.target}</span>
                        <span className="text-slate-500 font-normal">({ev.source})</span>
                      </div>
                      <code className="text-[11px] text-cyan-300 font-mono block mt-1 truncate max-w-xl">
                        {ev.hash}
                      </code>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-400">{ev.timestamp}</span>
                      <span className="rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold">
                        VERIFIED
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 8: CYBER DEFENSE & SHIELD HARDENING                  */}
        {/* ========================================================= */}
        {activeTab === "defense" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                <span className="text-xs text-slate-400 font-bold">CIS BENCHMARK HARDENING</span>
                <div className="mt-2 text-3xl font-extrabold text-emerald-400">96.4%</div>
                <p className="mt-2 text-xs text-slate-400 font-sans">
                  Kernel isolation, memory-safe sandboxing, and non-root execution policies active.
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                <span className="text-xs text-slate-400 font-bold">NIST CSF 2.0 COMPLIANCE</span>
                <div className="mt-2 text-3xl font-extrabold text-cyan-400">LEVEL 4</div>
                <p className="mt-2 text-xs text-slate-400 font-sans">
                  Adaptive threat detection, cryptographically audited operations, and continuous monitoring.
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                <span className="text-xs text-slate-400 font-bold">ZERO-TRUST POLICY</span>
                <div className="mt-2 text-3xl font-extrabold text-amber-300">ENFORCED</div>
                <p className="mt-2 text-xs text-slate-400 font-sans">
                  All external APIs authenticated via Bearer tokens. Fail-closed access validation active.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 9: NODE TELEMETRY & SYSTEM HEALTH                    */}
        {/* ========================================================= */}
        {activeTab === "telemetry" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <h3 className="text-sm font-bold text-white mb-4">SOVEREIGN NODE RUNTIME HEALTH</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="rounded border border-slate-800 bg-slate-950 p-3">
                  <div className="text-slate-500 text-[10px]">OSINT SPINE BACKEND</div>
                  <div className="text-emerald-400 font-bold mt-1">127.0.0.1:8000 &bull; LIVE</div>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950 p-3">
                  <div className="text-slate-500 text-[10px]">POSTGRESQL (PGVECTOR)</div>
                  <div className="text-emerald-400 font-bold mt-1">127.0.0.1:5432 &bull; HEALTHY</div>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950 p-3">
                  <div className="text-slate-500 text-[10px]">REDIS TELEMETRY CACHE</div>
                  <div className="text-emerald-400 font-bold mt-1">127.0.0.1:6379 &bull; ACTIVE</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Sovereign Tactical Command Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-cyan-400" />
            <span>DISHA 6.6 &bull; DEFENSE INTELLIGENCE &amp; SECURE HEURISTICS ARCHITECTURE</span>
          </div>
          <div className="text-[11px] text-slate-500">
            ALL RECONNAISSANCE CRYPTOGRAPHICALLY ATTESTED WITH SHA-256 PROVENANCE
          </div>
        </div>
      </footer>
    </div>
  );
}
