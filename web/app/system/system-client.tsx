"use client";

import Link from "next/link";
import { ArrowLeft, Box, Cpu, Database, HardDrive, MapPinned, RadioTower, ServerCog } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import type { GeospatialRuntimeStatus } from "@/lib/geospatial/contracts";
import styles from "./system.module.css";

type RuntimeStatus = {
  generatedAt: string;
  database: string;
  redis: string;
  modelRoutes: unknown;
  embeddingRoute: unknown;
  sourceScheduler: { policyCount: number; enabledCount: number; nextDueAt: string | null };
  researchRuntime: unknown;
};

export function SystemClient({ principal }: { principal: { email: string; roles: string[] } }) {
  const [runtime, setRuntime] = useState<RuntimeStatus | null>(null);
  const [geo, setGeo] = useState<GeospatialRuntimeStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      fetch("/api/v1/runtime/status", { cache: "no-store", credentials: "same-origin", signal: controller.signal }).then(requireJson<RuntimeStatus>),
      fetch("/api/v1/geo/status", { cache: "no-store", credentials: "same-origin", signal: controller.signal }).then(requireJson<GeospatialRuntimeStatus>),
    ]).then(([runtimeStatus, geoStatus]) => {
      setRuntime(runtimeStatus);
      setGeo(geoStatus);
    }).catch((caught) => {
      if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "System status unavailable");
    });
    return () => controller.abort();
  }, []);

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <Link href="/dashboard"><ArrowLeft size={15} /> Analyst workspace</Link>
          <p>disha6.6 technical boundary</p>
          <h1>System console</h1>
          <span>Infrastructure detail is intentionally separated from the intelligence workspace.</span>
        </div>
        <div className={styles.identity}><strong>{principal.email}</strong><span>{principal.roles.join(" · ")}</span></div>
      </header>

      {error ? <div className={styles.error}>{error}</div> : null}

      <section className={styles.grid}>
        <StatusCard icon={<Database size={18} />} title="Database" value={runtime?.database ?? "loading"} detail="Primary disha6.6 persistence connection" />
        <StatusCard icon={<HardDrive size={18} />} title="Redis" value={runtime?.redis ?? "loading"} detail="Runtime cache / coordination state" />
        <StatusCard icon={<MapPinned size={18} />} title="PostGIS" value={geo ? (geo.postgis ? "ready" : "unavailable") : "loading"} detail="Spatial extension state" />
        <StatusCard icon={<Box size={18} />} title="Admitted geodata" value={geo ? String(geo.admittedDatasets) : "—"} detail={geo ? `${geo.admittedFeatures} admitted features` : "Loading geospatial registry"} />
      </section>

      <section className={styles.panel} id="geodata">
        <div className={styles.panelHead}><MapPinned size={18} /><div><p>Geodata</p><h2>Authoritative geometry status</h2></div></div>
        {geo?.latestDataset ? (
          <dl>
            <Row label="Dataset" value={geo.latestDataset.datasetId} />
            <Row label="Source" value={geo.latestDataset.sourceId} />
            <Row label="Product" value={[geo.latestDataset.productId, geo.latestDataset.productVersion].filter(Boolean).join(" · ")} />
            <Row label="Imported" value={formatDate(geo.latestDataset.importedAt)} />
            <Row label="Attribution" value={geo.latestDataset.attribution} />
          </dl>
        ) : <p className={styles.muted}>No authoritative geospatial dataset is currently admitted. The operational basemap remains contextual only.</p>}
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}><RadioTower size={18} /><div><p>Source scheduler</p><h2>Ingestion control plane</h2></div></div>
        <div className={styles.inlineStats}>
          <span><strong>{runtime?.sourceScheduler.policyCount ?? "—"}</strong> policies</span>
          <span><strong>{runtime?.sourceScheduler.enabledCount ?? "—"}</strong> enabled</span>
          <span><strong>{runtime?.sourceScheduler.nextDueAt ? formatDate(runtime.sourceScheduler.nextDueAt) : "—"}</strong> next due</span>
        </div>
      </section>

      <section className={styles.twoCol}>
        <section className={styles.panel}>
          <div className={styles.panelHead}><Cpu size={18} /><div><p>Models</p><h2>Routing state</h2></div></div>
          <pre>{JSON.stringify(runtime?.modelRoutes ?? {}, null, 2)}</pre>
        </section>
        <section className={styles.panel}>
          <div className={styles.panelHead}><ServerCog size={18} /><div><p>Research runtime</p><h2>Governed services</h2></div></div>
          <pre>{JSON.stringify(runtime?.researchRuntime ?? {}, null, 2)}</pre>
        </section>
      </section>
    </main>
  );
}

function StatusCard({ icon, title, value, detail }: { icon: ReactNode; title: string; value: string; detail: string }) {
  return <article className={styles.card}><div>{icon}<span>{title}</span></div><strong>{value}</strong><p>{detail}</p></article>;
}
function Row({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}
function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
async function requireJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`System endpoint returned ${response.status}`);
  return response.json() as Promise<T>;
}
