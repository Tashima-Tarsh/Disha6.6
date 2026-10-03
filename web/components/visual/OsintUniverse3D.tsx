"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { Compass, RotateCcw, Search, Shield, Zap, Layers } from "lucide-react";
import type {
  CanonicalSourceRuntimeNode,
  OsintSystemSystemDefinition,
  OsintSystemId,
  RuntimeSourceHealth,
} from "@/lib/unified/canonical-source-registry";
import styles from "./osint-universe-3d.module.css";

type ThreeScene = InstanceType<typeof THREE.Scene>;
type ThreeCamera = InstanceType<typeof THREE.PerspectiveCamera>;
type ThreeRenderer = InstanceType<typeof THREE.WebGLRenderer>;
type ThreeGroup = InstanceType<typeof THREE.Group>;
type ThreeMesh = InstanceType<typeof THREE.Mesh>;
type ThreePoints = InstanceType<typeof THREE.Points>;
type ThreeCurve = InstanceType<typeof THREE.CatmullRomCurve3>;
type ThreeObject = InstanceType<typeof THREE.Object3D>;
type ThreeBufferGeometry = InstanceType<typeof THREE.BufferGeometry>;
type ThreeVector3 = InstanceType<typeof THREE.Vector3>;
type ThreeDisposable = { geometry?: { dispose: () => void }; material?: { dispose: () => void } | Array<{ dispose: () => void }> };

export interface ActiveInvestigationVisualState {
  investigationId: string;
  query: string;
  normalizedTarget: string;
  targetType: string;
  executedAdapters: string[];
  evidence: Array<{
    evidenceId: string;
    sourceId: string;
    summary: string;
    sourceUrl?: string;
    corroborationState: string;
  }>;
  candidateClusters?: Array<{
    candidateId: string;
    label: string;
    status: string;
    evidenceIds: string[];
  }>;
}

export interface OsintUniverse3DProps {
  sources?: CanonicalSourceRuntimeNode[];
  systems?: OsintSystemSystemDefinition[];
  activeInvestigation?: ActiveInvestigationVisualState | null;
  onSelectSource?: (source: CanonicalSourceRuntimeNode) => void;
  onSelectCandidate?: (candidateId: string) => void;
  activePreset?: "UNIVERSE" | "DISHA_CORE" | "CYBER" | "SPACE" | "INVESTIGATION" | "EVIDENCE";
}

const HEALTH_COLORS: Record<RuntimeSourceHealth, number> = {
  HEALTHY: 0x00f0ff,
  DEGRADED: 0xf59e0b,
  UNAVAILABLE: 0xef4444,
  UNCONFIGURED: 0x78716c,
  REFERENCE_ONLY: 0x64748b,
  BLOCKED: 0x991b1b,
  RESTRICTED: 0xb91c1c,
};

export function OsintUniverse3D({
  sources = [],
  systems = [],
  activeInvestigation = null,
  onSelectSource,
  onSelectCandidate,
  activePreset = "UNIVERSE",
}: OsintUniverse3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredSource, setHoveredSource] = useState<CanonicalSourceRuntimeNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [currentPreset, setCurrentPreset] = useState<string>(activePreset);

  const sceneRef = useRef<ThreeScene | null>(null);
  const cameraRef = useRef<ThreeCamera | null>(null);
  const rendererRef = useRef<ThreeRenderer | null>(null);
  const universeGroupRef = useRef<ThreeGroup | null>(null);
  const targetCamPosRef = useRef(new THREE.Vector3(0, 4.5, 12.0));
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2(-999, -999));
  const sourceMeshesRef = useRef<Map<string, ThreeMesh>>(new Map());

  const applyPreset = useCallback((preset: string) => {
    setCurrentPreset(preset);
    if (!targetCamPosRef.current) return;

    switch (preset) {
      case "UNIVERSE":
        targetCamPosRef.current.set(0, 7.5, 14.5);
        break;
      case "DISHA_CORE":
        targetCamPosRef.current.set(0, 1.8, 4.2);
        break;
      case "CYBER":
        targetCamPosRef.current.set(-4.5, 3.2, 5.0);
        break;
      case "SPACE":
        targetCamPosRef.current.set(4.8, 3.8, -4.5);
        break;
      case "INVESTIGATION":
        targetCamPosRef.current.set(0, 2.8, 6.0);
        break;
      case "EVIDENCE":
        targetCamPosRef.current.set(2.5, 1.5, 5.5);
        break;
      default:
        targetCamPosRef.current.set(0, 7.0, 14.0);
        break;
    }
  }, []);

  useEffect(() => {
    applyPreset(activePreset);
  }, [activePreset, applyPreset]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = Math.max(1, container.clientHeight);

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 7.5, 14.5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    rendererRef.current = renderer;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    const universeGroup = new THREE.Group();
    universeGroupRef.current = universeGroup;
    scene.add(universeGroup);

    // 2. Ambient & Directional Lighting
    const ambientLight = new THREE.AmbientLight(0x0a192f, 1.4);
    scene.add(ambientLight);

    const coreLight = new THREE.PointLight(0x00f0ff, 2.5, 25);
    coreLight.position.set(0, 0, 0);
    scene.add(coreLight);

    // 3. Starfield Depth Field
    const starsCount = 1200;
    const starGeom = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starsCount * 3);
    const starColors = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount; i++) {
      const r = 25 + Math.random() * 65;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      const color = new THREE.Color(Math.random() > 0.8 ? 0x38bdf8 : 0x0ea5e9);
      starColors[i * 3] = color.r;
      starColors[i * 3 + 1] = color.g;
      starColors[i * 3 + 2] = color.b;
    }

    starGeom.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeom.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
    });
    const starField = new THREE.Points(starGeom, starMat);
    scene.add(starField);

    // 4. Central DISHA Core (Orchestrating Sun / Hub)
    const coreGroup = new THREE.Group();
    const coreSphereGeom = new THREE.SphereGeometry(0.72, 32, 32);
    const coreSphereMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    const coreMesh = new THREE.Mesh(coreSphereGeom, coreSphereMat);
    coreGroup.add(coreMesh);

    // Inner glowing core
    const innerCoreGeom = new THREE.SphereGeometry(0.55, 24, 24);
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.6,
    });
    const innerMesh = new THREE.Mesh(innerCoreGeom, innerCoreMat);
    coreGroup.add(innerMesh);

    // Core Corona Rings
    const coronaRings: ThreeMesh[] = [];
    [0.9, 1.15, 1.4].forEach((radius, idx) => {
      const ringGeom = new THREE.RingGeometry(radius, radius + 0.015, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx === 1 ? 0x10b981 : 0x0ea5e9,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.35 - idx * 0.08,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = Math.PI / 2 + idx * 0.2;
      ring.rotation.y = idx * 0.3;
      coreGroup.add(ring);
      coronaRings.push(ring);
    });

    universeGroup.add(coreGroup);

    // 5. Source Systems Orbital Tracks & System Centers
    systems.forEach((system) => {
      // Orbital path track around DISHA Core
      const trackGeom = new THREE.RingGeometry(system.orbitalRadius - 0.01, system.orbitalRadius + 0.01, 96);
      const trackMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(system.color),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.12,
      });
      const trackMesh = new THREE.Mesh(trackGeom, trackMat);
      trackMesh.rotation.x = Math.PI / 2;
      universeGroup.add(trackMesh);

      // System Center Anchor
      const centerGeom = new THREE.SphereGeometry(0.18, 16, 16);
      const centerMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(system.color),
        transparent: true,
        opacity: 0.85,
      });
      const centerMesh = new THREE.Mesh(centerGeom, centerMat);
      centerMesh.position.set(system.center3D.x, system.center3D.y, system.center3D.z);
      universeGroup.add(centerMesh);
    });

    // 6. Source Planets (All individual providers positioned deterministically)
    const sourceMeshes = new Map<string, ThreeMesh>();
    sourceMeshesRef.current = sourceMeshes;

    sources.forEach((source) => {
      const colorHex = HEALTH_COLORS[source.health] ?? 0x64748b;
      const size = 0.06 + Math.min(0.12, Math.log10(source.evidenceCount + 1) * 0.04);

      const sphereGeom = new THREE.SphereGeometry(size, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(colorHex),
      });
      const mesh = new THREE.Mesh(sphereGeom, sphereMat);
      mesh.position.set(source.coordinates3D.x, source.coordinates3D.y, source.coordinates3D.z);
      mesh.userData = { sourceData: source };

      // Halo for healthy and active providers
      if (source.health === "HEALTHY") {
        const haloGeom = new THREE.RingGeometry(size * 1.3, size * 1.6, 16);
        const haloMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(colorHex),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.45,
        });
        const halo = new THREE.Mesh(haloGeom, haloMat);
        halo.lookAt(mesh.position.clone().multiplyScalar(2));
        mesh.add(halo);
      }

      universeGroup.add(mesh);
      sourceMeshes.set(source.sourceId, mesh);
    });

    // 7. Active Investigation Visual Nodes & Conduits
    const investigationGroup = new THREE.Group();
    const investigationPulses: Array<{ curve: ThreeCurve; mesh: ThreeMesh; speed: number }> = [];

    if (activeInvestigation) {
      // Central Investigation Target Node
      const targetGeom = new THREE.SphereGeometry(0.35, 32, 32);
      const targetMat = new THREE.MeshBasicMaterial({
        color: 0xff007f,
        wireframe: true,
        transparent: true,
        opacity: 0.9,
      });
      const targetMesh = new THREE.Mesh(targetGeom, targetMat);
      targetMesh.position.set(0, 1.4, 0);
      investigationGroup.add(targetMesh);

      // Connected Conduit Arcs to queried adapters
      activeInvestigation.executedAdapters.forEach((adapterId, idx) => {
        const cleanId = adapterId.replace(/^public-/, "");
        const sourceMesh = sourceMeshes.get(cleanId);
        if (sourceMesh) {
          const p1 = targetMesh.position;
          const p2 = sourceMesh.position;
          const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
          mid.y += 0.8;

          const curve = new THREE.CatmullRomCurve3([p1, mid, p2]);
          const pts = curve.getPoints(32);
          const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
          const lineMat = new THREE.LineBasicMaterial({
            color: 0x00f0ff,
            transparent: true,
            opacity: 0.7,
          });
          investigationGroup.add(new THREE.Line(lineGeom, lineMat));

          // Travelling telemetry packet
          const pulseGeom = new THREE.SphereGeometry(0.04, 8, 8);
          const pulseMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
          const pulseMesh = new THREE.Mesh(pulseGeom, pulseMat);
          investigationGroup.add(pulseMesh);

          investigationPulses.push({
            curve,
            mesh: pulseMesh,
            speed: 0.6 + (idx % 3) * 0.2,
          });
        }
      });

      // Candidate Clusters
      activeInvestigation.candidateClusters?.forEach((cluster, cIdx) => {
        const theta = (cIdx / (activeInvestigation.candidateClusters?.length || 1)) * Math.PI * 2;
        const cx = Math.cos(theta) * 2.2;
        const cz = Math.sin(theta) * 2.2;

        const clusterGeom = new THREE.SphereGeometry(0.18, 16, 16);
        const clusterMat = new THREE.MeshBasicMaterial({
          color: 0xf59e0b,
          transparent: true,
          opacity: 0.85,
        });
        const clusterMesh = new THREE.Mesh(clusterGeom, clusterMat);
        clusterMesh.position.set(cx, 1.4, cz);
        clusterMesh.userData = { clusterId: cluster.candidateId };
        investigationGroup.add(clusterMesh);

        // Line to target
        const lineGeom = new THREE.BufferGeometry().setFromPoints([targetMesh.position, clusterMesh.position]);
        const lineMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.4 });
        investigationGroup.add(new THREE.Line(lineGeom, lineMat));
      });
    }

    universeGroup.add(investigationGroup);

    // 8. Pointer Drag, Orbit & Zoom Controls
    const handlePointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      setTooltipPos({ x: e.clientX, y: e.clientY });

      if (!isDraggingRef.current || !universeGroupRef.current) return;

      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      universeGroupRef.current.rotation.y += deltaX * 0.005;
      universeGroupRef.current.rotation.x = Math.max(
        -1.2,
        Math.min(1.2, universeGroupRef.current.rotation.x + deltaY * 0.005)
      );

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const currentDist = targetCamPosRef.current.z;
      const newDist = Math.max(3.2, Math.min(22.0, currentDist + e.deltaY * 0.008));
      targetCamPosRef.current.z = newDist;
    };

    const handleClick = () => {
      if (!cameraRef.current || !sceneRef.current) return;
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const meshes = Array.from(sourceMeshesRef.current.values());
      const intersects = raycasterRef.current.intersectObjects(meshes);

      if (intersects.length > 0) {
        const hit = intersects[0]?.object as ThreeMesh;
        const sourceData = hit.userData.sourceData as CanonicalSourceRuntimeNode;
        if (sourceData && onSelectSource) {
          onSelectSource(sourceData);
        }
      }
    };

    container.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("click", handleClick);

    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // 9. Master Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth camera interpolation
      if (cameraRef.current) {
        cameraRef.current.position.lerp(targetCamPosRef.current, 0.04);
        cameraRef.current.lookAt(0, 0, 0);
      }

      // Restrained idle rotation
      if (!isDraggingRef.current && universeGroupRef.current) {
        universeGroupRef.current.rotation.y += 0.0008;
      }

      // DISHA Core pulsation
      if (coreMesh) {
        const scale = 1 + 0.06 * Math.sin(elapsed * 2.2);
        coreMesh.scale.set(scale, scale, scale);
        coreMesh.rotation.y += 0.003;
      }

      // Corona rings rotation
      coronaRings.forEach((ring, idx) => {
        ring.rotation.z += 0.002 * (idx + 1);
      });

      // Update investigation telemetry pulses
      investigationPulses.forEach((pulse) => {
        const t = (elapsed * pulse.speed * 0.4) % 1;
        pulse.mesh.position.copy(pulse.curve.getPointAt(t));
      });

      // Raycast hover detection
      if (cameraRef.current) {
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        const meshes = Array.from(sourceMeshesRef.current.values());
        const intersects = raycasterRef.current.intersectObjects(meshes);

        if (intersects.length > 0) {
          const hit = intersects[0]?.object as ThreeMesh;
          const sourceData = hit.userData.sourceData as CanonicalSourceRuntimeNode;
          setHoveredSource(sourceData || null);
        } else {
          setHoveredSource(null);
        }
      }

      rendererRef.current?.render(scene, camera);
    };

    animate();

    // 10. Clean up
    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("click", handleClick);
      window.removeEventListener("resize", handleResize);

      if (sceneRef.current) {
        sceneRef.current.traverse((obj: ThreeObject) => {
          const item = obj as unknown as ThreeDisposable;
          if (item.geometry) item.geometry.dispose();
          if (Array.isArray(item.material)) {
            item.material.forEach((m: { dispose: () => void }) => m.dispose());
          } else if (item.material) {
            item.material.dispose();
          }
        });
      }

      if (rendererRef.current?.domElement) {
        container.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [systems, sources, activeInvestigation, applyPreset, onSelectSource]);

  return (
    <div className={styles.host} ref={containerRef}>
      <div className={styles.celestialBackground} />

      {/* Top Left: System Metrics HUD */}
      <div className={styles.systemHud}>
        <div className={styles.systemBadge}>
          <span className={styles.pulseDot} />
          <span className={styles.systemTitle}>DISHA 6.6</span>
          <span className={styles.systemSep}>·</span>
          <span className={styles.systemSubtitle}>3D OSINT UNIVERSE</span>
        </div>
        <div className={styles.systemMetrics}>
          <div className={styles.metricPill}>
            <span>TOTAL SOURCES:</span>
            <span className={styles.metricValue}>{sources.length}</span>
          </div>
          <div className={styles.metricPill}>
            <span>ACTIVE CONNECTORS:</span>
            <span className={styles.metricValue}>{sources.filter((s) => s.health === "HEALTHY").length}</span>
          </div>
          <div className={styles.metricPill}>
            <span>SPATIAL SYSTEMS:</span>
            <span className={styles.metricValue}>{systems.length}</span>
          </div>
        </div>
      </div>

      {/* Camera Presets Selector */}
      <div className={styles.cameraPresets}>
        <span className={styles.presetLabel}>
          <Compass size={13} />
          <span>SPATIAL FOCUS</span>
        </span>
        <div className={styles.presetButtons}>
          <button
            type="button"
            className={`${styles.presetButton} ${currentPreset === "UNIVERSE" ? styles.activePreset : ""}`}
            onClick={() => applyPreset("UNIVERSE")}
          >
            UNIVERSE
          </button>
          <button
            type="button"
            className={`${styles.presetButton} ${currentPreset === "DISHA_CORE" ? styles.activePreset : ""}`}
            onClick={() => applyPreset("DISHA_CORE")}
          >
            DISHA CORE
          </button>
          <button
            type="button"
            className={`${styles.presetButton} ${currentPreset === "CYBER" ? styles.activePreset : ""}`}
            onClick={() => applyPreset("CYBER")}
          >
            CYBER IOC
          </button>
          <button
            type="button"
            className={`${styles.presetButton} ${currentPreset === "SPACE" ? styles.activePreset : ""}`}
            onClick={() => applyPreset("SPACE")}
          >
            SPACEINT
          </button>
          <button
            type="button"
            className={`${styles.presetButton} ${currentPreset === "INVESTIGATION" ? styles.activePreset : ""}`}
            onClick={() => applyPreset("INVESTIGATION")}
          >
            INVESTIGATION
          </button>
          <button
            type="button"
            className={`${styles.presetButton} ${currentPreset === "EVIDENCE" ? styles.activePreset : ""}`}
            onClick={() => applyPreset("EVIDENCE")}
          >
            EVIDENCE
          </button>
        </div>
      </div>

      {/* Hover Raycaster Tooltip */}
      {hoveredSource && (
        <div
          className={styles.nodeTooltip}
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          <div className={styles.tooltipHeader}>
            <span className={styles.tooltipTitle}>{hoveredSource.name}</span>
            <span
              className={`${styles.tooltipHealth} ${
                hoveredSource.health === "HEALTHY"
                  ? styles.healthHealthy
                  : hoveredSource.health === "UNCONFIGURED"
                  ? styles.healthUnconfigured
                  : styles.healthReference
              }`}
            >
              {hoveredSource.health}
            </span>
          </div>
          <div className={styles.tooltipCategory}>SYSTEM: {hoveredSource.system.toUpperCase()}</div>
          <div className={styles.tooltipEvidence}>
            Evidence Records: {hoveredSource.evidenceCount}
          </div>
        </div>
      )}
    </div>
  );
}
