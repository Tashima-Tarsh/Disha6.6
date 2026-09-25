"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Clock3,
  FileSearch,
  Fingerprint,
  GitBranch,
  Layers3,
  Map as MapIcon,
  Network,
  Settings2,
  ShieldCheck,
  Waypoints,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type {
  IntelligenceWorkspace,
  WorkspaceEntity,
  WorkspaceTimelineItem,
} from "@/lib/intelligence/workspace-contract";
import type { OperationalGeoFeature } from "@/lib/geospatial/contracts";
import { LiveOsintPlane } from "@/components/intelligence/LiveOsintPlane";
import { DishaMotionField } from "@/components/visual/DishaMotionField";
import { CommandPalette } from "./command-palette";
import styles from "./analyst-workspace.module.css";

const GeospatialCommandMap = dynamic(
  () => import("@/components/geospatial/GeospatialCommandMap").then((module) => module.GeospatialCommandMap),
  { ssr: false, loading: () => <div className={styles.mapLoading}>Initializing governed map runtime…</div> },
);
const IntelligenceGraph = dynamic(
  () => import("@/components/intelligence/IntelligenceGraph").then((module) => module.IntelligenceGraph),
  { ssr: false, loading: () => <div className={styles.graphLoading}>Loading persisted entity graph…</div> },
);

type PrincipalView = { email: string; roles: string[] };
type LoadState =
  | { status: "loading" }
  | { status: "ready"; data: IntelligenceWorkspace }
  | { status: "error"; message: string };

export function DashboardClient({ principal }: { principal: PrincipalView }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedTimelineId, setSelectedTimelineId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/v1/intelligence/workspace", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Workspace returned ${response.status}`);
        return response.json() as Promise<IntelligenceWorkspace>;
      })
      .then((data) => setState({ status: "ready", data }))
      .catch((error) => {
        if (!controller.signal.aborted) {
          setState({ status: "error", message: error instanceof Error ? error.message : "Workspace unavailable" });
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const timelineData = state.status === "ready" ? state.data : null;
  const timelineAscending = useMemo(
    () => timelineData ? [...timelineData.timeline].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)) : [],
    [timelineData],
  );

  useEffect(() => {
    if (!playing || reducedMotion || timelineAscending.length < 2) return;
    const timer = window.setInterval(() => {
      setPlaybackIndex((current) => {
        const next = (current + 1) % timelineAscending.length;
        const item = timelineAscending[next];
        if (item) setSelectedTimelineId(item.id);
        return next;
      });
    }, 1800);
    return () => window.clearInterval(timer);
  }, [playing, reducedMotion, timelineAscending]);

  if (state.status === "loading") return <WorkspaceState principal={principal} title="Opening disha6.6 intelligence workspace" />;
  if (state.status === "error") return <WorkspaceState principal={principal} title="Workspace unavailable" message={state.message} />;

  const data = state.data;
  const selectedFeature = data.geo.features.find((feature) => feature.properties.featureId === selectedFeatureId) ?? null;
  const selectedEntity = data.entities.find((entity) => entity.entityId === selectedEntityId) ?? null;
  const selectedTimeline = data.timeline.find((item) => item.id === selectedTimelineId) ?? null;
  const activeMission = data.missions[0] ?? null;

  function selectFeature(feature: OperationalGeoFeature) {
    setSelectedFeatureId(feature.properties.featureId);
    const entityLink = feature.properties.links.find((link) => link.linkType === "entity");
    if (entityLink) setSelectedEntityId(entityLink.refId);
  }

  function selectEntity(entityId: string) {
    setSelectedEntityId(entityId);
    const linked = data.geo.features.find((feature) =>
      feature.properties.links.some((link) => link.linkType === "entity" && link.refId === entityId),
    );
    if (linked) setSelectedFeatureId(linked.properties.featureId);
  }

  function selectTimeline(item: WorkspaceTimelineItem) {
    setSelectedTimelineId(item.id);
    const entityId = item.entityIds?.[0];
    if (entityId) selectEntity(entityId);
    if (item.missionId) {
      const linked = data.geo.features.find((feature) =>
        feature.properties.links.some((link) => link.linkType === "mission" && link.refId === item.missionId),
      );
      if (linked) setSelectedFeatureId(linked.properties.featureId);
    }
  }

  return (
    <div className={styles.shell}>
      <DishaMotionField />
      <aside className={styles.rail}>
        <Link className={styles.brand} href="/dashboard" aria-label="disha6.6 intelligence workspace">
          <span>D</span>
          <div><strong>disha6.6</strong><small>Constitutional Evidence OS</small></div>
        </Link>

        <nav className={styles.nav} aria-label="Primary">
          <a href="#map" className={styles.navActive}><MapIcon size={16} /> Situation map</a>
          <a href="#timeline"><Clock3 size={16} /> Timeline</a>
          <a href="#graph"><Network size={16} /> Entity graph</a>
          <a href="#evidence"><Fingerprint size={16} /> Evidence</a>
          <Link href="/workbench"><Waypoints size={16} /> Mission workbench</Link>
          <Link href="/intelligence"><FileSearch size={16} /> Intelligence</Link>
          <Link href="/system"><Settings2 size={16} /> System console</Link>
        </nav>

        <section className={styles.missionRail}>
          <p>Current mission</p>
          {activeMission ? (
            <>
              <strong>{activeMission.missionId}</strong>
              <span>{humanize(activeMission.status)}</span>
              <small>Updated {formatDateTime(activeMission.updatedAt)}</small>
            </>
          ) : (
            <>
              <strong>No active mission</strong>
              <span>Start a governed mission to bind analysis, policy and evidence.</span>
            </>
          )}
          <Link href="/workbench">Open workbench <ArrowUpRight size={13} /></Link>
        </section>

        <footer className={styles.railFooter}>
          <ShieldCheck size={15} />
          <div><strong>Evidence-first runtime</strong><span>{principal.email}</span></div>
        </footer>
      </aside>

      <main className={styles.workspace}>
        <header className={styles.topbar}>
          <div>
            <p>National intelligence workspace</p>
            <h1>Operational picture</h1>
          </div>
          <div className={styles.topActions}>
            <div className={styles.asOf}><span /> As of {formatDateTime(data.generatedAt)}</div>
            <CommandPalette />
          </div>
        </header>

        <section className={styles.workspaceGrid}>
          <section className={styles.mapPanel} aria-labelledby="map-heading">
            <header className={styles.sectionHead}>
              <div>
                <span className={styles.kicker}>Geospatial intelligence</span>
                <h2 id="map-heading">India operational map</h2>
              </div>
              <div className={styles.mapMeta}>
                <span><Layers3 size={14} /> {data.geoStatus.admittedDatasets} admitted datasets</span>
                <span><Activity size={14} /> {data.geoStatus.admittedFeatures} admitted features</span>
              </div>
            </header>
            <GeospatialCommandMap
              features={data.geo}
              selectedFeatureId={selectedFeatureId}
              onSelectFeature={selectFeature}
            />
          </section>

          <aside className={styles.inspector} id="evidence">
            <header>
              <span className={styles.kicker}>Context inspector</span>
              <h2>{selectedFeature ? "Geospatial evidence" : selectedEntity ? "Entity context" : selectedTimeline ? "Timeline evidence" : "Evidence context"}</h2>
            </header>
            <Inspector
              feature={selectedFeature}
              entity={selectedEntity}
              timeline={selectedTimeline}
              latestEvidence={data.evidence[0] ?? null}
            />
          </aside>

          <section className={styles.intelStrip} aria-label="Persisted intelligence counts">
            <Metric label="Missions" value={data.counts.missions} />
            <Metric label="Evidence events" value={data.counts.evidenceEvents} />
            <Metric label="Entities" value={data.counts.entities} />
            <Metric label="Relationships" value={data.counts.edges} />
            <Metric label="Claims" value={data.counts.claims} />
          </section>

          <LiveOsintPlane />

          <section className={styles.graphPanel} id="graph">
            <header className={styles.sectionHead}>
              <div>
                <span className={styles.kicker}>Network intelligence</span>
                <h2>Entity / evidence graph</h2>
              </div>
              <span className={styles.subtle}>{data.edges.length} persisted edges in view</span>
            </header>
            <IntelligenceGraph
              entities={data.entities}
              edges={data.edges}
              selectedEntityId={selectedEntityId}
              onSelectEntity={selectEntity}
            />
          </section>

          <section className={styles.timelinePanel} id="timeline">
            <header className={styles.sectionHead}>
              <div>
                <span className={styles.kicker}>Temporal intelligence</span>
                <h2>Evidence timeline</h2>
              </div>
              <button
                className={styles.playButton}
                type="button"
                disabled={reducedMotion || timelineAscending.length < 2}
                onClick={() => setPlaying((current) => !current)}
              >
                {playing ? "Pause playback" : "Play evidence"}
              </button>
            </header>
            {data.timeline.length ? (
              <div className={styles.timelineTrack}>
                {data.timeline.slice(0, 28).map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={item.id === selectedTimelineId ? styles.timelineItemActive : styles.timelineItem}
                    onClick={() => selectTimeline(item)}
                  >
                    <span>{formatCompactDate(item.timestamp)}</span>
                    <strong>{item.title}</strong>
                    <small>{item.summary}</small>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState text="No persisted intelligence, change or evidence events are available yet." />
            )}
          </section>
        </section>
      </main>
    </div>
  );
}

function Inspector({
  feature,
  entity,
  timeline,
  latestEvidence,
}: {
  feature: OperationalGeoFeature | null;
  entity: WorkspaceEntity | null;
  timeline: WorkspaceTimelineItem | null;
  latestEvidence: IntelligenceWorkspace["evidence"][number] | null;
}) {
  if (feature) {
    return (
      <div className={styles.inspectorBody}>
        <StatusChip>{feature.properties.geographyLevel}</StatusChip>
        <h3>{feature.properties.name ?? feature.properties.featureId}</h3>
        <Definition label="LGD code" value={feature.properties.lgdCode ?? "Not mapped"} />
        <Definition label="Authority" value={feature.properties.sourceId} />
        <Definition label="Product" value={[feature.properties.productId, feature.properties.productVersion].filter(Boolean).join(" · ")} />
        <Definition label="Observed" value={formatDateTime(feature.properties.observedAt)} />
        <HashBlock label="Source record" value={feature.properties.sourceRecordHash} />
        <HashBlock label="Provenance" value={feature.properties.provenanceHash} />
        <div className={styles.linkList}>
          <span>Evidence links</span>
          {feature.properties.links.length
            ? feature.properties.links.map((link) => <code key={`${link.linkType}:${link.refId}`}>{link.linkType} · {link.refId}</code>)
            : <small>No entity, claim, mission or evidence link is persisted for this feature.</small>}
        </div>
        <a href={feature.properties.sourceUrl} target="_blank" rel="noreferrer">Open authoritative source <ArrowUpRight size={13} /></a>
      </div>
    );
  }

  if (entity) {
    return (
      <div className={styles.inspectorBody}>
        <StatusChip>{entity.entityType}</StatusChip>
        <h3>{entity.displayName}</h3>
        <Definition label="Last observed" value={formatDateTime(entity.lastSeenAt)} />
        <Definition label="Aliases" value={entity.aliases.length ? entity.aliases.join(", ") : "None persisted"} />
        <HashBlock label="Entity provenance" value={entity.provenanceHash} />
        <small>Map linkage appears only when a persisted geospatial feature explicitly links to this entity.</small>
      </div>
    );
  }

  if (timeline) {
    return (
      <div className={styles.inspectorBody}>
        <StatusChip>{timeline.kind}</StatusChip>
        <h3>{timeline.title}</h3>
        <p>{timeline.summary}</p>
        <Definition label="Timestamp" value={formatDateTime(timeline.timestamp)} />
        {timeline.missionId ? <Definition label="Mission" value={timeline.missionId} /> : null}
        {timeline.sourceHashes.map((hash, index) => <HashBlock key={hash} label={index ? "Linked hash" : "Evidence hash"} value={hash} />)}
        <HashBlock label="Provenance" value={timeline.provenanceHash} />
      </div>
    );
  }

  if (latestEvidence) {
    return (
      <div className={styles.inspectorBody}>
        <StatusChip>{latestEvidence.nodeKind}</StatusChip>
        <h3>{latestEvidence.title ?? latestEvidence.sourceId}</h3>
        <Definition label="Source" value={latestEvidence.sourceId} />
        <Definition label="Observed" value={formatDateTime(latestEvidence.observedAt)} />
        <HashBlock label="Source hash" value={latestEvidence.sourceHash} />
        <HashBlock label="Content hash" value={latestEvidence.contentHash} />
        <HashBlock label="Provenance" value={latestEvidence.provenanceHash} />
        {latestEvidence.sourceUrl ? <a href={latestEvidence.sourceUrl} target="_blank" rel="noreferrer">Open source <ArrowUpRight size={13} /></a> : null}
      </div>
    );
  }

  return <EmptyState text="Select a map feature, graph node or timeline event to inspect its evidence and provenance." />;
}

function WorkspaceState({ principal, title, message }: { principal: PrincipalView; title: string; message?: string }) {
  return (
    <div className={styles.stateShell}>
      <Fingerprint size={28} />
      <span>disha6.6 · {principal.email}</span>
      <h1>{title}</h1>
      <p>{message ?? "Loading persisted mission, geospatial, temporal and network intelligence."}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className={styles.metric}><strong>{new Intl.NumberFormat("en-IN").format(value)}</strong><span>{label}</span></div>;
}

function Definition({ label, value }: { label: string; value: string }) {
  return <div className={styles.definition}><span>{label}</span><strong>{value}</strong></div>;
}

function HashBlock({ label, value }: { label: string; value: string }) {
  return <div className={styles.hash}><span>{label}</span><code title={value}>{shortHash(value)}</code></div>;
}

function StatusChip({ children }: { children: string }) {
  return <span className={styles.statusChip}>{humanize(children)}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <div className={styles.empty}><GitBranch size={20} /><p>{text}</p></div>;
}

function shortHash(value: string): string {
  return value.length > 26 ? `${value.slice(0, 12)}…${value.slice(-10)}` : value;
}
function humanize(value: string): string { return value.replaceAll("_", " "); }
function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
function formatCompactDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
