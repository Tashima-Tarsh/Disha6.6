"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import styles from "./disha-identity-scene.module.css";

type ThreeRenderer = InstanceType<typeof THREE.WebGLRenderer>;
type ThreeVector3 = InstanceType<typeof THREE.Vector3>;
type ThreeLine = InstanceType<typeof THREE.Line>;
type ThreeLineSegments = InstanceType<typeof THREE.LineSegments>;
type ThreeMaterial = { dispose: () => void };

export interface DishaIdentityScene3DProps {
  transitionState?: "idle" | "submitting" | "verified" | "error";
}

// ============================================================================
// Core Constants & Mathematical Geodesic Projections
// ============================================================================

const EARTH_RADIUS = 2.45;

// Canonical Palette
const COLOR_BG = 0x080c12;
const COLOR_SURFACE = 0x101823;
const COLOR_CYAN = 0x39c7d7;
const COLOR_RED = 0xc64a56;
const COLOR_GOLD = 0xd5a75b;
const COLOR_TEXT_MUTED = 0x7f93a7;
const COLOR_TEXT_LIGHT = 0xdce7f0;

// Central anchor coordinates for Sovereign India: [longitude, latitude] in degrees
const INDIA_CENTER_LON = 78.5;
const INDIA_CENTER_LAT = 22.5;

function geoToVector3(lon: number, lat: number, radius: number): ThreeVector3 {
  const phi = (lat * Math.PI) / 180;
  const theta = (lon * Math.PI) / 180;

  const x = radius * Math.cos(phi) * Math.sin(theta);
  const y = radius * Math.sin(phi);
  const z = radius * Math.cos(phi) * Math.cos(theta);

  return new THREE.Vector3(x, y, z);
}

// Major continental shoreline fallback polygons [lon, lat][] for immediate frame-1 render
const CONTINENT_FALLBACKS: [number, number][][] = [
  // Eurasia & Africa outline
  [
    [-9.5, 36.0], [-9.0, 43.0], [-1.5, 46.0], [5.0, 53.5], [8.5, 57.0],
    [14.0, 55.5], [20.0, 64.5], [28.0, 71.0], [40.0, 68.0], [60.0, 70.0],
    [80.0, 73.0], [105.0, 77.5], [140.0, 73.0], [170.0, 66.0], [180.0, 65.0],
    [160.0, 55.0], [142.0, 48.0], [130.0, 42.0], [122.0, 37.0], [121.0, 31.0],
    [118.0, 24.5], [109.0, 20.0], [106.0, 10.5], [100.0, 3.0], [98.0, 12.0],
    [92.5, 20.5], [88.5, 22.0], [80.0, 13.0], [77.5, 8.0], [73.0, 19.0],
    [69.0, 23.0], [62.0, 25.0], [56.0, 26.0], [51.0, 12.0], [43.5, 12.5],
    [32.5, 31.5], [26.0, 34.5], [18.0, 40.5], [12.0, 44.0], [3.0, 42.5],
    [-5.5, 36.0], [-9.5, 36.0]
  ],
  // Africa
  [
    [-5.5, 36.0], [11.0, 37.0], [25.0, 32.0], [32.5, 31.5], [43.5, 12.5],
    [51.0, 11.5], [41.0, -2.0], [40.5, -10.0], [35.5, -24.0], [28.0, -32.5],
    [18.5, -34.5], [12.0, -17.0], [8.5, 4.5], [-4.0, 5.0], [-15.0, 11.0],
    [-17.5, 14.5], [-17.0, 21.0], [-13.0, 28.0], [-9.5, 33.0], [-5.5, 36.0]
  ],
  // Australia
  [
    [114.0, -22.0], [113.0, -26.0], [115.0, -34.0], [122.0, -34.0], [136.0, -35.0],
    [146.0, -39.0], [153.0, -28.0], [145.0, -15.0], [142.0, -11.0], [136.0, -12.0],
    [130.0, -13.0], [124.0, -16.0], [114.0, -22.0]
  ],
  // Americas
  [
    [-168.0, 66.0], [-140.0, 69.0], [-120.0, 71.0], [-85.0, 70.0], [-65.0, 60.0],
    [-60.0, 47.0], [-71.0, 42.0], [-75.0, 35.0], [-80.0, 25.0], [-90.0, 30.0],
    [-97.0, 26.0], [-90.0, 16.0], [-83.0, 8.5], [-77.0, 8.0], [-75.0, 11.0],
    [-60.0, 9.0], [-50.0, 0.0], [-35.0, -5.5], [-38.0, -13.0], [-43.0, -23.0],
    [-53.0, -33.0], [-65.0, -42.0], [-68.0, -54.0], [-74.0, -52.0], [-72.0, -40.0],
    [-71.0, -30.0], [-70.0, -18.0], [-81.0, -5.0], [-79.0, 2.0], [-77.0, 8.0],
    [-87.0, 13.0], [-105.0, 20.0], [-115.0, 30.0], [-124.0, 40.0], [-125.0, 50.0],
    [-137.0, 58.0], [-160.0, 58.0], [-168.0, 66.0]
  ]
];

// Reference Indian metropolitan anchors
const INDIA_METRO_ANCHORS = [
  { name: "New Delhi", lat: 28.6139, lon: 77.2090 },
  { name: "Mumbai", lat: 19.0760, lon: 72.8777 },
  { name: "Bengaluru", lat: 12.9716, lon: 77.5946 },
  { name: "Kolkata", lat: 22.5726, lon: 88.3639 },
  { name: "Chennai", lat: 13.0827, lon: 80.2707 },
  { name: "Hyderabad", lat: 17.3850, lon: 78.4867 },
];

// Minimal Threat and Sensor Highlighting Nodes
const TELEMETRY_NODES = [
  { lat: 34.0837, lon: 74.7973, type: "sensor", label: "SIG-01" }, // North
  { lat: 11.6670, lon: 92.7359, type: "sensor", label: "MAR-02" }, // Andaman
  { lat: 25.3176, lon: 82.9739, type: "threat", label: "TH-WARN" }, // Central
  { lat: 23.0225, lon: 72.5714, type: "sensor", label: "W-DEF" },   // West
];

export function DishaIdentityScene3D({ transitionState = "idle" }: DishaIdentityScene3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webGlSupported, setWebGlSupported] = useState(true);
  const [readoutCoords, setReadoutCoords] = useState<{ lat: string; lon: string }>({
    lat: "22.5° N",
    lon: "78.5° E",
  });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let isDisposed = false;
    let animationFrameId: number;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let isReducedMotion = reducedMotionQuery.matches;

    const handleMotionChange = (e: MediaQueryListEvent) => {
      isReducedMotion = e.matches;
    };
    reducedMotionQuery.addEventListener("change", handleMotionChange);

    // 1. Setup Three.js WebGLRenderer
    let renderer: ThreeRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(container.clientWidth, container.clientHeight, false);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
    } catch {
      reducedMotionQuery.removeEventListener("change", handleMotionChange);
      const fallbackFrame = requestAnimationFrame(() => setWebGlSupported(false));
      return () => cancelAnimationFrame(fallbackFrame);
    }

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      40,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      120
    );

    const getTargetCameraZ = (width: number): number => {
      if (width < 640) return 7.6;
      if (width < 1024) return 6.4;
      if (width < 1440) return 5.6;
      return 5.2;
    };

    const initialCameraZ = getTargetCameraZ(container.clientWidth);
    camera.position.set(0, 0, initialCameraZ + 1.2);
    camera.lookAt(0, 0, 0);

    // Master Globe Group (shifted left on large screens to give space for right auth card)
    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    const updateGlobePosition = (width: number) => {
      if (width >= 1024) {
        earthGroup.position.x = -1.25; // elegant left-center alignment
      } else {
        earthGroup.position.x = 0;
      }
    };
    updateGlobePosition(container.clientWidth);

    // Initial orientation centered on India
    const baseRotationY = -(INDIA_CENTER_LON * Math.PI) / 180;
    const baseRotationX = (INDIA_CENTER_LAT * Math.PI) / 180;
    earthGroup.rotation.y = baseRotationY;
    earthGroup.rotation.x = baseRotationX;

    // 2. Deep Charcoal Earth Body
    const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
    const earthMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(COLOR_BG),
      roughness: 0.85,
      metalness: 0.15,
    });
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    earthGroup.add(earthMesh);

    // 3. Multi-layer Atmospheric Shading Shell
    const atmosphereGeometry = new THREE.SphereGeometry(EARTH_RADIUS * 1.026, 48, 48);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLOR_CYAN),
      transparent: true,
      opacity: 0.16,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    earthGroup.add(atmosphereMesh);

    // Subtle cloud / high-altitude ionization mesh
    const cloudGeometry = new THREE.SphereGeometry(EARTH_RADIUS * 1.012, 48, 48);
    const cloudMaterial = new THREE.MeshLambertMaterial({
      color: new THREE.Color(COLOR_SURFACE),
      transparent: true,
      opacity: 0.22,
      blending: THREE.NormalBlending,
    });
    const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
    earthGroup.add(cloudMesh);

    // 4. Subtle Cartographic Coordinate Overlays (Graticule)
    const graticuleGroup = new THREE.Group();
    earthGroup.add(graticuleGroup);

    const graticuleMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(COLOR_TEXT_MUTED),
      transparent: true,
      opacity: 0.22,
    });

    const latitudes = [-60, -30, 0, 23.436, 30, 60];
    latitudes.forEach((lat) => {
      const points: ThreeVector3[] = [];
      const isTropic = Math.abs(lat - 23.436) < 0.1;
      const radius = EARTH_RADIUS * (isTropic ? 1.0025 : 1.001);

      for (let lon = -180; lon <= 180; lon += 3) {
        points.push(geoToVector3(lon, lat, radius));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = isTropic
        ? new THREE.LineBasicMaterial({ color: COLOR_GOLD, transparent: true, opacity: 0.55 })
        : graticuleMaterial;
      const line = new THREE.Line(geo, mat);
      graticuleGroup.add(line);
    });

    for (let lon = -180; lon < 180; lon += 45) {
      const points: ThreeVector3[] = [];
      for (let lat = -85; lat <= 85; lat += 3) {
        points.push(geoToVector3(lon, lat, EARTH_RADIUS * 1.001));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geo, graticuleMaterial);
      graticuleGroup.add(line);
    }

    // 5. Continental Outlines (Immediate Synchronous Fallback)
    const continentLineGroup = new THREE.Group();
    earthGroup.add(continentLineGroup);

    const fallbackMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(0x1e354d),
      transparent: true,
      opacity: 0.65,
    });

    CONTINENT_FALLBACKS.forEach((poly) => {
      const points: ThreeVector3[] = [];
      for (let i = 0; i < poly.length; i++) {
        const pt = poly[i];
        if (pt) points.push(geoToVector3(pt[0], pt[1], EARTH_RADIUS * 1.002));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geo, fallbackMaterial);
      continentLineGroup.add(line);
    });

    // 6. Asynchronous Real GeoJSON Boundary Streaming
    let worldCountriesLine: ThreeLineSegments | null = null;
    let indiaAuthoritativeLine: ThreeLine | null = null;
    let indiaGlowLine: ThreeLine | null = null;

    const loadGeographicData = async () => {
      try {
        const worldRes = await fetch("/data/world-countries.geojson", { cache: "force-cache" });
        if (worldRes.ok && !isDisposed) {
          const worldGeoJson = await worldRes.json();
          const segmentPositions: number[] = [];

          type Coord = [number, number];
          const processRing = (ring: Coord[]) => {
            for (let i = 0; i < ring.length - 1; i++) {
              const p1 = ring[i];
              const p2 = ring[i + 1];
              if (!p1 || !p2) continue;
              const v1 = geoToVector3(p1[0], p1[1], EARTH_RADIUS * 1.002);
              const v2 = geoToVector3(p2[0], p2[1], EARTH_RADIUS * 1.002);
              segmentPositions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
            }
          };

          for (const feature of worldGeoJson.features || []) {
            const geom = feature.geometry;
            if (!geom) continue;
            if (geom.type === "Polygon") {
              geom.coordinates.forEach((ring: Coord[]) => processRing(ring));
            } else if (geom.type === "MultiPolygon") {
              geom.coordinates.forEach((poly: Coord[][]) => {
                poly.forEach((ring: Coord[]) => processRing(ring));
              });
            }
          }

          if (segmentPositions.length > 0 && !isDisposed) {
            const worldGeometry = new THREE.BufferGeometry();
            worldGeometry.setAttribute("position", new THREE.Float32BufferAttribute(segmentPositions, 3));
            const worldMaterial = new THREE.LineBasicMaterial({
              color: new THREE.Color(0x234468),
              transparent: true,
              opacity: 0.8,
            });
            worldCountriesLine = new THREE.LineSegments(worldGeometry, worldMaterial);
            earthGroup.add(worldCountriesLine);
            continentLineGroup.visible = false;
          }
        }
      } catch {
        // Fallback remains active
      }

      try {
        const indiaRes = await fetch("/data/datameet-india-land-simplified.geojson", { cache: "force-cache" });
        if (indiaRes.ok && !isDisposed) {
          const indiaGeoJson = await indiaRes.json();
          const indiaPoints: ThreeVector3[] = [];

          for (const feature of indiaGeoJson.features || []) {
            const coords = feature.geometry?.coordinates;
            if (Array.isArray(coords)) {
              for (const pt of coords) {
                if (Array.isArray(pt) && pt.length >= 2) {
                  indiaPoints.push(geoToVector3(pt[0], pt[1], EARTH_RADIUS * 1.005));
                }
              }
            }
          }

          if (indiaPoints.length > 0 && !isDisposed) {
            const indiaGeometry = new THREE.BufferGeometry().setFromPoints(indiaPoints);
            const indiaMaterial = new THREE.LineBasicMaterial({
              color: new THREE.Color(COLOR_GOLD),
              transparent: true,
              opacity: 0.95,
            });
            indiaAuthoritativeLine = new THREE.Line(indiaGeometry, indiaMaterial);
            earthGroup.add(indiaAuthoritativeLine);

            const glowMaterial = new THREE.LineBasicMaterial({
              color: new THREE.Color(COLOR_CYAN),
              transparent: true,
              opacity: 0.4,
            });
            indiaGlowLine = new THREE.Line(indiaGeometry, glowMaterial);
            earthGroup.add(indiaGlowLine);
          }
        }
      } catch {
        // Handled silently
      }
    };

    void loadGeographicData();

    // 7. Controlled Orbital Paths and Satellite-Style Tracking Lines
    const orbitalGroup = new THREE.Group();
    earthGroup.add(orbitalGroup);

    // Orbit 1: Inclined Polar Recon Orbit (55 deg)
    const orbit1Radius = EARTH_RADIUS * 1.34;
    const orbit1Points: ThreeVector3[] = [];
    const orbit1Segments = 96;
    for (let i = 0; i <= orbit1Segments; i++) {
      const angle = (i / orbit1Segments) * Math.PI * 2;
      const x = Math.cos(angle) * orbit1Radius;
      const y = Math.sin(angle) * orbit1Radius * 0.95;
      const z = Math.sin(angle) * orbit1Radius * 0.35;
      orbit1Points.push(new THREE.Vector3(x, y, z));
    }
    const orbit1Geo = new THREE.BufferGeometry().setFromPoints(orbit1Points);
    const orbit1Mat = new THREE.LineDashedMaterial({
      color: COLOR_CYAN,
      dashSize: 0.12,
      gapSize: 0.08,
      transparent: true,
      opacity: 0.45,
    });
    const orbit1Line = new THREE.Line(orbit1Geo, orbit1Mat);
    orbit1Line.computeLineDistances();
    orbitalGroup.add(orbit1Line);

    // Satellite 1 Marker
    const sat1Geo = new THREE.SphereGeometry(0.04, 12, 12);
    const sat1Mat = new THREE.MeshBasicMaterial({ color: COLOR_CYAN });
    const sat1Mesh = new THREE.Mesh(sat1Geo, sat1Mat);
    orbitalGroup.add(sat1Mesh);

    // Orbit 2: Equatorial / Geosynchronous Telemetry Track (-25 deg inclination)
    const orbit2Radius = EARTH_RADIUS * 1.52;
    const orbit2Points: ThreeVector3[] = [];
    for (let i = 0; i <= orbit1Segments; i++) {
      const angle = (i / orbit1Segments) * Math.PI * 2;
      const x = Math.cos(angle) * orbit2Radius;
      const y = -Math.sin(angle) * orbit2Radius * 0.4;
      const z = Math.sin(angle) * orbit2Radius * 0.9;
      orbit2Points.push(new THREE.Vector3(x, y, z));
    }
    const orbit2Geo = new THREE.BufferGeometry().setFromPoints(orbit2Points);
    const orbit2Mat = new THREE.LineDashedMaterial({
      color: COLOR_GOLD,
      dashSize: 0.14,
      gapSize: 0.1,
      transparent: true,
      opacity: 0.4,
    });
    const orbit2Line = new THREE.Line(orbit2Geo, orbit2Mat);
    orbit2Line.computeLineDistances();
    orbitalGroup.add(orbit2Line);

    // Satellite 2 Marker
    const sat2Geo = new THREE.SphereGeometry(0.038, 12, 12);
    const sat2Mat = new THREE.MeshBasicMaterial({ color: COLOR_GOLD });
    const sat2Mesh = new THREE.Mesh(sat2Geo, sat2Mat);
    orbitalGroup.add(sat2Mesh);

    // 8. Minimal Information Highlights: Telemetry & Threat Markers
    const sensorGroup = new THREE.Group();
    earthGroup.add(sensorGroup);

    TELEMETRY_NODES.forEach((node) => {
      const pos = geoToVector3(node.lon, node.lat, EARTH_RADIUS * 1.008);
      const isThreat = node.type === "threat";

      const dotGeo = new THREE.SphereGeometry(0.028, 12, 12);
      const dotMat = new THREE.MeshBasicMaterial({
        color: isThreat ? COLOR_RED : COLOR_CYAN,
      });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(pos);
      sensorGroup.add(dot);

      // Radial ping ring
      const ringGeo = new THREE.RingGeometry(0.035, 0.05, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isThreat ? COLOR_RED : COLOR_CYAN,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos);
      ring.lookAt(pos.clone().multiplyScalar(2));
      sensorGroup.add(ring);
    });

    // Indian Metropolitan Reference Anchors
    const anchorPoints: ThreeVector3[] = [];
    INDIA_METRO_ANCHORS.forEach((anchor) => {
      anchorPoints.push(geoToVector3(anchor.lon, anchor.lat, EARTH_RADIUS * 1.006));
    });
    const anchorGeo = new THREE.BufferGeometry().setFromPoints(anchorPoints);
    const anchorMat = new THREE.PointsMaterial({
      color: new THREE.Color(COLOR_TEXT_LIGHT),
      size: 0.035,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
    });
    const anchorMesh = new THREE.Points(anchorGeo, anchorMat);
    earthGroup.add(anchorMesh);

    // 9. Restrained Deep Space Stars
    const starCount = 500;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const idx = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const dist = 7 + Math.random() * 25;
      starPositions[idx] = Math.cos(angle) * dist;
      starPositions[idx + 1] = Math.sin(angle) * dist;
      starPositions[idx + 2] = -6 - Math.random() * 30;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(COLOR_TEXT_MUTED),
      size: 0.02,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.45,
    });
    const starsMesh = new THREE.Points(starGeometry, starMaterial);
    scene.add(starsMesh);

    // 10. Lighting: Natural Key Sunlight + Ambient Dark Fill + Rim Glow
    const sunLight = new THREE.DirectionalLight(0xe8f2ff, 2.2);
    sunLight.position.set(-6, 3, 7);
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(COLOR_SURFACE, 0.65);
    scene.add(ambientLight);

    const rimLight = new THREE.PointLight(COLOR_CYAN, 1.3, 24);
    rimLight.position.set(7, -2, -2);
    scene.add(rimLight);

    // 11. Mouse Drag & Pointer Interaction
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let dragVelocityX = 0;
    let dragVelocityY = 0;
    let targetRotationY = baseRotationY;
    let targetRotationX = baseRotationX;
    let lastInteractionTime = performance.now();

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      dragVelocityX = 0;
      dragVelocityY = 0;
      lastInteractionTime = performance.now();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      dragVelocityX = deltaX * 0.005;
      dragVelocityY = deltaY * 0.005;

      targetRotationY += dragVelocityX;
      targetRotationX = Math.max(-0.9, Math.min(0.9, targetRotationX + dragVelocityY));
      lastInteractionTime = performance.now();
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });

    // 12. Responsive Resize Management
    const handleResize = () => {
      if (!container || !canvas || isDisposed) return;
      const width = container.clientWidth;
      const height = Math.max(1, container.clientHeight);

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      updateGlobePosition(width);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    let isTabVisible = !document.hidden;
    const handleVisibility = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // 13. Render Loop
    let elapsedSeconds = 0;
    let entranceProgress = 0;

    const render = () => {
      if (isDisposed) return;
      animationFrameId = requestAnimationFrame(render);
      if (!isTabVisible) return;

      elapsedSeconds += 0.016;

      // Gentle auto-rotation when user is not dragging
      const now = performance.now();
      if (!isDragging) {
        // Apply remaining drag momentum with friction
        dragVelocityX *= 0.94;
        dragVelocityY *= 0.94;
        targetRotationY += dragVelocityX;
        targetRotationX = Math.max(-0.9, Math.min(0.9, targetRotationX + dragVelocityY));

        // After 2.5s idle, resume slow majestic drift
        if (now - lastInteractionTime > 2500 && !isReducedMotion) {
          targetRotationY += 0.0008;
        }
      }

      // Smooth damped rotation interpolation
      earthGroup.rotation.y = THREE.MathUtils.lerp(earthGroup.rotation.y, targetRotationY, 0.08);
      earthGroup.rotation.x = THREE.MathUtils.lerp(earthGroup.rotation.x, targetRotationX, 0.08);

      // Cloud slow differential rotation
      cloudMesh.rotation.y += 0.0003;

      // Satellite orbital positions
      const sat1Angle = elapsedSeconds * 0.45;
      sat1Mesh.position.set(
        Math.cos(sat1Angle) * orbit1Radius,
        Math.sin(sat1Angle) * orbit1Radius * 0.95,
        Math.sin(sat1Angle) * orbit1Radius * 0.35
      );

      const sat2Angle = -elapsedSeconds * 0.32;
      sat2Mesh.position.set(
        Math.cos(sat2Angle) * orbit2Radius,
        -Math.sin(sat2Angle) * orbit2Radius * 0.4,
        Math.sin(sat2Angle) * orbit2Radius * 0.9
      );

      // Camera entrance transition
      if (entranceProgress < 1.0) {
        entranceProgress = Math.min(1.0, entranceProgress + 0.018);
        const targetZ = getTargetCameraZ(container.clientWidth);
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.06);
      }

      // Controlled cinematic camera transition during authentication
      if (transitionState === "submitting") {
        const targetZ = getTargetCameraZ(container.clientWidth) - 0.4;
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.04);
      } else if (transitionState === "verified") {
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, 3.4, 0.07);
        earthGroup.scale.lerp(new THREE.Vector3(1.22, 1.22, 1.22), 0.07);
      }

      // Calculate approximate center coordinates for HUD readout
      if (Math.floor(elapsedSeconds * 4) % 8 === 0) {
        const degLon = (((-earthGroup.rotation.y * 180) / Math.PI) % 360 + 540) % 360 - 180;
        const degLat = (earthGroup.rotation.x * 180) / Math.PI;
        setReadoutCoords({
          lat: `${Math.abs(degLat).toFixed(1)}° ${degLat >= 0 ? "N" : "S"}`,
          lon: `${Math.abs(degLon).toFixed(1)}° ${degLon >= 0 ? "E" : "W"}`,
        });
      }

      renderer.render(scene, camera);
    };

    render();

    // 14. Teardown
    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      reducedMotionQuery.removeEventListener("change", handleMotionChange);
      document.removeEventListener("visibilitychange", handleVisibility);
      resizeObserver.disconnect();

      earthGeometry.dispose();
      earthMaterial.dispose();
      atmosphereGeometry.dispose();
      atmosphereMaterial.dispose();
      cloudGeometry.dispose();
      cloudMaterial.dispose();
      anchorGeo.dispose();
      anchorMat.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      fallbackMaterial.dispose();
      graticuleMaterial.dispose();
      orbit1Geo.dispose();
      orbit1Mat.dispose();
      orbit2Geo.dispose();
      orbit2Mat.dispose();
      sat1Geo.dispose();
      sat1Mat.dispose();
      sat2Geo.dispose();
      sat2Mat.dispose();

      if (worldCountriesLine) {
        worldCountriesLine.geometry.dispose();
        if (Array.isArray(worldCountriesLine.material)) {
          worldCountriesLine.material.forEach((m: ThreeMaterial) => m.dispose());
        } else {
          worldCountriesLine.material.dispose();
        }
      }

      if (indiaAuthoritativeLine) {
        indiaAuthoritativeLine.geometry.dispose();
        if (Array.isArray(indiaAuthoritativeLine.material)) {
          indiaAuthoritativeLine.material.forEach((m: ThreeMaterial) => m.dispose());
        } else {
          indiaAuthoritativeLine.material.dispose();
        }
      }

      if (indiaGlowLine) {
        indiaGlowLine.geometry.dispose();
        if (Array.isArray(indiaGlowLine.material)) {
          indiaGlowLine.material.forEach((m: ThreeMaterial) => m.dispose());
        } else {
          indiaGlowLine.material.dispose();
        }
      }

      renderer.dispose();
    };
  }, [transitionState]);

  if (!webGlSupported) {
    return (
      <div className={styles.fallbackScene} role="img" aria-label="DISHA 6.6 secure identity environment">
        <div className={styles.fallbackGlobeDisc} />
      </div>
    );
  }

  return (
    <div className={styles.sceneContainer} ref={containerRef}>
      <div className={styles.backlight} aria-hidden="true" />
      <canvas className={styles.canvas} ref={canvasRef} />

      {/* Dynamic Geodesic HUD Crosshair */}
      <div className={styles.orientationBadge} aria-hidden="true">
        <span className={styles.orientationDot} />
        <span>ORBITAL TELEMETRY · {readoutCoords.lat} {readoutCoords.lon}</span>
      </div>

      {/* Cartographic Coordinate System Overlay */}
      <div className={styles.metaWatermark} aria-hidden="true">
        <span>GRID: <strong>WGS84 GEODESIC // EPGS:4326</strong></span>
        <span>SURFACE: <strong>DEFENSIVE INTELLIGENCE PROJECTION</strong></span>
        <span>TRACKING: <strong>LEO / GEO TELEMETRY ACTIVE</strong></span>
      </div>

      {/* Mouse drag hint */}
      <div className={styles.interactionHint} aria-hidden="true">
        <span>DRAG TO REORIENT SATELLITE FIELD</span>
      </div>
    </div>
  );
}

export default DishaIdentityScene3D;
