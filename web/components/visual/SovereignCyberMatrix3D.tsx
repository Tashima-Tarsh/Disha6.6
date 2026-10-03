"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import styles from "./sovereign-cyber-matrix.module.css";

// High-fidelity perimeter coordinates of India [lon, lat]
const INDIA_BORDER_GEO: [number, number][] = [
  // Northern Crown - Ladakh, Siachen & Kashmir
  [74.0, 35.5], [75.0, 36.2], [76.5, 36.0], [77.8, 35.5], [78.8, 35.0],
  [79.2, 33.8], [78.8, 32.6], [78.5, 31.6], [79.8, 31.0], [80.5, 29.8],
  // Indo-Nepal corridor & Uttarakhand
  [80.2, 28.8], [82.0, 27.8], [84.5, 27.2], [86.0, 26.6], [88.0, 26.5],
  // Sikkim
  [88.2, 27.8], [88.8, 28.0], [88.9, 27.2],
  // Bhutan border corridor & Western Assam
  [91.5, 26.8],
  // Arunachal Pradesh
  [92.5, 27.8], [94.0, 28.8], [95.5, 29.2], [97.0, 28.3], [97.3, 27.5],
  // Eastern Border - Nagaland, Manipur, Mizoram
  [95.5, 26.5], [94.5, 25.0], [93.5, 23.8], [92.8, 22.0], [92.5, 23.5], [91.8, 24.2],
  // Tripura & Meghalaya
  [91.2, 23.5], [91.8, 25.2], [89.8, 25.5], [89.0, 25.0],
  // West Bengal & Sunderbans
  [88.2, 22.5], [88.3, 21.6],
  // Odisha Coast
  [87.0, 21.4], [86.0, 20.2], [85.0, 19.3],
  // Andhra Coast
  [83.3, 17.7], [82.2, 16.5], [80.5, 15.5], [80.1, 14.0],
  // Tamil Nadu Coast & Chennai
  [80.3, 13.1], [79.8, 11.5], [79.8, 10.3], [79.0, 9.3],
  // Southern Apex - Kanyakumari
  [77.55, 8.08],
  // Kerala Coast / Arabian Sea
  [76.5, 9.0], [76.2, 9.9], [75.5, 11.5], [75.0, 12.5],
  // Karnataka & Goa
  [74.5, 14.0], [73.8, 15.4],
  // Maharashtra Coast & Mumbai
  [73.3, 16.8], [72.88, 19.08], [72.8, 20.2],
  // Gujarat - Gulf of Khambhat & Kathiawar Peninsula
  [72.8, 21.1], [72.0, 21.8], [71.0, 20.8], [69.8, 21.5], [69.0, 22.2],
  // Gulf of Kutch & Rann of Kutch
  [69.5, 23.0], [68.5, 23.7], [70.0, 24.2], [71.0, 24.5],
  // Rajasthan Western Border
  [70.5, 25.5], [70.2, 26.8], [71.5, 28.0], [72.5, 29.5],
  // Punjab Border (Amritsar / Wagah)
  [74.0, 30.5], [74.6, 31.6], [74.9, 32.3],
  // Jammu & Kashmir Line of Control
  [74.5, 33.2], [74.0, 34.2], [74.0, 35.5]
];

// Strategic National Cyber & Defense Hubs
const STRATEGIC_HUBS = [
  { id: "delhi", name: "NEW DELHI", lat: 28.6139, lon: 77.2090, role: "National Root Defense Vault", color: "#FF9933", hubSize: 0.13, isRoot: true },
  { id: "mumbai", name: "MUMBAI", lat: 19.0760, lon: 72.8777, role: "Subsea Cable Gateway Core", color: "#38BDF8", hubSize: 0.09, isRoot: false },
  { id: "bengaluru", name: "BENGALURU", lat: 12.9716, lon: 77.5946, role: "Sovereign Aerospace Core", color: "#10B981", hubSize: 0.09, isRoot: false },
  { id: "hyderabad", name: "HYDERABAD", lat: 17.3850, lon: 78.4867, role: "Threat Intelligence Matrix", color: "#F59E0B", hubSize: 0.08, isRoot: false },
  { id: "chennai", name: "CHENNAI", lat: 13.0827, lon: 80.2707, role: "Maritime Landing Array", color: "#00E5FF", hubSize: 0.08, isRoot: false },
  { id: "kolkata", name: "KOLKATA", lat: 22.5726, lon: 88.3639, role: "Eastern Border Cyber Node", color: "#A855F7", hubSize: 0.08, isRoot: false },
  { id: "ahmedabad", name: "AHMEDABAD", lat: 23.0225, lon: 72.5714, role: "Western Energy Grid Ingress", color: "#F97316", hubSize: 0.08, isRoot: false },
  { id: "srinagar", name: "SRINAGAR", lat: 34.0837, lon: 74.7973, role: "Northern Geospatial Shield", color: "#38BDF8", hubSize: 0.08, isRoot: false },
  { id: "guwahati", name: "GUWAHATI", lat: 26.1445, lon: 91.7362, role: "Northeast Frontier Node", color: "#34D399", hubSize: 0.08, isRoot: false },
  { id: "kochi", name: "KOCHI", lat: 9.9312, lon: 76.2673, role: "Arabian Sea Telemetry Sensor", color: "#06B6D4", hubSize: 0.07, isRoot: false },
  { id: "portblair", name: "PORT BLAIR", lat: 11.6600, lon: 92.7400, role: "Andaman Strategic Sentinel", color: "#EC4899", hubSize: 0.07, isRoot: false },
];

// Hub interconnection backbone
const INTERCONNECT_PAIRS: [string, string][] = [
  ["delhi", "mumbai"],
  ["delhi", "kolkata"],
  ["delhi", "bengaluru"],
  ["delhi", "srinagar"],
  ["delhi", "ahmedabad"],
  ["mumbai", "ahmedabad"],
  ["mumbai", "bengaluru"],
  ["mumbai", "kochi"],
  ["bengaluru", "chennai"],
  ["bengaluru", "hyderabad"],
  ["hyderabad", "chennai"],
  ["hyderabad", "kolkata"],
  ["kolkata", "guwahati"],
  ["chennai", "portblair"],
];

type ThreeVector3 = InstanceType<typeof THREE.Vector3>;
type ThreeMesh = InstanceType<typeof THREE.Mesh>;
type ThreeBufferGeometry = InstanceType<typeof THREE.BufferGeometry>;
type ThreeMaterial = InstanceType<typeof THREE.Material>;
type ThreeCatmullRomCurve3 = InstanceType<typeof THREE.CatmullRomCurve3>;
type ThreeMeshBasicMaterial = InstanceType<typeof THREE.MeshBasicMaterial>;

const CENTER_LON = 78.9629;
const CENTER_LAT = 22.5937;
const SPHERE_RADIUS = 3.1;

// Converts geographic lat/lon to 3D spherical dome coordinates centered on India
function geoTo3D(lon: number, lat: number, alt = 0): ThreeVector3 {
  const radLon = (lon - CENTER_LON) * (Math.PI / 180) * 1.08;
  const radLat = (lat - CENTER_LAT) * (Math.PI / 180) * 1.08;
  const r = SPHERE_RADIUS + alt;

  const x = r * Math.sin(radLon) * Math.cos(radLat);
  const y = r * Math.sin(radLat);
  const z = r * Math.cos(radLon) * Math.cos(radLat) - (SPHERE_RADIUS * 0.42);
  return new THREE.Vector3(x, y, z);
}

export function SovereignCyberMatrix3D() {
  const hostRef = useRef<HTMLDivElement>(null);

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

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // -------------------------------------------------------------
    // 1. 3D INDIAN MAP GEOSPATIAL BOUNDARY & MESH
    // -------------------------------------------------------------
    const indiaMapGroup = new THREE.Group();
    rootGroup.add(indiaMapGroup);

    // Border polyline
    const borderPoints = INDIA_BORDER_GEO.map(([lon, lat]) => geoTo3D(lon, lat, 0.05));
    const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPoints);
    const borderMat = new THREE.LineBasicMaterial({
      color: new THREE.Color("#38bdf8"),
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const borderLine = new THREE.LineLoop(borderGeo, borderMat);
    indiaMapGroup.add(borderLine);

    // Elevated secondary neon halo along India's border
    const haloPoints = INDIA_BORDER_GEO.map(([lon, lat]) => geoTo3D(lon, lat, 0.12));
    const haloGeo = new THREE.BufferGeometry().setFromPoints(haloPoints);
    const haloMat = new THREE.LineBasicMaterial({
      color: new THREE.Color("#0284c7"),
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const haloLine = new THREE.LineLoop(haloGeo, haloMat);
    indiaMapGroup.add(haloLine);

    // Internal sovereign geospatial grid lines (Parallels and Meridians across India)
    const gridSegments: ThreeVector3[] = [];
    for (let lat = 12; lat <= 32; lat += 5) {
      for (let lon = 72; lon <= 88; lon += 4) {
        gridSegments.push(geoTo3D(lon, lat, 0.01), geoTo3D(lon + 3, lat, 0.01));
        gridSegments.push(geoTo3D(lon, lat, 0.01), geoTo3D(lon, lat + 4, 0.01));
      }
    }
    const internalGridGeo = new THREE.BufferGeometry().setFromPoints(gridSegments);
    const internalGridMat = new THREE.LineBasicMaterial({
      color: new THREE.Color("#0ea5e9"),
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
    });
    const internalGrid = new THREE.LineSegments(internalGridGeo, internalGridMat);
    indiaMapGroup.add(internalGrid);

    // Subtle 3D Wireframe Icosahedron Core beneath map
    const coreGeo = new THREE.IcosahedronGeometry(2.3, 2);
    const coreWireMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#0369a1"),
      wireframe: true,
      transparent: true,
      opacity: 0.16,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreWireMat);
    indiaMapGroup.add(coreMesh);

    // -------------------------------------------------------------
    // 2. STRATEGIC NODES & NEW DELHI RADAR BEACON
    // -------------------------------------------------------------
    const hubMap = new Map<string, ThreeVector3>();
    const nodeGeometries: ThreeBufferGeometry[] = [];
    const nodeMaterials: ThreeMaterial[] = [];

    let delhiPulseRing: ThreeMesh | null = null;
    let delhiPulseRing2: ThreeMesh | null = null;

    STRATEGIC_HUBS.forEach((hub) => {
      const pos = geoTo3D(hub.lon, hub.lat, 0.08);
      hubMap.set(hub.id, pos);

      // Beacon Dot
      const dotGeo = new THREE.SphereGeometry(hub.hubSize, 12, 12);
      const dotMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(hub.color),
        transparent: true,
        opacity: 0.95,
      });
      const dotMesh = new THREE.Mesh(dotGeo, dotMat);
      dotMesh.position.copy(pos);
      indiaMapGroup.add(dotMesh);
      nodeGeometries.push(dotGeo);
      nodeMaterials.push(dotMat);

      // New Delhi Radar Rings
      if (hub.isRoot) {
        const ringGeo = new THREE.RingGeometry(0.18, 0.22, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color("#ff9933"),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
        });
        delhiPulseRing = new THREE.Mesh(ringGeo, ringMat);
        delhiPulseRing.position.copy(pos);
        indiaMapGroup.add(delhiPulseRing);
        nodeGeometries.push(ringGeo);
        nodeMaterials.push(ringMat);

        const ring2Geo = new THREE.RingGeometry(0.28, 0.32, 32);
        const ring2Mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color("#38bdf8"),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6,
          blending: THREE.AdditiveBlending,
        });
        delhiPulseRing2 = new THREE.Mesh(ring2Geo, ring2Mat);
        delhiPulseRing2.position.copy(pos);
        indiaMapGroup.add(delhiPulseRing2);
        nodeGeometries.push(ring2Geo);
        nodeMaterials.push(ring2Mat);
      }
    });

    // Neural Backbone Laser Lines between Strategic Hubs
    const backbonePoints: ThreeVector3[] = [];
    INTERCONNECT_PAIRS.forEach(([fromId, toId]) => {
      const p1 = hubMap.get(fromId);
      const p2 = hubMap.get(toId);
      if (p1 && p2) {
        backbonePoints.push(p1, p2);
      }
    });
    const backboneGeo = new THREE.BufferGeometry().setFromPoints(backbonePoints);
    const backboneMat = new THREE.LineBasicMaterial({
      color: new THREE.Color("#38bdf8"),
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    });
    const backboneMesh = new THREE.LineSegments(backboneGeo, backboneMat);
    indiaMapGroup.add(backboneMesh);

    // -------------------------------------------------------------
    // 3. COMBINATION OF 5 COLOR LINES IN MOTION
    // -------------------------------------------------------------
    // Line 1: Saffron (#FF7700) - Northern Sovereign Sky Arc
    // Line 2: White (#FFFFFF)   - Central Cryptographic Provenance Spine
    // Line 3: Green (#00E676)   - Coastal Maritime Defensive Perimeter
    // Line 4: Navy (#0066FF)    - Ashoka Chakra Orbital Ring
    // Line 5: Gold (#FFD700)    - Quantum Neural Data Interconnect

    const delhiPos = hubMap.get("delhi") ?? geoTo3D(77.209, 28.6139, 0.08);
    const mumbaiPos = hubMap.get("mumbai") ?? geoTo3D(72.877, 19.076, 0.08);
    const blrPos = hubMap.get("bengaluru") ?? geoTo3D(77.594, 12.971, 0.08);
    const chnPos = hubMap.get("chennai") ?? geoTo3D(80.27, 13.082, 0.08);
    const kolPos = hubMap.get("kolkata") ?? geoTo3D(88.36, 22.572, 0.08);
    const hydPos = hubMap.get("hyderabad") ?? geoTo3D(78.48, 17.385, 0.08);
    const sriPos = hubMap.get("srinagar") ?? geoTo3D(74.79, 34.08, 0.08);
    const kchPos = hubMap.get("kochi") ?? geoTo3D(76.26, 9.93, 0.08);
    const gwhPos = hubMap.get("guwahati") ?? geoTo3D(91.73, 26.14, 0.08);
    const kanyakumariPos = geoTo3D(77.55, 8.08, 0.08);

    // Curve 1: Saffron (Northern and Orbital Celestial Arc)
    const curve1 = new THREE.CatmullRomCurve3([
      sriPos,
      delhiPos,
      new THREE.Vector3(0.3, 1.8, 1.4),
      new THREE.Vector3(1.6, 1.5, 0.2),
      new THREE.Vector3(2.4, 0.4, -0.6),
      new THREE.Vector3(1.2, -0.8, -0.4),
      new THREE.Vector3(-0.6, 0.2, 0.8),
      sriPos,
    ], true);

    // Curve 2: White (Central Cryptographic Provenance Spine)
    const curve2 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.2, 2.6, 0.4),
      delhiPos,
      hydPos,
      blrPos,
      kanyakumariPos,
      new THREE.Vector3(0.0, -2.4, 0.8),
      new THREE.Vector3(-1.8, -1.2, -0.2),
      new THREE.Vector3(-1.4, 1.2, 0.6),
      new THREE.Vector3(-0.2, 2.6, 0.4),
    ], true);

    // Curve 3: Green (Coastal Maritime Shield Stream)
    const curve3 = new THREE.CatmullRomCurve3([
      geoTo3D(68.5, 23.7, 0.1),
      mumbaiPos,
      kchPos,
      kanyakumariPos,
      chnPos,
      kolPos,
      new THREE.Vector3(2.2, 0.2, 0.9),
      new THREE.Vector3(1.4, -1.8, 0.4),
      new THREE.Vector3(-0.4, -2.2, -0.2),
      new THREE.Vector3(-2.0, -0.4, 0.2),
      geoTo3D(68.5, 23.7, 0.1),
    ], true);

    // Curve 4: Ashoka Chakra Navy (Orbital Defense Inclined Ellipse)
    const chakraPoints: ThreeVector3[] = [];
    const CHAKRA_SEGMENTS = 64;
    for (let i = 0; i <= CHAKRA_SEGMENTS; i += 1) {
      const angle = (i / CHAKRA_SEGMENTS) * Math.PI * 2;
      const rx = 3.2 * Math.cos(angle);
      const ry = 2.7 * Math.sin(angle);
      // Tilt in 3D
      const x = rx * Math.cos(Math.PI / 5) - ry * Math.sin(Math.PI / 5) * 0.4;
      const y = rx * Math.sin(Math.PI / 5) + ry * Math.cos(Math.PI / 5) * 0.9;
      const z = -rx * 0.4 + Math.sin(angle) * 1.1;
      chakraPoints.push(new THREE.Vector3(x, y, z));
    }
    const curve4 = new THREE.CatmullRomCurve3(chakraPoints, true);

    // Curve 5: Golden Amber (Quantum Neural Hub Interconnect Spiral)
    const curve5 = new THREE.CatmullRomCurve3([
      delhiPos,
      mumbaiPos,
      blrPos,
      chnPos,
      hydPos,
      kolPos,
      gwhPos,
      new THREE.Vector3(1.0, 1.2, 1.3),
      delhiPos,
    ], true);

    const fiveLineConfigs = [
      { curve: curve1, color: "#ff6600", speed: 0.16, size: 0.085, name: "saffron" },
      { curve: curve2, color: "#ffffff", speed: 0.22, size: 0.080, name: "white" },
      { curve: curve3, color: "#00e676", speed: 0.14, size: 0.080, name: "green" },
      { curve: curve4, color: "#0077ff", speed: 0.26, size: 0.090, name: "navy" },
      { curve: curve5, color: "#ffd700", speed: 0.19, size: 0.085, name: "gold" },
    ];

    const motionLinesGroup = new THREE.Group();
    rootGroup.add(motionLinesGroup);

    type MotionStream = {
      curve: ThreeCatmullRomCurve3;
      speed: number;
      headMesh: ThreeMesh;
      trailMesh: ThreeMesh;
    };
    const streams: MotionStream[] = [];

    fiveLineConfigs.forEach((cfg) => {
      // 1. Static/flowing guide line
      const points = cfg.curve.getPoints(120);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(cfg.color),
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
      });
      const lineMesh = new THREE.Line(lineGeo, lineMat);
      motionLinesGroup.add(lineMesh);
      nodeGeometries.push(lineGeo);
      nodeMaterials.push(lineMat);

      // 2. High-speed Glowing Photon Pulse (Head)
      const headGeo = new THREE.SphereGeometry(cfg.size, 10, 10);
      const headMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(cfg.color),
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
      });
      const headMesh = new THREE.Mesh(headGeo, headMat);
      motionLinesGroup.add(headMesh);
      nodeGeometries.push(headGeo);
      nodeMaterials.push(headMat);

      // 3. Secondary Trailing Photon Pulse
      const trailGeo = new THREE.SphereGeometry(cfg.size * 0.7, 8, 8);
      const trailMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(cfg.color),
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
      });
      const trailMesh = new THREE.Mesh(trailGeo, trailMat);
      motionLinesGroup.add(trailMesh);
      nodeGeometries.push(trailGeo);
      nodeMaterials.push(trailMat);

      streams.push({
        curve: cfg.curve,
        speed: cfg.speed,
        headMesh,
        trailMesh,
      });
    });

    // -------------------------------------------------------------
    // 4. AMBIENT CYBER DUST PARTICLES
    // -------------------------------------------------------------
    const PARTICLE_COUNT = 320;
    const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 14;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 1;
    }
    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particlesMat = new THREE.PointsMaterial({
      color: new THREE.Color("#7dd3fc"),
      size: 0.03,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particles);

    // -------------------------------------------------------------
    // 5. INTERACTIVE 3D PARALLAX & ANIMATION LOOP
    // -------------------------------------------------------------
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

    let animId = 0;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = (performance.now() - startTime) * 0.001;
      current.x += (target.x - current.x) * 0.04;
      current.y += (target.y - current.y) * 0.04;

      if (!reduceMotion) {
        // Continuous organic 3D rotation of the Indian map & cyber matrix
        indiaMapGroup.rotation.y = Math.sin(elapsed * 0.16) * 0.15;
        indiaMapGroup.rotation.x = Math.sin(elapsed * 0.11) * 0.07;
        indiaMapGroup.position.y = Math.sin(elapsed * 0.35) * 0.05;

        // Animate the 5 Color Lines in 3D Motion
        streams.forEach((stream, idx) => {
          const t1 = (elapsed * stream.speed) % 1;
          const t2 = (elapsed * stream.speed - 0.04 + 1) % 1;

          const p1 = stream.curve.getPointAt(t1);
          const p2 = stream.curve.getPointAt(t2);

          stream.headMesh.position.copy(p1);
          stream.trailMesh.position.copy(p2);

          // Subtle breathing scale on the pulses
          const pulseScale = 1 + Math.sin(elapsed * 4 + idx) * 0.25;
          stream.headMesh.scale.setScalar(pulseScale);
        });

        // Pulsating radar ripple rings on New Delhi
        if (delhiPulseRing && delhiPulseRing2) {
          const r1Phase = (elapsed * 0.8) % 1;
          const r2Phase = (elapsed * 0.8 + 0.5) % 1;

          delhiPulseRing.scale.setScalar(1 + r1Phase * 2.6);
          const r1Mat = delhiPulseRing.material as ThreeMeshBasicMaterial;
          r1Mat.opacity = Math.max(0, 0.8 * (1 - r1Phase));

          delhiPulseRing2.scale.setScalar(1 + r2Phase * 2.6);
          const r2Mat = delhiPulseRing2.material as ThreeMeshBasicMaterial;
          r2Mat.opacity = Math.max(0, 0.6 * (1 - r2Phase));
        }

        // Ambient particles rotation
        particles.rotation.y = elapsed * 0.015;
        particles.rotation.x = elapsed * 0.008;
      }

      // Parallax camera response
      camera.position.x = current.x * 0.5;
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

      // Clean disposal
      borderGeo.dispose();
      borderMat.dispose();
      haloGeo.dispose();
      haloMat.dispose();
      internalGridGeo.dispose();
      internalGridMat.dispose();
      coreGeo.dispose();
      coreWireMat.dispose();
      backboneGeo.dispose();
      backboneMat.dispose();
      particlesGeo.dispose();
      particlesMat.dispose();

      nodeGeometries.forEach((g) => g.dispose());
      nodeMaterials.forEach((m) => m.dispose());

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
            <span>ASTRA 6 · DISHA 6.6 SECURE VISUALIZATION</span>
          </div>
          <div className={styles.hudCoordinates}>
            <div>SYS-LOC: 28.6139° N, 77.2090° E</div>
            <div>INDIA GEOSPATIAL REFERENCE</div>
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
              Spatial orientation for the authenticated intelligence workspace. Operational status and evidence metrics are shown only after verified sign-in.
            </p>

            <div className={styles.colorStreamBar} aria-label="3D Sovereign 5-Color Vector Streams">
              <span className={styles.colorStreamItem}>
                <span className={styles.colorDot} style={{ backgroundColor: "#ff7700", boxShadow: "0 0 8px #ff7700" }} />
                <span>Saffron</span>
              </span>
              <span className={styles.colorStreamItem}>
                <span className={styles.colorDot} style={{ backgroundColor: "#ffffff", boxShadow: "0 0 8px #ffffff" }} />
                <span>White</span>
              </span>
              <span className={styles.colorStreamItem}>
                <span className={styles.colorDot} style={{ backgroundColor: "#00e676", boxShadow: "0 0 8px #00e676" }} />
                <span>Green</span>
              </span>
              <span className={styles.colorStreamItem}>
                <span className={styles.colorDot} style={{ backgroundColor: "#0077ff", boxShadow: "0 0 8px #0077ff" }} />
                <span>Navy</span>
              </span>
              <span className={styles.colorStreamItem}>
                <span className={styles.colorDot} style={{ backgroundColor: "#ffd700", boxShadow: "0 0 8px #ffd700" }} />
                <span>Gold</span>
              </span>
            </div>
          </div>

          <div className={styles.telemetryGrid}>
            <div className={styles.telemetryItem}>
              <span className={styles.telemetryLabel}>Visualization</span>
              <span className={styles.telemetryValue}>Three.js / WebGL</span>
            </div>
            <div className={styles.telemetryItem}>
              <span className={styles.telemetryLabel}>Runtime Metrics</span>
              <span className={styles.telemetryValue}>After Sign-In</span>
            </div>
            <div className={styles.telemetryItem}>
              <span className={styles.telemetryLabel}>Evidence State</span>
              <span className={styles.telemetryValue}>Authenticated</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
