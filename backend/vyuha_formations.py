"""Vyuha formation definitions — proposal-only under Constitution."""

VYUH_FORMATIONS = {
    "chakra_vyuha": {
        "name": "Chakra Vyuha — Perimeter Cyber Defense",
        "purpose": "Multi-tiered sensor grid with honeypot nodes and automated threat traps",
        "color": "#ef4444",
        "collectors": ["flights", "quakes", "sat", "crt"],
    },
    "padma_vyuha": {
        "name": "Padma Vyuha — Deep Entity Resolution",
        "purpose": "Concentric layers of entity deconstruction from a single seed",
        "color": "#a855f7",
        "collectors": ["sherlock", "maigret", "holehe", "phone"],
    },
    "garuda_vyuha": {
        "name": "Garuda Vyuha — Airborne & Signals Recon",
        "purpose": "ADS-B aircraft, vessel AIS, satellite orbital telemetry",
        "color": "#f59e0b",
        "collectors": ["flights", "sat", "gdelt"],
    },
    "suryavyuha": {
        "name": "Suryavyuha — Macro Pattern Recognition",
        "purpose": "Global graph topology, covert clusters, temporal anomalies",
        "color": "#fbbf24",
        "collectors": ["graph", "india_breach", "xon"],
    },
    "nakshatra_mandala": {
        "name": "Nakshatra Mandala Vyuha — Satellite & Celestial",
        "purpose": "RF ground stations, spatial coverage, orbital sensor passes",
        "color": "#3b82f6",
        "collectors": ["sat", "crt"],
    },
    "sarvatobhadra": {
        "name": "Sarvatobhadra Vyuha — Omnidirectional Node Defense",
        "purpose": "Total infrastructure immobility, cryptographic sealing",
        "color": "#10b981",
        "collectors": ["gdelt", "wayback"],
    },
    "nyaya_audit": {
        "name": "NYAYA Audit Vyuha — Legal Admissibility Verifier",
        "purpose": "BSA 2023 §61/63/65B evidence verification",
        "color": "#06b6d4",
        "collectors": ["india_breach", "graph"],
    },
    "setu_varuna": {
        "name": "SETU-VARUNA Vyuha — Maritime & Port Resiliency",
        "purpose": "Maritime registry, harbor manifests, oceanic transponder telemetry",
        "color": "#0ea5e9",
        "collectors": ["flights", "gdelt"],
    },
}

COLLECTOR_NAME_MAP = {
    "sherlock": "Sherlock", "maigret": "Maigret", "holehe": "Holehe",
    "phone": "PhoneInfoga", "flights": "Live: flights over India",
    "quakes": "Live: earthquakes India", "sat": "Live: active satellites",
    "crt": "crt.sh certs", "wayback": "Wayback availability",
    "gdelt": "Live: GDELT India news", "xon": "XposedOrNot breach",
    "india_breach": "India: breach corpus reference",
}
