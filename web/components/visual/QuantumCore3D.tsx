"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import styles from "./quantum-core.module.css";

interface QuantumCore3DProps {
  dbStatus?: string;
  redisStatus?: string;
  postgisStatus?: string;
}

export function QuantumCore3D({
  dbStatus = "ready",
  redisStatus = "ready",
  postgisStatus = "ready",
}: QuantumCore3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, host.clientWidth / Math.max(1, host.clientHeight), 0.1, 100);
    camera.position.set(0, 0, 5.8);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // 1. Torus Knot wireframe
    const torusGeo = new THREE.TorusKnotGeometry(1.05, 0.28, 96, 24, 2, 3);
    const torusMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#0ea5e9"),
      wireframe: true,
      transparent: true,
      opacity: 0.55,
    });
    const torus = new THREE.Mesh(torusGeo, torusMat);
    coreGroup.add(torus);

    // 2. Gyroscope rings
    const ring1Geo = new THREE.RingGeometry(1.85, 1.88, 64);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#38bdf8"),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 2.8;
    coreGroup.add(ring1);

    const ring2Geo = new THREE.RingGeometry(2.1, 2.13, 64);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#34d399"),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.y = Math.PI / 3.2;
    coreGroup.add(ring2);

    // 3. Orbiting Data Nodes (DB, Redis, PostGIS)
    const nodeCount = 8;
    const nodePositions = new Float32Array(nodeCount * 3);
    for (let i = 0; i < nodeCount; i += 1) {
      const angle = (i / nodeCount) * Math.PI * 2;
      nodePositions[i * 3] = Math.cos(angle) * 1.95;
      nodePositions[i * 3 + 1] = Math.sin(angle * 2) * 0.45;
      nodePositions[i * 3 + 2] = Math.sin(angle) * 1.95;
    }
    const nodesGeo = new THREE.BufferGeometry();
    nodesGeo.setAttribute("position", new THREE.BufferAttribute(nodePositions, 3));
    const nodesMat = new THREE.PointsMaterial({
      color: new THREE.Color("#a7f3d0"),
      size: 0.12,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const nodes = new THREE.Points(nodesGeo, nodesMat);
    coreGroup.add(nodes);

    // 4. Ambient field
    const pCount = 180;
    const pPositions = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i += 1) {
      pPositions[i * 3] = (Math.random() - 0.5) * 10;
      pPositions[i * 3 + 1] = (Math.random() - 0.5) * 6;
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: new THREE.Color("#38bdf8"),
      size: 0.03,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    const pointer = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      target.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      target.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
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
      pointer.x += (target.x - pointer.x) * 0.04;
      pointer.y += (target.y - pointer.y) * 0.04;

      if (!reduceMotion) {
        torus.rotation.x = elapsed * 0.25;
        tor.rotation.y = elapsed * 0.35;
        ring1.rotation.z = elapsed * 0.15;
        ring2.rotation.z = -elapsed * 0.18;
        nodes.rotation.y = elapsed * 0.22;
        particles.rotation.y = elapsed * 0.015;
      }

      camera.position.x = pointer.x * 0.3;
      camera.position.y = -pointer.y * 0.2;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      if (!reduceMotion) {
        animId = window.requestAnimationFrame(animate);
      }
    };

    const tor = torus;
    animate();

    return () => {
      if (animId) window.cancelAnimationFrame(animId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", handleResize);

      torusGeo.dispose();
      torusMat.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      nodesGeo.dispose();
      nodesMat.dispose();
      pGeo.dispose();
      pMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className={styles.wrapper}>
      <div className={styles.scanLine} />
      <div className={styles.canvasHost} ref={hostRef} />

      <div className={styles.hudLayer}>
        <div className={styles.hudLeft}>
          <div className={styles.badge}>
            <span className={styles.pulseDot} />
            <span>3D Telemetry Engine · Live</span>
          </div>
          <h2 className={styles.title}>System Control Plane</h2>
          <p className={styles.subtitle}>
            Constitutional runtime state, policy gates, PostGIS spatial layer, and vector store.
          </p>
        </div>

        <div className={styles.hudRight}>
          <div className={styles.metricBox}>
            <span className={styles.metricLabel}>PostgreSQL</span>
            <span className={styles.metricValue}>{dbStatus}</span>
          </div>
          <div className={styles.metricBox}>
            <span className={styles.metricLabel}>Redis Cache</span>
            <span className={styles.metricValue}>{redisStatus}</span>
          </div>
          <div className={styles.metricBox}>
            <span className={styles.metricLabel}>PostGIS Spatials</span>
            <span className={styles.metricValue}>{postgisStatus}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
