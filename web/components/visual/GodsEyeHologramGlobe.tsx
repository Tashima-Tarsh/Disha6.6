"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Clock, Eye, Pause, Play, RotateCcw } from "lucide-react";

import styles from "./gods-eye-globe.module.css";

export type StrategicNode = {
  id: string;
  name: string;
  category: "source" | "geospatial" | "infrastructure" | "evidence" | "connector";
  lat: number;
  lng: number;
  status: "admitted" | "reachable" | "degraded" | "unavailable";
  details: string;
  sourceId?: string;
  provenanceHash?: string;
};

export type SatelliteOrbit = {
  id: string;
  name: string;
  orbitRadius: number;
  inclination: number;
  speed: number;
  color: string;
  sensor: string;
};



function latLngToVector3(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

interface GodsEyeHologramGlobeProps {
  formation: string;
  nodes?: StrategicNode[];
  orbits?: SatelliteOrbit[];
  onSelectNode?: (node: StrategicNode) => void;
  selectedNodeId?: string | null;
  drillActive?: boolean;
}

export function GodsEyeHologramGlobe({
  formation,
  nodes = [],
  orbits = [],
  onSelectNode,
  selectedNodeId,
  drillActive = false,
}: GodsEyeHologramGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<StrategicNode | null>(
    nodes.find((node) => node.id === selectedNodeId) ?? nodes[0] ?? null
  );
  const [timeDimension, setTimeDimension] = useState<number>(0);
  const [isPlayingTime, setIsPlayingTime] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);

  useEffect(() => {
    setSelectedNode(nodes.find((node) => node.id === selectedNodeId) ?? nodes[0] ?? null);
  }, [nodes, selectedNodeId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.2, 5.2);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // 1. Core Hologram Wireframe Globe
    const globeRadius = 1.8;
    const sphereGeo = new THREE.SphereGeometry(globeRadius, 36, 36);
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    const globeWire = new THREE.Mesh(sphereGeo, wireframeMat);
    mainGroup.add(globeWire);

    // Inner Glowing Core
    const innerGeo = new THREE.SphereGeometry(globeRadius * 0.94, 24, 24);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x0369a1,
      transparent: true,
      opacity: 0.08,
    });
    mainGroup.add(new THREE.Mesh(innerGeo, innerMat));

    // Latitude & Longitude Coordinate Rings
    const ringMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.25 });
    for (let r = -60; r <= 60; r += 30) {
      const ringRad = globeRadius * Math.cos((r * Math.PI) / 180);
      const ringY = globeRadius * Math.sin((r * Math.PI) / 180);
      const ringPoints: InstanceType<typeof THREE.Vector3>[] = [];
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        ringPoints.push(new THREE.Vector3(Math.cos(theta) * ringRad, ringY, Math.sin(theta) * ringRad));
      }
      const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPoints);
      mainGroup.add(new THREE.Line(ringGeo, ringMat));
    }

    // 2. Add Strategic Ground Nodes
    const nodeGeometry = new THREE.SphereGeometry(0.045, 12, 12);

    nodes.forEach((node) => {
      const pos = latLngToVector3(node.lat, node.lng, globeRadius);
      const nodeColor =
        node.category === "evidence"
          ? 0xd4af37
          : node.category === "connector"
          ? 0xc084fc
          : node.category === "infrastructure"
          ? 0x34d399
          : node.category === "source"
          ? 0x8a7db2
          : 0x38bdf8;

      const nodeMat = new THREE.MeshBasicMaterial({ color: nodeColor });
      const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMat);
      nodeMesh.position.copy(pos);
      mainGroup.add(nodeMesh);

      // Node Halo / Radar Pulse
      const haloGeo = new THREE.RingGeometry(0.05, 0.08, 16);
      const haloMat = new THREE.MeshBasicMaterial({
        color: nodeColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.copy(pos.clone().multiplyScalar(1.02));
      halo.lookAt(new THREE.Vector3(0, 0, 0));
      mainGroup.add(halo);
    });

    // 3. Relationship arcs are intentionally omitted unless backed by authenticated evidence.
    // The component never infers or fabricates connectivity between admitted nodes.

    // 4. Orbital objects supplied by an admitted runtime feed
    const satSprites: { mesh: InstanceType<typeof THREE.Mesh>; orbit: SatelliteOrbit; angle: number }[] = [];
    orbits.forEach((orbit, idx) => {
      const orbitCurve = new THREE.EllipseCurve(0, 0, orbit.orbitRadius, orbit.orbitRadius, 0, Math.PI * 2, false, 0);
      const orbitPoints = orbitCurve.getPoints(64).map((p: { x: number; y: number }) => new THREE.Vector3(p.x, 0, p.y));
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
      const orbitMat = new THREE.LineBasicMaterial({ color: orbit.color, transparent: true, opacity: 0.3 });
      const orbitLine = new THREE.Line(orbitGeo, orbitMat);
      orbitLine.rotation.x = orbit.inclination;
      orbitLine.rotation.y = idx * 0.7;
      mainGroup.add(orbitLine);

      const satGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
      const satMat = new THREE.MeshBasicMaterial({ color: orbit.color });
      const satMesh = new THREE.Mesh(satGeo, satMat);
      mainGroup.add(satMesh);
      satSprites.push({ mesh: satMesh, orbit, angle: idx * 1.5 });
    });

    // 5. Vyuha Dynamic Energy Shield Mesh
    const shieldGeo = new THREE.IcosahedronGeometry(globeRadius * 1.15, 2);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: formation === "chakra" ? 0xc084fc : formation === "padma" ? 0x38bdf8 : 0x34d399,
      wireframe: true,
      transparent: true,
      opacity: drillActive ? 0.65 : 0.22,
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    mainGroup.add(shieldMesh);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);

    let animationId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      if (autoRotate && mainGroup) {
        mainGroup.rotation.y += 0.0025;
      }

      satSprites.forEach((sat) => {
        sat.angle += sat.orbit.speed * (isPlayingTime ? 4 : 1);
        const x = Math.cos(sat.angle) * sat.orbit.orbitRadius;
        const z = Math.sin(sat.angle) * sat.orbit.orbitRadius;
        const pos = new THREE.Vector3(x, 0, z);
        pos.applyAxisAngle(new THREE.Vector3(1, 0, 0), sat.orbit.inclination);
        sat.mesh.position.copy(pos);
        sat.mesh.rotation.y += 0.02;
      });

      if (shieldMesh) {
        const pulse = 1 + Math.sin(elapsed * 2.5) * 0.03;
        shieldMesh.scale.set(pulse, pulse, pulse);
        shieldMesh.rotation.y = -elapsed * 0.05;
      }

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      if (container) container.innerHTML = "";
    };
  }, [formation, autoRotate, drillActive, isPlayingTime, nodes, orbits]);

  useEffect(() => {
    if (!isPlayingTime) return;
    const interval = setInterval(() => {
      setTimeDimension((prev) => {
        if (prev >= 6) return -24;
        return Number((prev + 0.5).toFixed(1));
      });
    }, 400);
    return () => clearInterval(interval);
  }, [isPlayingTime]);

  const handleNodeClick = (node: StrategicNode) => {
    setSelectedNode(node);
    if (onSelectNode) onSelectNode(node);
  };

  return (
    <div className={styles.globeWrapper}>
      <div ref={containerRef} className={styles.canvasContainer} />

      {/* Visual time offset control. This changes presentation only; it is not a prediction engine. */}
      <div className={styles.timeScrubberPanel}>
        <div className={styles.timeControlsRow}>
          <div className={styles.timeHeader}>
            <Clock size={14} color="#38bdf8" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0" }}>VISUAL TIME OFFSET</span>
            <span className={styles.timeBadge}>
              {timeDimension === 0 ? "REFERENCE (T0)" : timeDimension > 0 ? `DISPLAY OFFSET (T+${timeDimension}h)` : `DISPLAY OFFSET (T${timeDimension}h)`}
            </span>
          </div>
          <div className={styles.timeActions}>
            <button
              className={styles.timeBtn}
              onClick={() => setIsPlayingTime(!isPlayingTime)}
              title={isPlayingTime ? "Pause 4D Playback" : "Play 4D Temporal Vector"}
            >
              {isPlayingTime ? <Pause size={12} /> : <Play size={12} />}
            </button>
            <button
              className={styles.timeBtn}
              onClick={() => {
                setTimeDimension(0);
                setIsPlayingTime(false);
              }}
              title="Reset time reference"
            >
              <RotateCcw size={12} />
            </button>
            <button
              className={`${styles.timeBtn} ${autoRotate ? styles.timeBtnActive : ""}`}
              onClick={() => setAutoRotate(!autoRotate)}
              title="Toggle Globe Orbit Rotation"
            >
              <Eye size={12} />
            </button>
          </div>
        </div>

        <input
          type="range"
          min="-24"
          max="6"
          step="0.5"
          value={timeDimension}
          onChange={(e) => setTimeDimension(parseFloat(e.target.value))}
          className={styles.slider4D}
        />
        <div className={styles.sliderLabels}>
          <span>T-24h</span>
          <span>T-12h</span>
          <span style={{ color: "#38bdf8", fontWeight: 700 }}>T0 (Reference)</span>
          <span>T+3h</span>
          <span style={{ color: "#c084fc" }}>T+6h</span>
        </div>
      </div>

      {!nodes.length && (
        <div className={styles.nodeCardOverlay}>
          <div className={styles.nodeCardHeader}>
            <strong style={{ fontSize: 13, color: "#f8fafc" }}>NO ADMITTED GEO NODES</strong>
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0" }}>
            The authenticated runtime has not supplied source-backed geospatial records. Synthetic operational nodes are disabled.
          </div>
        </div>
      )}

      {/* Floating Node Info Overlay */}
      {selectedNode && (
        <div className={styles.nodeCardOverlay}>
          <div className={styles.nodeCardHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className={`${styles.nodeDot} ${styles[selectedNode.status]}`} />
              <strong style={{ fontSize: 13, color: "#f8fafc" }}>{selectedNode.name}</strong>
            </div>
            <span style={{ fontSize: 10, background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" }}>
              {selectedNode.category}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0" }}>{selectedNode.details}</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 6 }}>
            <span>Reference topology</span>
            <span>Coord: [{selectedNode.lat.toFixed(2)}, {selectedNode.lng.toFixed(2)}]</span>
          </div>
        </div>
      )}

      {/* Interactive Node Selector Pills */}
      <div className={styles.nodesBar}>
        {nodes.slice(0, 6).map((node) => (
          <button
            key={node.id}
            className={`${styles.nodePill} ${selectedNode?.id === node.id ? styles.nodePillActive : ""}`}
            onClick={() => handleNodeClick(node)}
          >
            {node.name.split(" ")[0]}
          </button>
        ))}
      </div>
    </div>
  );
}
