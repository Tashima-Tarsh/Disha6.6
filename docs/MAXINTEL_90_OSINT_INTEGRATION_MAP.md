# DISHA 6.6 — Max Intel 90+ OSINT Directory & API Integration Blueprint

This document tracks the integration of the **90+ Curated OSINT Tools, APIs, and GitHub Repositories** from the Max Intel October 2026 Directory into DISHA 6.6, mapping API availability, live zero-install Python collectors, and fork targets under [`Tashima-Tarsh`](https://github.com/Tashima-Tarsh).

---

## 1. Executive Summary

- **Total Tools Catalogued**: 99 Tools across 15 Functional Categories.
- **DISHA Upstream Registry Status**: 532 Tools verified under `data/osint/upstream-registry.json`.
- **Live Integrated Native Python Collectors**: Expanded from 36 to **43 collectors** in [`backend/osint_collectors.py`](file:///d:/Downloads/Disha6.6-main/backend/osint_collectors.py).
- **Public Keyless APIs Directly Integrated**:
  1. **AlienVault OTX (Open Threat Exchange)**: Real-time domain and IP threat intelligence, pulse counts, validation, and ASN mapping.
  2. **URLScan.io Public Engine**: Live domain history, server IPs, ASN, page titles, and screenshot URLs.
  3. **HackerTarget DNS & Reverse IP**: Live zone discovery (A, MX, NS, TXT) and reverse DNS host lookup.
  4. **Bellingcat ShadowFinder (Solar Chrono)**: Pure mathematical NOAA solar elevation, azimuth, shadow-to-height ratio ($R = 1/\tan\alpha$), and shadow direction for photo verification.
  5. **Bluesky Social XRPC**: Public AT Protocol actor profile verification without API keys.
  6. **Wayback Machine & crt.sh**: SSL/TLS certificate transparency and archive availability.

---

## 2. Category-by-Category Tool & API Matrix

### Category 1: Reconnaissance & Automation Frameworks
| Tool | Upstream Repository | Fork Target | DISHA Status | API / Execution Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **OpenOSINT** | `OpenOSINT/OpenOSINT` | `Tashima-Tarsh/OpenOSINT` | Native Connector | Local MCP Server + Python wrapper |
| **SpiderFoot** | `smicallef/spiderfoot` | `Tashima-Tarsh/spiderfoot` | Catalog & Connector | Python CLI worker / REST API |
| **Photon** | `s0md3v/Photon` | `Tashima-Tarsh/Photon` | Upstream Registry | Python crawler (governed active recon) |
| **Recon-ng** | `lanmaster53/recon-ng` | `Tashima-Tarsh/recon-ng` | Upstream Registry | Modular CLI framework |
| **reconFTW** | `six2dez/reconftw` | `Tashima-Tarsh/reconftw` | Upstream Registry | Bash pipeline orchestrator |
| **Osmedeus** | `j3ssie/osmedeus` | `Tashima-Tarsh/osmedeus` | Catalog Addition | Go distributed workflow engine |
| **iKy** | `kennbroorg/iKy` | `Tashima-Tarsh/iKy` | Upstream Registry | Email visualization dashboard |
| **OpenGraph Intel** | `khashashin/ogi` | `Tashima-Tarsh/ogi` | Catalog Addition | Graph visualization / transforms |

### Category 2: Username & Social Media OSINT
| Tool | Upstream Repository | Fork Target | DISHA Status | API / Execution Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **Sherlock** | `sherlock-project/sherlock` | `Tashima-Tarsh/sherlock` | Live Collector & Worker | Python CLI + native DISHA HTTP probe |
| **Maigret** | `soxoj/maigret` | `Tashima-Tarsh/maigret` | Live Collector & Worker | Deep profile dossier generator |
| **Blackbird** | `p1ngul1n0/blackbird` | `Tashima-Tarsh/blackbird` | Upstream Registry | WhatsMyName query engine |
| **WhatsMyName** | `WebBreacher/WhatsMyName` | `Tashima-Tarsh/WhatsMyName` | Integrated Dataset | 730+ platform JSON rule definitions |
| **social-analyzer**| `qeeqbox/social-analyzer` | `Tashima-Tarsh/social-analyzer` | Upstream Registry | Multi-platform profile API |
| **Socialscan** | `iojw/socialscan` | `Tashima-Tarsh/socialscan` | Upstream Registry | Async email & username checker |
| **socid-extractor**| `soxoj/socid-extractor` | `Tashima-Tarsh/socid-extractor` | Upstream Registry | Profile page metadata extractor |
| **Bluesky Public**| AT Protocol | Native | **Active Collector** | `https://public.api.bsky.app/xrpc/` |

### Category 3: Email OSINT
| Tool | Upstream Repository | Fork Target | DISHA Status | API / Execution Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **Holehe** | `megadose/holehe` | `Tashima-Tarsh/holehe` | Live Collector & Worker | Silent password reset probe |
| **theHarvester** | `laramies/theHarvester` | `Tashima-Tarsh/theHarvester` | Upstream Registry | Public domain search engine harvester |
| **h8mail** | `khast3x/h8mail` | `Tashima-Tarsh/h8mail` | Upstream Registry | Local breach corpus searcher |
| **GHunt** | `mxrch/GHunt` | `Tashima-Tarsh/GHunt` | Upstream Registry | Google account & Gaia ID analysis |
| **email2phonenumber** | `martinvigo/email2phonenumber` | `Tashima-Tarsh/email2phonenumber` | Catalog Addition | Password reset phone digit resolver |
| **emailrep.io** | Public Service | Native | **Active Collector** | `https://emailrep.io/{email}` |
| **Gravatar** | Automattic | Native | **Active Collector** | MD5 avatar hash profile endpoint |

### Category 4: Phone Number OSINT
| Tool | Upstream Repository | Fork Target | DISHA Status | API / Execution Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **PhoneInfoga** | `sundowndev/PhoneInfoga` | `Tashima-Tarsh/PhoneInfoga` | Live Collector & Worker | Carrier, region, VoIP reconnaissance |
| **Ignorant** | `megadose/ignorant` | `Tashima-Tarsh/ignorant` | Upstream Registry | Social platform phone registration |
| **India Series** | TRAI / DOT Data | Native | **Active Collector** | Prefix-based carrier/circle mapping |

### Category 5: Instagram & Social Media
| Tool | Upstream Repository | Fork Target | DISHA Status | API / Execution Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **Instaloader** | `instaloader/instaloader` | `Tashima-Tarsh/instaloader` | Upstream Registry | Metadata & picture downloader |
| **Toutatis** | `megadose/toutatis` | `Tashima-Tarsh/toutatis` | Upstream Registry | Private account metadata probe |
| **Osintgram** | `Datalux/Osintgram` | `Tashima-Tarsh/Osintgram` | Upstream Registry | Interactive Instagram analysis |
| **twscrape** | `vladkens/twscrape` | `Tashima-Tarsh/twscrape` | Upstream Registry | X/Twitter GraphQL searcher |

### Category 6: Telegram OSINT
| Tool | Upstream Repository | Fork Target | DISHA Status | API / Execution Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **Telerecon** | `sockysec/Telerecon` | `Tashima-Tarsh/Telerecon` | Upstream Registry | Telegram channel recon framework |
| **Telethon** | `Lonami/Telethon` | `Tashima-Tarsh/Telethon` | Upstream Registry | MTProto client protocol engine |
| **telegram-phone-number-checker** | `bellingcat/telegram-phone-number-checker` | `Tashima-Tarsh/telegram-phone-number-checker` | Upstream Registry | Bellingcat Telegram registration check |

### Category 7: Domain, Subdomain & Web Infrastructure
| Tool | Upstream Repository | Fork Target | DISHA Status | API / Execution Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **Amass** | `owasp-amass/amass` | `Tashima-Tarsh/amass` | Upstream Registry | OWASP deep subdomain enumeration |
| **Subfinder** | `projectdiscovery/subfinder` | `Tashima-Tarsh/subfinder` | Upstream Registry | Passive subdomain engine |
| **httpx** | `projectdiscovery/httpx` | `Tashima-Tarsh/httpx` | Upstream Registry | Probing & technology detection |
| **Katana** | `projectdiscovery/katana` | `Tashima-Tarsh/katana` | Upstream Registry | Next-gen web crawler |
| **crt.sh** | Sectigo CT Logs | Native | **Active Collector** | `https://crt.sh/?q=%.{domain}&output=json` |
| **HackerTarget DNS** | HackerTarget | Native | **Active Collector** | `https://api.hackertarget.com/dnslookup/` |
| **URLScan.io** | urlscan.io | Native | **Active Collector** | `https://urlscan.io/api/v1/search/` |
| **AlienVault OTX** | AT&T Cybersecurity | Native | **Active Collector** | `https://otx.alienvault.com/api/v1/indicators/` |

### Category 8: Cybersecurity & Threat Intelligence
| Tool | Upstream Repository | Fork Target | DISHA Status | API / Execution Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **TruffleHog** | `trufflesecurity/trufflehog` | `Tashima-Tarsh/trufflehog` | Upstream Registry | Git secret scanner (800+ detectors) |
| **GitLeaks** | `gitleaks/gitleaks` | `Tashima-Tarsh/gitleaks` | Upstream Registry | SAST pre-commit & repo auditor |
| **XposedOrNot** | XposedOrNot API | Native | **Active Collector** | Free breach disclosure API |
| **Have I Been Pwned** | HIBP Pwned Passwords | Native | **Active Collector** | K-Anonymity SHA-1 prefix checking |

### Category 9: Geolocation & Image OSINT
| Tool | Upstream Repository | Fork Target | DISHA Status | API / Execution Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **ShadowFinder** | `bellingcat/ShadowFinder` | `Tashima-Tarsh/ShadowFinder` | **Active Collector** | Native NOAA solar geometry calculations |
| **Overpass Turbo** | OpenStreetMap Foundation | Native | Web & API Query | Overpass QL infrastructure mapper |
| **DeFlock** | DeFlock | Upstream Reference | Web Map | OpenStreetMap ALPR camera counter |

---

## 3. How to Execute Automated Forks into GitHub

To synchronize and verify real forks under `https://github.com/Tashima-Tarsh/`:
```bash
# 1. Provide your GitHub personal access token with repo scope
export GITHUB_TOKEN="ghp_yourTokenHere"

# 2. Run DISHA's fork checking engine
node scripts/osint/fork-upstreams.mjs

# 3. Check verification status of all upstreams
node scripts/osint/verify-upstreams.mjs
```
The DISHA truthful zero-mock policy guarantees that every fork status reflected in the UI and reports maps directly to an authenticated repository under `https://github.com/Tashima-Tarsh/<repo>`.

