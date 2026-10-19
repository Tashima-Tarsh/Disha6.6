"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AtSign, Building, Camera, Car, Coins, Database, Fingerprint, Globe, Hash, Mail, MapPin, Network, Phone, Search, Send, UserRound, ArrowUpRight, FileText, FolderOpen, Loader2, X } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { InvestigationEvidencePanel } from "@/components/osint/InvestigationEvidencePanel";
import { DishaCommandShell } from "@/components/shell/DishaCommandShell";
import { InvestigationSession } from "@/lib/investigation/session";
import { classifyIntelligenceTarget } from "@/lib/investigation/target-classifier";
import { safeSourceUrl, type Investigation, type InvestigationMode, type Jurisdiction, type SearchUniverse, type SourcePolicy, type TargetType, type TimeRange } from "@/lib/investigation/types";
import styles from "./investigate.module.css";
type SearchChannel = {
  id: string;
  label: string;
  eyebrow: string;
  title: string;
  placeholder: string;
  help: string;
  universe: SearchUniverse;
  targetType: TargetType | "auto";
  icon: typeof Search;
  kind: "text" | "file";
  inputMode?: "text" | "email" | "tel";
  selectedToolIds?: string[];
  identityAuthorization?: boolean;
  activeAuthorization?: boolean;
};

type ToolRecord = {
  toolId: string;
  name: string;
  status: string;
  healthStatus: string;
  runtimeState?: string;
  selectable?: boolean;
  category: string;
};

const CHANNELS: SearchChannel[] = [
  {
    id: "universal",
    label: "Universal OSINT",
    eyebrow: "Multi-Source Intelligence",
    title: "Universal Target Investigation",
    placeholder: "Enter domain, IP, handle, email, phone, name, hash, CVE, or company...",
    help: "Intelligently classifies target and orchestrates multi-source OSINT adapters across all intelligence domains.",
    universe: "universal",
    targetType: "auto",
    icon: Search,
    kind: "text",
    identityAuthorization: true,
  },
  {
    id: "breach",
    label: "Leak Database",
    eyebrow: "Sovereign Breach Repositories",
    title: "Search Sovereign Leak & Breach Databases",
    placeholder: "Company name, entity, email, or domain (e.g. Yahoo, Sony, Adobe, Starbucks)...",
    help: "Directly audits 175+ historical data breach archives, Sony Pictures hack logs, WikiLeaks SpyFiles, and leaked credential datasets.",
    universe: "universal",
    targetType: "topic",
    icon: Database,
    kind: "text",
    selectedToolIds: ["leak-database", "biggest-data-breaches"],
  },
  {
    id: "name",
    label: "Person Name",
    eyebrow: "Identity & Personnel",
    title: "Search a Person Identity",
    placeholder: "Full legal name, alias, or public record",
    help: "Routes to approved person registries, GDELT news, and OpenAlex records. Requires verified lawful purpose.",
    universe: "person",
    targetType: "person_name",
    icon: UserRound,
    kind: "text",
    identityAuthorization: true,
  },
  {
    id: "username",
    label: "Username / Handle",
    eyebrow: "Account Intelligence",
    title: "Search a Username / Handle",
    placeholder: "handle or @alias across 500+ services",
    help: "Dispatches to local Sherlock and Maigret runners with passive footprinting.",
    universe: "person",
    targetType: "username",
    icon: AtSign,
    kind: "text",
    selectedToolIds: ["sherlock", "maigret"],
    identityAuthorization: true,
  },
  {
    id: "phone",
    label: "Phone Number",
    eyebrow: "Number Telemetry",
    title: "Search a Phone Number",
    placeholder: "+91 98765 43210 (E.164 format)",
    help: "Normalizes country code and checks local phone carrier metadata and HLR tools.",
    universe: "phone",
    targetType: "phone",
    icon: Phone,
    kind: "text",
    inputMode: "tel",
    selectedToolIds: ["phoneinfoga"],
    identityAuthorization: true,
  },
  {
    id: "email",
    label: "Email Address",
    eyebrow: "Account Signal",
    title: "Search an Email Address",
    placeholder: "target@domain.com",
    help: "Checks breach telemetry, email validation, and service existence without alerting target.",
    universe: "email",
    targetType: "email",
    icon: Mail,
    kind: "text",
    inputMode: "email",
    selectedToolIds: ["holehe"],
    identityAuthorization: true,
  },
  {
    id: "domain",
    label: "Domain / URL",
    eyebrow: "Infrastructure OSINT",
    title: "Investigate Domain / Web Host",
    placeholder: "subdomain.target.gov or https://...",
    help: "Gathers passive DNS, certificate transparency logs, subdomains, and WHOIS provenance.",
    universe: "domain",
    targetType: "domain",
    icon: Globe,
    kind: "text",
    selectedToolIds: ["sublist3r", "crtsh"],
  },
  {
    id: "ip",
    label: "IP / CIDR",
    eyebrow: "Network Intelligence",
    title: "Investigate IP Address / CIDR",
    placeholder: "198.51.100.1 or 203.0.113.0/24",
    help: "Performs Shodan host scanning, BGP routing analysis, and exposed port correlation.",
    universe: "universal",
    targetType: "ip",
    icon: Network,
    kind: "text",
    selectedToolIds: ["shodan"],
  },
  {
    id: "hash",
    label: "File Hash",
    eyebrow: "Malware & Artifacts",
    title: "Analyze Cryptographic Hash",
    placeholder: "SHA-256, SHA-1, or MD5 hash",
    help: "Cross-checks MalwareBazaar, VirusTotal, and ThreatFox malware catalogs.",
    universe: "universal",
    targetType: "file_hash",
    icon: Hash,
    kind: "text",
  },
  {
    id: "crypto",
    label: "Crypto Wallet",
    eyebrow: "Ledger Forensics",
    title: "Trace Cryptocurrency Address",
    placeholder: "BTC (1/3/bc1) or ETH (0x...) address",
    help: "Queries public blockchain explorers and threat ledger sanctions lists.",
    universe: "universal",
    targetType: "ioc",
    icon: Coins,
    kind: "text",
  },
  {
    id: "vehicle",
    label: "Vehicle Plate",
    eyebrow: "Transport Registry",
    title: "Search a Vehicle Identifier",
    placeholder: "DL01AB1234 or 17-char VIN",
    help: "Validates against authorized vehicle registry formats and transport services.",
    universe: "vehicle",
    targetType: "vehicle_identifier",
    icon: Car,
    kind: "text",
  },
  {
    id: "geo",
    label: "Geospatial",
    eyebrow: "Spatial Coordinates",
    title: "Search Coordinates / POI",
    placeholder: "28.6139, 77.2090 (Lat, Lon)",
    help: "Correlates district polygons and PostGIS critical infrastructure datasets.",
    universe: "location",
    targetType: "location",
    icon: MapPin,
    kind: "text",
  },
  {
    id: "social",
    label: "Social Media",
    eyebrow: "Social Intelligence",
    title: "Search Social Profile URL",
    placeholder: "instagram.com/username or t.me/channel",
    help: "Passive inspection using local Instagram and Telegram public adapters.",
    universe: "person",
    targetType: "username",
    icon: Send,
    kind: "text",
    selectedToolIds: ["instaloader", "telegram-public"],
    identityAuthorization: true,
  },
  {
    id: "company",
    label: "Corporate Entity",
    eyebrow: "Corporate Registry",
    title: "Search Corporate / Legal Entity",
    placeholder: "Company name, CIN, or registration ID",
    help: "Cross-references corporate records and MCA filing metadata.",
    universe: "company",
    targetType: "company",
    icon: Building,
    kind: "text",
  },
  {
    id: "photo",
    label: "Media File",
    eyebrow: "Forensic Media",
    title: "Investigate Image / Photo",
    placeholder: "Upload image (JPEG/PNG/WebP)",
    help: "Extracts EXIF metadata, GPS coordinates, and hash verification without cloud exposure.",
    universe: "universal",
    targetType: "image",
    icon: Camera,
    kind: "file",
  },
  {
    id: "biometric",
    label: "Biometric",
    eyebrow: "Consent Required",
    title: "Run Biometric Comparison",
    placeholder: "Upload reference image with consent",
    help: "Restricted strictly to consent-based evidence matching under defense audit.",
    universe: "universal",
    targetType: "image",
    icon: Fingerprint,
    kind: "file",
    identityAuthorization: true,
  },
];

const RESULT_TABS = ["Summary", "Evidence", "Sources", "Timeline", "Graph", "Raw"] as const;
const INVESTIGATION_MODE: InvestigationMode = "standard";
const SOURCE_POLICY: SourcePolicy = "all_approved";
const JURISDICTION: Jurisdiction = "india";
const TIME_RANGE: TimeRange = "30d";

export function InvestigationClient({ email }: { email: string }) {
  return (
    <Suspense fallback={<div className={styles.commandShell}>Opening your workspace…</div>}>
      <InvestigationInner email={email} />
    </Suspense>
  );
}

function InvestigationInner({ email }: { email: string }) {
  const searchParams = useSearchParams();
  const incomingQ = searchParams?.get("q") ?? searchParams?.get("query");
  const incomingChannel = searchParams?.get("channel") ?? searchParams?.get("type");

  const [active, setActive] = useState<Investigation | null>(null);
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState(incomingQ ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);

  const [selectedChannelId, setSelectedChannelId] = useState(() => {
    if (incomingChannel) {
      const match = CHANNELS.find((c) => c.id === incomingChannel || c.targetType === incomingChannel);
      if (match) return match.id;
    }
    return CHANNELS[0].id;
  });

  // Sync selected channel when URL search params change (e.g. clicking sidebar)
  useEffect(() => {
    const ch = searchParams?.get("channel") ?? searchParams?.get("type");
    if (ch) {
      const match = CHANNELS.find((c) => c.id === ch || c.targetType === ch);
      if (match) setSelectedChannelId(match.id);
    }
  }, [searchParams]);
  const [legalConsentChecked, setLegalConsentChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof RESULT_TABS)[number]>("Summary");
  const [tools, setTools] = useState<ToolRecord[]>([]);
  const [toolsError, setToolsError] = useState("");
  const session = useRef<InvestigationSession | null>(null);

  useEffect(() => { if (incomingQ !== null) setQuery(incomingQ); }, [incomingQ]);

  const channel = useMemo(
    () => CHANNELS.find((item) => item.id === selectedChannelId) ?? CHANNELS[0],
    [selectedChannelId],
  );
  const selectedTools = useMemo(() => channel.selectedToolIds ?? [], [channel.selectedToolIds]);
  const detected = useMemo(() => classifyIntelligenceTarget(query), [query]);

  useEffect(() => {
    const current = new InvestigationSession(
      (value) => {
        setActive(value);
        if (!value) {
          setSelectedEvidence(null);
          setActiveTab("Summary");
          setBusy(false);
        } else if (value.status === "COMPLETED" || value.status === "CLOSING") {
          setBusy(false);
        }
      },
      (msg) => {
        setError(msg);
        setBusy(false);
      },
    );
    session.current = current;
    const leave = () => current.dispose();
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("pagehide", leave);
      current.dispose();
    };
  }, []);

  useEffect(() => {
    if (active?.status === "COMPLETED" || active?.status === "CLOSING") {
      setBusy(false);
    }
  }, [active?.status]);

  // Auto-switch to Evidence tab when first results arrive so user sees populated cards without clicking
  useEffect(() => {
    if (active && active.evidence.length > 0 && activeTab === "Summary") {
      setActiveTab("Evidence");
    }
  }, [active?.evidence.length]);

  useEffect(() => {
    const controller = new AbortController();
    const universeParam = channel.universe !== "universal" ? `&universe=${channel.universe}` : "";
    void fetch(`/api/v1/osint/tools?runnable=true${universeParam}&limit=40`, {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Tool registry unavailable");
        return response.json() as Promise<{ tools?: ToolRecord[] }>;
      })
      .then((payload) => {
        setToolsError("");
        setTools(Array.isArray(payload.tools) ? payload.tools : []);
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setToolsError(failure instanceof Error ? failure.message : "Tool registry unavailable");
      });
    return () => controller.abort();
  }, [channel.universe]);

  const start = useCallback(async () => {
    if (busy || closing || active) return;
    if (channel.identityAuthorization && !legalConsentChecked) {
      setError("Legal Purpose Verification: You must certify lawful authorization before executing identity queries.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      if (channel.kind === "file") {
        if (!file) throw new Error("Upload an authorized image before starting this search.");
        await session.current?.start(file);
      } else {
        let target = query.trim();
        if (!target) return;
        if (channel.id === "phone") {
          const rawClean = target.replace(/[\s().-]/g, "");
          if (!rawClean.startsWith("+")) {
            if (rawClean.length === 10) target = `+91${rawClean}`;
            else if (rawClean.startsWith("0") && rawClean.length === 11) target = `+91${rawClean.slice(1)}`;
            else if (rawClean.startsWith("00")) target = `+${rawClean.slice(2)}`;
            else target = `+${rawClean}`;
          }
        }
        const effectiveTargetType = channel.id === "universal" ? "auto" : channel.targetType;
        const effectiveUniverse = channel.id === "universal" ? "universal" : channel.universe;
        await session.current?.start({
          target,
          targetType: effectiveTargetType,
          searchUniverse: effectiveUniverse,
          investigationMode: INVESTIGATION_MODE,
          sourcePolicy: SOURCE_POLICY,
          jurisdiction: JURISDICTION,
          timeRange: TIME_RANGE,
          selectedToolIds: selectedTools,
          identityAuthorization: Boolean(channel.identityAuthorization),
          activeAuthorization: Boolean(channel.activeAuthorization),
        });
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Investigation failed.");
    } finally {
      setBusy(false);
    }
  }, [active, busy, channel, closing, file, legalConsentChecked, query, selectedTools]);

  const close = useCallback(async () => {
    setClosing(true);
    setError("");
    try {
      await session.current?.close();
      setQuery("");
      setFile(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Cleanup could not be confirmed.");
    } finally {
      setClosing(false);
    }
  }, []);

  useEffect(() => {
    const runWithKeyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        void start();
      }
    };
    window.addEventListener("keydown", runWithKeyboard);
    return () => window.removeEventListener("keydown", runWithKeyboard);
  }, [start]);

  const evidence = active?.evidence.find((item) => item.evidenceId === selectedEvidence);
  const completedSources = active?.runs.filter((run) => run.status === "COMPLETED").length ?? 0;
  const sourceCount = active?.runs.length ?? tools.length;
  const resultCount = active?.evidence.length ?? 0;
  const findingCount = active?.rankedFindings.length ?? 0;
  const ready = channel.kind === "file" ? Boolean(file) : Boolean(query.trim());

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void start();
  }

  function chooseChannel(id: string) {
    if (active) return;
    setSelectedChannelId(id);
    setQuery("");
    setFile(null);
    setError("");
  }

  return (
    <DishaCommandShell principal={{ email }} activeTarget={active?.normalizedTarget} evidenceCount={resultCount}>
      <div className={styles.commandShell}>
        <header className={styles.heroCopy}>
          <p className={styles.eyebrow}>THE RESEARCH DESK</p>
          <div className={styles.heroTitle}><h1>Follow the evidence.</h1><Link href="/investigate/osint-runtime">Tool runtime<ArrowUpRight size={14} /></Link></div>
          <p>Start with a question. Search public sources, compare the records, and keep the source in view.</p>
        </header>
        <section className={styles.searchCard} aria-label="Investigation search">
          <div className={styles.searchHeading}><Search size={17} /><h2>What are you looking into?</h2><span>01 / SEARCH</span></div>
          <div className={styles.channelGrid} aria-label="Search category">{CHANNELS.map(item => <button key={item.id} type="button" disabled={Boolean(active) || busy} aria-pressed={channel.id === item.id} className={channel.id === item.id ? styles.channelActive : styles.channelButton} onClick={() => chooseChannel(item.id)}><item.icon size={14} /><span>{item.label}</span></button>)}</div>
          <form onSubmit={submit} className={styles.searchForm}>
            <label className={styles.inputLabel} htmlFor="investigation-query">{channel.label}</label>
            {channel.kind === "file" ? <input id="investigation-query" className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(active) || busy} onChange={event => setFile(event.target.files?.[0] ?? null)} /> : <div className={styles.inputRow}><Search size={18} /><input id="investigation-query" value={query} onChange={event => setQuery(event.target.value)} disabled={Boolean(active) || busy} inputMode={channel.inputMode ?? "text"} placeholder={channel.id === "universal" ? "A domain, name, handle, identifier or place" : channel.placeholder} autoComplete="off" /><button type="submit" disabled={!ready || busy || Boolean(active) || (Boolean(channel.identityAuthorization) && !legalConsentChecked)}>{busy ? <Loader2 size={16} className={styles.spin} /> : <ArrowUpRight size={17} />}<span>{busy ? "Searching…" : "Investigate"}</span></button></div>}
            <div className={styles.formMeta}><span>{query.trim() && channel.kind === "text" ? `Detected: ${detected.label}` : "Only configured, approved sources can return records."}</span><span>Ctrl + Enter to search</span></div>
            {channel.identityAuthorization && <label className={styles.authConsentStrip}><input type="checkbox" checked={legalConsentChecked} disabled={Boolean(active) || busy} onChange={event => setLegalConsentChecked(event.target.checked)} /><span>I confirm a lawful purpose and authorization for this identity search.</span></label>}
            {channel.kind === "file" && <button className={styles.primaryAction} type="submit" disabled={!ready || busy || Boolean(active) || (Boolean(channel.identityAuthorization) && !legalConsentChecked)}>{busy ? "Searching…" : "Examine image"}<ArrowUpRight size={16} /></button>}
          </form>
          {error && <p className={styles.error} role="alert">{error}</p>}
        </section>
        {!active ? <>
          <div className={styles.sectionLabel}><h2>Keep your research connected</h2><span>YOUR WORKSPACE</span></div>
          <div className={styles.workspaceCards}><Link href="/vault"><span className={styles.cardIcon}><FolderOpen size={21} /></span><h3>Evidence vault</h3><p>Return to stored records and examine their provenance.</p><span className={styles.readLink}>Open vault<ArrowUpRight size={14} /></span></Link><Link href="/workbench"><span className={styles.cardIcon}><FileText size={21} /></span><h3>Research workbench</h3><p>Bring a question, its sources and your review into one place.</p><span className={styles.readLink}>Open workbench<ArrowUpRight size={14} /></span></Link><Link href="/investigate/osint-runtime"><span className={styles.cardIcon}><Network size={21} /></span><h3>Know what can run</h3><p>Check tool configuration and execution evidence before relying on it.</p><span className={styles.readLink}>Review tools<ArrowUpRight size={14} /></span></Link></div>
          <div className={styles.sourceNote}><span>SOURCE AVAILABILITY</span><p>{toolsError || `${tools.length} tool entries returned for this category. Availability depends on configuration and current runtime evidence.`}</p><Link href="/investigate/osint-runtime">Inspect runtime evidence<ArrowUpRight size={13} /></Link></div>
        </> : <section className={styles.results} aria-label="Investigation results">
          <div className={styles.resultHeading}><div><p className={styles.eyebrow}>CURRENT INVESTIGATION · {humanStatus(active.status)}</p><h2>{active.normalizedTarget}</h2></div><button onClick={() => void close()} disabled={closing}><X size={14} />{closing ? "Closing…" : "Close and clear"}</button></div>
          <div className={styles.metrics}><span><strong>{resultCount}</strong> records</span><span><strong>{completedSources}/{active.runs.length}</strong> sources completed</span><span><strong>{findingCount}</strong> findings</span></div>
          {!!active.warnings?.length && <div className={styles.warning} role="status">{active.warnings.map((warning, i) => <p key={i}>{warning}</p>)}</div>}
          <nav className={styles.resultTabs} aria-label="Result views">{RESULT_TABS.map(tab => <button key={tab} onClick={() => setActiveTab(tab)} aria-pressed={activeTab === tab} className={activeTab === tab ? styles.tabActive : ""}>{tab}</button>)}</nav>
          <ResultView active={active} tab={activeTab} onSelect={setSelectedEvidence} />
        </section>}
        <footer className={styles.researchFooter}><span>DISHA 6.6 / EVIDENCE FIRST</span><p>A source record is an observation. A shared name does not establish identity.</p></footer>
        {evidence && <InvestigationEvidencePanel evidence={evidence} status={active?.runs.find(run => run.adapterId === evidence.adapterId)?.status ?? "Unknown"} onClose={() => setSelectedEvidence(null)} />}
      </div>
    </DishaCommandShell>
  );
}

function ResultView({ active, tab, onSelect }: { active: Investigation; tab: string; onSelect: (id: string) => void }) {
  if (tab === "Raw") return <pre className={styles.rawView}>{JSON.stringify(active, null, 2)}</pre>;
  if (tab === "Sources") return <div className={styles.recordGrid}>{active.runs.length ? active.runs.map(run => <article key={run.adapterId} className={styles.record}><span>{humanStatus(run.status)}</span><h3>{run.sourceName}</h3><p>{run.error ?? `${run.evidenceCount} records returned`}</p>{run.warnings.map((warning, index) => <p key={index}>{warning}</p>)}</article>) : <EmptyState />}</div>;
  if (tab === "Graph") return <div className={styles.recordGrid}>{active.edges.length ? active.edges.map(edge => <button key={edge.id} className={styles.record} onClick={() => onSelect(edge.evidenceId)}><span>{humanStatus(edge.type)}</span><h3>{edge.sourceId}</h3><p>→ {edge.targetId}</p><small>Inspect supporting evidence</small></button>) : <EmptyState />}</div>;
  if (tab === "Timeline") return <div className={styles.recordGrid}>{active.timeline.length ? active.timeline.map(item => <button key={item.id} className={styles.record} onClick={() => onSelect(item.evidenceId)}><span>{item.timestamp}</span><h3>{item.title}</h3><p>{item.summary}</p><small>{item.sourceName}</small></button>) : <EmptyState />}</div>;
  if (tab === "Summary") return <div className={styles.recordGrid}>{active.rankedFindings.length ? active.rankedFindings.map(item => <article key={item.id} className={styles.record}><span>{humanStatus(item.matchState)}</span><h3>{item.title}</h3><p>{item.summary}</p><small>{item.contributingSources.join(" · ")}</small>{item.evidenceIds.map(id => <button className={styles.evidenceButton} key={id} onClick={() => onSelect(id)}>Inspect evidence {id.slice(0, 8)}<ArrowUpRight size={12} /></button>)}</article>) : <EmptyState />}</div>;
  return <div className={styles.recordGrid}>{active.evidence.length ? active.evidence.map(item => {
    const url = safeSourceUrl(item.sourceUrl);
    return <article key={item.evidenceId} className={styles.record}><span>{item.sourceName} · {humanStatus(item.corroborationState)}</span><h3>{item.summary}</h3><p>Observed: {item.observedAt ?? "Timestamp not supplied"}</p><small>Retrieved: {item.retrievedAt}</small><code>SHA-256: {item.contentHash}</code><button className={styles.evidenceButton} onClick={() => onSelect(item.evidenceId)}>Inspect provenance<ArrowUpRight size={13} /></button>{url && <a href={url} target="_blank" rel="noopener noreferrer">Open source record<ArrowUpRight size={13} /></a>}</article>;
  }) : <EmptyState />}</div>;
}

function EmptyState() { return <p className={styles.empty}>No records in this view yet. Check Sources for execution status.</p>; }
function humanStatus(value: string) { return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, character => character.toUpperCase()); }
export default InvestigationClient;
