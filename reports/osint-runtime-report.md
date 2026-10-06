# DISHA 6.6 — Truthful OSINT Runtime & Upstream Integration Report

**Generated:** 2026-10-06T20:17:01.694Z<br />
**Total Upstream Repositories Cataloged:** 512<br />
**Truthful Data Policy:** ZERO MOCK / REAL REPOSITORIES / VERIFIED ARCHITECTURE<br />

---

## 1. Executive Summary & Status Metrics

| Metric Category | Detail / Count |
| :--- | :--- |
| **Total Cataloged Upstreams** | **512** |
| **Fork Status** | Verified Forks: **0**, Pending: **512** |
| **Health Classification** | Healthy: **0**, Unconfigured: **495**, Reference Only: **17**, Degraded: **0**, Unavailable: **0** |
| **Runtime Breakdown** | Python: **381**, Go: **35**, Node: **50**, Rust: **14**, Docker: **10**, Reference/Other: **22** |

### Runtime Distribution

```
python               : 381
node                 : 50
go                   : 35
rust                 : 14
docker               : 10
library-only         : 7
binary               : 5
dataset-only         : 5
gui-only             : 5
```

### Category Distribution

```
framework            : 154
network              : 107
identity             : 105
documents            : 47
media                : 44
threat-intelligence  : 26
secrets              : 16
web-archive          : 7
metadata             : 6
```

---

## 2. Mandatory Core OSINT Tools Status

| Tool | Category | Runtime | Upstream Repository | Fork Status | Execution Class | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **GHunt** | identity | `python` | [mxrch/ghunt](https://github.com/mxrch/GHunt) | Pending | `credentialed_public_api` | `AUTH_REQUIRED` |
| **Holehe** | identity | `python` | [megadose/holehe](https://github.com/megadose/holehe) | Pending | `passive_public` | `UNCONFIGURED` |
| **h8mail** | secrets | `python` | [khast3x/h8mail](https://github.com/khast3x/h8mail) | Pending | `passive_public` | `UNCONFIGURED` |
| **pwnedOrNot** | secrets | `python` | [thewhiteh4t/pwnedornot](https://github.com/thewhiteh4t/pwnedOrNot) | Pending | `passive_public` | `UNCONFIGURED` |
| **PhoneInfoga** | identity | `go` | [sundowndev/phoneinfoga](https://github.com/sundowndev/phoneinfoga) | Pending | `passive_public` | `UNCONFIGURED` |
| **theHarvester** | network | `python` | [laramies/theharvester](https://github.com/laramies/theHarvester) | Pending | `passive_public` | `UNCONFIGURED` |
| **OWASP Amass** | network | `go` | [owasp-amass/amass](https://github.com/owasp-amass/amass) | Pending | `passive_public` | `UNCONFIGURED` |
| **Subfinder** | network | `go` | [projectdiscovery/subfinder](https://github.com/projectdiscovery/subfinder) | Pending | `passive_public` | `UNCONFIGURED` |
| **BBOT** | network | `python` | [blacklanternsecurity/bbot](https://github.com/blacklanternsecurity/bbot) | Pending | `passive_public` | `UNCONFIGURED` |
| **Findomain** | network | `rust` | [findomain/findomain](https://github.com/Findomain/Findomain) | Pending | `passive_public` | `UNCONFIGURED` |
| **dnsx** | network | `go` | [projectdiscovery/dnsx](https://github.com/projectdiscovery/dnsx) | Pending | `passive_public` | `UNCONFIGURED` |
| **SubDomainizer** | secrets | `python` | [nsonaniya2010/subdomainizer](https://github.com/nsonaniya2010/SubDomainizer) | Pending | `passive_public` | `UNCONFIGURED` |
| **Photon** | network | `python` | [s0md3v/photon](https://github.com/s0md3v/Photon) | Pending | `passive_public` | `UNCONFIGURED` |
| **gau** | network | `go` | [lc/gau](https://github.com/lc/gau) | Pending | `passive_public` | `UNCONFIGURED` |
| **Cariddi** | secrets | `go` | [edoardottt/cariddi](https://github.com/edoardottt/cariddi) | Pending | `passive_public` | `UNCONFIGURED` |
| **waybackpack** | web-archive | `python` | [jsvine/waybackpack](https://github.com/jsvine/waybackpack) | Pending | `passive_public` | `UNCONFIGURED` |
| **waymore** | network | `python` | [xnl-h4ck3r/waymore](https://github.com/xnl-h4ck3r/waymore) | Pending | `passive_public` | `UNCONFIGURED` |
| **ExifTool** | metadata | `binary` | [exiftool/exiftool](https://github.com/exiftool/exiftool) | Pending | `passive_public` | `UNCONFIGURED` |
| **OpenSanctions** | identity | `python` | [opensanctions/opensanctions](https://github.com/opensanctions/opensanctions) | Pending | `passive_public` | `UNCONFIGURED` |
| **SpiderFoot** | framework | `python` | [smicallef/spiderfoot](https://github.com/smicallef/spiderfoot) | Pending | `passive_public` | `UNCONFIGURED` |
| **OpenCTI** | threat-intelligence | `docker` | [opencti-platform/opencti](https://github.com/OpenCTI-Platform/opencti) | Pending | `credentialed_public_api` | `AUTH_REQUIRED` |
| **Recon-ng** | network | `python` | [lanmaster53/recon-ng](https://github.com/lanmaster53/recon-ng) | Pending | `passive_public` | `UNCONFIGURED` |
| **IntelOwl** | threat-intelligence | `docker` | [intelowlproject/intelowl](https://github.com/intelowlproject/IntelOwl) | Pending | `credentialed_public_api` | `AUTH_REQUIRED` |
| **sn0int** | framework | `rust` | [kpcyrd/sn0int](https://github.com/kpcyrd/sn0int) | Pending | `passive_public` | `UNCONFIGURED` |
| **Sherlock** | identity | `python` | [sherlock-project/sherlock](https://github.com/sherlock-project/sherlock) | Pending | `passive_public` | `UNCONFIGURED` |
| **Maigret** | identity | `python` | [soxoj/maigret](https://github.com/soxoj/maigret) | Pending | `passive_public` | `UNCONFIGURED` |
| **Social Analyzer** | identity | `node` | [qeeqbox/social-analyzer](https://github.com/qeeqbox/social-analyzer) | Pending | `passive_public` | `UNCONFIGURED` |
| **Snoop** | identity | `python` | [snooppr/snoop](https://github.com/snooppr/snoop) | Pending | `passive_public` | `UNCONFIGURED` |
| **WhatsMyName** | identity | `dataset-only` | [webbreacher/whatsmyname](https://github.com/WebBreacher/WhatsMyName) | Pending | `catalog_only` | `DATASET_ONLY` |
| **Osintgram** | identity | `python` | [datalux/osintgram](https://github.com/Datalux/Osintgram) | Pending | `passive_public` | `UNCONFIGURED` |
| **Instaloader** | identity | `python` | [instaloader/instaloader](https://github.com/instaloader/instaloader) | Pending | `passive_public` | `UNCONFIGURED` |
| **yt-dlp** | media | `python` | [yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp) | Pending | `passive_public` | `UNCONFIGURED` |
| **github-dorks** | secrets | `python` | [techgaun/github-dorks](https://github.com/techgaun/github-dorks) | Pending | `passive_public` | `UNCONFIGURED` |
| **gitGraber** | secrets | `python` | [hisxo/gitgraber](https://github.com/hisxo/gitGraber) | Pending | `passive_public` | `UNCONFIGURED` |
| **git-hound** | secrets | `go` | [tillson/git-hound](https://github.com/tillson/git-hound) | Pending | `passive_public` | `UNCONFIGURED` |
| **httpx** | network | `go` | [projectdiscovery/httpx](https://github.com/projectdiscovery/httpx) | Pending | `passive_public` | `UNCONFIGURED` |
| **Gitleaks** | secrets | `go` | [gitleaks/gitleaks](https://github.com/gitleaks/gitleaks) | Pending | `passive_public` | `UNCONFIGURED` |
| **TruffleHog** | secrets | `go` | [trufflesecurity/trufflehog](https://github.com/trufflesecurity/trufflehog) | Pending | `passive_public` | `UNCONFIGURED` |
| **ArchiveBox** | web-archive | `docker` | [archivebox/archivebox](https://github.com/ArchiveBox/ArchiveBox) | Pending | `passive_public` | `UNCONFIGURED` |
| **Browsertrix Crawler** | web-archive | `docker` | [webrecorder/browsertrix-crawler](https://github.com/webrecorder/browsertrix-crawler) | Pending | `passive_public` | `UNCONFIGURED` |
| **ArchiveWeb.page** | web-archive | `node` | [webrecorder/archiveweb.page](https://github.com/webrecorder/archiveweb.page) | Pending | `passive_public` | `UNCONFIGURED` |
| **Bellingcat Auto Archiver** | web-archive | `python` | [bellingcat/auto-archiver](https://github.com/bellingcat/auto-archiver) | Pending | `passive_public` | `UNCONFIGURED` |
| **ReplayWeb.page** | web-archive | `node` | [webrecorder/replayweb.page](https://github.com/webrecorder/replayweb.page) | Pending | `passive_public` | `UNCONFIGURED` |
| **MarkItDown** | documents | `python` | [microsoft/markitdown](https://github.com/microsoft/markitdown) | Pending | `passive_public` | `UNCONFIGURED` |
| **OCRmyPDF** | documents | `python` | [ocrmypdf/ocrmypdf](https://github.com/ocrmypdf/OCRmyPDF) | Pending | `passive_public` | `UNCONFIGURED` |
| **Tesseract** | documents | `binary` | [tesseract-ocr/tesseract](https://github.com/tesseract-ocr/tesseract) | Pending | `passive_public` | `UNCONFIGURED` |
| **Apache Tika** | documents | `binary` | [apache/tika](https://github.com/apache/tika) | Pending | `passive_public` | `UNCONFIGURED` |
| **ICIJ Extract** | documents | `docker` | [icij/extract](https://github.com/ICIJ/extract) | Pending | `passive_public` | `UNCONFIGURED` |
| **ICIJ Datashare** | documents | `docker` | [icij/datashare](https://github.com/ICIJ/datashare) | Pending | `passive_public` | `UNCONFIGURED` |
| **MISP** | threat-intelligence | `docker` | [misp/misp](https://github.com/MISP/MISP) | Pending | `passive_public` | `UNCONFIGURED` |
| **Sherloq** | media | `python` | [guidobartoli/sherloq](https://github.com/GuidoBartoli/sherloq) | Pending | `passive_public` | `UNCONFIGURED` |
| **MediaInfo** | media | `binary` | [mediaarea/mediainfo](https://github.com/MediaArea/MediaInfo) | Pending | `passive_public` | `UNCONFIGURED` |
| **WhatBreach** | secrets | `python` | [ekultek/whatbreach](https://github.com/Ekultek/WhatBreach) | Pending | `passive_public` | `UNCONFIGURED` |
| **Toutatis** | identity | `python` | [megadose/toutatis](https://github.com/megadose/toutatis) | Pending | `passive_public` | `UNCONFIGURED` |
| **Malwoverview** | threat-intelligence | `python` | [alexandreborges/malwoverview](https://github.com/alexandreborges/malwoverview) | Pending | `passive_public` | `UNCONFIGURED` |
| **Yeti** | threat-intelligence | `docker` | [yeti-platform/yeti](https://github.com/yeti-platform/yeti) | Pending | `passive_public` | `UNCONFIGURED` |
| **Cortex** | threat-intelligence | `docker` | [thehive-project/cortex](https://github.com/TheHive-Project/Cortex) | Pending | `passive_public` | `UNCONFIGURED` |
| **IPED** | documents | `binary` | [sepinf-inc/iped](https://github.com/sepinf-inc/IPED) | Pending | `passive_public` | `UNCONFIGURED` |
| **pyannote.audio** | media | `python` | [pyannote/pyannote-audio](https://github.com/pyannote/pyannote-audio) | Pending | `passive_public` | `UNCONFIGURED` |
| **Vosk API** | media | `python` | [alphacep/vosk-api](https://github.com/alphacep/vosk-api) | Pending | `passive_public` | `UNCONFIGURED` |
| **MISP Modules** | threat-intelligence | `python` | [misp/misp-modules](https://github.com/MISP/misp-modules) | Pending | `passive_public` | `UNCONFIGURED` |
| **Telethon** | identity | `python` | [lonamiwebs/telethon](https://github.com/LonamiWebs/Telethon) | Pending | `credentialed_public_api` | `AUTH_REQUIRED` |
| **Blackbird** | identity | `python` | [p1ngul1n0/blackbird](https://github.com/p1ngul1n0/blackbird) | Pending | `passive_public` | `UNCONFIGURED` |
| **OpenOSINT** | framework | `library-only` | [the-art-of-hacking/openosint](https://github.com/The-Art-of-Hacking/OpenOSINT) | Pending | `catalog_only` | `LIBRARY_ONLY` |
| **OSINT Framework** | framework | `gui-only` | [lockfale/osint-framework](https://github.com/lockfale/OSINT-Framework) | Pending | `catalog_only` | `GUI_ONLY` |
| **Assetfinder** | network | `go` | [tomnomnom/assetfinder](https://github.com/tomnomnom/assetfinder) | Pending | `passive_public` | `UNCONFIGURED` |
| **waybackurls** | network | `go` | [tomnomnom/waybackurls](https://github.com/tomnomnom/waybackurls) | Pending | `passive_public` | `UNCONFIGURED` |
| **Unfurl** | network | `python` | [obsidianforensics/unfurl](https://github.com/obsidianforensics/unfurl) | Pending | `passive_public` | `UNCONFIGURED` |
| **MetaDetective** | metadata | `python` | [accidental-rebel/metadetective](https://github.com/accidental-rebel/MetaDetective) | Pending | `passive_public` | `UNCONFIGURED` |
| **Metagoofil** | metadata | `python` | [laramies/metagoofil](https://github.com/laramies/metagoofil) | Pending | `passive_public` | `UNCONFIGURED` |
| **ExifLooter** | metadata | `go` | [aydinnydn/exiflooter](https://github.com/aydinnydn/ExifLooter) | Pending | `passive_public` | `UNCONFIGURED` |
| **pyWhat** | metadata | `python` | [bee-san/pywhat](https://github.com/bee-san/pyWhat) | Pending | `passive_public` | `UNCONFIGURED` |
| **Name-That-Hash** | metadata | `python` | [hashpals/name-that-hash](https://github.com/HashPals/Name-That-Hash) | Pending | `passive_public` | `UNCONFIGURED` |
| **detect-secrets** | secrets | `python` | [yelp/detect-secrets](https://github.com/Yelp/detect-secrets) | Pending | `passive_public` | `UNCONFIGURED` |
| **ggshield** | secrets | `python` | [gitguardian/ggshield](https://github.com/GitGuardian/ggshield) | Pending | `passive_public` | `UNCONFIGURED` |
| **KeyLeak-Detector** | secrets | `python` | [0xcyber/keyleak-detector](https://github.com/0xcyber/KeyLeak-Detector) | Pending | `passive_public` | `UNCONFIGURED` |
| **Leaker** | secrets | `python` | [the404hacking/leaker](https://github.com/The404Hacking/Leaker) | Pending | `passive_public` | `UNCONFIGURED` |
| **MailAccess** | secrets | `python` | [lone-ranger-op/mailaccess](https://github.com/Lone-Ranger-Op/MailAccess) | Pending | `passive_public` | `UNCONFIGURED` |
| **emploleaks** | secrets | `python` | [dievus/emploleaks](https://github.com/dievus/emploleaks) | Pending | `passive_public` | `UNCONFIGURED` |
| **Docling** | documents | `python` | [ds4sd/docling](https://github.com/DS4SD/docling) | Pending | `passive_public` | `UNCONFIGURED` |
| **kronikier** | web-archive | `python` | [marnix/kronikier](https://github.com/marnix/kronikier) | Pending | `passive_public` | `UNCONFIGURED` |

---

## 3. Complete Upstream Repository Inventory (Top 100 Sample)

| Tool ID | Name | Category | Runtime | Upstream URL | License | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ghunt` | GHunt | identity | `python` | [GitHub](https://github.com/mxrch/GHunt) | GPL-3.0 | `AUTH_REQUIRED` |
| `username-anarchy` | username-anarchy | identity | `python` | [GitHub](https://github.com/urbanadventurer/username-anarchy) | MIT | `UNCONFIGURED` |
| `vesper` | vesper | identity | `rust` | [GitHub](https://github.com/krishpranav/vesper) | MIT | `UNCONFIGURED` |
| `holehe` | Holehe | identity | `python` | [GitHub](https://github.com/megadose/holehe) | GPL-3.0 | `UNCONFIGURED` |
| `h8mail` | h8mail | secrets | `python` | [GitHub](https://github.com/khast3x/h8mail) | BSD-3-Clause | `UNCONFIGURED` |
| `pwnedornot` | pwnedOrNot | secrets | `python` | [GitHub](https://github.com/thewhiteh4t/pwnedOrNot) | GPL-3.0 | `UNCONFIGURED` |
| `zehef` | Zehef | identity | `python` | [GitHub](https://github.com/N0rz3/Zehef) | GPL-3.0 | `UNCONFIGURED` |
| `iky` | iKy | identity | `python` | [GitHub](https://github.com/kennbroorg/iKy) | GPL-3.0 | `UNCONFIGURED` |
| `mailcat` | mailcat | identity | `python` | [GitHub](https://github.com/sharsil/mailcat) | Apache-2.0 | `UNCONFIGURED` |
| `glit` | glit | identity | `rust` | [GitHub](https://github.com/shadawck/glit) | Unknown | `UNCONFIGURED` |
| `phoneinfoga` | PhoneInfoga | identity | `go` | [GitHub](https://github.com/sundowndev/phoneinfoga) | GPL-3.0 | `UNCONFIGURED` |
| `phunter` | Phunter | identity | `python` | [GitHub](https://github.com/N0rz3/Phunter) | GPL-3.0 | `UNCONFIGURED` |
| `odnoklassniki-checker` | odnoklassniki-checker | identity | `python` | [GitHub](https://github.com/OSINT-mindset/odnoklassniki-checker) | MIT | `UNCONFIGURED` |
| `theharvester` | theHarvester | network | `python` | [GitHub](https://github.com/laramies/theHarvester) | GPL-2.0 | `UNCONFIGURED` |
| `amass` | OWASP Amass | network | `go` | [GitHub](https://github.com/owasp-amass/amass) | Apache-2.0 | `UNCONFIGURED` |
| `subfinder` | Subfinder | network | `go` | [GitHub](https://github.com/projectdiscovery/subfinder) | MIT | `UNCONFIGURED` |
| `bbot` | BBOT | network | `python` | [GitHub](https://github.com/blacklanternsecurity/bbot) | GPL-3.0 | `UNCONFIGURED` |
| `oneforall` | OneForAll | framework | `python` | [GitHub](https://github.com/shmilylty/OneForAll) | GPL-3.0 | `UNCONFIGURED` |
| `reconftw` | reconFTW | framework | `python` | [GitHub](https://github.com/six2dez/reconftw) | MIT | `UNCONFIGURED` |
| `dnstwist` | dnstwist | framework | `python` | [GitHub](https://github.com/elceef/dnstwist) | Apache-2.0 | `UNCONFIGURED` |
| `knockpy` | Knockpy | framework | `python` | [GitHub](https://github.com/guelfoweb/knockpy) | GPL-3.0 | `UNCONFIGURED` |
| `findomain` | Findomain | network | `rust` | [GitHub](https://github.com/Findomain/Findomain) | GPL-3.0 | `UNCONFIGURED` |
| `finalrecon` | FinalRecon | framework | `python` | [GitHub](https://github.com/thewhiteh4t/FinalRecon) | MIT | `UNCONFIGURED` |
| `dnsx` | dnsx | network | `go` | [GitHub](https://github.com/projectdiscovery/dnsx) | MIT | `UNCONFIGURED` |
| `subdomainizer` | SubDomainizer | secrets | `python` | [GitHub](https://github.com/nsonaniya2010/SubDomainizer) | GPL-3.0 | `UNCONFIGURED` |
| `domain-digger` | domain-digger | framework | `node` | [GitHub](https://github.com/wotschofsky/domain-digger) | AGPL-3.0 | `UNCONFIGURED` |
| `dnsgen` | dnsgen | framework | `python` | [GitHub](https://github.com/AlephNullSK/dnsgen) | MIT | `UNCONFIGURED` |
| `opensquat` | openSquat | framework | `python` | [GitHub](https://github.com/atenreiro/opensquat) | GPL-3.0 | `UNCONFIGURED` |
| `subscraper` | subscraper | framework | `python` | [GitHub](https://github.com/m8sec/subscraper) | GPL-3.0 | `UNCONFIGURED` |
| `subdominator` | Subdominator | framework | `python` | [GitHub](https://github.com/RevoltSecurities/Subdominator) | MIT | `UNCONFIGURED` |
| `ivre` | IVRE | framework | `python` | [GitHub](https://github.com/ivre/ivre) | GPL-3.0 | `UNCONFIGURED` |
| `uncover` | Uncover | framework | `go` | [GitHub](https://github.com/projectdiscovery/uncover) | MIT | `UNCONFIGURED` |
| `ipinfo-cli` | IPinfo CLI | framework | `go` | [GitHub](https://github.com/ipinfo/cli) | Apache-2.0 | `UNCONFIGURED` |
| `asn` | asn | framework | `python` | [GitHub](https://github.com/nitefood/asn) | MIT | `UNCONFIGURED` |
| `metabigor` | Metabigor | framework | `go` | [GitHub](https://github.com/j3ssie/metabigor) | MIT | `UNCONFIGURED` |
| `harpoon` | Harpoon | threat-intelligence | `python` | [GitHub](https://github.com/Te-k/harpoon) | GPL-3.0 | `UNCONFIGURED` |
| `hosthunter` | HostHunter | framework | `python` | [GitHub](https://github.com/SpiderLabs/HostHunter) | MIT | `UNCONFIGURED` |
| `asnmap` | asnmap | framework | `go` | [GitHub](https://github.com/projectdiscovery/asnmap) | MIT | `UNCONFIGURED` |
| `pygreynoise` | pygreynoise | framework | `python` | [GitHub](https://github.com/GreyNoise-Intelligence/pygreynoise) | MIT | `UNCONFIGURED` |
| `web-check` | Web-Check | network | `node` | [GitHub](https://github.com/lissy93/web-check) | MIT | `UNCONFIGURED` |
| `changedetection-io` | changedetection.io | network | `python` | [GitHub](https://github.com/dgtlmoon/changedetection.io) | Apache-2.0 | `UNCONFIGURED` |
| `singlefile` | SingleFile | network | `node` | [GitHub](https://github.com/gildas-lormeau/SingleFile) | AGPL-3.0 | `UNCONFIGURED` |
| `photon` | Photon | network | `python` | [GitHub](https://github.com/s0md3v/Photon) | GPL-3.0 | `UNCONFIGURED` |
| `hakrawler` | hakrawler | network | `go` | [GitHub](https://github.com/hakluke/hakrawler) | GPL-3.0 | `UNCONFIGURED` |
| `gau` | gau | network | `go` | [GitHub](https://github.com/lc/gau) | MIT | `UNCONFIGURED` |
| `torbot` | TorBot | network | `python` | [GitHub](https://github.com/DedSecInside/TorBot) | Unknown | `UNCONFIGURED` |
| `cariddi` | Cariddi | secrets | `go` | [GitHub](https://github.com/edoardottt/cariddi) | GPL-3.0 | `UNCONFIGURED` |
| `pagodo` | pagodo | network | `python` | [GitHub](https://github.com/opsdisk/pagodo) | GPL-3.0 | `UNCONFIGURED` |
| `waybackpack` | waybackpack | web-archive | `python` | [GitHub](https://github.com/jsvine/waybackpack) | MIT | `UNCONFIGURED` |
| `paramspider` | ParamSpider | network | `python` | [GitHub](https://github.com/devanshbatham/ParamSpider) | MIT | `UNCONFIGURED` |
| `waymore` | waymore | network | `python` | [GitHub](https://github.com/xnl-h4ck3r/waymore) | MIT | `UNCONFIGURED` |
| `mitaka` | Mitaka | network | `node` | [GitHub](https://github.com/ninoseki/mitaka) | MIT | `UNCONFIGURED` |
| `blackwidow` | BlackWidow | network | `python` | [GitHub](https://github.com/1N3/BlackWidow) | Unknown | `UNCONFIGURED` |
| `urlhunter` | urlhunter | network | `go` | [GitHub](https://github.com/utkusen/urlhunter) | MIT | `UNCONFIGURED` |
| `darkdump` | darkdump | network | `python` | [GitHub](https://github.com/josh0xA/darkdump) | MIT | `UNCONFIGURED` |
| `goofuzz` | GooFuzz | network | `python` | [GitHub](https://github.com/m3n0sd0n4ld/GooFuzz) | GPL-3.0 | `UNCONFIGURED` |
| `favfreak` | FavFreak | network | `python` | [GitHub](https://github.com/devanshbatham/FavFreak) | MIT | `UNCONFIGURED` |
| `xurlfind3r` | xurlfind3r | network | `go` | [GitHub](https://github.com/hueristiq/xurlfind3r) | MIT | `UNCONFIGURED` |
| `waybackpy` | waybackpy | network | `python` | [GitHub](https://github.com/akamhy/waybackpy) | MIT | `UNCONFIGURED` |
| `exiftool` | ExifTool | metadata | `binary` | [GitHub](https://github.com/exiftool/exiftool) | Artistic-1.0 | `UNCONFIGURED` |
| `exiflooter` | ExifLooter | framework | `go` | [GitHub](https://github.com/aydinnyunus/exifLooter) | Apache-2.0 | `UNCONFIGURED` |
| `gvision` | GVision | media | `python` | [GitHub](https://github.com/GONZOsint/gvision) | Unlicense | `UNCONFIGURED` |
| `lingolens` | lingolens | media | `python` | [GitHub](https://github.com/OSINT-mindset/lingolens) | MIT | `UNCONFIGURED` |
| `photosint` | PhotOSINT | media | `node` | [GitHub](https://github.com/Haris87/photosint) | GPL-3.0 | `UNCONFIGURED` |
| `geowifi` | GeoWiFi | framework | `python` | [GitHub](https://github.com/GONZOsint/geowifi) | Unknown | `UNCONFIGURED` |
| `shadowfinder` | ShadowFinder | framework | `python` | [GitHub](https://github.com/bellingcat/ShadowFinder) | MIT | `UNCONFIGURED` |
| `aleph` | Aleph | documents | `node` | [GitHub](https://github.com/alephdata/aleph) | MIT | `UNCONFIGURED` |
| `cloud-enum` | cloud_enum | documents | `python` | [GitHub](https://github.com/initstring/cloud_enum) | MIT | `UNCONFIGURED` |
| `emploleaks` | emploleaks | documents | `python` | [GitHub](https://github.com/infobyte/emploleaks) | Unknown | `UNCONFIGURED` |
| `opensanctions` | OpenSanctions | identity | `python` | [GitHub](https://github.com/opensanctions/opensanctions) | MIT | `UNCONFIGURED` |
| `bitcoin-etl` | Bitcoin ETL | framework | `python` | [GitHub](https://github.com/blockchain-etl/bitcoin-etl) | MIT | `UNCONFIGURED` |
| `all-in-one-bot` | all-in-one-bot | framework | `go` | [GitHub](https://github.com/uerax/all-in-one-bot) | Unknown | `UNCONFIGURED` |
| `graphsense-dashboard` | GraphSense Dashboard | framework | `python` | [GitHub](https://github.com/graphsense/graphsense-dashboard) | MIT | `UNCONFIGURED` |
| `graphsense-library` | GraphSense Library | framework | `python` | [GitHub](https://github.com/graphsense/graphsense-lib) | MIT | `UNCONFIGURED` |
| `spiderfoot` | SpiderFoot | framework | `python` | [GitHub](https://github.com/smicallef/spiderfoot) | MIT | `UNCONFIGURED` |
| `opencti` | OpenCTI | threat-intelligence | `docker` | [GitHub](https://github.com/OpenCTI-Platform/opencti) | Apache-2.0 | `AUTH_REQUIRED` |
| `recon-ng` | Recon-ng | network | `python` | [GitHub](https://github.com/lanmaster53/recon-ng) | GPL-3.0 | `UNCONFIGURED` |
| `intelowl` | IntelOwl | threat-intelligence | `docker` | [GitHub](https://github.com/intelowlproject/IntelOwl) | AGPL-3.0 | `AUTH_REQUIRED` |
| `mr-holmes` | Mr.Holmes | framework | `python` | [GitHub](https://github.com/Lucksi/Mr.Holmes) | GPL-3.0 | `UNCONFIGURED` |
| `x-osint` | X-osint | framework | `python` | [GitHub](https://github.com/TermuxHackz/X-osint) | GPL-3.0 | `UNCONFIGURED` |
| `sn0int` | sn0int | framework | `rust` | [GitHub](https://github.com/kpcyrd/sn0int) | GPL-3.0 | `UNCONFIGURED` |
| `watcher` | Watcher | threat-intelligence | `node` | [GitHub](https://github.com/thalesgroup-cert/Watcher) | AGPL-3.0 | `UNCONFIGURED` |
| `open-semantic-search` | Open Semantic Search | documents | `python` | [GitHub](https://github.com/opensemanticsearch/open-semantic-search) | GPL-3.0 | `UNCONFIGURED` |
| `taranis-ai` | Taranis AI | threat-intelligence | `python` | [GitHub](https://github.com/taranis-ai/taranis-ai) | EUPL-1.2 | `UNCONFIGURED` |
| `mihari` | Mihari | threat-intelligence | `python` | [GitHub](https://github.com/ninoseki/mihari) | MIT | `UNCONFIGURED` |
| `threatingestor` | ThreatIngestor | threat-intelligence | `python` | [GitHub](https://github.com/pedramamini/ThreatIngestor) | GPL-2.0 | `UNCONFIGURED` |
| `seekr` | Seekr | framework | `go` | [GitHub](https://github.com/seekr-osint/seekr) | GPL-3.0 | `UNCONFIGURED` |
| `linkscope-client` | LinkScope Client | framework | `python` | [GitHub](https://github.com/AccentuSoft/LinkScope_Client) | AGPL-3.0 | `UNCONFIGURED` |
| `ronin-recon` | Ronin Recon | framework | `python` | [GitHub](https://github.com/ronin-rb/ronin-recon) | LGPL-3.0 | `UNCONFIGURED` |
| `sherlock` | Sherlock | identity | `python` | [GitHub](https://github.com/sherlock-project/sherlock) | MIT | `UNCONFIGURED` |
| `maigret` | Maigret | identity | `python` | [GitHub](https://github.com/soxoj/maigret) | MIT | `UNCONFIGURED` |
| `social-analyzer` | Social Analyzer | identity | `node` | [GitHub](https://github.com/qeeqbox/social-analyzer) | AGPL-3.0 | `UNCONFIGURED` |
| `blackbird` | Blackbird | identity | `python` | [GitHub](https://github.com/antoniaci/blackbird) | Unknown | `UNCONFIGURED` |
| `snoop` | Snoop | identity | `python` | [GitHub](https://github.com/snooppr/snoop) | GPL-3.0 | `UNCONFIGURED` |
| `gosearch` | gosearch | identity | `go` | [GitHub](https://github.com/ibnaleem/gosearch) | GPL-3.0 | `UNCONFIGURED` |
| `user-scanner` | user-scanner | identity | `python` | [GitHub](https://github.com/kaifcodec/user-scanner) | MIT | `UNCONFIGURED` |
| `whatsmyname` | WhatsMyName | identity | `dataset-only` | [GitHub](https://github.com/WebBreacher/WhatsMyName) | CC-BY-SA-4.0 | `DATASET_ONLY` |
| `tookie` | Tookie | identity | `python` | [GitHub](https://github.com/Alfredredbird/tookie-osint) | MIT | `UNCONFIGURED` |
| `aliens-eye` | Aliens Eye | identity | `python` | [GitHub](https://github.com/arxhr007/Aliens_eye) | MIT | `UNCONFIGURED` |
| `socid-extractor` | socid-extractor | identity | `python` | [GitHub](https://github.com/soxoj/socid-extractor) | MIT | `UNCONFIGURED` |

*(Full machine-readable manifest containing all 512 repositories is available in `reports/osint-runtime-report.json`)*
