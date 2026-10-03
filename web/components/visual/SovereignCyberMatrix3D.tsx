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
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!host || reduced.matches || window.innerWidth < 768) return;
    let renderer: InstanceType<typeof THREE.WebGLRenderer>;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" }); }
    catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, .1, 40);
    camera.position.set(0, 0, 9);
    const group = new THREE.Group();
    scene.add(group);
    const geometry = new THREE.IcosahedronGeometry(.82, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xa8c7b6, wireframe: true, transparent: true, opacity: .55 });
    const nodes = [-2.15, 0, 2.15].map((x) => {
      const node = new THREE.Mesh(geometry, material);
      node.position.set(x, x === 0 ? .48 : -.3, 0);
      group.add(node);
      return node;
    });
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(nodes.map(node => node.position));
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x627e6e, transparent: true, opacity: .8 });
    group.add(new THREE.Line(lineGeometry, lineMaterial));
    const resize = () => {
      const width = host.clientWidth, height = Math.max(host.clientHeight, 1);
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(host);
    let visible = true, frame = 0;
    const render = (time: number) => {
      frame = 0;
      if (document.hidden || !visible) return;
      nodes.forEach((node, index) => { node.rotation.y = time * .00008 + index; node.rotation.z = .2; });
      renderer.render(scene, camera);
      if (!reduced.matches) frame = requestAnimationFrame(render);
    };
    const resume = () => { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(render); };
    const visibilityObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; resume(); });
    visibilityObserver.observe(host);
    document.addEventListener("visibilitychange", resume);
    reduced.addEventListener("change", resume);
    resume();
    return () => {
      cancelAnimationFrame(frame);
      visibilityObserver.disconnect(); sizeObserver.disconnect();
      document.removeEventListener("visibilitychange", resume); reduced.removeEventListener("change", resume);
      geometry.dispose(); material.dispose(); lineGeometry.dispose(); lineMaterial.dispose();
      renderer.dispose(); renderer.domElement.remove();
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
