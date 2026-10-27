import { NextRequest, NextResponse } from "next/server";

import { getOsintBackendUrl } from "@/lib/server/osint-backend-client";
import { withContext } from "@/lib/unified/api";

const BACKEND = getOsintBackendUrl();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const CANONICAL_VYUH_FORMATIONS: Record<string, any> = {
  chakra_vyuha: {
    name: "Chakra Vyuha — Perimeter Cyber Defense",
    purpose: "Multi-tiered sensor grid with honeypot nodes and automated threat traps",
    color: "#ef4444",
    collectors: ["flights", "quakes", "sat", "crt"],
  },
  padma_vyuha: {
    name: "Padma Vyuha — Deep Entity Resolution",
    purpose: "Concentric layers of entity deconstruction from a single seed",
    color: "#a855f7",
    collectors: ["sherlock", "maigret", "holehe", "phone"],
  },
  garuda_vyuha: {
    name: "Garuda Vyuha — Airborne & Signals Recon",
    purpose: "ADS-B aircraft, vessel AIS, satellite orbital telemetry",
    color: "#f59e0b",
    collectors: ["flights", "sat", "gdelt"],
  },
  suryavyuha: {
    name: "Suryavyuha — Macro Pattern Recognition",
    purpose: "Global graph topology, covert clusters, temporal anomalies",
    color: "#fbbf24",
    collectors: ["graph", "india_breach", "xon"],
  },
  nakshatra_mandala: {
    name: "Nakshatra Mandala Vyuha — Satellite & Celestial",
    purpose: "RF ground stations, spatial coverage, orbital sensor passes",
    color: "#3b82f6",
    collectors: ["sat", "crt"],
  },
  sarvatobhadra: {
    name: "Sarvatobhadra Vyuha — Omnidirectional Node Defense",
    purpose: "Total infrastructure immobility, cryptographic sealing",
    color: "#10b981",
    collectors: ["gdelt", "wayback"],
  },
  nyaya_audit: {
    name: "NYAYA Audit Vyuha — Legal Admissibility Verifier",
    purpose: "BSA 2023 §61/63/65B evidence verification",
    color: "#06b6d4",
    collectors: ["india_breach", "graph"],
  },
  setu_varuna: {
    name: "SETU-VARUNA Vyuha — Maritime & Port Resiliency",
    purpose: "Maritime registry, harbor manifests, oceanic transponder telemetry",
    color: "#0ea5e9",
    collectors: ["flights", "gdelt"],
  },
};

export async function GET(request: NextRequest) {
  return withContext(request, "agent:read", async () => {
    const apiKey = process.env.DISHA_OSINT_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "osint_backend_unconfigured", status: "unavailable" },
        { status: 503 }
      );
    }

    try {
      const res = await fetch(`${BACKEND}/api/v1/vyuh/formations`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        next: { revalidate: 0 },
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data, { status: 200 });
      }
    } catch {
      // Graceful deterministic fallback
    }

    return NextResponse.json({
      mode: "proposal_only",
      note: "Vyuha is advisory under the Constitution. Built-in formation catalog active.",
      formations: CANONICAL_VYUH_FORMATIONS,
    }, {
      status: 200,
    });
  });
}
