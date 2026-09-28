"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ShieldCheck, Lock, Activity } from "lucide-react";

import styles from "./sovereign-cyber-matrix.module.css";

const PARTICLE_COUNT = 380;
const NODE_COUNT = 18;

type CyberTelemetry = {
  activeStreams: number;
  policyGateLatency: string;
  formationStatus: string;
  verifiedHashes: number;
};

export function SovereignCyberMatrix3D() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [telemetry, setTelemetry] = useState<CyberTelemetry>({
    activeStreams: 142,
    policyGateLatency: "0.84ms",
    formationStatus: "KURMA NFU",
    verifiedHashes: 18490,
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTelemetry((prev) => ({
        ...prev,
        activeStreams: 140 + Math.floor(Math.sin(Date.now() / 1500) * 8),
        verifiedHashes: prev.verifiedHashes + 1,
      }));
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, host.clientWidth / Math.max(1, host.clientHeight), 0.1, 100);
    camera.position.set(0, 0, 7.2);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const cyberGroup = new THREE.Group();
    scene.add(cyberGroup);

    // 1. Central Core Icosahedron
    const coreGeo = new THREE.IcosahedronGeometry(1.5, 1);
    const coreWireMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#38bdf8"),
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreWireMat);
    cyberGroup.add(coreMesh);

    // 2. Inner Glowing Core
    const innerGeo = new THREE.SphereGeometry(0.85, 24, 24);
    const innerMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#0284c7"),
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const innerCore = new THREE.Mesh(innerGeo, innerMat);
    cyberGroup.add(innerCore);

    // 3. Orbital Defense Rings
    const ring1Geo = new THREE.RingGeometry(2.35, 2.38, 64);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#34d399"),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 3;
    cyberGroup.add(ring1);

    const ring2Geo = new THREE.RingGeometry(2.75, 2.78, 64);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#38bdf8"),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.y = Math.PI / 4;
    ring2.rotation.x = -Math.PI / 5;
    cyberGroup.add(ring2);

    // 4. Node Coordinates & Interconnecting lines
    type NodeCoord = { x: number; y: number; z: number; distanceTo: (other: NodeCoord) => number };
    const nodes: NodeCoord[] = [];
    for (let i = 0; i < NODE_COUNT; i += 1) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 2.1 + Math.random() * 0.9;
      const sinPhi = Math.sin(phi);
      nodes.push(new THREE.Vector3(
        r * sinPhi * Math.cos(theta),
        r * sinPhi * Math.sin(theta),
        r * Math.cos(phi)
      ));
    }

    const nodePositions = new Float32Array(NODE_COUNT * 3);
    for (let i = 0; i < NODE_COUNT; i += 1) {
      nodePositions[i * 3] = nodes[i].x;
      nodePositions[i * 3 + 1] = nodes[i].y;
      nodePositions[i * 3 + 2] = nodes[i].z;
    }
    const nodesGeo = new THREE.BufferGeometry();
    nodesGeo.setAttribute("position", new THREE.BufferAttribute(nodePositions, 3));
    const nodesMat = new THREE.PointsMaterial({
      color: new THREE.Color("#67e8f9"),
      size: 0.08,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const nodesPoints = new THREE.Points(nodesGeo, nodesMat);
    cyberGroup.add(nodesPoints);

    // Lines connecting close nodes
    const lineIndices: number[] = [];
    for (let i = 0; i < NODE_COUNT; i += 1) {
      for (let j = i + 1; j < NODE_COUNT; j += 1) {
        if (nodes[i].distanceTo(nodes[j]) < 2.0) {
          lineIndices.push(nodes[i].x, nodes[i].y, nodes[i].z);
          lineIndices.push(nodes[j].x, nodes[j].y, nodes[j].z);
        }
      }
    }
    const linesGeo = new THREE.BufferGeometry();
    linesGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(lineIndices), 3));
    const linesMat = new THREE.LineBasicMaterial({
      color: new THREE.Color("#0284c7"),
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });
    const linesMesh = new THREE.LineSegments(linesGeo, linesMat);
    cyberGroup.add(linesMesh);

    // 5. Ambient Particles
    const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 14;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 14;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
    }
    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particlesMat = new THREE.PointsMaterial({
      color: new THREE.Color("#7dd3fc"),
      size: 0.035,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particles);

    // Mouse Tracking for Interactive Parallax
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      target.x = x;
      target.y = y;
    };

    const handleResize = () => {
      if (!host) return;
      const w = host.clientWidth;
      const h = host.clientHeight;
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("resize", handleResize);

    const clock = new THREE.Clock();
    let animId = 0;

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      current.x += (target.x - current.x) * 0.04;
      current.y += (target.y - current.y) * 0.04;

      if (!reduceMotion) {
        cyberGroup.rotation.y = elapsed * 0.15;
        cyberGroup.rotation.x = Math.sin(elapsed * 0.1) * 0.12;

        innerCore.rotation.y = -elapsed * 0.22;
        ring1.rotation.z = elapsed * 0.12;
        ring2.rotation.z = -elapsed * 0.09;

        particles.rotation.y = elapsed * 0.02;
        particles.rotation.x = elapsed * 0.01;
      }

      camera.position.x = current.x * 0.45;
      camera.position.y = -current.y * 0.35;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      if (!reduceMotion) {
        animId = window.requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animId) window.cancelAnimationFrame(animId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", handleResize);

      coreGeo.dispose();
      coreWireMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      nodesGeo.dispose();
      nodesMat.dispose();
      linesGeo.dispose();
      linesMat.dispose();
      particlesGeo.dispose();
      particlesMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.gridBackdrop} />
      <div className={styles.canvasHost} ref={hostRef} />

      <div className={styles.hudLayer}>
        <div className={styles.hudTop}>
          <div className={styles.hudTag}>
            <span className={styles.liveDot} />
            <span>Constitutional Defense OS · 6.6</span>
          </div>
          <div className={styles.hudCoordinates}>
            <div>SYS-LOC: 28.6139° N, 77.2090° E</div>
            <div>NEW DELHI ROOT DEFENSE VAULT</div>
          </div>
        </div>

        <div className={styles.hudCenter}>
          <div className={styles.centerCrosshair} />
        </div>

        <div className={styles.hudBottom}>
          <div className={styles.hudTitleBlock}>
            <p className={styles.hudEyebrow}>EVIDENCE-FIRST SOVEREIGN RUNTIME</p>
            <h2 className={styles.hudTitle}>Governed Public Intelligence</h2>
            <p className={styles.hudDescription}>
              Every assertion backed by cryptographic provenance. Autonomous defensive formations operating under strict No-First-Use doctrine.
            </p>
          </div>

          <div className={styles.telemetryGrid}>
            <div className={styles.telemetryItem}>
              <span className={styles.telemetryLabel}>Telemetry Streams</span>
              <span className={styles.telemetryValue}>{telemetry.activeStreams} Active</span>
            </div>
            <div className={styles.telemetryItem}>
              <span className={styles.telemetryLabel}>Policy Gate</span>
              <span className={styles.telemetryValue}>{telemetry.policyGateLatency}</span>
            </div>
            <div className={styles.telemetryItem}>
              <span className={styles.telemetryLabel}>Evidence Hashes</span>
              <span className={styles.telemetryValue}>#{telemetry.verifiedHashes}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
