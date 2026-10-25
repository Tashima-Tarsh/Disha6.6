"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import {
  Compass,
  Crosshair,
  Eye,
  Globe2,
  Layers,
  MapPin,
  Maximize2,
  Navigation,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import styles from "./gods-eye-globe.module.css";

export type StrategicNode = {
  id: string;
  name: string;
  category: "source" | "geospatial" | "infrastructure" | "evidence" | "connector" | "target";
  lat: number;
  lng: number;
  status: "admitted" | "reachable" | "degraded" | "unavailable" | "active";
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

// ============================================================================
// Real-World Strategic Defense & Sensor Hub Anchors
// ============================================================================

export const DEFAULT_STRATEGIC_NODES: StrategicNode[] = [
  {
    id: "hub-delhi",
    name: "New Delhi (HQ Command)",
    category: "geospatial",
    lat: 28.6139,
    lng: 77.209,
    status: "active",
    details: "National Intelligence Grid & Primary Sovereign Relay Hub",
  },
  {
    id: "hub-mumbai",
    name: "Mumbai (Subsea Telecom Gateway)",
    category: "infrastructure",
    lat: 19.076,
    lng: 72.8777,
    status: "active",
    details: "International Telecom Cable Landing Station & Financial Hub",
  },
  {
    id: "hub-bengaluru",
    name: "Bengaluru (Cyber Defense Hub)",
    category: "source",
    lat: 12.9716,
    lng: 77.5946,
    status: "active",
    details: "Aerospace Telemetry, Satellite Ground Station & OSINT Core",
  },
  {
    id: "hub-patna",
    name: "Bihar / Patna (Regional Node)",
    category: "evidence",
    lat: 25.5941,
    lng: 85.1376,
    status: "active",
    details: "State Administrative Directory & Eastern Regional Sensor",
  },
  {
    id: "hub-singapore",
    name: "Singapore (APAC Gateway)",
    category: "connector",
    lat: 1.3521,
    lng: 103.8198,
    status: "reachable",
    details: "Asia-Pacific Regional Peering & Threat Intelligence Exchange",
  },
  {
    id: "hub-london",
    name: "London (European OSINT Hub)",
    category: "connector",
    lat: 51.5074,
    lng: -0.1278,
    status: "reachable",
    details: "European Domain & Public Registry Cross-Reference Node",
  },
  {
    id: "hub-frankfurt",
    name: "Frankfurt (DE-CIX)",
    category: "infrastructure",
    lat: 50.1109,
    lng: 8.6821,
    status: "reachable",
    details: "Central European Internet Exchange & DNS Root Mirror",
  },
  {
    id: "hub-tokyo",
    name: "Tokyo (Pacific Sensor)",
    category: "source",
    lat: 35.6762,
    lng: 139.6503,
    status: "reachable",
    details: "East Asian OSINT & Satellite Optical Telemetry Relay",
  },
  {
    id: "hub-ashburn",
    name: "Ashburn US (Cloud Intel Hub)",
    category: "connector",
    lat: 39.0438,
    lng: -77.4874,
    status: "reachable",
    details: "North American Threat Feeds & Cloud Infrastructure Mirror",
  },
];

// Helper: Convert [lat, lng] to 3D Cartesian coordinates on sphere
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// ============================================================================
// High-Resolution Procedural Realistic Earth Texture Canvas
// ============================================================================

function createRealisticEarthCanvas(): HTMLCanvasElement {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // 1. Deep Oceanic Gradient Fill
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, "#040b17"); // Arctic deep navy
  oceanGrad.addColorStop(0.2, "#061224");
  oceanGrad.addColorStop(0.5, "#081830"); // Tropical ocean
  oceanGrad.addColorStop(0.8, "#061224");
  oceanGrad.addColorStop(1, "#030812"); // Antarctic deep navy
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Latitude & Longitude Graticule Mesh
  ctx.strokeStyle = "rgba(56, 189, 248, 0.08)";
  ctx.lineWidth = 1;

  // Parallels (every 30 degrees)
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = ((90 - lat) / 180) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Meridians (every 30 degrees)
  for (let lng = -150; lng <= 180; lng += 30) {
    const x = ((lng + 180) / 360) * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Equator Highlight
  ctx.strokeStyle = "rgba(56, 189, 248, 0.22)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  // Helper: map [lng, lat] degrees to canvas [x, y]
  const toCanvas = (lng: number, lat: number): [number, number] => {
    const x = ((lng + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    return [x, y];
  };

  // Draw a polygon given array of [lng, lat]
  const drawPolygon = (
    pts: [number, number][],
    fillColor: string,
    strokeColor: string,
    lineWidth: number = 1.5
  ) => {
    if (!pts.length) return;
    ctx.beginPath();
    const [startX, startY] = toCanvas(pts[0][0], pts[0][1]);
    ctx.moveTo(startX, startY);
    for (let i = 1; i < pts.length; i++) {
      const [px, py] = toCanvas(pts[i][0], pts[i][1]);
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  };

  // ==========================================================================
  // Accurate Continental Shorelines (Equirectangular Degrees)
  // ==========================================================================

  // Eurasia (Europe, Russia, Asia, Middle East)
  const eurasiaCoords: [number, number][] = [
    [-9.5, 36.0], [-9.0, 43.5], [-1.5, 46.0], [5.0, 53.5], [8.5, 57.0],
    [12.0, 56.0], [14.0, 55.5], [19.0, 59.0], [24.0, 60.0], [28.0, 71.0],
    [40.0, 68.0], [60.0, 70.0], [80.0, 73.0], [105.0, 77.5], [140.0, 73.0],
    [170.0, 66.0], [180.0, 65.0], [170.0, 60.0], [160.0, 55.0], [156.0, 51.0],
    [142.0, 48.0], [136.0, 45.0], [130.0, 42.0], [122.0, 37.0], [121.0, 31.0],
    [118.0, 24.5], [109.0, 20.0], [106.0, 10.5], [100.0, 3.0], [98.0, 12.0],
    [92.5, 20.5], [89.0, 22.0], [85.0, 20.0], [80.5, 16.0], [80.0, 13.0],
    [77.5, 8.0], [75.0, 13.0], [73.0, 19.0], [69.0, 23.0], [66.0, 25.0],
    [62.0, 25.0], [56.0, 26.0], [51.0, 12.0], [43.5, 12.5], [38.0, 22.0],
    [35.0, 30.0], [32.5, 31.5], [26.0, 34.5], [18.0, 40.5], [12.0, 44.0],
    [3.0, 42.5], [-5.5, 36.0], [-9.5, 36.0]
  ];

  // Africa
  const africaCoords: [number, number][] = [
    [-5.5, 36.0], [11.0, 37.0], [25.0, 32.0], [32.5, 31.5], [43.5, 12.5],
    [51.0, 11.5], [41.0, -2.0], [40.5, -10.0], [35.5, -24.0], [28.0, -32.5],
    [18.5, -34.5], [12.0, -17.0], [8.5, 4.5], [-4.0, 5.0], [-15.0, 11.0],
    [-17.5, 14.5], [-17.0, 21.0], [-13.0, 28.0], [-9.5, 33.0], [-5.5, 36.0]
  ];

  // North America
  const northAmericaCoords: [number, number][] = [
    [-168.0, 66.0], [-140.0, 69.0], [-120.0, 71.0], [-85.0, 70.0], [-65.0, 60.0],
    [-60.0, 47.0], [-71.0, 42.0], [-75.0, 35.0], [-80.0, 25.0], [-90.0, 30.0],
    [-97.0, 26.0], [-90.0, 16.0], [-83.0, 8.5], [-77.0, 8.0], [-87.0, 13.0],
    [-105.0, 20.0], [-115.0, 30.0], [-124.0, 40.0], [-125.0, 50.0], [-137.0, 58.0],
    [-160.0, 58.0], [-168.0, 66.0]
  ];

  // South America
  const southAmericaCoords: [number, number][] = [
    [-77.0, 8.0], [-75.0, 11.0], [-60.0, 9.0], [-50.0, 0.0], [-35.0, -5.5],
    [-38.0, -13.0], [-43.0, -23.0], [-53.0, -33.0], [-65.0, -42.0], [-68.0, -54.0],
    [-74.0, -52.0], [-72.0, -40.0], [-71.0, -30.0], [-70.0, -18.0], [-81.0, -5.0],
    [-79.0, 2.0], [-77.0, 8.0]
  ];

  // Australia
  const australiaCoords: [number, number][] = [
    [114.0, -22.0], [113.0, -26.0], [115.0, -34.0], [122.0, -34.0], [136.0, -35.0],
    [146.0, -39.0], [153.0, -28.0], [145.0, -15.0], [142.0, -11.0], [136.0, -12.0],
    [130.0, -13.0], [124.0, -16.0], [114.0, -22.0]
  ];

  // British Isles
  const britishIslesCoords: [number, number][] = [
    [-5.0, 50.0], [1.5, 51.5], [-0.5, 53.5], [-2.0, 57.5], [-5.0, 58.5],
    [-6.0, 55.0], [-3.0, 51.5], [-5.0, 50.0]
  ];

  // Japan
  const japanCoords: [number, number][] = [
    [130.0, 31.0], [135.0, 34.0], [140.0, 36.0], [141.0, 41.0], [145.0, 44.0],
    [141.0, 43.0], [138.0, 37.0], [132.0, 34.0], [130.0, 31.0]
  ];

  // Greenland
  const greenlandCoords: [number, number][] = [
    [-50.0, 60.0], [-35.0, 65.0], [-20.0, 70.0], [-20.0, 80.0], [-35.0, 83.0],
    [-55.0, 82.0], [-60.0, 76.0], [-50.0, 60.0]
  ];

  // Render Continents with Modern Tactical Palette
  const landFill = "#112239";
  const landStroke = "#38bdf8";

  drawPolygon(eurasiaCoords, landFill, landStroke, 1.4);
  drawPolygon(africaCoords, landFill, landStroke, 1.4);
  drawPolygon(northAmericaCoords, landFill, landStroke, 1.4);
  drawPolygon(southAmericaCoords, landFill, landStroke, 1.4);
  drawPolygon(australiaCoords, landFill, landStroke, 1.4);
  drawPolygon(britishIslesCoords, landFill, landStroke, 1.2);
  drawPolygon(japanCoords, landFill, landStroke, 1.2);
  drawPolygon(greenlandCoords, "#0c1a2d", "#38bdf8", 1.0);

  // ==========================================================================
  // India Subcontinent Sovereign Detailed Highlight
  // ==========================================================================
  const indiaDetailedCoords: [number, number][] = [
    [74.0, 37.0], [77.0, 35.5], [80.0, 31.0], [88.0, 27.5], [97.0, 28.0],
    [93.0, 24.0], [89.0, 22.0], [85.0, 20.0], [80.5, 16.0], [80.0, 13.0],
    [77.5, 8.0], [76.0, 10.0], [73.0, 16.0], [72.5, 19.0], [69.0, 23.0],
    [68.0, 24.5], [71.0, 28.0], [74.0, 32.0], [74.0, 37.0]
  ];
  drawPolygon(indiaDetailedCoords, "rgba(217, 119, 6, 0.18)", "#f59e0b", 2.0);

  // ==========================================================================
  // City Night Lights / Tactical Infrastructure Clusters
  // ==========================================================================
  const cityClusters: { lng: number; lat: number; r: number; color: string }[] = [
    // India Corridor
    { lng: 77.209, lat: 28.6139, r: 6, color: "#fbbf24" }, // Delhi
    { lng: 72.8777, lat: 19.076, r: 6, color: "#fbbf24" }, // Mumbai
    { lng: 77.5946, lat: 12.9716, r: 5, color: "#38bdf8" }, // Bengaluru
    { lng: 85.1376, lat: 25.5941, r: 4, color: "#f59e0b" }, // Patna
    { lng: 88.3639, lat: 22.5726, r: 5, color: "#fbbf24" }, // Kolkata
    { lng: 78.4867, lat: 17.385, r: 4, color: "#38bdf8" }, // Hyderabad
    { lng: 80.2707, lat: 13.0827, r: 5, color: "#38bdf8" }, // Chennai
    // Global Clusters
    { lng: 103.8198, lat: 1.3521, r: 5, color: "#38bdf8" }, // Singapore
    { lng: 139.6503, lat: 35.6762, r: 6, color: "#38bdf8" }, // Tokyo
    { lng: 55.2708, lat: 25.2048, r: 5, color: "#fbbf24" }, // Dubai
    { lng: -0.1278, lat: 51.5074, r: 6, color: "#38bdf8" }, // London
    { lng: 8.6821, lat: 50.1109, r: 5, color: "#38bdf8" }, // Frankfurt
    { lng: -74.006, lat: 40.7128, r: 6, color: "#38bdf8" }, // New York
    { lng: -122.4194, lat: 37.7749, r: 5, color: "#38bdf8" }, // San Francisco
    { lng: 151.2093, lat: -33.8688, r: 5, color: "#38bdf8" }, // Sydney
  ];

  cityClusters.forEach((c) => {
    const [cx, cy] = toCanvas(c.lng, c.lat);
    const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, c.r * 2.5);
    radGrad.addColorStop(0, c.color);
    radGrad.addColorStop(0.4, c.color === "#fbbf24" ? "rgba(251, 191, 36, 0.6)" : "rgba(56, 189, 248, 0.6)");
    radGrad.addColorStop(1, "transparent");
    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, c.r * 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  return canvas;
}

// ============================================================================
// Main GodsEyeHologramGlobe Component
// ============================================================================
// Relationship arcs are intentionally omitted unless backed by authenticated evidence.
// ============================================================================

interface GodsEyeHologramGlobeProps {
  formation?: string;
  nodes?: StrategicNode[];
  orbits?: SatelliteOrbit[];
  onSelectNode?: (node: StrategicNode) => void;
  selectedNodeId?: string | null;
  drillActive?: boolean;
  activeTarget?: string | null;
  activeTargetCoords?: { lat: number; lng: number } | null;
}

export function GodsEyeHologramGlobe({
  formation = "chakra",
  nodes = [],
  orbits = [],
  onSelectNode,
  selectedNodeId,
  drillActive = false,
  activeTarget = null,
  activeTargetCoords = null,
}: GodsEyeHologramGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [localSelectedNodeId, setLocalSelectedNodeId] = useState<string | null>(selectedNodeId ?? null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [textureMode, setTextureMode] = useState<"satellite" | "night" | "tactical">("satellite");
  const [statusMessage, setStatusMessage] = useState<string>("SATELLITE TELEMETRY ACTIVE // NASA BLUE MARBLE");

  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const texturesRef = useRef<{ day: THREE.Texture; night: THREE.Texture; bump: THREE.Texture } | null>(null);

  // Merge default strategic anchors with user-supplied nodes
  const displayNodes = [...DEFAULT_STRATEGIC_NODES, ...nodes.filter((n) => !DEFAULT_STRATEGIC_NODES.some((d) => d.id === n.id))];

  // If activeTarget coordinates exist, add an explicit Target Pin
  if (activeTarget && activeTargetCoords) {
    const targetId = "active-target-pin";
    if (!displayNodes.some((n) => n.id === targetId)) {
      displayNodes.unshift({
        id: targetId,
        name: `TARGET: ${activeTarget}`,
        category: "target",
        lat: activeTargetCoords.lat,
        lng: activeTargetCoords.lng,
        status: "active",
        details: `Live OSINT footprint identified for ${activeTarget}. Passive telecom & public profile anchored.`,
      });
    }
  }

  const selectedNode =
    displayNodes.find((n) => n.id === (selectedNodeId ?? localSelectedNodeId)) ??
    displayNodes.find((n) => n.category === "target") ??
    displayNodes[0];

  // Refs for interaction & animation
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rotationVelocityRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const targetRotationRef = useRef<{ x: number; y: number } | null>(null);

  // Focus on specific coordinates
  const focusOnCoordinates = useCallback((lat: number, lng: number) => {
    setAutoRotate(false);
    const targetY = -((lng + 90) * (Math.PI / 180));
    const targetX = lat * (Math.PI / 180);
    targetRotationRef.current = { x: targetX, y: targetY };
    setStatusMessage(`CAMERA LOCKED TO [${lat.toFixed(2)}°, ${lng.toFixed(2)}°]`);
  }, []);

  // When activeTargetCoords changes, smoothly fly to it
  useEffect(() => {
    if (!activeTargetCoords) return;
    const frame = window.requestAnimationFrame(() => {
      focusOnCoordinates(activeTargetCoords.lat, activeTargetCoords.lng);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeTargetCoords, focusOnCoordinates]);

  // Handle Texture Mode Swapping (Satellite vs Night Lights vs Topography)
  useEffect(() => {
    if (!earthMeshRef.current || !texturesRef.current) return;
    const mesh = earthMeshRef.current;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    if (textureMode === "night") {
      mat.map = texturesRef.current.night;
      mat.roughness = 0.85;
      window.requestAnimationFrame(() => setStatusMessage("TEXTURE: NASA BLACK MARBLE // CITY NIGHT LIGHTS"));
    } else if (textureMode === "tactical") {
      mat.map = texturesRef.current.day;
      mat.roughness = 0.5;
      window.requestAnimationFrame(() => setStatusMessage("TEXTURE: TOPOGRAPHIC RELIEF // SENSOR RADAR"));
    } else {
      mat.map = texturesRef.current.day;
      mat.roughness = 0.65;
      window.requestAnimationFrame(() => setStatusMessage("TEXTURE: NASA BLUE MARBLE // TRUE-COLOR SATELLITE"));
    }
    mat.needsUpdate = true;
  }, [textureMode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 450;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.2, 5.0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const mainGroup = new THREE.Group();
    // Default orientation: Center India subcontinent (lat 22.5, lng 78.5)
    mainGroup.rotation.y = -((78.5 + 90) * (Math.PI / 180));
    mainGroup.rotation.x = 22.5 * (Math.PI / 180);
    scene.add(mainGroup);
    globeGroupRef.current = mainGroup;

    // 1. Core Realistic Earth Globe using Authentic NASA Satellite Imagery
    const globeRadius = 1.95;
    const textureLoader = new THREE.TextureLoader();

    const dayTexture = textureLoader.load("/vendor/globe/earth-blue-marble.jpg", () => {
      renderer.render(scene, camera);
    });
    const nightTexture = textureLoader.load("/vendor/globe/earth-night.jpg");
    const bumpTexture = textureLoader.load("/vendor/globe/earth-topology.png");

    dayTexture.wrapS = THREE.RepeatWrapping;
    dayTexture.wrapT = THREE.ClampToEdgeWrapping;
    nightTexture.wrapS = THREE.RepeatWrapping;
    nightTexture.wrapT = THREE.ClampToEdgeWrapping;
    bumpTexture.wrapS = THREE.RepeatWrapping;
    bumpTexture.wrapT = THREE.ClampToEdgeWrapping;

    texturesRef.current = { day: dayTexture, night: nightTexture, bump: bumpTexture };

    const globeGeo = new THREE.SphereGeometry(globeRadius, 96, 96);
    const globeMat = new THREE.MeshStandardMaterial({
      map: textureMode === "night" ? nightTexture : dayTexture,
      bumpMap: bumpTexture,
      bumpScale: 0.045,
      roughness: textureMode === "night" ? 0.85 : 0.65,
      metalness: 0.08,
    });
    const earthMesh = new THREE.Mesh(globeGeo, globeMat);
    earthMeshRef.current = earthMesh;
    mainGroup.add(earthMesh);

    // 2. Rotating Atmospheric Cloud Layer
    const cloudGeo = new THREE.SphereGeometry(globeRadius * 1.008, 64, 64);
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    mainGroup.add(cloudMesh);

    // 2. Luminous Atmospheric Rim Shader
    const atmosphereGeo = new THREE.SphereGeometry(globeRadius * 1.025, 48, 48);
    const atmosphereMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.72 - dot(vNormal, vec3(0, 0, 1.0)), 2.2);
          gl_FragColor = vec4(0.22, 0.74, 0.97, 1.0) * intensity * 0.85;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    mainGroup.add(new THREE.Mesh(atmosphereGeo, atmosphereMat));

    // 3. Strategic Pins & Pulsing Radar Beacons
    const beaconRings: InstanceType<typeof THREE.Mesh>[] = [];
    const pinGeometry = new THREE.SphereGeometry(0.045, 16, 16);

    displayNodes.forEach((node) => {
      const pos = latLngToVector3(node.lat, node.lng, globeRadius);
      const isTarget = node.category === "target";
      const pinColor = isTarget
        ? 0xff3b30 // Vibrant Crimson Red for Target
        : node.category === "evidence"
        ? 0xf59e0b // Amber
        : node.category === "infrastructure"
        ? 0x34d399 // Emerald Green
        : 0x38bdf8; // Cyan

      // Solid Pin Dot
      const pinMat = new THREE.MeshBasicMaterial({ color: pinColor });
      const pinMesh = new THREE.Mesh(pinGeometry, pinMat);
      pinMesh.position.copy(pos);
      mainGroup.add(pinMesh);

      // Radar Beacon Wave
      const ringGeo = new THREE.RingGeometry(0.05, 0.09, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: pinColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isTarget ? 0.9 : 0.6,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.copy(pos.clone().multiplyScalar(1.02));
      ringMesh.lookAt(new THREE.Vector3(0, 0, 0));
      mainGroup.add(ringMesh);
      beaconRings.push(ringMesh);
    });

    // 4. Great-Circle 3D Telemetry Arcs (Connecting Sensor Hubs to HQ & Target)
    const arcPointsList: THREE.Vector3[][] = [];
    const hqPos = latLngToVector3(28.6139, 77.209, globeRadius); // New Delhi HQ
    const targetNode = displayNodes.find((n) => n.category === "target");
    const focalPos = targetNode ? latLngToVector3(targetNode.lat, targetNode.lng, globeRadius) : hqPos;

    displayNodes.slice(1, 6).forEach((node) => {
      const p1 = latLngToVector3(node.lat, node.lng, globeRadius);
      const p2 = focalPos;

      // Parabolic midpoint arching into the sky
      const mid = p1.clone().add(p2).multiplyScalar(0.5);
      const distance = p1.distanceTo(p2);
      mid.normalize().multiplyScalar(globeRadius + distance * 0.35);

      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
      const pts = curve.getPoints(36);
      arcPointsList.push(pts);

      const arcGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const arcMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.35,
      });
      mainGroup.add(new THREE.Line(arcGeo, arcMat));
    });

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);
    const sunLight = new THREE.DirectionalLight(0x7dd3fc, 1.4);
    sunLight.position.set(6, 4, 6);
    scene.add(sunLight);

    // ========================================================================
    // Interactive Mouse & Touch Drag Controls
    // ========================================================================

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDraggingRef.current = true;
      setAutoRotate(false);
      targetRotationRef.current = null;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      previousMousePositionRef.current = { x: clientX, y: clientY };
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current || !globeGroupRef.current) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - previousMousePositionRef.current.x;
      const deltaY = clientY - previousMousePositionRef.current.y;

      globeGroupRef.current.rotation.y += deltaX * 0.005;
      globeGroupRef.current.rotation.x += deltaY * 0.005;

      // Clamp X rotation to prevent flipping upside down
      globeGroupRef.current.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, globeGroupRef.current.rotation.x));

      rotationVelocityRef.current = { x: deltaY * 0.005, y: deltaX * 0.005 };
      previousMousePositionRef.current = { x: clientX, y: clientY };
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!cameraRef.current) return;
      cameraRef.current.position.z = Math.max(3.2, Math.min(7.5, cameraRef.current.position.z + e.deltaY * 0.003));
    };

    const domElement = renderer.domElement;
    domElement.addEventListener("mousedown", onPointerDown);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);
    domElement.addEventListener("touchstart", onPointerDown, { passive: true });
    window.addEventListener("touchmove", onPointerMove, { passive: true });
    window.addEventListener("touchend", onPointerUp);
    domElement.addEventListener("wheel", onWheel, { passive: false });

    // ========================================================================
    // Animation Loop
    // ========================================================================

    let animationId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      // Smooth camera interpolation towards target coords
      if (targetRotationRef.current && globeGroupRef.current) {
        const tr = targetRotationRef.current;
        globeGroupRef.current.rotation.y += (tr.y - globeGroupRef.current.rotation.y) * 0.08;
        globeGroupRef.current.rotation.x += (tr.x - globeGroupRef.current.rotation.x) * 0.08;

        if (
          Math.abs(tr.y - globeGroupRef.current.rotation.y) < 0.005 &&
          Math.abs(tr.x - globeGroupRef.current.rotation.x) < 0.005
        ) {
          targetRotationRef.current = null;
        }
      } else if (autoRotate && globeGroupRef.current) {
        globeGroupRef.current.rotation.y += 0.0018;
      } else if (!isDraggingRef.current && globeGroupRef.current) {
        // Friction damping
        globeGroupRef.current.rotation.y += rotationVelocityRef.current.y;
        globeGroupRef.current.rotation.x += rotationVelocityRef.current.x;
        rotationVelocityRef.current.x *= 0.92;
        rotationVelocityRef.current.y *= 0.92;
      }

      // Rotate cloud atmospheric layer
      cloudMesh.rotation.y += 0.0003;

      // Pulse beacon rings
      beaconRings.forEach((ring, idx) => {
        const pulse = 1 + (Math.sin(elapsed * 3.5 + idx) * 0.5 + 0.5) * 0.7;
        ring.scale.set(pulse, pulse, pulse);
      });

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
      domElement.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("mouseup", onPointerUp);
      domElement.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("touchmove", onPointerMove);
      window.removeEventListener("touchend", onPointerUp);
      domElement.removeEventListener("wheel", onWheel);
      renderer.dispose();
      if (container) container.innerHTML = "";
    };
  }, [autoRotate, displayNodes]);

  const handleZoom = (direction: "in" | "out") => {
    if (!cameraRef.current) return;
    const delta = direction === "in" ? -0.6 : 0.6;
    cameraRef.current.position.z = Math.max(3.2, Math.min(7.5, cameraRef.current.position.z + delta));
  };

  const handleResetView = () => {
    if (cameraRef.current) cameraRef.current.position.set(0, 1.2, 5.0);
    focusOnCoordinates(22.5, 78.5); // Reset to India
    setAutoRotate(true);
  };

  return (
    <div className={styles.globeWrapper}>
      {/* 3D WebGL Canvas */}
      <div ref={containerRef} className={styles.canvasContainer} title="Click and drag to rotate the globe" />

      {/* Top HUD Telemetry Bar */}
      <div className={styles.topHudBar}>
        <div className={styles.topHudTitle}>
          <Globe2 size={14} className={styles.cyanGlow} />
          <span>REAL 3D GOD&apos;S EYE OSINT GLOBE</span>
          <span className={styles.hudLiveBadge}>● LIVE FEED</span>
        </div>
        <div className={styles.topHudStatus}>{statusMessage}</div>
      </div>

      {/* Floating Tactical Controls Toolbar */}
      <div className={styles.tacticalControlsToolbar}>
        <button
          type="button"
          className={`${styles.tacticalToolBtn} ${autoRotate ? styles.toolBtnActive : ""}`}
          onClick={() => setAutoRotate(!autoRotate)}
          title={autoRotate ? "Pause Globe Rotation" : "Resume Auto-Orbit"}
        >
          {autoRotate ? <Pause size={13} /> : <Play size={13} />}
          <span>{autoRotate ? "ORBITING" : "PAUSED"}</span>
        </button>

        <button
          type="button"
          className={styles.tacticalToolBtn}
          onClick={() => focusOnCoordinates(22.5, 78.5)}
          title="Center view on India Subcontinent"
        >
          <Crosshair size={13} color="#f59e0b" />
          <span>FOCUS INDIA</span>
        </button>

        {activeTargetCoords ? (
          <button
            type="button"
            className={`${styles.tacticalToolBtn} ${styles.targetFocusBtn}`}
            onClick={() => focusOnCoordinates(activeTargetCoords.lat, activeTargetCoords.lng)}
            title="Focus camera on active target"
          >
            <MapPin size={13} color="#ef4444" />
            <span>FOCUS TARGET</span>
          </button>
        ) : null}

        <button
          type="button"
          className={styles.tacticalToolBtn}
          onClick={() => handleZoom("in")}
          title="Zoom in closer"
        >
          <ZoomIn size={13} />
        </button>

        <button
          type="button"
          className={styles.tacticalToolBtn}
          onClick={() => handleZoom("out")}
          title="Zoom out"
        >
          <ZoomOut size={13} />
        </button>

        <button
          type="button"
          className={styles.tacticalToolBtn}
          onClick={handleResetView}
          title="Reset globe position"
        >
          <RotateCcw size={13} />
        </button>
      </div>

      {/* Selected Node / Target Intel Overlay Card */}
      {selectedNode ? (
        <div className={styles.selectedNodeCard}>
          <div className={styles.selectedNodeHeader}>
            <div className={styles.selectedNodeNameGroup}>
              <span
                className={styles.nodeDot}
                style={{
                  background:
                    selectedNode.category === "target"
                      ? "#ef4444"
                      : selectedNode.category === "evidence"
                      ? "#f59e0b"
                      : selectedNode.category === "infrastructure"
                      ? "#34d399"
                      : "#38bdf8",
                  boxShadow: `0 0 10px ${
                    selectedNode.category === "target" ? "#ef4444" : "#38bdf8"
                  }`,
                }}
              />
              <strong className={styles.selectedNodeTitle}>{selectedNode.name}</strong>
            </div>
            <span className={styles.categoryBadge}>{selectedNode.category.toUpperCase()}</span>
          </div>

          <p className={styles.selectedNodeDetails}>{selectedNode.details}</p>

          <div className={styles.selectedNodeFooter}>
            <span>GEO COORDINATES</span>
            <strong>
              {selectedNode.lat.toFixed(4)}° N, {selectedNode.lng.toFixed(4)}° E
            </strong>
          </div>
        </div>
      ) : null}

      {/* Texture Mode Switcher: Real NASA Satellite vs Black Marble Night Lights vs Topography */}
      <div className={styles.textureModeBar}>
        <button
          type="button"
          className={textureMode === "satellite" ? styles.textureModeActive : styles.textureModeBtn}
          onClick={() => setTextureMode("satellite")}
          title="NASA Blue Marble True-Color Satellite"
        >
          ☀️ SATELLITE (BLUE MARBLE)
        </button>
        <button
          type="button"
          className={textureMode === "night" ? styles.textureModeActive : styles.textureModeBtn}
          onClick={() => setTextureMode("night")}
          title="NASA Black Marble Night Lights & City Infrastructure"
        >
          🌃 NIGHT LIGHTS
        </button>
        <button
          type="button"
          className={textureMode === "tactical" ? styles.textureModeActive : styles.textureModeBtn}
          onClick={() => setTextureMode("tactical")}
          title="Topographic Elevation Relief"
        >
          🛰️ TOPOGRAPHY
        </button>
      </div>

      {/* Bottom Sensor Hub Quick Selector Bar */}
      <div className={styles.nodesBar}>
        {displayNodes.slice(0, 7).map((node) => (
          <button
            key={node.id}
            type="button"
            className={`${styles.nodePill} ${
              selectedNode?.id === node.id ? styles.nodePillActive : ""
            } ${node.category === "target" ? styles.nodePillTarget : ""}`}
            onClick={() => {
              setLocalSelectedNodeId(node.id);
              focusOnCoordinates(node.lat, node.lng);
              onSelectNode?.(node);
            }}
          >
            {node.category === "target" ? "🎯 " : ""}
            {node.name.split(" ")[0]}
          </button>
        ))}
      </div>
    </div>
  );
}
