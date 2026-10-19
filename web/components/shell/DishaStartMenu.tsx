"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { LayoutGrid, MessageSquare, LogOut } from "lucide-react";
import { DESKTOP_APPS } from "./desktop-apps";
import {
  Search,
  X,
  Plane,
  Camera,
  Globe,
  User,
  ShieldAlert,
  Car,
  FileCode,
  FolderGit2,
  Clock,
  Radio,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Layers,
  Terminal,
  Cpu,
  Fingerprint,
  Database,
} from "lucide-react";
import type { ToolDef } from "./DishaToolLookupModal";
import styles from "./disha-start-menu.module.css";

export const ALL_72_TOOLS: ToolDef[] = [
  // 1. Movement & Aviation (5)
  {
    id: "opensky",
    name: "OpenSky Flight Radar",
    category: "Movement & Radar",
    iconName: "Plane",
    description: "Real-time ADS-B transponder tracking pulling live aircraft positions, altitudes, and callsigns globally.",
    placeholder: "Enter flight callsign or ICAO24 (e.g. DLH400, a835af)...",
    sampleTargets: ["DLH400", "AIC101", "UAE202", "400a0c"],
    upstreamUrl: "https://opensky-network.org",
  },
  {
    id: "adsb-exchange",
    name: "ADS-B Exchange",
    category: "Movement & Radar",
    iconName: "Plane",
    description: "Unfiltered military and commercial aviation tracking with unfiltered transponder data.",
    placeholder: "Enter military or tactical callsign (e.g. RRR7201)...",
    sampleTargets: ["RRR7201", "REACH101", "FORTE12"],
    upstreamUrl: "https://www.adsbexchange.com",
  },
  {
    id: "marinetraffic",
    name: "MarineTraffic AIS",
    category: "Movement & Radar",
    iconName: "Radio",
    description: "Global maritime vessel tracking using Automated Identification System (AIS) coastal and satellite receivers.",
    placeholder: "Enter vessel name, IMO number, or MMSI (e.g. 9811000)...",
    sampleTargets: ["9811000", "EVER GIVEN", "413905000"],
    upstreamUrl: "https://www.marinetraffic.com",
  },
  {
    id: "global-fishing-watch",
    name: "Global Fishing Watch",
    category: "Movement & Radar",
    iconName: "Radio",
    description: "Commercial fishing vessel tracking, transshipment events, and Exclusive Economic Zone (EEZ) monitoring.",
    placeholder: "Enter vessel name or maritime MMSI...",
    sampleTargets: ["412440000", "224068000"],
    upstreamUrl: "https://globalfishingwatch.org",
  },
  {
    id: "flightradar24",
    name: "Flightradar24",
    category: "Movement & Radar",
    iconName: "Plane",
    description: "Global commercial aviation tracking network with squawk code, altitude profiles, and route histories.",
    placeholder: "Enter commercial flight number (e.g. AI102, BA178)...",
    sampleTargets: ["AI102", "BA178", "LH400"],
    upstreamUrl: "https://www.flightradar24.com",
  },

  // 2. Surveillance & Optics (4)
  {
    id: "project-eyes-on",
    name: "Project Eyes On CCTV",
    category: "Surveillance & Optics",
    iconName: "Camera",
    description: "Automated scanner for public IP surveillance cameras, RTSP streams, and municipal traffic feeds.",
    placeholder: "Enter target city, country, or IP range (e.g. Delhi, IN)...",
    sampleTargets: ["Delhi", "Mumbai", "London", "Tokyo"],
    upstreamUrl: "https://github.com/Y0oshi/Project-Eyes-On",
  },
  {
    id: "sentinel-hub",
    name: "Sentinel Hub EO Browser",
    category: "Surveillance & Optics",
    iconName: "Camera",
    description: "High-resolution multi-spectral satellite imagery from Copernicus Sentinel-2, Landsat, and MODIS constellations.",
    placeholder: "Enter latitude, longitude or region name...",
    sampleTargets: ["28.6139, 77.2090", "34.0837, 74.7973"],
    upstreamUrl: "https://apps.sentinel-hub.com/eo-browser/",
  },
  {
    id: "google-earth-pro",
    name: "Google Earth 3D",
    category: "Surveillance & Optics",
    iconName: "Globe",
    description: "Historical satellite imagery, 3D photogrammetry terrain, elevation profiles, and KML defense mapping.",
    placeholder: "Enter location coordinates or landmark name...",
    sampleTargets: ["Siachen Glacier", "Pangong Tso", "Strait of Hormuz"],
    upstreamUrl: "https://earth.google.com",
  },
  {
    id: "shodan-cctv",
    name: "Shodan Optical Streams",
    category: "Surveillance & Optics",
    iconName: "Camera",
    description: "Search open RTSP, MJPEG, and WebRTC streaming video sensors across global infrastructure.",
    placeholder: "Enter camera query or country code (e.g. port:554 country:IN)...",
    sampleTargets: ["port:554 country:IN", "has_screenshot:true webcam"],
    upstreamUrl: "https://www.shodan.io",
  },

  // 3. Network & Infrastructure (7)
  {
    id: "google-dns",
    name: "Google DNS over HTTPS",
    category: "Network & Infra",
    iconName: "Globe",
    description: "Cryptographically verified DNS records (A, AAAA, MX, TXT, SOA, NS) with zero local ISP tampering.",
    placeholder: "Enter domain name (e.g. nic.in, isro.gov.in)...",
    sampleTargets: ["nic.in", "isro.gov.in", "cert-in.org.in", "google.com"],
  },
  {
    id: "rdap-whois",
    name: "RDAP / Sovereign Whois",
    category: "Network & Infra",
    iconName: "Globe",
    description: "Authoritative registry records, registrar details, abuse contacts, and registration expiry dates.",
    placeholder: "Enter domain or IP (e.g. gov.in, 164.100.0.1)...",
    sampleTargets: ["digitalindia.gov.in", "164.100.0.1"],
  },
  {
    id: "ripestat",
    name: "RIPEstat IP Routing",
    category: "Network & Infra",
    iconName: "Globe",
    description: "Regional Internet Registry IP prefix lookups, autonomous system announcements, and BGP routing status.",
    placeholder: "Enter IP address or ASN (e.g. 8.8.8.8, AS15169)...",
    sampleTargets: ["8.8.8.8", "1.1.1.1", "AS15169", "AS55836"],
  },
  {
    id: "crt-sh",
    name: "Certificate Transparency",
    category: "Network & Infra",
    iconName: "Globe",
    description: "Query immutable Certificate Transparency logs (crt.sh) to discover hidden subdomains and historical SSL/TLS certificates.",
    placeholder: "Enter root domain (e.g. tata.com, mil.in)...",
    sampleTargets: ["tata.com", "gov.in", "drdo.gov.in"],
  },
  {
    id: "shodan-recon",
    name: "Shodan Port Scanner",
    category: "Network & Infra",
    iconName: "Globe",
    description: "Audit exposed listening ports, banner strings, vulnerable software versions, and SSL certificates.",
    placeholder: "Enter IP address or CIDR block...",
    sampleTargets: ["1.1.1.1", "8.8.4.4"],
  },
  {
    id: "censys-scanner",
    name: "Censys Attack Surface",
    category: "Network & Infra",
    iconName: "Globe",
    description: "Scan Internet-wide host fingerprints, TLS certificate relationships, and virtual host associations.",
    placeholder: "Enter domain or IPv4 address...",
    sampleTargets: ["github.com", "cloudflare.com"],
  },
  {
    id: "sublist3r",
    name: "Sublist3r Subdomains",
    category: "Network & Infra",
    iconName: "Globe",
    description: "Fast multi-engine subdomain enumeration using search engines and public SSL CT log caches.",
    placeholder: "Enter target domain...",
    sampleTargets: ["aiims.edu", "iitd.ac.in"],
  },

  // 4. Identity & People Recon (5)
  {
    id: "sherlock",
    name: "Sherlock Social Hunt",
    category: "Identity & Social",
    iconName: "User",
    description: "Check username existence across 300+ major social networks, developer hubs, and gaming portals.",
    placeholder: "Enter username / handle (e.g. nitishkumar)...",
    sampleTargets: ["torvalds", "thenitishkr", "sundarpichai"],
  },
  {
    id: "phoneinfoga",
    name: "PhoneInfoga Telecom",
    category: "Identity & Social",
    iconName: "User",
    description: "Analyze international phone numbers for country code, carrier name, line type (mobile/VoIP), and reputation.",
    placeholder: "Enter international phone number with + country code...",
    sampleTargets: ["+919876543210", "+12024561111"],
  },
  {
    id: "holehe",
    name: "Holehe Email Checker",
    category: "Identity & Social",
    iconName: "User",
    description: "Check if an email address is registered on 120+ platforms without sending notification emails.",
    placeholder: "Enter email address (e.g. target@domain.com)...",
    sampleTargets: ["analyst@disha.gov.in", "test@gmail.com"],
  },
  {
    id: "blackbird",
    name: "Blackbird OSINT",
    category: "Identity & Social",
    iconName: "User",
    description: "Fast account search across 574 websites simultaneously using custom asynchronous HTTP pipelines.",
    placeholder: "Enter username to scan...",
    sampleTargets: ["securityexpert", "hacker1"],
  },
  {
    id: "maigret",
    name: "Maigret Dossier Builder",
    category: "Identity & Social",
    iconName: "User",
    description: "Collects comprehensive dossiers, cross-references avatars, bios, and connected accounts from social graphs.",
    placeholder: "Enter username or nickname...",
    sampleTargets: ["satyanadella", "elonmusk"],
  },

  // 4B. Sovereign Breach & Leak Databases (4)
  {
    id: "leak-database",
    name: "Breach & Leak Directory",
    category: "Identity & Leaks",
    iconName: "Database",
    description: "Search 175+ historical corporate, government, and consumer data breaches, leak methods, and exposed records.",
    placeholder: "Enter target company, domain, or agency (e.g. Sony, Yahoo, Military, Police)...",
    sampleTargets: ["Sony", "Yahoo", "Starbucks", "Military", "South Africa police"],
  },
  {
    id: "biggest-data-breaches",
    name: "Biggest Data Breaches Archive",
    category: "Identity & Leaks",
    iconName: "ShieldAlert",
    description: "Curated dataset master indexing massive global compromise incidents, records count, and data sensitivity.",
    placeholder: "Search breach index by entity or leak vector (e.g. Hacked, Inside Job)...",
    sampleTargets: ["Hacked", "Morgan Stanley", "New York Taxis", "Adobe", "Yahoo"],
  },
  {
    id: "hibp-breach-audit",
    name: "HaveIBeenPwned & Leak Check",
    category: "Identity & Leaks",
    iconName: "Fingerprint",
    description: "Cross-reference target email, username, or company against known credential dumps and public breach telemetry.",
    placeholder: "Enter email or username to audit exposure...",
    sampleTargets: ["analyst@disha.gov.in", "target@domain.com", "admin"],
  },
  {
    id: "wikileaks-spyfiles",
    name: "WikiLeaks SpyFiles Directory",
    category: "Identity & Leaks",
    iconName: "FileCode",
    description: "Surveillance technology vendors, contractors, and mass interception apparatus archives from WikiLeaks.",
    placeholder: "Enter surveillance vendor or country...",
    sampleTargets: ["FinFisher", "Hacking Team", "Gamma Group"],
  },

  // 5. Conflict & Geopolitical Defense (3)
  {
    id: "liveuamap",
    name: "Liveuamap War Frontlines",
    category: "Conflict & Defense",
    iconName: "ShieldAlert",
    description: "Geolocated conflict intelligence, frontline territory changes, air raid alerts, and combat reports.",
    placeholder: "Enter region (e.g. Ukraine, Middle East, Caucasus)...",
    sampleTargets: ["Ukraine", "Middle East", "Red Sea"],
    upstreamUrl: "https://liveuamap.com",
  },
  {
    id: "acled",
    name: "ACLED Conflict Data",
    category: "Conflict & Defense",
    iconName: "ShieldAlert",
    description: "Armed Conflict Location & Event Data Project collecting verified battle, riot, and protest events globally.",
    placeholder: "Enter country or theatre name...",
    sampleTargets: ["India", "Myanmar", "Sudan"],
    upstreamUrl: "https://acleddata.com",
  },
  {
    id: "polyglobe",
    name: "Polyglobe Multi-Theater",
    category: "Conflict & Defense",
    iconName: "ShieldAlert",
    description: "Tri-service strategic threat aggregation across maritime chokepoints, airspace, and border flashpoints.",
    placeholder: "Enter theater of interest...",
    sampleTargets: ["Indo-Pacific", "Malacca Strait", "Hormuz"],
  },

  // 6. National Registries & Legal (4)
  {
    id: "parivahan",
    name: "Parivahan Vehicle RTO",
    category: "National Registries",
    iconName: "Car",
    description: "Instant Indian vehicle registration lookup, RTO jurisdiction, vehicle class, fitness, PUC, and tax compliance.",
    placeholder: "Enter Indian registration plate (e.g. DL01AB1234, 22BH1234AA)...",
    sampleTargets: ["DL01AB1234", "MH12DE1433", "22BH1234AA"],
  },
  {
    id: "section-63-bsa",
    name: "Section 63 BSA Certifier",
    category: "National Registries",
    iconName: "ShieldAlert",
    description: "Generates tamper-proof SHA-256 cryptographic evidence certificates compliant with Bharatiya Sakshya Adhiniyam 2023.",
    placeholder: "Enter Evidence Record ID or SHA-256 Hash...",
    sampleTargets: ["EVID-2026-CONF-001", "7c4a8d09bc12e"],
  },
  {
    id: "cisa-kev",
    name: "CISA KEV Catalog",
    category: "National Registries",
    iconName: "ShieldAlert",
    description: "Official United States Cybersecurity & Infrastructure Security Agency catalog of actively exploited vulnerabilities.",
    placeholder: "Enter CVE identifier (e.g. CVE-2024-3094, CVE-2023-38606)...",
    sampleTargets: ["CVE-2024-3094", "CVE-2023-38606", "CVE-2021-44228"],
  },
  {
    id: "nvd-cve",
    name: "NVD NIST Vulnerability",
    category: "National Registries",
    iconName: "ShieldAlert",
    description: "National Institute of Standards & Technology CVSS v3.1 severity scores, attack vector vectors, and remediation advisories.",
    placeholder: "Enter CVE ID or software package...",
    sampleTargets: ["CVE-2024-21626", "openssh", "nginx"],
  },

  // 7. Investigation Frameworks (8)
  {
    id: "spiderfoot",
    name: "SpiderFoot Recon Suite",
    category: "Frameworks",
    iconName: "Terminal",
    description: "Automated open-source intelligence gathering engine scanning 100+ public sources simultaneously.",
    placeholder: "Enter target domain, IP, or organization...",
    sampleTargets: ["example.com", "1.1.1.1"],
  },
  {
    id: "recon-ng",
    name: "Recon-ng Modular OSINT",
    category: "Frameworks",
    iconName: "Terminal",
    description: "Full-featured Web Reconnaissance framework with independent modules, database interaction, and reporting.",
    placeholder: "Enter target domain or company...",
    sampleTargets: ["target-org.com"],
  },
  {
    id: "sn1per",
    name: "Sn1per Attack Surface",
    category: "Frameworks",
    iconName: "Terminal",
    description: "Automated penetration testing platform for offensive reconnaissance and continuous attack surface management.",
    placeholder: "Enter target IP or range...",
    sampleTargets: ["192.168.1.1"],
  },
  {
    id: "maltego",
    name: "Maltego Transform Bridge",
    category: "Frameworks",
    iconName: "Terminal",
    description: "Link analysis transform engine mapping real-world connections between people, infrastructure, and organizations.",
    placeholder: "Enter entity name or domain...",
    sampleTargets: ["Global Logistics Ltd"],
  },
  {
    id: "photon",
    name: "Photon High-Speed Crawler",
    category: "Frameworks",
    iconName: "Terminal",
    description: "Incredibly fast web crawler extracting URLs with parameters, JS files, secret keys, and email addresses.",
    placeholder: "Enter target web URL...",
    sampleTargets: ["https://example.com"],
  },
  {
    id: "theharvester",
    name: "theHarvester Gathering",
    category: "Frameworks",
    iconName: "Terminal",
    description: "Gather emails, subdomains, hosts, employee names, open ports, and banners from diverse public sources.",
    placeholder: "Enter target domain name...",
    sampleTargets: ["isro.gov.in"],
  },
  {
    id: "osintgram",
    name: "Osintgram Analytics",
    category: "Frameworks",
    iconName: "Terminal",
    description: "Gathers photos, captions, tagged users, followers, and engagement metrics from public profiles.",
    placeholder: "Enter target handle...",
    sampleTargets: ["target_profile"],
  },
  {
    id: "finalrecon",
    name: "FinalRecon Web Recon",
    category: "Frameworks",
    iconName: "Terminal",
    description: "Fast Python-based header analysis, SSL inspection, whois, DNS, traceroute, and directory scanner.",
    placeholder: "Enter target URL...",
    sampleTargets: ["https://disha.gov.in"],
  },

  // 8. Documents & EXIF Forensics (6)
  {
    id: "exiftool",
    name: "ExifTool Metadata Parser",
    category: "Documents & EXIF",
    iconName: "FileCode",
    description: "Read, write, and manipulate metadata across JPEG, PNG, PDF, TIFF, HEIC, and raw camera files.",
    placeholder: "Enter image URL or drop image file...",
    sampleTargets: ["sample_satellite.jpg", "surveillance_frame.png"],
  },
  {
    id: "foca",
    name: "FOCA Document Fingerprint",
    category: "Documents & EXIF",
    iconName: "FileCode",
    description: "Fingerprinting Organizations with Collected Archives: extracts users, folders, software, and printers from files.",
    placeholder: "Enter target domain to harvest documents...",
    sampleTargets: ["targetcorp.com"],
  },
  {
    id: "metagoofil",
    name: "Metagoofil Extractor",
    category: "Documents & EXIF",
    iconName: "FileCode",
    description: "Searches Google for public PDFs, Word docs, Excel files, and extracts metadata into structured reports.",
    placeholder: "Enter domain name to extract docs...",
    sampleTargets: ["university.edu"],
  },
  {
    id: "pdf-parser",
    name: "PDF-Parser Deep Inspect",
    category: "Documents & EXIF",
    iconName: "FileCode",
    description: "Inspects elements in PDF files, extracts embedded JavaScript, streams, and concealed attachments.",
    placeholder: "Enter PDF filename or URL...",
    sampleTargets: ["dossier_contract.pdf"],
  },
  {
    id: "docx-meta",
    name: "Office Document Metadata",
    category: "Documents & EXIF",
    iconName: "FileCode",
    description: "Parses docx/xlsx archives for original creator name, last modified date, revision numbers, and template paths.",
    placeholder: "Enter Office document URL...",
    sampleTargets: ["tender_spec.docx"],
  },
  {
    id: "exifprobe",
    name: "Exifprobe Color & Sensor",
    category: "Documents & EXIF",
    iconName: "FileCode",
    description: "Inspects camera sensor characteristics, quantization tables, and compression artifacts for forgery detection.",
    placeholder: "Enter image file path...",
    sampleTargets: ["evidence_photo.jpg"],
  },

  // 9. Code & Reverse-Engineering (6)
  {
    id: "gitleaks",
    name: "GitLeaks Secret Audit",
    category: "Code & Secrets",
    iconName: "FolderGit2",
    description: "Detects hardcoded secrets like passwords, API keys, tokens, and private keys in Git repositories and commit logs.",
    placeholder: "Enter GitHub repository URL (e.g. github.com/org/repo)...",
    sampleTargets: ["github.com/torvalds/linux", "github.com/expressjs/express"],
  },
  {
    id: "trufflehog",
    name: "TruffleHog Token Hunter",
    category: "Code & Secrets",
    iconName: "FolderGit2",
    description: "Finds leaked credentials, AWS keys, Slack tokens, and database passwords by running regexes and entropy checks.",
    placeholder: "Enter repository or file path...",
    sampleTargets: ["github.com/sample/target-app"],
  },
  {
    id: "github-forensics",
    name: "GitHub Forensic Engine",
    category: "Code & Secrets",
    iconName: "FolderGit2",
    description: "Analyzes developer commit patterns, contributor emails, commit timestamps, and timezone anomalies.",
    placeholder: "Enter GitHub user or repo name...",
    sampleTargets: ["torvalds", "antigravity"],
  },
  {
    id: "rea-engine",
    name: "REA Reverse Engineering",
    category: "Code & Secrets",
    iconName: "FolderGit2",
    description: "Reverse Engineer Anything: decompiles binaries, Electron packages, APKs, and WebAssembly into understandable architecture.",
    placeholder: "Enter target binary or artifact path...",
    sampleTargets: ["target_service.wasm", "app.asar"],
  },
  {
    id: "pentagi",
    name: "PentAGI Autonomous PenTest",
    category: "Code & Secrets",
    iconName: "FolderGit2",
    description: "Autonomous penetration testing AI agent running in containerized isolation to verify network security posture.",
    placeholder: "Enter target scope or domain...",
    sampleTargets: ["127.0.0.1:8080", "internal.lab"],
    upstreamUrl: "http://localhost:8443",
  },
  {
    id: "flowsint",
    name: "FlowSINT Graph Studio",
    category: "Code & Secrets",
    iconName: "FolderGit2",
    description: "Visual node-based canvas for chaining OSINT tools, connecting graph nodes, and building automated pipelines.",
    placeholder: "Enter mission or graph name...",
    sampleTargets: ["MISSION-ALPHA", "SUPPLY-CHAIN-2026"],
    upstreamUrl: "http://localhost:5001",
  },

  // 10. Web Archives & History (4)
  {
    id: "wayback-cdx",
    name: "Wayback Machine CDX",
    category: "Web Archives",
    iconName: "Clock",
    description: "Query billions of archived web pages, deleted subdirectories, and historical text changes since 1996.",
    placeholder: "Enter URL to view timeline of changes...",
    sampleTargets: ["bbc.com", "gov.in"],
  },
  {
    id: "common-crawl",
    name: "Common Crawl Petabyte Graph",
    category: "Web Archives",
    iconName: "Clock",
    description: "Open repository of web crawl data composed of over 250 billion web pages spanning multiple years.",
    placeholder: "Enter domain or URL prefix...",
    sampleTargets: ["wikipedia.org"],
  },
  {
    id: "archive-today",
    name: "Archive.today Snapshots",
    category: "Web Archives",
    iconName: "Clock",
    description: "Time capsule for web pages that preserves text and graphical copy of the page even if the original is removed.",
    placeholder: "Enter target webpage URL...",
    sampleTargets: ["https://news.ycombinator.com"],
  },
  {
    id: "google-cache",
    name: "Search Engine Cache",
    category: "Web Archives",
    iconName: "Clock",
    description: "Inspect the latest crawled HTML snapshot from leading search engine indexers before page modifications.",
    placeholder: "Enter target page URL...",
    sampleTargets: ["https://example.com/press-release"],
  },

  // 11. Threat Intelligence & IOCs (5)
  {
    id: "alienvault-otx",
    name: "AlienVault OTX Pulses",
    category: "Threat Intel",
    iconName: "ShieldAlert",
    description: "Open Threat Exchange: community-curated pulses connecting IP addresses, malware hashes, and CVE exploits.",
    placeholder: "Enter IP, domain, or file hash (MD5/SHA256)...",
    sampleTargets: ["44d88612fea8a8f36de82e1278abb02f", "185.220.101.5"],
  },
  {
    id: "threatconnect",
    name: "ThreatConnect Platform",
    category: "Threat Intel",
    iconName: "ShieldAlert",
    description: "Threat intelligence platform unifying indicators of compromise (IOCs) with adversary tactics and techniques.",
    placeholder: "Enter threat actor or indicator...",
    sampleTargets: ["APT28", "Lazarus"],
  },
  {
    id: "misp-hub",
    name: "MISP Malware Sharing",
    category: "Threat Intel",
    iconName: "ShieldAlert",
    description: "Malware Information Sharing Platform for sharing structured cyber security indicators and financial fraud patterns.",
    placeholder: "Enter event tag or IOC hash...",
    sampleTargets: ["ransomware", "phishing-bank"],
  },
  {
    id: "abuseipdb",
    name: "AbuseIPDB Score",
    category: "Threat Intel",
    iconName: "ShieldAlert",
    description: "Check IP address reputation, abuse confidence score, port scanning history, and user incident reports.",
    placeholder: "Enter IPv4 or IPv6 address...",
    sampleTargets: ["118.25.6.39", "185.220.101.7"],
  },
  {
    id: "virustotal",
    name: "VirusTotal Inspection",
    category: "Threat Intel",
    iconName: "ShieldAlert",
    description: "Analyzes suspicious files, domains, IPs, and URLs using 70+ antivirus engines and URL/domain blacklists.",
    placeholder: "Enter file hash, domain, or IP address...",
    sampleTargets: ["8.8.8.8", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
  },

  // 12. 15 Directory Category Pillars (All 532 Tools)
  {
    id: "cat-frameworks",
    name: "All 154 Investigation Frameworks",
    category: "532 Upstream Directory",
    iconName: "Layers",
    description: "Direct index into all 154 open-source investigation suites including SpiderFoot, Maltego, Photon, and Sn1per.",
    placeholder: "Search within 154 frameworks...",
    sampleTargets: ["spiderfoot", "recon-ng", "sn1per"],
  },
  {
    id: "cat-network",
    name: "All 108 Network OSINT Tools",
    category: "532 Upstream Directory",
    iconName: "Layers",
    description: "Direct index into all 108 network reconnaissance tools including Shodan, Masscan, Amass, Nmap, and Sublist3r.",
    placeholder: "Search within 108 network tools...",
    sampleTargets: ["shodan", "amass", "masscan"],
  },
  {
    id: "cat-identity",
    name: "All 105 Identity & People Tools",
    category: "532 Upstream Directory",
    iconName: "Layers",
    description: "Direct index into all 105 people investigation tools including Sherlock, Maigret, PhoneInfoga, Holehe, and GHunt.",
    placeholder: "Search within 105 identity tools...",
    sampleTargets: ["sherlock", "holehe", "phoneinfoga"],
  },
  {
    id: "cat-docs",
    name: "All 52 Document & Metadata Tools",
    category: "532 Upstream Directory",
    iconName: "Layers",
    description: "Direct index into all 52 document analysis tools including ExifTool, FOCA, Metagoofil, and pdf-parser.",
    placeholder: "Search within 52 document tools...",
    sampleTargets: ["exiftool", "foca", "metagoofil"],
  },
  {
    id: "cat-media",
    name: "All 44 Media & Camera Tools",
    category: "532 Upstream Directory",
    iconName: "Layers",
    description: "Direct index into all 44 multimedia forensics tools including Project Eyes On, InVID, FotoForensics, and Search4faces.",
    placeholder: "Search within 44 media tools...",
    sampleTargets: ["project-eyes-on", "invid", "fotoforensics"],
  },
  {
    id: "cat-threats",
    name: "All 28 Threat Intel Repositories",
    category: "532 Upstream Directory",
    iconName: "Layers",
    description: "Direct index into all 28 threat intelligence databases and CVE feeds.",
    placeholder: "Search within 28 threat repositories...",
    sampleTargets: ["cisa-kev", "nvd", "alienvault"],
  },
  {
    id: "cat-secrets",
    name: "All 16 Code & Secrets Scanners",
    category: "532 Upstream Directory",
    iconName: "Layers",
    description: "Direct index into all 16 secret scanning repositories including GitLeaks, TruffleHog, and Shhgit.",
    placeholder: "Search within 16 secret audit engines...",
    sampleTargets: ["gitleaks", "trufflehog"],
  },
  {
    id: "cat-movement",
    name: "All 9 Movement & Radar Tools",
    category: "532 Upstream Directory",
    iconName: "Layers",
    description: "Direct index into OpenSky, ADS-B Exchange, MarineTraffic, Flightradar24, and Global Fishing Watch.",
    placeholder: "Search within 9 movement trackers...",
    sampleTargets: ["opensky", "marinetraffic", "ads-b"],
  },
  {
    id: "cat-archives",
    name: "All 7 Web Archive Repositories",
    category: "532 Upstream Directory",
    iconName: "Layers",
    description: "Direct index into Wayback Machine, Common Crawl, Archive.today, and Google Cache engines.",
    placeholder: "Search within 7 web archives...",
    sampleTargets: ["wayback", "commoncrawl"],
  },
  {
    id: "cat-forensics",
    name: "All 9 Case & File Forensics Tools",
    category: "532 Upstream Directory",
    iconName: "Layers",
    description: "Direct index into Autopsy, Volatility, Hashdeep, and digital forensics evidence chains.",
    placeholder: "Search within 9 forensics suites...",
    sampleTargets: ["autopsy", "volatility", "hashdeep"],
  },
  {
    id: "cat-metadata",
    name: "All 6 Specialized Metadata Engines",
    category: "532 Upstream Directory",
    iconName: "Layers",
    description: "Direct index into exifprobe, mat2, and image sensor characteristic evaluators.",
    placeholder: "Search within 6 metadata engines...",
    sampleTargets: ["mat2", "exifprobe"],
  },
  {
    id: "cat-conflict",
    name: "All 3 Conflict & War Map Tools",
    category: "532 Upstream Directory",
    iconName: "Layers",
    description: "Direct index into Liveuamap, ACLED, and Polyglobe real-time war conflict monitors.",
    placeholder: "Search within 3 conflict engines...",
    sampleTargets: ["liveuamap", "acled", "polyglobe"],
  },
  {
    id: "cat-satellites",
    name: "All 2 Earth Observation Platforms",
    category: "532 Upstream Directory",
    iconName: "Layers",
    description: "Direct index into Sentinel Hub and Google Earth Pro satellite reconnaissance platforms.",
    placeholder: "Search satellite tools...",
    sampleTargets: ["sentinel-hub", "google-earth"],
  },
  {
    id: "cat-crypto",
    name: "Crypto & Blockchain Forensics",
    category: "532 Upstream Directory",
    iconName: "Layers",
    description: "Direct index into Bitcoin, Ethereum, and multi-chain wallet transaction tracing engines.",
    placeholder: "Search crypto tools...",
    sampleTargets: ["bitcoin-whales", "etherscan-api"],
  },
  {
    id: "cat-telecom",
    name: "Telecom & Sovereign HLR",
    category: "532 Upstream Directory",
    iconName: "Layers",
    description: "Direct index into Indian National Numbering Plan, SS7/SIGTRAN signaling audits, and telecom circles.",
    placeholder: "Search telecom tools...",
    sampleTargets: ["hlr-lookup", "circle-code"],
  },
];

interface DishaStartMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (tool: ToolDef) => void;
  onOpenAi?: () => void;
  principal?: { email: string };
  onSignOut?: () => void;
  onLaunchApp?: () => void;
}

function getToolIcon(iconName: string) {
  switch (iconName) {
    case "Plane": return <Plane size={18} />;
    case "Camera": return <Camera size={18} />;
    case "Globe": return <Globe size={18} />;
    case "User": return <User size={18} />;
    case "ShieldAlert": return <ShieldAlert size={18} />;
    case "Car": return <Car size={18} />;
    case "FileCode": return <FileCode size={18} />;
    case "FolderGit2": return <FolderGit2 size={18} />;
    case "Clock": return <Clock size={18} />;
    case "Radio": return <Radio size={18} />;
    case "Terminal": return <Terminal size={18} />;
    case "Cpu": return <Cpu size={18} />;
    case "Fingerprint": return <Fingerprint size={18} />;
    case "Database": return <Database size={18} />;
    case "Layers": return <Layers size={18} />;
    default: return <LayoutGrid size={18} />;
  }
}

const CATEGORIES = [
  "All",
  "Identity & Leaks",
  "Network & Infra",
  "Conflict & Defense",
  "Threat Intel",
  "Code & Secrets",
  "Documents & EXIF",
  "Movement & Radar",
  "Surveillance & Optics",
  "National Registries",
  "Web Archives",
  "532 Upstream Directory",
];

export function DishaStartMenu({ isOpen, onClose, onSelectTool, onOpenAi, principal, onSignOut, onLaunchApp }: DishaStartMenuProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const query = searchTerm.trim().toLowerCase();

  const filteredTools = useMemo(() => {
    return ALL_72_TOOLS.filter(tool => {
      const matchesCat = selectedCategory === "All" || tool.category === selectedCategory;
      const matchesQuery = !query || `${tool.name} ${tool.category} ${tool.description}`.toLowerCase().includes(query);
      return matchesCat && matchesQuery;
    });
  }, [selectedCategory, query]);

  const showBreachBanner =
    (selectedCategory === "All" || selectedCategory === "Identity & Leaks") &&
    (!query || query.includes("leak") || query.includes("breach") || query.includes("pwn") || query.includes("hack"));

  return (
    <Dialog.Root open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.menu}
          onCloseAutoFocus={event => {
            event.preventDefault();
            document.querySelector<HTMLButtonElement>('[aria-label="Start"]')?.focus();
          }}
        >
          <div className={styles.headerArea}>
            <div className={styles.heading}>
              <h2>
                <LayoutGrid size={20} style={{ color: "#00f0ff" }} />
                <span>DISHA 6.6 ARSENAL</span>
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className={styles.statusBadge}>76 SOVEREIGN TOOLS</span>
                <Dialog.Close className={styles.iconButton} aria-label="Close Start menu">
                  <X size={17} />
                </Dialog.Close>
              </div>
            </div>

            <p className={styles.subtitle}>
              Sovereign OSINT instruments, threat telemetry, and historical leak repositories.
            </p>

            <label className={styles.search}>
              <Search size={17} />
              <input
                autoFocus
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Search 76 tools, breach datasets, radar, registries..."
                aria-label="Search tools"
              />
              {query && (
                <button type="button" onClick={() => setSearchTerm("")} aria-label="Clear search">
                  <X size={15} />
                </button>
              )}
            </label>

            <div className={styles.categoryPills}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`${styles.categoryPill} ${selectedCategory === cat ? styles.categoryPillActive : ""}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.scrollArea}>
            {showBreachBanner && (
              <div className={styles.breachFeatureCard}>
                <div className={styles.breachFeatureTitle}>
                  <Database size={15} />
                  <span>Sovereign Data Breach & Leak Repositories</span>
                </div>
                <p style={{ margin: "2px 0 6px", fontSize: "11px", color: "#cbd5e1", lineHeight: 1.5 }}>
                  Cross-reference targets across 175+ historical corporate and government breaches (Sony, Yahoo, Adobe, Military).
                </p>
                <div className={styles.breachChips}>
                  {["Sony", "Yahoo", "Starbucks", "Military", "Adobe", "Morgan Stanley"].map(sample => (
                    <button
                      key={sample}
                      type="button"
                      className={styles.breachChip}
                      onClick={() => {
                        const leakTool = ALL_72_TOOLS.find(t => t.id === "leak-database") || ALL_72_TOOLS[0];
                        onSelectTool({ ...leakTool, initialTarget: sample });
                        onClose();
                      }}
                    >
                      Audit {sample}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.sectionHeading}>
              <h3>
                {selectedCategory === "All" ? "Operational Tool Suite" : selectedCategory} ({filteredTools.length})
              </h3>
              <span style={{ fontSize: "10px", color: "#64748b" }}>
                Instant Launch on Click
              </span>
            </div>

            {filteredTools.length > 0 ? (
              <div className={styles.toolsGrid}>
                {filteredTools.map(tool => (
                  <button
                    key={tool.id}
                    type="button"
                    className={styles.toolCard}
                    onClick={() => {
                      onSelectTool(tool);
                      onClose();
                    }}
                  >
                    <div className={styles.toolIconContainer}>
                      {getToolIcon(tool.iconName)}
                    </div>
                    <div className={styles.toolInfo}>
                      <div className={styles.toolNameRow}>
                        <span className={styles.toolName}>{tool.name}</span>
                        <span className={styles.toolCategoryPill}>{tool.category.split(" ")[0]}</span>
                      </div>
                      <span className={styles.toolDescription}>{tool.description}</span>
                    </div>
                    <ChevronRight size={14} style={{ color: "#64748b", flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                No instruments match &quot;{searchTerm}&quot; in category &quot;{selectedCategory}&quot;. Try a broader search.
              </div>
            )}
          </div>

          <footer className={styles.footer}>
            <span className={styles.userAvatar}>
              {principal?.email?.slice(0, 1).toUpperCase() ?? "D"}
            </span>
            <div className={styles.user}>
              <span>{principal?.email ?? "analyst@disha.gov.in"}</span>
              <small>CIPHER ACTIVE · SEC 63 BSA</small>
            </div>

            {onOpenAi && (
              <button
                type="button"
                className={styles.aiLaunchBtn}
                onClick={() => {
                  onClose();
                  onOpenAi();
                }}
              >
                <Sparkles size={14} />
                DISHA AI Copilot
              </button>
            )}

            {onSignOut && (
              <button
                type="button"
                className={styles.signOutBtn}
                onClick={onSignOut}
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            )}
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export default DishaStartMenu;
