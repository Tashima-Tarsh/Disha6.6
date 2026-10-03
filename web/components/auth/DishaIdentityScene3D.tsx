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

const EARTH_RADIUS = 2.4;

// Central anchor coordinates for Sovereign India: [longitude, latitude] in degrees
const INDIA_CENTER_LON = 78.5;
const INDIA_CENTER_LAT = 22.5;

// Convert geographic [lon, lat] (degrees) to 3D Cartesian coordinates on sphere of radius R
function geoToVector3(lon: number, lat: number, radius: number): ThreeVector3 {
  const phi = (lat * Math.PI) / 180;
  const theta = (lon * Math.PI) / 180;

  const x = radius * Math.cos(phi) * Math.sin(theta);
  const y = radius * Math.sin(phi);
  const z = radius * Math.cos(phi) * Math.cos(theta);

  return new THREE.Vector3(x, y, z);
}

// Major continental shoreline fallback polygons [lon, lat][] for immediate frame-1 render
// (Ensures the globe never renders as a featureless blank ball while GeoJSON streams)
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

// Reference Indian metropolitan anchors (non-operational geographical anchors)
const INDIA_METRO_ANCHORS = [
  { name: "New Delhi", lat: 28.6139, lon: 77.2090 },
  { name: "Mumbai", lat: 19.0760, lon: 72.8777 },
  { name: "Bengaluru", lat: 12.9716, lon: 77.5946 },
  { name: "Kolkata", lat: 22.5726, lon: 88.3639 },
  { name: "Chennai", lat: 13.0827, lon: 80.2707 },
];

export function DishaIdentityScene3D({ transitionState = "idle" }: DishaIdentityScene3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webGlSupported, setWebGlSupported] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let isDisposed = false;
    let animationFrameId: number;

    // Check prefers-reduced-motion
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let isReducedMotion = reducedMotionQuery.matches;

    const handleMotionChange = (e: MediaQueryListEvent) => {
      isReducedMotion = e.matches;
    };
    reducedMotionQuery.addEventListener("change", handleMotionChange);

    // 1. Setup Three.js Scene, Camera, Renderer
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
      renderer.toneMappingExposure = 1.1;
    } catch {
      setWebGlSupported(false);
      return;
    }

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      100
    );

    // Dynamic responsive camera distance calculation
    const getTargetCameraZ = (width: number): number => {
      if (width < 640) return 7.8;
      if (width < 1024) return 6.6;
      if (width < 1440) return 5.8;
      return 5.4;
    };

    const initialCameraZ = getTargetCameraZ(container.clientWidth);
    camera.position.set(0, 0, initialCameraZ + 1.6); // slight entrance offset
    camera.lookAt(0, 0, 0);

    // Master Globe Group
    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    // Calculate initial orientation so India [78.5 E, 22.5 N] faces the camera directly at (0, 0, R)
    const baseRotationY = -(INDIA_CENTER_LON * Math.PI) / 180;
    const baseRotationX = (INDIA_CENTER_LAT * Math.PI) / 180;
    earthGroup.rotation.y = baseRotationY;
    earthGroup.rotation.x = baseRotationX;

    // 2. Earth Base Surface (Dark Graphite Oceans)
    const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
    const earthMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x060b13),
      roughness: 0.88,
      metalness: 0.12,
    });
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    earthGroup.add(earthMesh);

    // 3. Atmosphere Shell & Rim Glow
    const atmosphereGeometry = new THREE.SphereGeometry(EARTH_RADIUS * 1.022, 48, 48);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0x244c75),
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    earthGroup.add(atmosphereMesh);

    // 4. Subtle Cartographic Graticule (Equator, Tropic of Cancer through India, Meridians)
    const graticuleGroup = new THREE.Group();
    earthGroup.add(graticuleGroup);

    const graticuleMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(0x1a2e45),
      transparent: true,
      opacity: 0.32,
    });

    // Parallels (every 30 degrees, plus Tropic of Cancer at 23.436 N)
    const latitudes = [-60, -30, 0, 23.436, 30, 60];
    latitudes.forEach((lat) => {
      const points: ThreeVector3[] = [];
      const isTropic = Math.abs(lat - 23.436) < 0.1;
      const radius = EARTH_RADIUS * (isTropic ? 1.002 : 1.001);

      for (let lon = -180; lon <= 180; lon += 3) {
        points.push(geoToVector3(lon, lat, radius));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = isTropic
        ? new THREE.LineBasicMaterial({ color: 0x3d688f, transparent: true, opacity: 0.45 })
        : graticuleMaterial;
      const line = new THREE.Line(geo, mat);
      graticuleGroup.add(line);
    });

    // Meridians (every 45 degrees)
    for (let lon = -180; lon < 180; lon += 45) {
      const points: ThreeVector3[] = [];
      for (let lat = -85; lat <= 85; lat += 3) {
        points.push(geoToVector3(lon, lat, EARTH_RADIUS * 1.001));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geo, graticuleMaterial);
      graticuleGroup.add(line);
    }

    // 5. Baseline Continental Outlines (Immediate synchronous frame-1 render)
    const continentLineGroup = new THREE.Group();
    earthGroup.add(continentLineGroup);

    const fallbackMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(0x274360),
      transparent: true,
      opacity: 0.55,
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
    // Stream World Countries + Authoritative DataMeet India boundary
    let worldCountriesLine: ThreeLineSegments | null = null;
    let indiaAuthoritativeLine: ThreeLine | null = null;
    let indiaGlowLine: ThreeLine | null = null;

    const loadGeographicData = async () => {
      try {
        // Fetch world countries
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
            worldGeometry.setAttribute(
              "position",
              new THREE.Float32BufferAttribute(segmentPositions, 3)
            );
            const worldMaterial = new THREE.LineBasicMaterial({
              color: new THREE.Color(0x274360),
              transparent: true,
              opacity: 0.7,
            });
            worldCountriesLine = new THREE.LineSegments(worldGeometry, worldMaterial);
            earthGroup.add(worldCountriesLine);

            // Hide fallback continents once rich GeoJSON resolves
            continentLineGroup.visible = false;
          }
        }
      } catch {
        // Fallback continent polygons remain visible gracefully
      }

      try {
        // Fetch official DataMeet India boundary
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

            // Refined metallic ivory-gold boundary highlight
            const indiaMaterial = new THREE.LineBasicMaterial({
              color: new THREE.Color(0xd4af37), // Restrained metallic gold/ivory
              transparent: true,
              opacity: 0.95,
            });
            indiaAuthoritativeLine = new THREE.Line(indiaGeometry, indiaMaterial);
            earthGroup.add(indiaAuthoritativeLine);

            // Subtle outer atmospheric luminescence around India's frontier
            const glowMaterial = new THREE.LineBasicMaterial({
              color: new THREE.Color(0x45c7f4),
              transparent: true,
              opacity: 0.35,
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

    // 7. Restrained Indian Anchor Dots (Non-operational reference locations)
    const anchorPoints: ThreeVector3[] = [];
    INDIA_METRO_ANCHORS.forEach((anchor) => {
      anchorPoints.push(geoToVector3(anchor.lon, anchor.lat, EARTH_RADIUS * 1.006));
    });

    const anchorGeometry = new THREE.BufferGeometry().setFromPoints(anchorPoints);
    const anchorMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(0xf4f7fb),
      size: 0.035,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
    });
    const anchorMesh = new THREE.Points(anchorGeometry, anchorMaterial);
    earthGroup.add(anchorMesh);

    // 8. Distant Deep-Space Starfield (restrained, 600 particles at depths Z: -40 to -10)
    const starCount = 650;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const idx = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const dist = 6 + Math.random() * 22;
      starPositions[idx] = Math.cos(angle) * dist;
      starPositions[idx + 1] = Math.sin(angle) * dist;
      starPositions[idx + 2] = -5 - Math.random() * 35;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(0x94a8be),
      size: 0.022,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.55,
    });
    const starsMesh = new THREE.Points(starGeometry, starMaterial);
    scene.add(starsMesh);

    // 9. Physically Balanced Studio Lighting
    // Directional sunlight casting natural terminator shadow
    const sunLight = new THREE.DirectionalLight(0xe8f2ff, 2.0);
    sunLight.position.set(-6, 3, 7);
    scene.add(sunLight);

    // Ambient dark graphite fill
    const ambientLight = new THREE.AmbientLight(0x0a1424, 0.6);
    scene.add(ambientLight);

    // Rim light highlighting atmospheric limb
    const rimLight = new THREE.PointLight(0x45c7f4, 1.2, 20);
    rimLight.position.set(7, -2, -2);
    scene.add(rimLight);

    // 10. Pointer Parallax Tracking (Subtle 1–2 degrees)
    let pointerX = 0;
    let pointerY = 0;
    let targetParallaxX = 0;
    let targetParallaxY = 0;

    const handlePointerMove = (e: PointerEvent) => {
      if (isReducedMotion) return;
      const rect = container.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      pointerX = normX;
      pointerY = normY;
      targetParallaxX = normX * 0.04; // ~2.2 degrees
      targetParallaxY = normY * 0.03; // ~1.7 degrees
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    // 11. Responsive Resize Management
    const handleResize = () => {
      if (!container || !canvas || isDisposed) return;
      const width = container.clientWidth;
      const height = Math.max(1, container.clientHeight);

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 12. Visibility Optimization (Halt loop if tab inactive)
    let isTabVisible = !document.hidden;
    const handleVisibility = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // 13. Render Loop with Smooth Damped Interpolation
    let elapsedSeconds = 0;
    let entranceProgress = 0;

    const render = () => {
      if (isDisposed) return;
      animationFrameId = requestAnimationFrame(render);

      if (!isTabVisible) return;

      elapsedSeconds += 0.016;

      // Cinematic entrance over ~1.4 seconds
      if (entranceProgress < 1.0) {
        entranceProgress = Math.min(1.0, entranceProgress + 0.018);
        const targetZ = getTargetCameraZ(container.clientWidth);
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.06);
      }

      // Parallax damping
      if (!isReducedMotion) {
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, pointerX * 0.22, 0.05);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, pointerY * 0.16, 0.05);

        // Subtle gentle breathing oscillation around India center
        const subtleWobbleY = Math.sin(elapsedSeconds * 0.4) * 0.018;
        earthGroup.rotation.y = baseRotationY + targetParallaxX + subtleWobbleY;
        earthGroup.rotation.x = baseRotationX - targetParallaxY;
      } else {
        camera.position.x = 0;
        camera.position.y = 0;
        earthGroup.rotation.y = baseRotationY;
        earthGroup.rotation.x = baseRotationX;
      }

      // Verified success transition dolly forward
      if (transitionState === "verified") {
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, 3.8, 0.08);
        earthGroup.scale.lerp(new THREE.Vector3(1.15, 1.15, 1.15), 0.08);
      }

      renderer.render(scene, camera);
    };

    render();

    // 14. Comprehensive Resource Teardown
    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("pointermove", handlePointerMove);
      reducedMotionQuery.removeEventListener("change", handleMotionChange);
      document.removeEventListener("visibilitychange", handleVisibility);
      resizeObserver.disconnect();

      // Dispose all Three.js geometries and materials
      earthGeometry.dispose();
      earthMaterial.dispose();
      atmosphereGeometry.dispose();
      atmosphereMaterial.dispose();
      anchorGeometry.dispose();
      anchorMaterial.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      fallbackMaterial.dispose();
      graticuleMaterial.dispose();

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

      {/* Restrained orientation indicator */}
      <div className={styles.orientationBadge} aria-hidden="true">
        <span className={styles.orientationDot} />
        <span>Sovereign Geodesic Frame · 78.5°E 22.5°N</span>
      </div>

      {/* Technical coordinate watermark */}
      <div className={styles.metaWatermark} aria-hidden="true">
        <span>GRID: <strong>WGS84 GEODESIC</strong></span>
        <span>PROJECTION: <strong>ELLIPSOIDAL SPHERICAL</strong></span>
        <span>DATUM: <strong>DISHA 6.6 CARTOGRAPHIC CORE</strong></span>
      </div>
    </div>
  );
}

export default DishaIdentityScene3D;
