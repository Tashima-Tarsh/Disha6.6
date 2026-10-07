export type OsintSourceCategory =
  | "master_directory"
  | "search_archive"
  | "media_verification"
  | "geolocation"
  | "conflict_events"
  | "corporate_financial"
  | "transparency_leaks"
  | "movement_tracking"
  | "vehicle_registry"
  | "social_media"
  | "internet_scanner"
  | "malware_ioc"
  | "domain_infrastructure"
  | "breach_exposure"
  | "vulnerability"
  | "adversary_knowledge"
  | "framework"
  | "orbital_tracking"
  | "satellite_database"
  | "space_situational_awareness"
  | "space_signals"
  | "earth_observation"
  | "commercial_imagery"
  | "space_policy"
  | "launch_activity"
  | "space_weather";

export type OsintSourceMode =
  | "builtin"
  | "connector_ready"
  | "requires_configuration"
  | "reference_only"
  | "blocked_by_default";

export type OsintSourceAuth = "none" | "api_key" | "account" | "paid" | "varies";
export type OsintSourceRisk = "low" | "moderate" | "restricted";

export type OsintSourceUniverseEntry = {
  id: string;
  name: string;
  category: OsintSourceCategory;
  homeUrl: string;
  mode: OsintSourceMode;
  auth: OsintSourceAuth;
  risk: OsintSourceRisk;
  capabilities: string[];
  notes: string;
  adapterId?: string;
};

export const osintSourceUniverse: OsintSourceUniverseEntry[] = [
  { id:"osint-framework", name:"OSINT Framework", category:"master_directory", homeUrl:"https://osintframework.com/", mode:"reference_only", auth:"none", risk:"low", capabilities:["tool discovery","category navigation"], notes:"Directory only; linked tools require independent review." },
  { id:"bellingcat-toolkit", name:"Bellingcat Online Investigations Toolkit", category:"master_directory", homeUrl:"https://www.bellingcat.com/resources/how-tos/", mode:"reference_only", auth:"none", risk:"low", capabilities:["investigation guides","tool discovery","verification workflows"], notes:"Use as a vetted research reference, not an automated collection endpoint." },
  { id:"startme-osint", name:"Start.me OSINT dashboards", category:"master_directory", homeUrl:"https://start.me/", mode:"reference_only", auth:"account", risk:"low", capabilities:["community-curated source dashboards"], notes:"Community pages vary in quality and availability." },
  { id:"inteltechniques", name:"IntelTechniques Search Tools", category:"master_directory", homeUrl:"https://inteltechniques.com/tools/", mode:"reference_only", auth:"none", risk:"moderate", capabilities:["search workflows","people/domain/social lookups"], notes:"Search launchpad; individual destinations keep their own terms and privacy constraints." },
  { id:"awesome-osint", name:"Awesome OSINT", category:"master_directory", homeUrl:"https://github.com/jivoi/awesome-osint", mode:"reference_only", auth:"none", risk:"low", capabilities:["large OSINT source index"], notes:"Catalog only; every linked source must be reviewed separately." },
  { id:"aware-online", name:"Aware Online", category:"master_directory", homeUrl:"https://www.aware-online.com/", mode:"reference_only", auth:"varies", risk:"moderate", capabilities:["OSINT training","tool discovery"], notes:"External research/training collection." },
  { id:"osint-combine", name:"OSINT Combine", category:"master_directory", homeUrl:"https://www.osintcombine.com/", mode:"reference_only", auth:"varies", risk:"moderate", capabilities:["OSINT training","tool collection"], notes:"External research/training collection." },
  { id:"trace-labs", name:"Trace Labs", category:"master_directory", homeUrl:"https://www.tracelabs.org/", mode:"reference_only", auth:"account", risk:"moderate", capabilities:["OSINT training","missing-person investigation methodology"], notes:"Human-led workflows; no autonomous personal tracking." },

  { id:"google-search-operators", name:"Google search operators / GHDB", category:"search_archive", homeUrl:"https://www.exploit-db.com/google-hacking-database", mode:"reference_only", auth:"none", risk:"moderate", capabilities:["advanced public web search"], notes:"Queries must stay within public lawful research; do not use to seek exposed credentials or secrets." },
  { id:"wayback", name:"Internet Archive Wayback Machine", category:"search_archive", homeUrl:"https://web.archive.org/", mode:"builtin", auth:"none", risk:"low", adapterId:"public-wayback-cdx", capabilities:["historical web snapshots"], notes:"DISHA has a governed CDX adapter." },
  { id:"archive-today", name:"archive.today", category:"search_archive", homeUrl:"https://archive.today/", mode:"reference_only", auth:"none", risk:"low", capabilities:["web snapshots"], notes:"No stable production API assumed." },
  { id:"yandex-images", name:"Yandex Images", category:"search_archive", homeUrl:"https://yandex.com/images/", mode:"reference_only", auth:"none", risk:"moderate", capabilities:["reverse image search"], notes:"Interactive external service." },
  { id:"tineye", name:"TinEye", category:"search_archive", homeUrl:"https://tineye.com/", mode:"requires_configuration", auth:"api_key", risk:"low", capabilities:["reverse image search"], notes:"API access is credentialed/commercial." },
  { id:"google-lens", name:"Google Lens", category:"search_archive", homeUrl:"https://lens.google/", mode:"reference_only", auth:"varies", risk:"moderate", capabilities:["visual search","reverse image investigation"], notes:"Interactive external service; no scraping adapter." },

  { id:"invid-weverify", name:"InVID-WeVerify", category:"media_verification", homeUrl:"https://www.invid-project.eu/tools-and-services/invid-verification-plugin/", mode:"reference_only", auth:"none", risk:"low", capabilities:["video verification","keyframes","metadata assistance"], notes:"Browser/plugin workflow." },
  { id:"forensically", name:"Forensically", category:"media_verification", homeUrl:"https://29a.ch/photo-forensics/", mode:"reference_only", auth:"none", risk:"low", capabilities:["image forensics","ELA","clone detection"], notes:"Human interpretation required." },
  { id:"amnesty-youtube-dataviewer", name:"Amnesty YouTube DataViewer", category:"media_verification", homeUrl:"https://citizenevidence.org/", mode:"reference_only", auth:"none", risk:"low", capabilities:["video verification","thumbnail extraction"], notes:"External verification workflow." },

  { id:"google-earth-pro", name:"Google Earth Pro", category:"geolocation", homeUrl:"https://www.google.com/earth/about/versions/", mode:"reference_only", auth:"none", risk:"low", capabilities:["historical imagery","geolocation"], notes:"Desktop/manual research workflow." },
  { id:"suncalc", name:"SunCalc", category:"geolocation", homeUrl:"https://www.suncalc.org/", mode:"reference_only", auth:"none", risk:"low", capabilities:["sun position","shadow/time analysis"], notes:"Manual geolocation aid." },
  { id:"mapillary", name:"Mapillary", category:"geolocation", homeUrl:"https://www.mapillary.com/", mode:"requires_configuration", auth:"api_key", risk:"moderate", capabilities:["street-level imagery","geolocation"], notes:"Use provider API/terms; avoid covert tracking of private individuals." },
  { id:"overpass-turbo", name:"Overpass Turbo", category:"geolocation", homeUrl:"https://overpass-turbo.eu/", mode:"connector_ready", auth:"none", risk:"low", capabilities:["OpenStreetMap queries","geospatial features"], notes:"Suitable for bounded public geospatial queries." },

  { id:"gdelt", name:"GDELT", category:"conflict_events", homeUrl:"https://www.gdeltproject.org/", mode:"builtin", auth:"none", risk:"low", adapterId:"public-gdelt-news", capabilities:["global news discovery","event reporting"], notes:"DISHA has a governed public-news adapter." },
  { id:"acled", name:"ACLED", category:"conflict_events", homeUrl:"https://acleddata.com/", mode:"requires_configuration", auth:"api_key", risk:"moderate", capabilities:["political violence","protest/event data"], notes:"Credentialed dataset; licensing and attribution requirements apply." },
  { id:"liveuamap", name:"Liveuamap", category:"conflict_events", homeUrl:"https://liveuamap.com/", mode:"reference_only", auth:"varies", risk:"moderate", capabilities:["conflict/event map"], notes:"Use for discovery; corroborate events with primary/independent sources." },
  { id:"isw", name:"Institute for the Study of War", category:"conflict_events", homeUrl:"https://www.understandingwar.org/", mode:"reference_only", auth:"none", risk:"low", capabilities:["conflict assessments","maps"], notes:"Analytical source, not a primary event API." },
  { id:"reliefweb", name:"ReliefWeb", category:"conflict_events", homeUrl:"https://reliefweb.int/", mode:"requires_configuration", auth:"account", risk:"low", adapterId:"public-reliefweb", capabilities:["humanitarian reports","disaster updates","API"], notes:"DISHA has a governed adapter that becomes healthy when RELIEFWEB_APPNAME is configured with a pre-approved appname." },

  { id:"opencorporates", name:"OpenCorporates", category:"corporate_financial", homeUrl:"https://opencorporates.com/", mode:"requires_configuration", auth:"api_key", risk:"moderate", adapterId:"public-opencorporates", capabilities:["company registry aggregation","officer/company relationships"], notes:"DISHA can query public company/officer candidates when OPENCORPORATES_API_TOKEN is configured; API/licensing terms apply." },
  { id:"occrp-aleph", name:"OCCRP Aleph", category:"corporate_financial", homeUrl:"https://aleph.occrp.org/", mode:"requires_configuration", auth:"account", risk:"moderate", capabilities:["entity search","document/public-record collections"], notes:"Respect dataset-specific access controls and source terms." },
  { id:"icij-offshore-leaks", name:"ICIJ Offshore Leaks Database", category:"corporate_financial", homeUrl:"https://offshoreleaks.icij.org/", mode:"reference_only", auth:"none", risk:"moderate", capabilities:["offshore entity/public-record research"], notes:"Use as sourced investigative material; avoid unsupported guilt-by-association conclusions." },
  { id:"sec-edgar", name:"SEC EDGAR", category:"corporate_financial", homeUrl:"https://www.sec.gov/edgar", mode:"builtin", auth:"none", risk:"low", adapterId:"public-sec-edgar", capabilities:["company filings","official corporate disclosures"], notes:"DISHA has an official public filing adapter." },
  { id:"ofac-sanctions", name:"OFAC Sanctions Lists", category:"corporate_financial", homeUrl:"https://ofac.treasury.gov/sanctions-list-service", mode:"connector_ready", auth:"none", risk:"low", capabilities:["official sanctions lists"], notes:"Official source; name matches require human verification." },
  { id:"opensanctions", name:"OpenSanctions", category:"corporate_financial", homeUrl:"https://www.opensanctions.org/", mode:"requires_configuration", auth:"api_key", risk:"moderate", adapterId:"public-opensanctions", capabilities:["sanctions screening","PEP/entity search","entity graph"], notes:"DISHA can run user-facing entity discovery when OPENSANCTIONS_API_KEY is configured; search relevance is not identity-match confidence." },

  { id:"ddosecrets", name:"Distributed Denial of Secrets", category:"transparency_leaks", homeUrl:"https://ddosecrets.com/", mode:"blocked_by_default", auth:"varies", risk:"restricted", capabilities:["leak/archive discovery"], notes:"No automated ingestion of leaked/private data. Legal review and explicit authorization required." },
  { id:"wikileaks", name:"WikiLeaks archive", category:"transparency_leaks", homeUrl:"https://wikileaks.org/", mode:"blocked_by_default", auth:"none", risk:"restricted", capabilities:["published leak archive"], notes:"No automated ingestion of leaked/private data. Legal review and source-by-source assessment required." },

  { id:"vahan-national-transport", name:"VAHAN / National Transport Repository", category:"vehicle_registry", homeUrl:"https://parivahan.gov.in/", mode:"requires_configuration", auth:"varies", risk:"moderate", capabilities:["vehicle registration lookup","vehicle class/status","registration validity","permit/insurance fields subject to entitlement"], notes:"DISHA recognizes Indian registration identifiers, but registry data remains non-executable until a reviewed authorized data/API entitlement is configured." },
  { id:"parivahan-echallan", name:"Parivahan eChallan", category:"vehicle_registry", homeUrl:"https://echallan.parivahan.gov.in/", mode:"requires_configuration", auth:"varies", risk:"moderate", capabilities:["vehicle challan/enforcement status subject to authorized access"], notes:"No scraping or CAPTCHA bypass. Automated enrichment requires an approved public or authorized connector." },

  { id:"adsb-exchange", name:"ADS-B Exchange", category:"movement_tracking", homeUrl:"https://www.adsbexchange.com/", mode:"requires_configuration", auth:"api_key", risk:"moderate", capabilities:["aircraft tracking","ADS-B data"], notes:"Use for public aviation analysis, not covert tracking of private individuals." },
  { id:"flightradar24", name:"Flightradar24", category:"movement_tracking", homeUrl:"https://www.flightradar24.com/", mode:"requires_configuration", auth:"paid", risk:"moderate", capabilities:["flight tracking","aviation history"], notes:"Provider terms and plan limits apply." },
  { id:"marinetraffic", name:"MarineTraffic", category:"movement_tracking", homeUrl:"https://www.marinetraffic.com/", mode:"requires_configuration", auth:"paid", risk:"moderate", capabilities:["AIS vessel tracking"], notes:"Provider terms apply; avoid personal stalking use." },
  { id:"vesselfinder", name:"VesselFinder", category:"movement_tracking", homeUrl:"https://www.vesselfinder.com/", mode:"requires_configuration", auth:"paid", risk:"moderate", capabilities:["AIS vessel tracking"], notes:"Provider terms apply." },
  { id:"global-fishing-watch", name:"Global Fishing Watch", category:"movement_tracking", homeUrl:"https://globalfishingwatch.org/", mode:"requires_configuration", auth:"api_key", risk:"low", capabilities:["fishing vessel activity","maritime analytics"], notes:"Public-interest maritime analytics; API access may require registration." },

  { id:"x-advanced-search", name:"X Advanced Search", category:"social_media", homeUrl:"https://x.com/search-advanced", mode:"reference_only", auth:"account", risk:"moderate", capabilities:["public post search"], notes:"Interactive search only unless an approved API connector is configured." },
  { id:"tgstat", name:"TGStat", category:"social_media", homeUrl:"https://tgstat.com/", mode:"requires_configuration", auth:"varies", risk:"moderate", capabilities:["public Telegram analytics","channel discovery"], notes:"Public channel research only; respect service terms and privacy boundaries." },
  { id:"telemetrio", name:"Telemetrio", category:"social_media", homeUrl:"https://telemetr.io/", mode:"requires_configuration", auth:"varies", risk:"moderate", capabilities:["public Telegram analytics","channel discovery"], notes:"Public channel research only." },
  { id:"reddit-search", name:"Reddit Search", category:"social_media", homeUrl:"https://www.reddit.com/search/", mode:"reference_only", auth:"varies", risk:"moderate", capabilities:["public discussion search"], notes:"Use public content and official/API-approved access paths." },
  { id:"social-searcher", name:"Social Searcher", category:"social_media", homeUrl:"https://www.social-searcher.com/", mode:"requires_configuration", auth:"varies", risk:"moderate", capabilities:["social/web mention search"], notes:"External service; terms and API availability vary." },

  { id:"shodan", name:"Shodan", category:"internet_scanner", homeUrl:"https://www.shodan.io/", mode:"requires_configuration", auth:"api_key", risk:"moderate", capabilities:["internet-exposed service search","host metadata"], notes:"Passive query adapter only; no active probing." },
  { id:"censys", name:"Censys", category:"internet_scanner", homeUrl:"https://search.censys.io/", mode:"requires_configuration", auth:"api_key", risk:"moderate", capabilities:["internet asset search","certificate/host metadata"], notes:"Passive provider queries only." },
  { id:"zoomeye", name:"ZoomEye", category:"internet_scanner", homeUrl:"https://www.zoomeye.org/", mode:"requires_configuration", auth:"api_key", risk:"moderate", capabilities:["internet asset search"], notes:"Passive provider queries only." },
  { id:"fofa", name:"FOFA", category:"internet_scanner", homeUrl:"https://fofa.info/", mode:"requires_configuration", auth:"api_key", risk:"moderate", capabilities:["internet asset search"], notes:"Passive provider queries only." },
  { id:"netlas", name:"Netlas", category:"internet_scanner", homeUrl:"https://netlas.io/", mode:"requires_configuration", auth:"api_key", risk:"moderate", capabilities:["internet asset search","DNS/certificate data"], notes:"Passive provider queries only." },
  { id:"greynoise", name:"GreyNoise", category:"internet_scanner", homeUrl:"https://www.greynoise.io/", mode:"requires_configuration", auth:"api_key", risk:"moderate", capabilities:["internet noise/context","IP intelligence"], notes:"Use for defensive enrichment." },

  { id:"virustotal", name:"VirusTotal", category:"malware_ioc", homeUrl:"https://www.virustotal.com/", mode:"requires_configuration", auth:"api_key", risk:"moderate", capabilities:["file/URL/domain/IP reputation","malware intelligence"], notes:"Respect sample-sharing and privacy implications before submission." },
  { id:"urlhaus", name:"URLhaus", category:"malware_ioc", homeUrl:"https://urlhaus.abuse.ch/", mode:"requires_configuration", auth:"api_key", risk:"low", capabilities:["malicious URL feed"], notes:"Current community API and data access require an abuse.ch Auth-Key; no DISHA lookup adapter is promoted yet." },
  { id:"malwarebazaar", name:"MalwareBazaar", category:"malware_ioc", homeUrl:"https://bazaar.abuse.ch/", mode:"requires_configuration", auth:"api_key", risk:"moderate", adapterId:"public-malwarebazaar", capabilities:["malware sample metadata","hash intelligence"], notes:"DISHA performs metadata-only hash lookup when MALWAREBAZAAR_AUTH_KEY is configured; malware samples are never downloaded by this adapter." },
  { id:"threatfox", name:"ThreatFox", category:"malware_ioc", homeUrl:"https://threatfox.abuse.ch/", mode:"requires_configuration", auth:"api_key", risk:"low", adapterId:"public-threatfox", capabilities:["IOC feed","malware-family context","hash-to-IOC search"], notes:"DISHA has a governed lookup adapter that becomes executable when THREATFOX_AUTH_KEY is configured." },
  { id:"alienvault-otx", name:"AlienVault OTX", category:"malware_ioc", homeUrl:"https://otx.alienvault.com/", mode:"requires_configuration", auth:"api_key", risk:"low", capabilities:["IOC pulses","threat feeds"], notes:"Credentialed community feed." },
  { id:"hybrid-analysis", name:"Hybrid Analysis", category:"malware_ioc", homeUrl:"https://www.hybrid-analysis.com/", mode:"requires_configuration", auth:"api_key", risk:"moderate", capabilities:["malware sandbox reports","IOC enrichment"], notes:"Do not submit sensitive/private files automatically." },
  { id:"anyrun", name:"ANY.RUN", category:"malware_ioc", homeUrl:"https://any.run/", mode:"requires_configuration", auth:"paid", risk:"moderate", capabilities:["interactive malware analysis","sandbox reports"], notes:"No automated private-file submission." },
  { id:"urlscan", name:"urlscan.io", category:"malware_ioc", homeUrl:"https://urlscan.io/", mode:"requires_configuration", auth:"api_key", risk:"moderate", capabilities:["URL scan reports","web infrastructure"], notes:"Scanning a URL can disclose the target to the provider; require explicit operator intent for submissions." },
  { id:"misp", name:"MISP communities", category:"malware_ioc", homeUrl:"https://www.misp-project.org/", mode:"requires_configuration", auth:"api_key", risk:"moderate", capabilities:["threat sharing","IOC feeds","STIX-like exchange"], notes:"Connector depends on the configured MISP instance and sharing groups." },

  { id:"crtsh", name:"crt.sh", category:"domain_infrastructure", homeUrl:"https://crt.sh/", mode:"builtin", auth:"none", risk:"low", adapterId:"public-certificate-transparency", capabilities:["certificate transparency search"], notes:"DISHA has a governed public CT adapter." },
  { id:"securitytrails", name:"SecurityTrails", category:"domain_infrastructure", homeUrl:"https://securitytrails.com/", mode:"requires_configuration", auth:"api_key", risk:"moderate", capabilities:["DNS history","domain intelligence"], notes:"Credentialed provider." },
  { id:"dnsdumpster", name:"DNSDumpster", category:"domain_infrastructure", homeUrl:"https://dnsdumpster.com/", mode:"reference_only", auth:"none", risk:"moderate", capabilities:["DNS/host discovery"], notes:"Interactive service; no scraping adapter." },
  { id:"viewdns", name:"ViewDNS", category:"domain_infrastructure", homeUrl:"https://viewdns.info/", mode:"requires_configuration", auth:"api_key", risk:"moderate", capabilities:["DNS/domain utilities"], notes:"Use provider API where configured." },
  { id:"bgphe", name:"BGP.he.net", category:"domain_infrastructure", homeUrl:"https://bgp.he.net/", mode:"reference_only", auth:"none", risk:"low", capabilities:["BGP/ASN relationships"], notes:"Reference service; prefer structured RIR/RDAP APIs for automation." },
  { id:"ripe-stat", name:"RIPEstat", category:"domain_infrastructure", homeUrl:"https://stat.ripe.net/", mode:"builtin", auth:"none", risk:"low", adapterId:"public-ripestat-whois", capabilities:["IP/ASN/RPKI/routing data","API"], notes:"DISHA has a governed passive Whois/RIR enrichment adapter." },
  { id:"cloudflare-radar", name:"Cloudflare Radar", category:"domain_infrastructure", homeUrl:"https://radar.cloudflare.com/", mode:"requires_configuration", auth:"api_key", risk:"low", capabilities:["internet traffic/trends","routing/security insights"], notes:"API access requires configured credentials." },

  { id:"hibp", name:"Have I Been Pwned", category:"breach_exposure", homeUrl:"https://haveibeenpwned.com/", mode:"requires_configuration", auth:"api_key", risk:"restricted", capabilities:["breach exposure checks"], notes:"Only authorized/self/account-protection workflows; do not bulk-enumerate people." },
  { id:"intelligence-x", name:"Intelligence X", category:"breach_exposure", homeUrl:"https://intelx.io/", mode:"blocked_by_default", auth:"paid", risk:"restricted", capabilities:["historical/search datasets"], notes:"Potentially sensitive/leaked-data access; requires legal review and explicit authorization." },
  { id:"dehashed", name:"DeHashed", category:"breach_exposure", homeUrl:"https://www.dehashed.com/", mode:"blocked_by_default", auth:"paid", risk:"restricted", capabilities:["credential/breach exposure search"], notes:"No default execution. Authorized defensive account exposure checks only where lawful." },

  { id:"nvd", name:"NVD", category:"vulnerability", homeUrl:"https://nvd.nist.gov/", mode:"builtin", auth:"none", risk:"low", adapterId:"public-nvd-cve", capabilities:["CVE enrichment","CVSS/CPE metadata","API"], notes:"DISHA has a governed NVD CVE API adapter; unauthenticated rate limits apply." },
  { id:"cve-org", name:"CVE.org", category:"vulnerability", homeUrl:"https://www.cve.org/", mode:"connector_ready", auth:"none", risk:"low", capabilities:["CVE records","CNA data"], notes:"Official CVE Program source." },
  { id:"cisa-kev", name:"CISA KEV", category:"vulnerability", homeUrl:"https://www.cisa.gov/known-exploited-vulnerabilities-catalog", mode:"builtin", auth:"none", risk:"low", adapterId:"public-cisa-kev", capabilities:["known exploited vulnerability catalog"], notes:"DISHA has a defensive KEV adapter." },
  { id:"exploit-db", name:"Exploit-DB", category:"vulnerability", homeUrl:"https://www.exploit-db.com/", mode:"reference_only", auth:"none", risk:"moderate", capabilities:["public exploit references"], notes:"Reference metadata only; Universal Search must not execute exploit code." },
  { id:"epss", name:"EPSS", category:"vulnerability", homeUrl:"https://www.first.org/epss/", mode:"builtin", auth:"none", risk:"low", adapterId:"public-epss", capabilities:["exploit probability scores","API"], notes:"DISHA has a governed FIRST EPSS adapter; probability is a prioritization signal, not certainty." },

  { id:"mitre-attack", name:"MITRE ATT&CK", category:"adversary_knowledge", homeUrl:"https://attack.mitre.org/", mode:"connector_ready", auth:"none", risk:"low", capabilities:["adversary techniques","groups","software","STIX"], notes:"Good candidate for structured STIX enrichment." },
  { id:"ransomware-live", name:"ransomware.live", category:"adversary_knowledge", homeUrl:"https://ransomware.live/", mode:"connector_ready", auth:"none", risk:"moderate", capabilities:["ransomware victim/group monitoring"], notes:"Treat actor claims as unverified until corroborated." },
  { id:"ransomlook", name:"RansomLook", category:"adversary_knowledge", homeUrl:"https://www.ransomlook.io/", mode:"connector_ready", auth:"none", risk:"moderate", capabilities:["ransomware intelligence"], notes:"Treat actor claims as unverified until corroborated." },
  { id:"malpedia", name:"Malpedia", category:"adversary_knowledge", homeUrl:"https://malpedia.caad.fkie.fraunhofer.de/", mode:"requires_configuration", auth:"account", risk:"low", capabilities:["malware families","actors","YARA/reference intelligence"], notes:"Account/terms may apply." },

  { id:"maltego", name:"Maltego", category:"framework", homeUrl:"https://www.maltego.com/", mode:"requires_configuration", auth:"paid", risk:"moderate", capabilities:["link analysis","transforms","investigation graph"], notes:"External platform; transforms must be individually governed." },
  { id:"spiderfoot", name:"SpiderFoot", category:"framework", homeUrl:"https://github.com/smicallef/spiderfoot", mode:"requires_configuration", auth:"varies", risk:"moderate", capabilities:["multi-source OSINT automation","correlation"], notes:"Reviewed for a future passive-only integration. Not executable in the current worker image until a compatible isolated runtime and module allowlist are packaged and smoke-tested." },
  { id:"recon-ng", name:"Recon-ng", category:"framework", homeUrl:"https://github.com/lanmaster53/recon-ng", mode:"reference_only", auth:"varies", risk:"moderate", capabilities:["modular OSINT"], notes:"Module-by-module review required." },
  { id:"theharvester", name:"theHarvester", category:"framework", homeUrl:"https://github.com/laramies/theHarvester", mode:"builtin", auth:"varies", risk:"moderate", adapterId:"astra6-theharvester", capabilities:["search-provider aggregation","domain discovery"], notes:"Production-integrated via ASTRA 6 with passive-only provider allowlist." },
  { id:"amass", name:"OWASP Amass", category:"framework", homeUrl:"https://github.com/owasp-amass/amass", mode:"builtin", auth:"varies", risk:"moderate", adapterId:"astra6-owasp-amass", capabilities:["asset discovery","DNS enumeration"], notes:"Production-integrated via ASTRA 6 in passive-only mode." },
  { id:"opencti", name:"OpenCTI", category:"framework", homeUrl:"https://www.opencti.io/", mode:"requires_configuration", auth:"account", risk:"moderate", adapterId:"service-opencti", capabilities:["STIX 2.1 knowledge graph","bounded CTI search","source-linked enrichment"], notes:"DISHA uses a configured OpenCTI deployment/token only for bounded read-only STIX graph search; mutations and connector execution remain outside this adapter." },
  { id:"intelowl", name:"IntelOwl", category:"framework", homeUrl:"https://github.com/intelowlproject/IntelOwl", mode:"requires_configuration", auth:"api_key", risk:"moderate", adapterId:"service-intelowl", capabilities:["IOC enrichment","allowlisted analyzer execution","job report normalization"], notes:"DISHA submits observables only to the server-side INTELOWL_ANALYZERS_ALLOWLIST; arbitrary analyzers, connectors, playbooks, files, and detonation are not exposed." },
 codex/rewire-osint-production-447dcddf
  { id:"photon", name:"Photon", category:"framework", homeUrl:"https://github.com/s0md3v/Photon", mode:"builtin", auth:"none", risk:"moderate", adapterId:"astra6-photon", capabilities:["bounded public-site URL discovery"], notes:"Production-integrated through the ASTRA advanced worker. Execution is a depth-1 same-site crawl and requires explicit active-recon authorization." },
 main

  { id:"space-track", name:"Space-Track.org", category:"orbital_tracking", homeUrl:"https://www.space-track.org/", mode:"requires_configuration", auth:"account", risk:"low", capabilities:["US Space Force catalog","TLE/GP orbital data"], notes:"Account required; respect redistribution and usage rules." },
  { id:"celestrak", name:"CelesTrak", category:"orbital_tracking", homeUrl:"https://celestrak.org/", mode:"builtin", auth:"none", risk:"low", adapterId:"public-celestrak-gp", capabilities:["orbital element data","satellite groups"], notes:"DISHA has a bounded current-GP lookup adapter and follows CelesTrak usage guidance." },
  { id:"n2yo", name:"N2YO", category:"orbital_tracking", homeUrl:"https://www.n2yo.com/", mode:"requires_configuration", auth:"api_key", risk:"low", capabilities:["satellite tracking","pass predictions"], notes:"API key required for structured access." },
  { id:"heavens-above", name:"Heavens-Above", category:"orbital_tracking", homeUrl:"https://www.heavens-above.com/", mode:"reference_only", auth:"none", risk:"low", capabilities:["satellite passes","sky visibility"], notes:"Manual/reference workflow." },
  { id:"stuff-in-space", name:"Stuff in Space", category:"orbital_tracking", homeUrl:"https://stuffin.space/", mode:"reference_only", auth:"none", risk:"low", capabilities:["3D satellite visualization"], notes:"Visualization/reference source." },
  { id:"orbitron", name:"Orbitron", category:"orbital_tracking", homeUrl:"https://www.stoff.pl/", mode:"reference_only", auth:"none", risk:"low", capabilities:["desktop satellite tracking"], notes:"Desktop/manual workflow." },

  { id:"ucs-satellite-database", name:"UCS Satellite Database", category:"satellite_database", homeUrl:"https://www.ucsusa.org/resources/satellite-database", mode:"reference_only", auth:"none", risk:"low", capabilities:["satellite database","operator/purpose metadata"], notes:"Reference dataset; verify update cadence before automated use." },
  { id:"mcdowell-space-reports", name:"Jonathan McDowell's Space Reports", category:"satellite_database", homeUrl:"https://planet4589.org/", mode:"reference_only", auth:"none", risk:"low", capabilities:["launch/satellite catalog research"], notes:"Expert reference source." },
  { id:"gunters-space-page", name:"Gunter's Space Page", category:"satellite_database", homeUrl:"https://space.skyrocket.de/", mode:"reference_only", auth:"none", risk:"low", capabilities:["spacecraft/launcher reference database"], notes:"Reference source." },
  { id:"nanosats", name:"Nanosats Database", category:"satellite_database", homeUrl:"https://www.nanosats.eu/", mode:"reference_only", auth:"none", risk:"low", capabilities:["small satellite database"], notes:"Reference source." },

  { id:"leolabs", name:"LeoLabs", category:"space_situational_awareness", homeUrl:"https://leolabs.space/", mode:"requires_configuration", auth:"paid", risk:"low", capabilities:["space situational awareness","tracking analytics"], notes:"Commercial provider." },
  { id:"exoanalytic", name:"ExoAnalytic Solutions", category:"space_situational_awareness", homeUrl:"https://exoanalytic.com/", mode:"requires_configuration", auth:"paid", risk:"low", capabilities:["space domain awareness","optical tracking"], notes:"Commercial provider." },
  { id:"slingshot-aerospace", name:"Slingshot Aerospace", category:"space_situational_awareness", homeUrl:"https://www.slingshotaerospace.com/", mode:"requires_configuration", auth:"paid", risk:"low", capabilities:["space domain awareness","traffic coordination"], notes:"Commercial provider." },
  { id:"comspoc", name:"COMSPOC", category:"space_situational_awareness", homeUrl:"https://comspoc.com/", mode:"requires_configuration", auth:"paid", risk:"low", capabilities:["space situational awareness","conjunction analysis"], notes:"Commercial provider." },

  { id:"satnogs", name:"SatNOGS", category:"space_signals", homeUrl:"https://network.satnogs.org/", mode:"connector_ready", auth:"none", risk:"moderate", capabilities:["open ground-station observations","satellite telemetry metadata"], notes:"Use public observations; comply with radio laws and do not facilitate interception of protected/private communications." },
  { id:"sigidwiki", name:"SigIDWiki", category:"space_signals", homeUrl:"https://www.sigidwiki.com/", mode:"reference_only", auth:"none", risk:"moderate", capabilities:["signal identification reference"], notes:"Reference-only signal identification; no interception workflow." },
  { id:"sdr-communities", name:"SDR communities", category:"space_signals", homeUrl:"https://www.rtl-sdr.com/", mode:"reference_only", auth:"none", risk:"moderate", capabilities:["software-defined radio learning","satellite RF references"], notes:"Educational reference only; follow applicable radio/interception law." },

  { id:"copernicus-browser", name:"Copernicus Data Space / Sentinel", category:"earth_observation", homeUrl:"https://browser.dataspace.copernicus.eu/", mode:"requires_configuration", auth:"account", risk:"low", capabilities:["Sentinel-1 SAR","Sentinel-2 optical","Earth observation"], notes:"Account/API configuration may be required for automated access." },
  { id:"sentinel-hub", name:"Sentinel Hub", category:"earth_observation", homeUrl:"https://www.sentinel-hub.com/", mode:"requires_configuration", auth:"api_key", risk:"low", capabilities:["EO APIs","Sentinel/Landsat processing"], notes:"Commercial/free-tier service depending on use." },
  { id:"usgs-earthexplorer", name:"USGS EarthExplorer", category:"earth_observation", homeUrl:"https://earthexplorer.usgs.gov/", mode:"requires_configuration", auth:"account", risk:"low", capabilities:["Landsat and remote-sensing downloads"], notes:"Account required for many downloads." },
  { id:"nasa-worldview", name:"NASA Worldview", category:"earth_observation", homeUrl:"https://worldview.earthdata.nasa.gov/", mode:"connector_ready", auth:"none", risk:"low", capabilities:["near-real-time Earth imagery","layer visualization"], notes:"Public imagery; machine access should use NASA APIs/services where available." },
  { id:"nasa-firms", name:"NASA FIRMS", category:"earth_observation", homeUrl:"https://firms.modaps.eosdis.nasa.gov/", mode:"requires_configuration", auth:"api_key", risk:"low", capabilities:["active fire/hotspot data","API"], notes:"MAP_KEY is required for many API endpoints." },
  { id:"zoom-earth", name:"Zoom Earth", category:"earth_observation", homeUrl:"https://zoom.earth/", mode:"reference_only", auth:"none", risk:"low", capabilities:["weather/satellite visualization"], notes:"Interactive reference source." },

  { id:"planet", name:"Planet", category:"commercial_imagery", homeUrl:"https://www.planet.com/", mode:"requires_configuration", auth:"paid", risk:"low", capabilities:["commercial optical imagery","tasking/archive"], notes:"Paid/commercial imagery with possible open-data programs." },
  { id:"maxar", name:"Maxar", category:"commercial_imagery", homeUrl:"https://www.maxar.com/", mode:"requires_configuration", auth:"paid", risk:"low", capabilities:["commercial high-resolution imagery"], notes:"Paid/commercial provider." },
  { id:"airbus-intelligence", name:"Airbus Intelligence", category:"commercial_imagery", homeUrl:"https://www.intelligence-airbusds.com/", mode:"requires_configuration", auth:"paid", risk:"low", capabilities:["commercial satellite imagery"], notes:"Paid/commercial provider." },
  { id:"capella", name:"Capella Space", category:"commercial_imagery", homeUrl:"https://www.capellaspace.com/", mode:"requires_configuration", auth:"paid", risk:"low", capabilities:["commercial SAR imagery"], notes:"Paid/commercial provider." },
  { id:"iceye", name:"ICEYE", category:"commercial_imagery", homeUrl:"https://www.iceye.com/", mode:"requires_configuration", auth:"paid", risk:"low", capabilities:["commercial SAR imagery"], notes:"Paid/commercial provider." },

  { id:"csis-space-threat", name:"CSIS Space Threat Assessment", category:"space_policy", homeUrl:"https://www.csis.org/programs/aerospace-security-project/space-threat-assessment", mode:"reference_only", auth:"none", risk:"low", capabilities:["space threat analysis"], notes:"Analytical report series." },
  { id:"swf-counterspace", name:"Secure World Foundation Global Counterspace", category:"space_policy", homeUrl:"https://swfound.org/counterspace/", mode:"reference_only", auth:"none", risk:"low", capabilities:["counterspace capability analysis"], notes:"Analytical report series." },
  { id:"unoosa-register", name:"UNOOSA Space Object Register", category:"space_policy", homeUrl:"https://www.unoosa.org/oosa/en/spaceobjectregister/index.html", mode:"connector_ready", auth:"none", risk:"low", capabilities:["UN registration records","space object registry"], notes:"Official international registry." },
  { id:"itu-space-filings", name:"ITU satellite filings", category:"space_policy", homeUrl:"https://www.itu.int/en/ITU-R/space/", mode:"requires_configuration", auth:"varies", risk:"low", capabilities:["frequency/orbit filings","space services regulation"], notes:"Different databases/services have different access conditions." },

  { id:"next-spaceflight", name:"Next Spaceflight", category:"launch_activity", homeUrl:"https://nextspaceflight.com/", mode:"reference_only", auth:"none", risk:"low", capabilities:["launch schedule","mission tracking"], notes:"Reference source; confirm time-critical launches with operators/official notices." },
  { id:"rocketlaunch-live", name:"RocketLaunch.Live", category:"launch_activity", homeUrl:"https://www.rocketlaunch.live/", mode:"reference_only", auth:"none", risk:"low", capabilities:["launch schedule"], notes:"Reference source." },
  { id:"notam", name:"NOTAM notices", category:"launch_activity", homeUrl:"https://www.faa.gov/air_traffic/flight_info/aeronav/notams", mode:"reference_only", auth:"varies", risk:"low", capabilities:["aviation hazard/airspace notices"], notes:"Jurisdiction-specific official NOTAM sources should be preferred." },
  { id:"navarea", name:"NAVAREA / maritime navigation warnings", category:"launch_activity", homeUrl:"https://msi.nga.mil/NavWarnings", mode:"reference_only", auth:"none", risk:"low", capabilities:["maritime navigation warnings"], notes:"Useful for launch/reentry hazard area research." },

  { id:"phoneinfoga", name:"PhoneInfoga", category:"framework", homeUrl:"https://github.com/sundowndev/phoneinfoga", mode:"builtin", auth:"none", risk:"moderate", adapterId:"astra6-phoneinfoga", capabilities:["phone number OSINT","carrier lookup"], notes:"Production-integrated via ASTRA 6 with identity enumeration policy gate." },
  { id:"sherlock-tool", name:"Sherlock", category:"framework", homeUrl:"https://github.com/sherlock-project/sherlock", mode:"builtin", auth:"none", risk:"moderate", adapterId:"astra6-sherlock", capabilities:["username presence discovery"], notes:"Production-integrated via ASTRA 6 with identity enumeration policy gate." },
  { id:"subfinder", name:"ProjectDiscovery Subfinder", category:"framework", homeUrl:"https://github.com/projectdiscovery/subfinder", mode:"builtin", auth:"none", risk:"low", adapterId:"astra6-subfinder", capabilities:["passive subdomain enumeration"], notes:"Production-integrated via ASTRA 6 for passive subdomain enumeration." },
  { id:"noaa-swpc", name:"NOAA Space Weather Prediction Center", category:"space_weather", homeUrl:"https://www.spaceweather.gov/", mode:"builtin", auth:"none", risk:"low", adapterId:"public-noaa-space-weather", capabilities:["space weather alerts","solar/geomagnetic data"], notes:"DISHA has a governed adapter for NOAA SWPC machine-readable public alert products." },
  { id:"spaceweatherlive", name:"SpaceWeatherLive", category:"space_weather", homeUrl:"https://www.spaceweatherlive.com/", mode:"reference_only", auth:"none", risk:"low", capabilities:["space-weather dashboards","solar activity"], notes:"Reference/visualization source; use NOAA/SWPC as authoritative source for US alerts." },
];

export function listOsintSourceUniverse(): OsintSourceUniverseEntry[] {
  return osintSourceUniverse.map((entry) => ({ ...entry, capabilities: [...entry.capabilities] }));
}

export function searchOsintSourceUniverse(query: string, category?: OsintSourceCategory): OsintSourceUniverseEntry[] {
  const needle = query.trim().toLowerCase();
  return listOsintSourceUniverse().filter((entry) => {
    if (category && entry.category !== category) return false;
    if (!needle) return true;
    return [
      entry.name,
      entry.id,
      entry.category,
      entry.mode,
      entry.notes,
      ...entry.capabilities,
    ].some((value) => value.toLowerCase().includes(needle));
  });
}

export function getOsintSourceUniverseSummary() {
  const entries = listOsintSourceUniverse();
  const byCategory = Object.fromEntries(
    [...new Set(entries.map((entry) => entry.category))]
      .sort()
      .map((category) => [category, entries.filter((entry) => entry.category === category).length]),
  );
  return {
    total: entries.length,
    builtin: entries.filter((entry) => entry.mode === "builtin").length,
    connectorReady: entries.filter((entry) => entry.mode === "connector_ready").length,
    requiresConfiguration: entries.filter((entry) => entry.mode === "requires_configuration").length,
    referenceOnly: entries.filter((entry) => entry.mode === "reference_only").length,
    blockedByDefault: entries.filter((entry) => entry.mode === "blocked_by_default").length,
    restricted: entries.filter((entry) => entry.risk === "restricted").length,
    byCategory,
  };
}
