# DISHA 6.6 — Truthful OSINT Runtime & Upstream Integration Report

**Generated:** 2026-10-10T16:25:14.702Z<br />
**Total Upstream Repositories Cataloged:** 523<br />
**Truthful Data Policy:** ZERO MOCK / REAL REPOSITORIES / VERIFIED ARCHITECTURE<br />

---

## 1. Executive Summary & Status Metrics

| Metric Category | Detail / Count |
| :--- | :--- |
| **Total Cataloged Upstreams** | **523** |
| **Runnable Smoke Passed On This Machine** | **2** |
| **Smoke Failed / Missing** | Failed: **483**, Missing: **3** |
| **Reference/Auth/Catalogue Only** | Reference-only: **25**, Auth/API-key required: **10**, Catalogue-only: **0** |
| **Verification Claims Requiring Refresh** | **484** |
| **Fork Status** | Verified Forks: **0**, Pending: **523** |
| **Health Classification** | Healthy: **479**, Unconfigured: **4**, Reference Only: **7**, Degraded: **0**, Unavailable: **0** |
| **Runtime Breakdown** | Python: **383**, Go: **35**, Node: **50**, Rust: **14**, Docker: **13**, Reference/Other: **26** |

### Runtime Evidence Classification

```
SMOKE_FAILED             : 483
REFERENCE_ONLY           : 25
AUTH_OR_KEY_REQUIRED     : 10
SMOKE_MISSING            : 3
RUNNABLE_SMOKE_PASS      : 2
```

Runnable status means a tool produced a successful local/runtime smoke result in this environment. Catalogue presence, upstream metadata, forks, datasets, GUI references, and library references are not counted as runnable execution.

### Runtime Distribution

```
python               : 383
node                 : 50
go                   : 35
rust                 : 14
docker               : 13
library-only         : 9
gui-only             : 6
dataset-only         : 6
binary               : 5
documentation        : 2
```

### Category Distribution

```
framework            : 154
network              : 108
identity             : 105
documents            : 52
media                : 44
threat-intelligence  : 28
secrets              : 16
web-archive          : 7
metadata             : 6
case-forensics       : 3
```

---

## 2. Mandatory Core OSINT Tools Status

| Tool | Category | Runtime | Upstream Repository | Fork Status | Execution Class | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **OWASP Amass** | network | `go` | [owasp-amass/amass](https://github.com/owasp-amass/amass) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **Apache Tika** | documents | `binary` | [apache/tika](https://github.com/apache/tika) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **ArchiveBox** | web-archive | `docker` | [archivebox/archivebox](https://github.com/ArchiveBox/ArchiveBox) | Pending | `passive_public` | `SERVICE_VERIFIED` / SMOKE_FAILED |
| **ArchiveWeb.page** | web-archive | `node` | [webrecorder/archiveweb.page](https://github.com/webrecorder/archiveweb.page) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **Assetfinder** | network | `go` | [tomnomnom/assetfinder](https://github.com/tomnomnom/assetfinder) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **BBOT** | network | `python` | [blacklanternsecurity/bbot](https://github.com/blacklanternsecurity/bbot) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **Bellingcat Auto Archiver** | web-archive | `python` | [bellingcat/auto-archiver](https://github.com/bellingcat/auto-archiver) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **Blackbird** | identity | `python` | [p1ngul1n0/blackbird](https://github.com/p1ngul1n0/blackbird) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **Browsertrix Crawler** | web-archive | `docker` | [webrecorder/browsertrix-crawler](https://github.com/webrecorder/browsertrix-crawler) | Pending | `passive_public` | `SERVICE_VERIFIED` / SMOKE_FAILED |
| **Cariddi** | secrets | `go` | [edoardottt/cariddi](https://github.com/edoardottt/cariddi) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **Cortex** | threat-intelligence | `docker` | [thehive-project/cortex](https://github.com/TheHive-Project/Cortex) | Pending | `passive_public` | `SERVICE_VERIFIED` / SMOKE_FAILED |
| **detect-secrets** | secrets | `python` | [yelp/detect-secrets](https://github.com/Yelp/detect-secrets) | Pending | `passive_public` | `UNCONFIGURED` / SMOKE_FAILED |
| **dnsx** | network | `go` | [projectdiscovery/dnsx](https://github.com/projectdiscovery/dnsx) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **Docling** | documents | `python` | [ds4sd/docling](https://github.com/DS4SD/docling) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **emploleaks** | secrets | `python` | [dievus/emploleaks](https://github.com/infobyte/emploleaks) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **ExifLooter** | metadata | `go` | [aydinnydn/exiflooter](https://github.com/aydinnyunus/exifLooter) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **ExifTool** | metadata | `binary` | [exiftool/exiftool](https://github.com/exiftool/exiftool) | Pending | `passive_public` | `UNCONFIGURED` / SMOKE_FAILED |
| **Findomain** | network | `rust` | [findomain/findomain](https://github.com/Findomain/Findomain) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **gau** | network | `go` | [lc/gau](https://github.com/lc/gau) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **ggshield** | secrets | `python` | [gitguardian/ggshield](https://github.com/GitGuardian/ggshield) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **GHunt** | identity | `python` | [mxrch/ghunt](https://github.com/mxrch/GHunt) | Pending | `credentialed_public_api` | `CREDENTIAL_REQUIRED` / AUTH_OR_KEY_REQUIRED |
| **git-hound** | secrets | `go` | [tillson/git-hound](https://github.com/tillson/git-hound) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **gitGraber** | secrets | `python` | [hisxo/gitgraber](https://github.com/hisxo/gitGraber) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **github-dorks** | secrets | `python` | [techgaun/github-dorks](https://github.com/techgaun/github-dorks) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **Gitleaks** | secrets | `go` | [gitleaks/gitleaks](https://github.com/gitleaks/gitleaks) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **h8mail** | secrets | `python` | [khast3x/h8mail](https://github.com/khast3x/h8mail) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **Holehe** | identity | `python` | [megadose/holehe](https://github.com/megadose/holehe) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **httpx** | network | `go` | [projectdiscovery/httpx](https://github.com/projectdiscovery/httpx) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **ICIJ Datashare** | documents | `docker` | [icij/datashare](https://github.com/ICIJ/datashare) | Pending | `passive_public` | `SERVICE_VERIFIED` / SMOKE_FAILED |
| **ICIJ Extract** | documents | `docker` | [icij/extract](https://github.com/ICIJ/extract) | Pending | `passive_public` | `SERVICE_VERIFIED` / SMOKE_FAILED |
| **Instaloader** | identity | `python` | [instaloader/instaloader](https://github.com/instaloader/instaloader) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **IntelOwl** | threat-intelligence | `docker` | [intelowlproject/intelowl](https://github.com/intelowlproject/IntelOwl) | Pending | `credentialed_public_api` | `CREDENTIAL_REQUIRED` / AUTH_OR_KEY_REQUIRED |
| **IPED** | documents | `binary` | [sepinf-inc/iped](https://github.com/sepinf-inc/IPED) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **KeyLeak-Detector** | secrets | `python` | [0xcyber/keyleak-detector](https://github.com/Amal-David/keyleak-detector) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **kronikier** | web-archive | `python` | [marnix/kronikier](https://github.com/soxoj/kronikier) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **Leaker** | secrets | `python` | [the404hacking/leaker](https://github.com/vflame6/leaker) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **Maigret** | identity | `python` | [soxoj/maigret](https://github.com/soxoj/maigret) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **MailAccess** | secrets | `python` | [lone-ranger-op/mailaccess](https://github.com/KatrielMoses/MailAccess) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **Malwoverview** | threat-intelligence | `python` | [alexandreborges/malwoverview](https://github.com/alexandreborges/malwoverview) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **MarkItDown** | documents | `python` | [microsoft/markitdown](https://github.com/microsoft/markitdown) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **MediaInfo** | media | `binary` | [mediaarea/mediainfo](https://github.com/MediaArea/MediaInfo) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **MetaDetective** | metadata | `python` | [accidental-rebel/metadetective](https://github.com/franckferman/MetaDetective) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **Metagoofil** | metadata | `python` | [laramies/metagoofil](https://github.com/laramies/metagoofil) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **MISP** | threat-intelligence | `docker` | [misp/misp](https://github.com/MISP/MISP) | Pending | `passive_public` | `SERVICE_VERIFIED` / SMOKE_FAILED |
| **MISP Modules** | threat-intelligence | `python` | [misp/misp-modules](https://github.com/MISP/misp-modules) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **Name-That-Hash** | metadata | `python` | [hashpals/name-that-hash](https://github.com/HashPals/Name-That-Hash) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **OCRmyPDF** | documents | `python` | [ocrmypdf/ocrmypdf](https://github.com/ocrmypdf/OCRmyPDF) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **OpenCTI** | threat-intelligence | `docker` | [opencti-platform/opencti](https://github.com/OpenCTI-Platform/opencti) | Pending | `credentialed_public_api` | `CREDENTIAL_REQUIRED` / AUTH_OR_KEY_REQUIRED |
| **OpenOSINT** | framework | `library-only` | [the-art-of-hacking/openosint](https://github.com/OpenOSINT/OpenOSINT) | Pending | `catalog_only` | `LIBRARY_INTEGRATED` / REFERENCE_ONLY |
| **OpenSanctions** | identity | `python` | [opensanctions/opensanctions](https://github.com/opensanctions/opensanctions) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **OSINT Framework** | framework | `gui-only` | [lockfale/osint-framework](https://github.com/lockfale/OSINT-Framework) | Pending | `catalog_only` | `GUI_INTEGRATED` / REFERENCE_ONLY |
| **Osintgram** | identity | `python` | [datalux/osintgram](https://github.com/Datalux/Osintgram) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **PhoneInfoga** | identity | `go` | [sundowndev/phoneinfoga](https://github.com/sundowndev/phoneinfoga) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **Photon** | network | `python` | [s0md3v/photon](https://github.com/s0md3v/Photon) | Pending | `passive_public` | `AUTH_REQUIRED` / AUTH_OR_KEY_REQUIRED |
| **pwnedOrNot** | secrets | `python` | [thewhiteh4t/pwnedornot](https://github.com/thewhiteh4t/pwnedOrNot) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **pyannote.audio** | media | `python` | [pyannote/pyannote-audio](https://github.com/pyannote/pyannote-audio) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **pyWhat** | metadata | `python` | [bee-san/pywhat](https://github.com/bee-san/pyWhat) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **Recon-ng** | network | `python` | [lanmaster53/recon-ng](https://github.com/lanmaster53/recon-ng) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **ReplayWeb.page** | web-archive | `node` | [webrecorder/replayweb.page](https://github.com/webrecorder/replayweb.page) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **Sherlock** | identity | `python` | [sherlock-project/sherlock](https://github.com/sherlock-project/sherlock) | Pending | `passive_public` | `AUTH_REQUIRED` / AUTH_OR_KEY_REQUIRED |
| **Sherloq** | media | `python` | [guidobartoli/sherloq](https://github.com/GuidoBartoli/sherloq) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **sn0int** | framework | `rust` | [kpcyrd/sn0int](https://github.com/kpcyrd/sn0int) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **Snoop** | identity | `python` | [snooppr/snoop](https://github.com/snooppr/snoop) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **Social Analyzer** | identity | `node` | [qeeqbox/social-analyzer](https://github.com/qeeqbox/social-analyzer) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **SpiderFoot** | framework | `python` | [smicallef/spiderfoot](https://github.com/smicallef/spiderfoot) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **SubDomainizer** | secrets | `python` | [nsonaniya2010/subdomainizer](https://github.com/nsonaniya2010/SubDomainizer) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **Subfinder** | network | `go` | [projectdiscovery/subfinder](https://github.com/projectdiscovery/subfinder) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **Telethon** | identity | `python` | [lonamiwebs/telethon](https://github.com/LonamiWebs/Telethon) | Pending | `credentialed_public_api` | `CREDENTIAL_REQUIRED` / AUTH_OR_KEY_REQUIRED |
| **Tesseract** | documents | `binary` | [tesseract-ocr/tesseract](https://github.com/tesseract-ocr/tesseract) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **theHarvester** | network | `python` | [laramies/theharvester](https://github.com/laramies/theHarvester) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **Toutatis** | identity | `python` | [megadose/toutatis](https://github.com/megadose/toutatis) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **TruffleHog** | secrets | `go` | [trufflesecurity/trufflehog](https://github.com/trufflesecurity/trufflehog) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **Unfurl** | network | `python` | [obsidianforensics/unfurl](https://github.com/obsidianforensics/unfurl) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **Vosk API** | media | `python` | [alphacep/vosk-api](https://github.com/alphacep/vosk-api) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **waybackpack** | web-archive | `python` | [jsvine/waybackpack](https://github.com/jsvine/waybackpack) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **waybackurls** | network | `go` | [tomnomnom/waybackurls](https://github.com/tomnomnom/waybackurls) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **waymore** | network | `python` | [xnl-h4ck3r/waymore](https://github.com/xnl-h4ck3r/waymore) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **WhatBreach** | secrets | `python` | [ekultek/whatbreach](https://github.com/Ekultek/WhatBreach) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| **WhatsMyName** | identity | `dataset-only` | [webbreacher/whatsmyname](https://github.com/WebBreacher/WhatsMyName) | Pending | `catalog_only` | `DATASET_INTEGRATED` / REFERENCE_ONLY |
| **Yeti** | threat-intelligence | `docker` | [yeti-platform/yeti](https://github.com/yeti-platform/yeti) | Pending | `passive_public` | `SERVICE_VERIFIED` / SMOKE_FAILED |
| **yt-dlp** | media | `python` | [yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp) | Pending | `passive_public` | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |

---

## 3. Complete Upstream Repository Inventory (Top 100 Sample)

| Tool ID | Name | Category | Runtime | Upstream URL | License | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `abster-intelligence` | Abster Intelligence | framework | `node` | [GitHub](https://github.com/frangelbarrera/Abster-Intelligence) | Apache-2.0 | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `abx-dl` | abx-dl | network | `python` | [GitHub](https://github.com/ArchiveBox/abx-dl) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `academia-mcp` | Academia MCP | documents | `python` | [GitHub](https://github.com/IlyaGusev/academia_mcp) | Apache-2.0 | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `agent-pulse` | agent-pulse | network | `node` | [GitHub](https://github.com/barretlee/agent-pulse) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `agent-reach` | Agent Reach | identity | `python` | [GitHub](https://github.com/Panniantong/Agent-Reach) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `agent-search` | Agent Search | network | `python` | [GitHub](https://github.com/brcrusoe72/agent-search) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `agent-toolkit` | Agent Toolkit | network | `python` | [GitHub](https://github.com/000001000000/agent-toolkit) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `agentset` | Agentset | documents | `python` | [GitHub](https://github.com/agentset-ai/agentset) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `ah-osint` | AH-OSINT | framework | `python` | [GitHub](https://github.com/ArunHax/AH-OSINT) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `ahmia` | Ahmia | network | `python` | [GitHub](https://github.com/ahmia/ahmia-site) | BSD-3-Clause | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `ail-framework` | AIL Framework | network | `python` | [GitHub](https://github.com/ail-project/ail-framework) | AGPL-3.0 | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `aircraft-research-skill` | Aircraft Research Skill | framework | `python` | [GitHub](https://github.com/WPTK/aircraft-research-claude-skill) | CC-BY-SA-4.0 | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `aleph` | Aleph | documents | `node` | [GitHub](https://github.com/alephdata/aleph) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `aliens-eye` | Aliens Eye | identity | `python` | [GitHub](https://github.com/arxhr007/Aliens_eye) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `all-in-one-bot` | all-in-one-bot | framework | `go` | [GitHub](https://github.com/uerax/all-in-one-bot) | Unknown | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `amass` | OWASP Amass | network | `go` | [GitHub](https://github.com/owasp-amass/amass) | Apache-2.0 | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `anthropic-cybersecurity-skills` | Anthropic Cybersecurity Skills | framework | `library-only` | [GitHub](https://github.com/mukul975/Anthropic-Cybersecurity-Skills) | Apache-2.0 | `LIBRARY_INTEGRATED` / REFERENCE_ONLY |
| `apache-tika` | Apache Tika | documents | `binary` | [GitHub](https://github.com/apache/tika) | Apache-2.0 | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `apify-mcp-server` | Apify MCP Server | network | `python` | [GitHub](https://github.com/apify/apify-mcp-server) | MIT | `CREDENTIAL_REQUIRED` / AUTH_OR_KEY_REQUIRED |
| `archivebox` | ArchiveBox | web-archive | `docker` | [GitHub](https://github.com/ArchiveBox/ArchiveBox) | MIT | `SERVICE_VERIFIED` / SMOKE_FAILED |
| `archiveweb-page` | ArchiveWeb.page | web-archive | `node` | [GitHub](https://github.com/webrecorder/archiveweb.page) | AGPL-3.0 | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `arctic-shift` | Arctic Shift | identity | `node` | [GitHub](https://github.com/ArthurHeitmann/arctic_shift) | Unknown | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `argus` | Argus | framework | `python` | [GitHub](https://github.com/divinelabio/Argus) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `aris` | ARIS | documents | `python` | [GitHub](https://github.com/wanshuiyin/Auto-claude-code-research-in-sleep) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `arkhammirror` | ArkhamMirror | documents | `python` | [GitHub](https://github.com/mantisfury/ArkhamMirror) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `asn` | asn | framework | `python` | [GitHub](https://github.com/nitefood/asn) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `asnmap` | asnmap | framework | `go` | [GitHub](https://github.com/projectdiscovery/asnmap) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `assetfinder` | Assetfinder | network | `go` | [GitHub](https://github.com/tomnomnom/assetfinder) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `atdork` | AtDork | network | `python` | [GitHub](https://github.com/amnottdevv/AtDork) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `autopsy` | Autopsy | documents | `gui-only` | [GitHub](https://github.com/sleuthkit/autopsy) | Apache-2.0 [VERIFY REQUIRED] | `REFERENCE_ONLY` / REFERENCE_ONLY |
| `autopsy-addon-modules` | Autopsy Add-on Modules | documents | `library-only` | [GitHub](https://github.com/sleuthkit/autopsy_addon_modules) | Apache-2.0 [VERIFY REQUIRED] | `REFERENCE_ONLY` / REFERENCE_ONLY |
| `bbot` | BBOT | network | `python` | [GitHub](https://github.com/blacklanternsecurity/bbot) | GPL-3.0 | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `bellingcat-ads-b-history` | Bellingcat ADS-B History | framework | `node` | [GitHub](https://github.com/bellingcat/adsb-history) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `bellingcat-auto-archiver` | Bellingcat Auto Archiver | web-archive | `python` | [GitHub](https://github.com/bellingcat/auto-archiver) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `bellingcat-councilsearcher` | Bellingcat CouncilSearcher | framework | `python` | [GitHub](https://github.com/bellingcat/CouncilSearcher) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `bellingcat-geoclustering` | Bellingcat Geoclustering | framework | `python` | [GitHub](https://github.com/bellingcat/geoclustering) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `bellingcat-name-variant-search` | Bellingcat Name Variant Search | identity | `python` | [GitHub](https://github.com/bellingcat/name-variant-search) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `bellingcat-octosuite` | Bellingcat Octosuite | framework | `python` | [GitHub](https://github.com/bellingcat/octosuite) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `bellingcat-osint-toolkit-skills` | Bellingcat OSINT Toolkit Skills | framework | `python` | [GitHub](https://github.com/CasualSecurityInc/Bellingcat-OSINT-Toolkit) | Unknown | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `bellingcat-osm-search` | Bellingcat OSM Search | framework | `node` | [GitHub](https://github.com/bellingcat/osm-search) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `bellingcat-sugartrail` | Bellingcat Sugartrail | documents | `python` | [GitHub](https://github.com/bellingcat/sugartrail) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `bellingcat-wayback-google-analytics` | Bellingcat Wayback Google Analytics | network | `python` | [GitHub](https://github.com/bellingcat/wayback-google-analytics) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `betterleaks` | Betterleaks | framework | `go` | [GitHub](https://github.com/betterleaks/betterleaks) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `bitcoin-etl` | Bitcoin ETL | framework | `python` | [GitHub](https://github.com/blockchain-etl/bitcoin-etl) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `bitsleuth-analyzer` | BitSleuth Analyzer | framework | `node` | [GitHub](https://github.com/jamespepper81/Analyzer) | AGPL-3.0 | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `blackbird` | Blackbird | identity | `python` | [GitHub](https://github.com/antoniaci/blackbird) | Unknown | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `blackbird-p1ngul1n0` | Blackbird | identity | `python` | [GitHub](https://github.com/p1ngul1n0/blackbird) | GPL-3.0 | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `blackwidow` | BlackWidow | network | `python` | [GitHub](https://github.com/1N3/BlackWidow) | Unknown | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `bounty-recon-pro` | Bounty Recon Pro | framework | `python` | [GitHub](https://github.com/synicalkid/bounty-recon-pro) | Unknown | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `brave-search-mcp-server` | Brave Search MCP Server | network | `python` | [GitHub](https://github.com/brave/brave-search-mcp-server) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `bright-data-mcp` | Bright Data MCP | network | `dataset-only` | [GitHub](https://github.com/brightdata/brightdata-mcp) | MIT | `DATASET_INTEGRATED` / REFERENCE_ONLY |
| `browser-use` | Browser Use | network | `python` | [GitHub](https://github.com/browser-use/browser-use) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `browsertrix` | Browsertrix | network | `node` | [GitHub](https://github.com/webrecorder/browsertrix) | AGPL-3.0 | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `browsertrix-crawler` | Browsertrix Crawler | web-archive | `docker` | [GitHub](https://github.com/webrecorder/browsertrix-crawler) | AGPL-3.0 | `SERVICE_VERIFIED` / SMOKE_FAILED |
| `camera-ui` | camera.ui | media | `node` | [GitHub](https://github.com/cameraui/camera.ui) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `cariddi` | Cariddi | secrets | `go` | [GitHub](https://github.com/edoardottt/cariddi) | GPL-3.0 | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `changedetection-io` | changedetection.io | network | `python` | [GitHub](https://github.com/dgtlmoon/changedetection.io) | Apache-2.0 | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `chinese-osint-skills` | Chinese OSINT Skills | identity | `python` | [GitHub](https://github.com/zomin/chinese-osint-skills) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `citizen-intelligence-agency` | Citizen Intelligence Agency | framework | `python` | [GitHub](https://github.com/Hack23/cia) | Apache-2.0 | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `claude-bug-bounty` | Claude Bug Bounty | framework | `python` | [GitHub](https://github.com/awarexone/Agentic-Bug-Hunter) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `claude-bughunter` | Claude BugHunter | framework | `python` | [GitHub](https://github.com/elementalsouls/Claude-BugHunter) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `claude-code-pentest` | Claude Code Pentest | framework | `python` | [GitHub](https://github.com/Orizon-eu/claude-code-pentest) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `claude-osint` | Claude OSINT | framework | `dataset-only` | [GitHub](https://github.com/elementalsouls/Claude-OSINT) | MIT | `DATASET_INTEGRATED` / REFERENCE_ONLY |
| `claude-osint-deploy` | Claude OSINT Deploy | framework | `python` | [GitHub](https://github.com/soxoj/claude-osint-deploy) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `claude-osint-plugin` | Claude OSINT Plugin | framework | `python` | [GitHub](https://github.com/lawriec/claude-osint-plugin) | Unknown | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `claude-red` | Claude Red | framework | `python` | [GitHub](https://github.com/SnailSploit/Claude-Red) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `claude-skills` | Claude Skills | framework | `python` | [GitHub](https://github.com/alirezarezvani/claude-skills) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `claude-skills-for-journalism` | Claude Skills for Journalism | documents | `python` | [GitHub](https://github.com/jamditis/claude-skills-journalism) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `claudii-exploratores` | Claudii Exploratores | framework | `python` | [GitHub](https://github.com/SOsintOps/claudii-exploratores) | AGPL-3.0 | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `clearcam` | clearcam | media | `python` | [GitHub](https://github.com/roryclear/clearcam) | GPL-3.0 | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `clearfront` | Clearfront | identity | `python` | [GitHub](https://github.com/scottmartinanderson/clearfront) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `cloakquest3r` | CloakQuest3r | framework | `python` | [GitHub](https://github.com/spyboy-productions/CloakQuest3r) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `cloud-enum` | cloud_enum | documents | `python` | [GitHub](https://github.com/initstring/cloud_enum) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `cloudrip` | CloudRip | framework | `python` | [GitHub](https://github.com/moscovium-mc/CloudRip) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `coastsat` | CoastSat | framework | `python` | [GitHub](https://github.com/kvos/CoastSat) | GPL-3.0 | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `commipiste` | CommiPiste | framework | `python` | [GitHub](https://github.com/soxoj/CommiPiste) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `company-recon-skill` | Company Recon Skill | documents | `python` | [GitHub](https://github.com/zoharbabin/company-recon-skill) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `compreface` | CompreFace | media | `python` | [GitHub](https://github.com/exadel-inc/CompreFace) | Apache-2.0 | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `copernicus-browser` | Copernicus Browser | framework | `node` | [GitHub](https://github.com/eu-cdse/copernicus-browser) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `cortex` | Cortex | threat-intelligence | `docker` | [GitHub](https://github.com/TheHive-Project/Cortex) | AGPL-3.0 | `SERVICE_VERIFIED` / SMOKE_FAILED |
| `crawl4ai` | Crawl4AI | network | `python` | [GitHub](https://github.com/unclecode/crawl4ai) | Apache-2.0 | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `crawlee` | Crawlee | network | `node` | [GitHub](https://github.com/apify/crawlee) | Apache-2.0 | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `crosslinked` | CrossLinked | identity | `python` | [GitHub](https://github.com/m8sec/CrossLinked) | GPL-3.0 | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `crucix` | Crucix | threat-intelligence | `node` | [GitHub](https://github.com/calesthio/Crucix) | AGPL-3.0 | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `ctf-skills` | CTF Skills | framework | `python` | [GitHub](https://github.com/ljagiello/ctf-skills) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `cti-expert` | CTI Expert | threat-intelligence | `gui-only` | [GitHub](https://github.com/7onez/cti-expert) | Unknown | `GUI_INTEGRATED` / REFERENCE_ONLY |
| `cve-mcp-server` | CVE MCP Server | threat-intelligence | `rust` | [GitHub](https://github.com/mukul975/cve-mcp-server) | Apache-2.0 | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `cyberbro` | Cyberbro | framework | `python` | [GitHub](https://github.com/stanfrbd/cyberbro) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `cyberstrike` | CyberStrike | framework | `python` | [GitHub](https://github.com/CyberStrikeus/CyberStrike) | AGPL-3.0 | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `darc` | darc | network | `python` | [GitHub](https://github.com/JarryShaw/darc) | BSD-3-Clause | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `dark-light-viewer` | Dark Light Viewer | framework | `node` | [GitHub](https://github.com/bendobrown/Dark-Light-Viewer) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `darkdump` | darkdump | network | `python` | [GitHub](https://github.com/josh0xA/darkdump) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `darknet-mcp-server` | Darknet MCP Server | network | `python` | [GitHub](https://github.com/badchars/darknet-mcp-server) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `darkspider` | DarkSpider | network | `python` | [GitHub](https://github.com/PROxZIMA/DarkSpider) | GPL-3.0 | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `darkus` | Darkus | network | `python` | [GitHub](https://github.com/Lucksi/Darkus) | GPL-3.0 | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `data-commons-agent-toolkit` | Data Commons Agent Toolkit | documents | `python` | [GitHub](https://github.com/datacommonsorg/agent-toolkit) | Apache-2.0 | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `de-anthropocentric-research-engine` | De-Anthropocentric Research Engine | network | `python` | [GitHub](https://github.com/yogsoth-ai/de-anthropocentric-research-engine) | Apache-2.0 | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `deanonymizer` | Deanonymizer | identity | `node` | [GitHub](https://github.com/ni5arga/deanonymizer) | Unknown | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `deep-recon` | deep-recon | framework | `python` | [GitHub](https://github.com/kvarnelis/deep-recon) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_FAILED |
| `deep-research` | Deep Research | network | `python` | [GitHub](https://github.com/u14app/deep-research) | MIT | `EXECUTABLE_VERIFIED` / SMOKE_MISSING |

*(Full machine-readable manifest containing all 523 repositories is available in `reports/osint-runtime-report.json`)*
