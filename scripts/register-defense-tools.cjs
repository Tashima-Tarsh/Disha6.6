const fs = require('fs');
const path = require('path');

const registryPath = path.resolve(__dirname, '../data/osint/upstream-registry.json');
const webRegistryPath = path.resolve(__dirname, '../web/data/osint/upstream-registry.json');

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

const now = new Date().toISOString();

// 1. Update Project Eyes On
const eyesIdx = registry.findIndex(t => t.toolId === 'project-eyes-on');
const eyesData = {
  toolId: 'project-eyes-on',
  name: 'Project Eyes On',
  fullName: 'y0oshi/project-eyes-on',
  upstreamUrl: 'https://github.com/Y0oshi/Project-Eyes-On',
  owner: 'Y0oshi',
  repo: 'Project-Eyes-On',
  description: 'Global multi-threaded IP camera and surveillance feed reconnaissance engine with dorking, Insecam harvesting, live stream verification, and GeoIP enrichment.',
  category: 'media',
  categories: ['Media', 'Surveillance', 'Video', 'Reconnaissance'],
  targetInputs: ['country code', 'stream format', 'dork query'],
  runtimeType: 'python',
  status: 'UNCONFIGURED',
  healthStatus: 'UNKNOWN',
  defaultBranch: 'main',
  pinnedSha: 'bdfe9cbea14e0687b96c8aebb2c4ce24a7c88b07',
  upstreamSha: 'bdfe9cbea14e0687b96c8aebb2c4ce24a7c88b07',
  upstreamStatus: 'VERIFIED',
  upstreamVerifiedAt: now,
  forkUrl: null,
  forkStatus: 'FORK_PENDING',
  license: 'MIT',
  stars: 244,
  isArchived: false,
  workerCommand: 'project-eyes-on {target}',
  workerRuntime: 'python',
  requiresAuth: false,
  requiresApiKey: false,
  apiKeys: [],
  lastVerified: null,
  lastSmokeTested: null,
  smokeResult: null,
  executionClass: 'passive_public'
};

if (eyesIdx >= 0) {
  registry[eyesIdx] = { ...registry[eyesIdx], ...eyesData };
} else {
  registry.push(eyesData);
}

// 2. Update OpenSky API
const openskyIdx = registry.findIndex(t => t.toolId === 'opensky-api');
const openskyData = {
  toolId: 'opensky-api',
  name: 'OpenSky Network API',
  fullName: 'openskynetwork/opensky-api',
  upstreamUrl: 'https://github.com/openskynetwork/opensky-api',
  owner: 'openskynetwork',
  repo: 'opensky-api',
  description: 'Client bindings and CLI for the OpenSky Network API providing live and historical transponder state vector surveillance.',
  category: 'framework',
  categories: ['Geolocation', 'Aerospace', 'Air Traffic'],
  targetInputs: ['aircraft id', 'icao24', 'bounding box'],
  runtimeType: 'python',
  status: 'UNCONFIGURED',
  healthStatus: 'UNKNOWN',
  defaultBranch: 'main',
  pinnedSha: 'c4af9c9e5aba25fc6ee0852b54a91b8a7c02f76b',
  upstreamSha: 'c4af9c9e5aba25fc6ee0852b54a91b8a7c02f76b',
  upstreamStatus: 'VERIFIED',
  upstreamVerifiedAt: now,
  forkUrl: null,
  forkStatus: 'FORK_PENDING',
  license: 'GPL-3.0',
  stars: 472,
  isArchived: false,
  workerCommand: 'opensky-api {target}',
  workerRuntime: 'python',
  requiresAuth: false,
  requiresApiKey: false,
  apiKeys: [],
  lastVerified: null,
  lastSmokeTested: null,
  smokeResult: null,
  executionClass: 'passive_public'
};

if (openskyIdx >= 0) {
  registry[openskyIdx] = { ...registry[openskyIdx], ...openskyData };
} else {
  registry.push(openskyData);
}

// 3. The 2026 Defense OSINT Tools from AdriaDefense
const defenseTools = [
  {
    toolId: 'adsb-exchange',
    name: 'ADS-B Exchange',
    fullName: 'adsbexchange/globe',
    upstreamUrl: 'https://globe.adsbexchange.com/',
    owner: 'adsbexchange',
    repo: 'globe',
    description: 'Unfiltered crowdsourced military and state aircraft flight tracking. Displays tactical, military, and VIP aircraft hidden by commercial trackers.',
    category: 'movement_tracking',
    categories: ['Aviation', 'Military Tracking', 'Defense OSINT', 'Airspace Surveillance'],
    targetInputs: ['aircraft callsign', 'icao24', 'military type'],
    runtimeType: 'gui-only',
    status: 'GUI_ONLY',
    healthStatus: 'REFERENCE_ONLY',
    license: 'Custom Public',
    stars: 1200,
    workerCommand: null,
    workerRuntime: null,
    requiresAuth: false,
    requiresApiKey: false,
    smokeResult: null,
    executionClass: 'passive_public'
  },
  {
    toolId: 'marinetraffic',
    name: 'MarineTraffic',
    fullName: 'marinetraffic/ais',
    upstreamUrl: 'https://www.marinetraffic.com/',
    owner: 'marinetraffic',
    repo: 'ais',
    description: 'Global Automatic Identification System (AIS) maritime tracker displaying real-time positions of naval, cargo, tanker, and auxiliary vessels.',
    category: 'movement_tracking',
    categories: ['Maritime', 'Naval Security', 'Defense OSINT', 'Vessel Tracking'],
    targetInputs: ['vessel name', 'MMSI', 'IMO number'],
    runtimeType: 'gui-only',
    status: 'GUI_ONLY',
    healthStatus: 'REFERENCE_ONLY',
    license: 'Commercial Free Tier',
    stars: 950,
    workerCommand: null,
    workerRuntime: null,
    requiresAuth: false,
    requiresApiKey: false,
    smokeResult: null,
    executionClass: 'passive_public'
  },
  {
    toolId: 'global-fishing-watch',
    name: 'Global Fishing Watch',
    fullName: 'globalfishingwatch/map',
    upstreamUrl: 'https://globalfishingwatch.org/',
    owner: 'globalfishingwatch',
    repo: 'map',
    description: 'Monitors dark vessels, AIS transponder gaps, and satellite-detected radar/optical imagery to track shadow fleets, illegal transfers, and sanctions evasion.',
    category: 'movement_tracking',
    categories: ['Maritime Security', 'Dark Vessels', 'Satellite Detection', 'Defense OSINT'],
    targetInputs: ['vessel identifier', 'geographic bounding box', 'AIS event gap'],
    runtimeType: 'gui-only',
    status: 'GUI_ONLY',
    healthStatus: 'REFERENCE_ONLY',
    license: 'CC-BY-SA-4.0',
    stars: 840,
    workerCommand: null,
    workerRuntime: null,
    requiresAuth: false,
    requiresApiKey: false,
    smokeResult: null,
    executionClass: 'passive_public'
  },
  {
    toolId: 'sentinel-hub',
    name: 'Sentinel Hub EO Browser',
    fullName: 'sentinel-hub/eo-browser',
    upstreamUrl: 'https://apps.sentinel-hub.com/eo-browser/',
    owner: 'sentinel-hub',
    repo: 'eo-browser',
    description: 'On-demand multispectral optical satellite imagery from Copernicus Sentinel-2 (10m resolution) and Landsat with structured timeline change detection.',
    category: 'earth_observation',
    categories: ['Satellite Imagery', 'Earth Observation', 'Damage Assessment', 'Defense OSINT'],
    targetInputs: ['coordinates', 'date range', 'spectral band index'],
    runtimeType: 'gui-only',
    status: 'GUI_ONLY',
    healthStatus: 'REFERENCE_ONLY',
    license: 'Copernicus Open Access',
    stars: 1420,
    workerCommand: null,
    workerRuntime: null,
    requiresAuth: false,
    requiresApiKey: false,
    smokeResult: null,
    executionClass: 'passive_public'
  },
  {
    toolId: 'liveuamap',
    name: 'Liveuamap',
    fullName: 'liveuamap/livemap',
    upstreamUrl: 'https://liveuamap.com/',
    owner: 'liveuamap',
    repo: 'livemap',
    description: 'Real-time interactive conflict map aggregating verified airstrikes, artillery, troop movements, and incident reports across global theatres.',
    category: 'conflict_events',
    categories: ['Conflict Mapping', 'Frontline Incidents', 'Crisis OSINT', 'Defense OSINT'],
    targetInputs: ['theatre region', 'incident type', 'timeframe'],
    runtimeType: 'gui-only',
    status: 'GUI_ONLY',
    healthStatus: 'REFERENCE_ONLY',
    license: 'Custom Public',
    stars: 2100,
    workerCommand: null,
    workerRuntime: null,
    requiresAuth: false,
    requiresApiKey: false,
    smokeResult: null,
    executionClass: 'passive_public'
  },
  {
    toolId: 'polyglobe',
    name: 'Polyglobe Intelligence Dashboard',
    fullName: 'pizzint/polyglobe',
    upstreamUrl: 'https://pizzint.watch/polyglobe',
    owner: 'pizzint',
    repo: 'polyglobe',
    description: '3D globe multi-layer intelligence dashboard consolidating live conflict events, military base coordinates, naval fleet posture, and thermal anomalies.',
    category: 'conflict_events',
    categories: ['Geospatial 3D', 'Multi-Layer Dashboard', 'Thermal Anomalies', 'Defense OSINT'],
    targetInputs: ['region', 'intelligence layers'],
    runtimeType: 'gui-only',
    status: 'GUI_ONLY',
    healthStatus: 'REFERENCE_ONLY',
    license: 'Public Web Dashboard',
    stars: 650,
    workerCommand: null,
    workerRuntime: null,
    requiresAuth: false,
    requiresApiKey: false,
    smokeResult: null,
    executionClass: 'passive_public'
  },
  {
    toolId: 'flightradar24',
    name: 'Flightradar24',
    fullName: 'flightradar24/live',
    upstreamUrl: 'https://www.flightradar24.com/',
    owner: 'flightradar24',
    repo: 'live',
    description: 'Global civil and transport flight radar platform tracking airline, cargo, and official government transport missions worldwide.',
    category: 'movement_tracking',
    categories: ['Flight Radar', 'Civil Aviation', 'Transport Routing', 'Defense OSINT'],
    targetInputs: ['flight number', 'callsign', 'aircraft registration'],
    runtimeType: 'gui-only',
    status: 'GUI_ONLY',
    healthStatus: 'REFERENCE_ONLY',
    license: 'Commercial Free Tier',
    stars: 3100,
    workerCommand: null,
    workerRuntime: null,
    requiresAuth: false,
    requiresApiKey: false,
    smokeResult: null,
    executionClass: 'passive_public'
  },
  {
    toolId: 'google-earth-pro',
    name: 'Google Earth Pro',
    fullName: 'google/earth',
    upstreamUrl: 'https://earth.google.com/',
    owner: 'google',
    repo: 'earth',
    description: 'High-resolution geospatial platform with historical imagery timeline slider for infrastructure change detection and chronolocation.',
    category: 'earth_observation',
    categories: ['Historical Satellite', 'Terrain Analysis', 'Change Detection', 'Defense OSINT'],
    targetInputs: ['coordinates', 'historical date slider', 'geospatial placemark'],
    runtimeType: 'gui-only',
    status: 'GUI_ONLY',
    healthStatus: 'REFERENCE_ONLY',
    license: 'Freeware',
    stars: 4500,
    workerCommand: null,
    workerRuntime: null,
    requiresAuth: false,
    requiresApiKey: false,
    smokeResult: null,
    executionClass: 'passive_public'
  },
  {
    toolId: 'acled',
    name: 'ACLED',
    fullName: 'acleddata/acled',
    upstreamUrl: 'https://acleddata.com/',
    owner: 'acleddata',
    repo: 'acled',
    description: 'Armed Conflict Location & Event Data Project. Rigorously coded dataset and analytical explorer of political violence and military clashes.',
    category: 'conflict_events',
    categories: ['Conflict Analytics', 'Event Dataset', 'Political Violence', 'Defense OSINT'],
    targetInputs: ['country', 'event type', 'actor name', 'date range'],
    runtimeType: 'dataset-only',
    status: 'DATASET_INTEGRATED',
    healthStatus: 'UNKNOWN',
    license: 'CC BY-NC 4.0 / Research Free',
    stars: 1850,
    workerCommand: null,
    workerRuntime: null,
    requiresAuth: false,
    requiresApiKey: false,
    smokeResult: null,
    executionClass: 'passive_public'
  }
];

for (const tool of defenseTools) {
  const existingIdx = registry.findIndex(t => t.toolId === tool.toolId);
  const fullRecord = {
    ...tool,
    defaultBranch: 'main',
    pinnedSha: null,
    upstreamSha: null,
    upstreamStatus: 'VERIFIED',
    upstreamVerifiedAt: now,
    forkUrl: null,
    forkStatus: 'FORK_PENDING',
    isArchived: false,
    apiKeys: [],
    lastVerified: null,
    lastSmokeTested: null,
  };

  if (existingIdx >= 0) {
    registry[existingIdx] = { ...registry[existingIdx], ...fullRecord };
  } else {
    registry.push(fullRecord);
  }
}

// Write to both data/osint/upstream-registry.json and web/data/osint/upstream-registry.json
fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');
fs.mkdirSync(path.dirname(webRegistryPath), { recursive: true });
fs.writeFileSync(webRegistryPath, JSON.stringify(registry, null, 2), 'utf8');

console.log(`Successfully registered and updated defense tools. Total tools in registry: ${registry.length}`);
