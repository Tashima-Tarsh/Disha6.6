"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Clock, Eye, Pause, Play, RotateCcw } from "lucide-react";

import styles from "./gods-eye-globe.module.css";

export type StrategicNode = {
  id: string;
  name: string;
  category: "command" | "subsea" | "satcom" | "cloud" | "border" | "international";
  lat: number;
  lng: number;
  status: "active" | "defending" | "monitoring" | "intercepting";
  traffic: string;
  details: string;
};

export const STRATEGIC_GLOBAL_NODES: StrategicNode[] = [
  { id: "geo-delhi-01", name: "Delhi Supreme Cyber Command", category: "command", lat: 28.6139, lng: 77.2090, status: "defending", traffic: "94.2 Gbps", details: "Core national governance neural backbone, Vyuha chakra policy root." },
  { id: "geo-mumbai-02", name: "Mumbai Subsea Gateway Alpha", category: "subsea", lat: 18.9220, lng: 72.8347, status: "intercepting", traffic: "1.42 Tbps", details: "Arabian Sea undersea cable landing, international high-capacity fiber conduit." },
  { id: "geo-bengaluru-03", name: "Bengaluru Cloud Defense Hub", category: "cloud", lat: 12.9716, lng: 77.5946, status: "active", traffic: "620 Gbps", details: "Critical sovereign cloud data exchange, AI model cluster telemetry." },
  { id: "geo-hyderabad-04", name: "Hyderabad SatCom Control", category: "satcom", lat: 17.3850, lng: 78.4867, status: "active", traffic: "310 Gbps", details: "Orbital telemetry downlink, GSAT satellite command transceiver." },
  { id: "geo-chennai-05", name: "Chennai Bay Gateway", category: "subsea", lat: 13.0827, lng: 80.2707, status: "active", traffic: "890 Gbps", details: "Bay of Bengal subsea interconnect, Southeast Asia fiber landing point." },
  { id: "geo-kolkata-06", name: "Kolkata Eastern Frontier Node", category: "border", lat: 22.5726, lng: 88.3639, status: "monitoring", traffic: "240 Gbps", details: "Eastern corridor surveillance radar, border gateway monitoring." },
  { id: "geo-singapore-07", name: "Singapore ASEAN Relay", category: "international", lat: 1.3521, lng: 103.8198, status: "monitoring", traffic: "450 Gbps", details: "International sovereign proxy node, Pacific routing telemetry." },
  { id: "geo-frankfurt-08", name: "Frankfurt European Exchange", category: "international", lat: 50.1109, lng: 8.6821, status: "monitoring", traffic: "380 Gbps", details: "DE-CIX sovereign link, European intelligence telemetry." },
  { id: "geo-tokyo-09", name: "Tokyo Far-East Relay", category: "international", lat: 35.6762, lng: 139.6503, status: "monitoring", traffic: "290 Gbps", details: "Asia-Pacific defense data bridge, Trans-Pacific cable junction." },
  { id: "geo-london-10", name: "London Sovereign Link", category: "international", lat: 51.5074, lng: -0.1278, status: "monitoring", traffic: "340 Gbps", details: "Atlantic governance bridge, European financial telemetry." },
  { id: "geo-sv-11", name: "Silicon Valley Tech Relay", category: "international", lat: 37.3861, lng: -122.0839, status: "monitoring", traffic: "510 Gbps", details: "US-West gateway, sovereign identity validation beacon." },
  { id: "geo-ladakh-12", name: "Ladakh Northern High-Altitude Post", category: "border", lat: 34.1526, lng: 77.5771, status: "defending", traffic: "88 Gbps", details: "Northern border electronic warfare sensor array, high-altitude sat receiver." },
];

export type SatelliteOrbit = {
  id: string;
  name: string;
  orbitRadius: number;
  inclination: number;
  speed: number;
  color: string;
  sensor: string;
};

export const SATELLITE_ORBITS: SatelliteOrbit[] = [
  { id: "GS-01", name: "GS-01 Sovereignty SAR", orbitRadius: 2.35, inclination: 0.45, speed: 0.008, color: "#38bdf8", sensor: "Synthetic Aperture Radar" },
  { id: "GS-04", name: "GS-04 Orbital Intercept", orbitRadius: 2.65, inclination: -0.62, speed: 0.006, color: "#c084fc", sensor: "High-Band RF Spectrum Scanner" },
  { id: "GS-07", name: "GS-07 Maritime Recon", orbitRadius: 2.95, inclination: 0.85, speed: 0.005, color: "#34d399", sensor: "AIS + Multi-Spectral Imagery" },
  { id: "GS-12", name: "GS-12 Deep Space Relay", orbitRadius: 3.25, inclination: 0.20, speed: 0.003, color: "#f59e0b", sensor: "Quantum Cryptographic Uplink" },
];

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
  onSelectNode?: (node: StrategicNode) => void;
  selectedNodeId?: string | null;
  drillActive?: boolean;
}

export function GodsEyeHologramGlobe({
  formation,
  onSelectNode,
  selectedNodeId,
  drillActive = false,
}: GodsEyeHologramGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<StrategicNode | null>(
    STRATEGIC_GLOBAL_NODES.find((n) => n.id === (selectedNodeId || "geo-delhi-01")) || STRATEGIC_GLOBAL_NODES[0]
  );
  const [timeDimension, setTimeDimension] = useState<number>(0);
  const [isPlayingTime, setIsPlayingTime] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);

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

    STRATEGIC_GLOBAL_NODES.forEach((node) => {
      const pos = latLngToVector3(node.lat, node.lng, globeRadius);
      const isDefending = node.category === "command" || node.category === "border";
      const nodeColor = isDefending ? 0xc084fc : node.category === "subsea" ? 0x38bdf8 : 0x34d399;

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

    // 3. Dynamic Telemetry Arcs between Delhi/Mumbai and other hubs
    const arcsGroup = new THREE.Group();
    mainGroup.add(arcsGroup);

    const delhiPos = latLngToVector3(28.6139, 77.2090, globeRadius);
    const mumbaiPos = latLngToVector3(18.9220, 72.8347, globeRadius);

    STRATEGIC_GLOBAL_NODES.forEach((targetNode) => {
      if (targetNode.id === "geo-delhi-01" || targetNode.id === "geo-mumbai-02") return;
      const targetPos = latLngToVector3(targetNode.lat, targetNode.lng, globeRadius);
      const originPos = targetNode.category === "subsea" || targetNode.category === "international" ? mumbaiPos : delhiPos;

      const midPoint = originPos.clone().add(targetPos).multiplyScalar(0.5);
      const distance = originPos.distanceTo(targetPos);
      midPoint.normalize().multiplyScalar(globeRadius + distance * 0.28);

      const curve = new THREE.QuadraticBezierCurve3(originPos, midPoint, targetPos);
      const points = curve.getPoints(32);
      const arcGeo = new THREE.BufferGeometry().setFromPoints(points);
      const arcMat = new THREE.LineBasicMaterial({
        color: targetNode.category === "international" ? 0xf59e0b : 0x38bdf8,
        transparent: true,
        opacity: 0.45,
      });
      arcsGroup.add(new THREE.Line(arcGeo, arcMat));
    });

    // 4. Orbital Satellites (GS-01 to GS-12)
    const satSprites: { mesh: InstanceType<typeof THREE.Mesh>; orbit: SatelliteOrbit; angle: number }[] = [];
    SATELLITE_ORBITS.forEach((orbit, idx) => {
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
  }, [formation, autoRotate, drillActive, isPlayingTime]);

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

      {/* 4D Space-Time Temporal Scrubber */}
      <div className={styles.timeScrubberPanel}>
        <div className={styles.timeControlsRow}>
          <div className={styles.timeHeader}>
            <Clock size={14} color="#38bdf8" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0" }}>4D TEMPORAL VECTOR SCRUBBER</span>
            <span className={styles.timeBadge}>
              {timeDimension === 0 ? "LIVE (T-00:00)" : timeDimension > 0 ? `PREDICTIVE (T+0${timeDimension}h)` : `HISTORICAL (T${timeDimension}h)`}
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
              title="Reset to Live Real-Time"
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
          <span>T-24h (Archive)</span>
          <span>T-12h</span>
          <span style={{ color: "#38bdf8", fontWeight: 700 }}>T-0 (Real-Time)</span>
          <span>T+3h</span>
          <span style={{ color: "#c084fc" }}>T+6h (Predictive)</span>
        </div>
      </div>

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
            <span>Traffic: <strong style={{ color: "#34d399" }}>{selectedNode.traffic}</strong></span>
            <span>Coord: [{selectedNode.lat.toFixed(2)}, {selectedNode.lng.toFixed(2)}]</span>
          </div>
        </div>
      )}

      {/* Interactive Node Selector Pills */}
      <div className={styles.nodesBar}>
        {STRATEGIC_GLOBAL_NODES.slice(0, 6).map((node) => (
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
