"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import {
  Globe,
  Compass,
  Layers,
  Network,
  Shield,
  Eye,
  Crosshair,
  Maximize2,
  RefreshCw,
  Activity,
  Server,
  Database,
  Lock,
} from "lucide-react";
import styles from "./sovereign-cyber-matrix.module.css";

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

// ============================================================================
// 1. AUTHORITATIVE GEOGRAPHIC COORDINATES
// ============================================================================

// High-precision sovereign perimeter of India [lon, lat]
const INDIA_BORDER_GEO: [number, number][] = [
  [74.0, 35.5], [75.0, 36.2], [76.5, 36.0], [77.8, 35.5], [78.8, 35.0],
  [79.2, 33.8], [78.8, 32.6], [78.5, 31.6], [79.8, 31.0], [80.5, 29.8],
  [80.2, 28.8], [82.0, 27.8], [84.5, 27.2], [86.0, 26.6], [88.0, 26.5],
  [88.2, 27.8], [88.8, 28.0], [88.9, 27.2], [91.5, 26.8], [92.5, 27.8],
  [94.0, 28.8], [95.5, 29.2], [97.0, 28.3], [97.3, 27.5], [95.5, 26.5],
  [94.5, 25.0], [93.5, 23.8], [92.8, 22.0], [92.5, 23.5], [91.8, 24.2],
  [91.2, 23.5], [91.8, 25.2], [89.8, 25.5], [89.0, 25.0], [88.2, 22.5],
  [88.3, 21.6], [87.0, 21.4], [86.0, 20.2], [85.0, 19.3], [83.3, 17.7],
  [82.2, 16.5], [80.5, 15.5], [80.1, 14.0], [80.3, 13.1], [79.8, 11.5],
  [79.8, 10.3], [79.0, 9.3], [77.55, 8.08], [76.5, 9.0], [76.2, 9.9],
  [75.5, 11.5], [75.0, 12.5], [74.5, 14.0], [73.8, 15.4], [73.3, 16.8],
  [72.88, 19.08], [72.8, 20.2], [72.8, 21.1], [72.0, 21.8], [71.0, 20.8],
  [69.8, 21.5], [69.0, 22.2], [69.5, 23.0], [68.5, 23.7], [70.0, 24.2],
  [71.0, 24.5], [70.5, 25.5], [70.2, 26.8], [71.5, 28.0], [72.5, 29.5],
  [74.0, 30.5], [74.6, 31.6], [74.9, 32.3], [74.5, 33.2], [74.0, 34.2],
  [74.0, 35.5]
];

// Sovereign India Internal Strategic Corridors & Grid Vectors [lon, lat][]
const INDIA_INTERNAL_CORRIDORS: [number, number][][] = [
  // Northern Crown Vector: Srinagar -> Leh -> Jammu -> New Delhi
  [[74.8, 34.1], [77.6, 34.15], [74.87, 32.73], [77.21, 28.61]],
  // Western Strategic Vector: New Delhi -> Jaipur -> Ahmedabad -> Mumbai -> Goa
  [[77.21, 28.61], [75.8, 26.9], [72.57, 23.02], [72.88, 19.08], [73.83, 15.5]],
  // Southern Technological & Subsea Vector: Mumbai -> Bengaluru -> Kochi -> Thiruvananthapuram -> Kanyakumari
  [[72.88, 19.08], [77.59, 12.97], [76.27, 9.93], [76.94, 8.52], [77.55, 8.08]],
  // Coromandel / Eastern Subsea Landing Vector: Kanyakumari -> Chennai -> Visakhapatnam -> Bhubaneswar -> Kolkata
  [[77.55, 8.08], [80.27, 13.08], [83.3, 17.7], [85.82, 20.3], [88.36, 22.57]],
  // Deccan Intelligence Core: Bengaluru -> Hyderabad -> Nagpur -> New Delhi
  [[77.59, 12.97], [78.48, 17.38], [79.08, 21.15], [77.21, 28.61]],
  // Gangetic Sovereign Line: New Delhi -> Lucknow -> Varanasi -> Patna -> Kolkata
  [[77.21, 28.61], [80.95, 26.85], [82.97, 25.32], [85.14, 25.61], [88.36, 22.57]],
  // Siliguri Strategic Gateway to North-East: Kolkata -> Siliguri -> Guwahati -> Shillong -> Itanagar
  [[88.36, 22.57], [88.43, 26.73], [91.74, 26.14], [91.88, 25.57], [93.61, 27.1]],
  // Andaman & Nicobar Sovereign Maritime Corridor: Chennai -> Port Blair
  [[80.27, 13.08], [86.5, 12.3], [92.73, 11.62]],
  // Lakshadweep Sea Vector: Kochi -> Kavaratti
  [[76.27, 9.93], [72.64, 10.57]],
];

// Strategic Indian Intelligence Reference Anchors on Earth Surface
const INDIA_STRATEGIC_ANCHORS = [
  { name: "NEW DELHI", lat: 28.6139, lon: 77.2090, label: "National Command Matrix" },
  { name: "MUMBAI", lat: 19.0760, lon: 72.8777, label: "Subsea Landing & Financial Gateway" },
  { name: "BENGALURU", lat: 12.9716, lon: 77.5946, label: "Cyber & Aerospace Hub" },
  { name: "HYDERABAD", lat: 17.3850, lon: 78.4867, label: "Defense & Strategic Matrix" },
  { name: "CHENNAI", lat: 13.0827, lon: 80.2707, label: "Indo-Pacific Subsea Gateway" },
  { name: "KOLKATA", lat: 22.5726, lon: 88.3639, label: "Eastern Maritime Corridor" },
  { name: "GUWAHATI", lat: 26.1445, lon: 91.7362, label: "North-Eastern Sector Hub" },
  { name: "SRINAGAR", lat: 34.0837, lon: 74.7973, label: "Northern Sovereign Perimeter" },
  { name: "AHMEDABAD", lat: 23.0225, lon: 72.5714, label: "Western Border Vector" },
  { name: "PORT BLAIR", lat: 11.6234, lon: 92.7265, label: "Andaman Maritime Sentinel" },
];

// Major Continental Polygons [lon, lat][] for True Planetary Context
const CONTINENT_OUTLINES: [number, number][][] = [
  // Eurasia / Europe / Asia
  [
    [-9.5, 36.0], [-9.0, 43.0], [-1.5, 46.0], [5.0, 53.5], [8.5, 57.0],
    [14.0, 55.5], [20.0, 64.5], [28.0, 71.0], [40.0, 68.0], [60.0, 70.0],
    [80.0, 73.0], [105.0, 77.5], [140.0, 73.0], [170.0, 66.0], [180.0, 65.0],
    [170.0, 60.0], [160.0, 54.0], [142.0, 50.0], [131.0, 43.0], [122.0, 37.5],
    [120.0, 32.0], [118.0, 24.5], [109.0, 18.0], [105.0, 10.0], [100.0, 3.0],
    [98.5, 10.0], [92.0, 21.0], [80.0, 28.0], [70.0, 24.0], [60.0, 25.0],
    [50.0, 26.0], [44.0, 12.5], [43.0, 28.0], [35.0, 32.0], [28.0, 41.0],
    [15.0, 40.0], [3.0, 42.0], [-5.5, 36.0], [-9.5, 36.0]
  ],
  // Africa
  [
    [-5.5, 36.0], [11.0, 37.0], [25.0, 32.0], [32.0, 31.5], [43.0, 12.5],
    [51.0, 10.5], [41.0, -4.0], [40.5, -15.0], [35.0, -24.0], [32.0, -28.0],
    [28.0, -32.5], [18.5, -34.5], [17.5, -30.0], [12.0, -17.0], [9.0, 1.0],
    [3.0, 6.0], [-7.5, 4.5], [-17.5, 14.5], [-16.0, 21.0], [-10.0, 29.0],
    [-5.5, 36.0]
  ],
  // North America
  [
    [-168.0, 66.0], [-150.0, 71.0], [-130.0, 70.0], [-95.0, 75.0], [-70.0, 62.0],
    [-55.0, 52.0], [-65.0, 44.0], [-75.0, 35.0], [-80.0, 25.0], [-82.0, 23.0],
    [-97.0, 26.0], [-96.0, 16.0], [-85.0, 13.0], [-77.0, 8.0], [-84.0, 9.5],
    [-92.0, 15.0], [-105.0, 20.0], [-115.0, 30.0], [-124.0, 40.0], [-124.0, 48.0],
    [-135.0, 57.0], [-165.0, 54.0], [-168.0, 66.0]
  ],
  // South America
  [
    [-77.0, 8.0], [-65.0, 10.5], [-50.0, 0.0], [-35.0, -6.0], [-38.0, -18.0],
    [-48.0, -28.0], [-55.0, -38.0], [-65.0, -48.0], [-68.0, -55.0], [-75.0, -45.0],
    [-72.0, -35.0], [-70.0, -20.0], [-80.0, -5.0], [-77.0, 8.0]
  ],
  // Australia
  [
    [114.0, -22.0], [124.0, -16.0], [136.0, -12.0], [142.0, -11.0], [153.0, -28.0],
    [150.0, -37.0], [140.0, -38.0], [130.0, -32.0], [115.0, -34.0], [114.0, -22.0]
  ]
];

// ============================================================================
// 2. SEMANTIC ALTITUDE LAYERS & INTELLIGENCE DATA MODEL
// ============================================================================

export type SemanticEntityType =
  | "LOCATION"
  | "INFRASTRUCTURE"
  | "DOMAIN"
  | "IP"
  | "PERSON"
  | "ORGANIZATION"
  | "EVIDENCE"
  | "ALERT"
  | "SOURCE";

export interface IntelligenceNode {
  id: string;
  name: string;
  type: SemanticEntityType;
  lat: number;
  lon: number;
  altitude: number; // 0.03 (surface) to 0.85 (outer)
  sourceClass: "sovereign_core" | "public_passive" | "verified_gazette" | "infrastructure" | "osint";
  confidence: number;
  status: "preview" | "active" | "monitored" | "admitted" | "flagged";
  details: string;
}

export interface IntelligenceArc {
  id: string;
  sourceId: string;
  targetId: string;
  type: "telemetry" | "provenance" | "corroboration" | "infrastructure";
  color: string;
  pulseSpeed: number;
}

// Semantic node color scheme strictly adhering to master prompt
export const SEMANTIC_COLORS: Record<SemanticEntityType, string> = {
  DOMAIN: "#00f0ff",        // Cyan
  IP: "#4682b4",            // Steel Blue
  PERSON: "#f0f4f8",        // Neutral White
  ORGANIZATION: "#d4af37",  // Muted Gold
  EVIDENCE: "#20b2aa",      // Teal
  ALERT: "#ff6b4a",         // Controlled Amber/Red
  LOCATION: "#e2e8f0",      // Geographic Marker
  INFRASTRUCTURE: "#10b981",// Emerald
  SOURCE: "#8a7db2",        // Muted Violet
};

// Capability Preview Nodes (Pre-Auth)
// These are abstract product capabilities placed on the globe only as visual anchors.
// They do not represent live infrastructure, connector health, incidents, or operational status.
const INITIAL_INTELLIGENCE_NODES: IntelligenceNode[] = [
  { id: "cap-source-registry", name: "SOURCE REGISTRY", type: "SOURCE", lat: 28.6139, lon: 77.2090, altitude: 0.18, sourceClass: "osint", confidence: 0, status: "preview", details: "Capability preview: governed source catalog, access mode, risk metadata, and provenance requirements. No connector is claimed live before authentication." },
  { id: "cap-connector-health", name: "CONNECTOR HEALTH", type: "INFRASTRUCTURE", lat: 19.0760, lon: 72.8777, altitude: 0.24, sourceClass: "public_passive", confidence: 0, status: "preview", details: "Capability preview: authenticated reachability and parser-health checks populate the operational universe after login." },
  { id: "cap-universal-search", name: "UNIVERSAL SEARCH", type: "DOMAIN", lat: 12.9716, lon: 77.5946, altitude: 0.38, sourceClass: "osint", confidence: 0, status: "preview", details: "Capability preview: governed public-source query routing with source-by-source execution and explicit adapter results." },
  { id: "cap-evidence-vault", name: "EVIDENCE VAULT", type: "EVIDENCE", lat: 23.0225, lon: 72.5714, altitude: 0.62, sourceClass: "verified_gazette", confidence: 0, status: "preview", details: "Capability preview: source-linked evidence, hashes, lineage, retention, and review boundaries." },
  { id: "cap-corroboration", name: "CORROBORATION", type: "EVIDENCE", lat: 22.5726, lon: 88.3639, altitude: 0.54, sourceClass: "osint", confidence: 0, status: "preview", details: "Capability preview: compare independent evidence families without inventing support where none exists." },
  { id: "cap-contradiction", name: "CONTRADICTION", type: "ALERT", lat: 26.1445, lon: 91.7362, altitude: 0.50, sourceClass: "osint", confidence: 0, status: "preview", details: "Capability preview: surface conflicting statements, temporal divergence, and evidence gaps for analyst review." },
  { id: "cap-geospatial", name: "GEOSPATIAL LAYER", type: "LOCATION", lat: 20.5937, lon: 78.9629, altitude: 0.12, sourceClass: "public_passive", confidence: 0, status: "preview", details: "Capability preview: admitted geospatial records only. Missing PostGIS or datasets render as unavailable, never as synthetic locations." },
  { id: "cap-cti", name: "CYBER CTI", type: "ALERT", lat: 13.0827, lon: 80.2707, altitude: 0.44, sourceClass: "public_passive", confidence: 0, status: "preview", details: "Capability preview: public defensive intelligence adapters, vulnerability records, and policy-gated enrichment." },
  { id: "cap-spaceint", name: "SPACEINT", type: "SOURCE", lat: 17.3850, lon: 78.4867, altitude: 0.70, sourceClass: "public_passive", confidence: 0, status: "preview", details: "Capability preview: orbital and space-weather sources appear only when admitted source data is available." },
  { id: "cap-astra", name: "ASTRA GOVERNED RUNS", type: "INFRASTRUCTURE", lat: 9.9312, lon: 76.2673, altitude: 0.32, sourceClass: "sovereign_core", confidence: 0, status: "preview", details: "Capability preview: queued ASTRA runs, authorization, worker state, and evidence output become visible only after authentication." },
];

// Conceptual capability-flow arcs. These encode product workflow, not real-world telemetry.
const INITIAL_INTELLIGENCE_ARCS: IntelligenceArc[] = [
  { id: "cap-arc-01", sourceId: "cap-source-registry", targetId: "cap-connector-health", type: "provenance", color: "#38bdf8", pulseSpeed: 0.7 },
  { id: "cap-arc-02", sourceId: "cap-connector-health", targetId: "cap-universal-search", type: "provenance", color: "#00f0ff", pulseSpeed: 0.8 },
  { id: "cap-arc-03", sourceId: "cap-universal-search", targetId: "cap-evidence-vault", type: "provenance", color: "#20b2aa", pulseSpeed: 0.9 },
  { id: "cap-arc-04", sourceId: "cap-evidence-vault", targetId: "cap-corroboration", type: "corroboration", color: "#d4af37", pulseSpeed: 0.6 },
  { id: "cap-arc-05", sourceId: "cap-evidence-vault", targetId: "cap-contradiction", type: "corroboration", color: "#ff6b4a", pulseSpeed: 0.6 },
  { id: "cap-arc-06", sourceId: "cap-geospatial", targetId: "cap-evidence-vault", type: "provenance", color: "#10b981", pulseSpeed: 0.5 },
  { id: "cap-arc-07", sourceId: "cap-cti", targetId: "cap-universal-search", type: "provenance", color: "#4682b4", pulseSpeed: 0.7 },
  { id: "cap-arc-08", sourceId: "cap-spaceint", targetId: "cap-universal-search", type: "provenance", color: "#8a7db2", pulseSpeed: 0.5 },
  { id: "cap-arc-09", sourceId: "cap-astra", targetId: "cap-evidence-vault", type: "provenance", color: "#38bdf8", pulseSpeed: 0.8 },
];

const EARTH_RADIUS = 3.0;

// Spherical coordinate transformation: (lat, lon, altitude) -> 3D Vector3
export function latLonToVector3(lat: number, lon: number, radius = EARTH_RADIUS, altitude = 0) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const r = radius + altitude;

  const x = -(r * Math.sin(phi) * Math.cos(theta));
  const z = r * Math.sin(phi) * Math.sin(theta);
  const y = r * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}

// ============================================================================
// 3. SOVEREIGN 3D INTELLIGENCE GLOBE COMPONENT
// ============================================================================

export interface SovereignCyberMatrix3DProps {
  mode?: "pre-auth" | "operational";
  onNodeSelect?: (node: IntelligenceNode | null) => void;
  selectedNodeId?: string | null;
  activePreset?: "GLOBAL" | "INDIA" | "INFRASTRUCTURE" | "ENTITIES" | "EVIDENCE";
}

export function SovereignCyberMatrix3D({
  mode = "pre-auth",
  onNodeSelect,
  selectedNodeId,
  activePreset = "INDIA",
}: SovereignCyberMatrix3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<IntelligenceNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<IntelligenceNode | null>(null);
  const [currentPreset, setCurrentPreset] = useState<string>(activePreset);

  // References to keep across renders
  const sceneRef = useRef<ThreeScene | null>(null);
  const cameraRef = useRef<ThreeCamera | null>(null);
  const rendererRef = useRef<ThreeRenderer | null>(null);
  const globeGroupRef = useRef<ThreeGroup | null>(null);
  const targetCamPosRef = useRef(new THREE.Vector3(0, 1.2, 5.8));
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2(-999, -999));
  const nodeMeshesRef = useRef<Map<string, ThreeMesh>>(new Map());
  const starFieldRef = useRef<ThreePoints | null>(null);

  // Camera presets
  const applyPreset = useCallback((preset: string) => {
    setCurrentPreset(preset);
    if (!globeGroupRef.current) return;

    if (preset === "INDIA") {
      // Focus on India (Lat: 22, Lon: 78)
      targetCamPosRef.current.set(0, 1.1, 5.6);
      globeGroupRef.current.rotation.set(0.38, -1.35, 0);
    } else if (preset === "GLOBAL") {
      targetCamPosRef.current.set(0, 0.8, 8.4);
    } else if (preset === "INFRASTRUCTURE") {
      targetCamPosRef.current.set(0, 0.9, 5.2);
      globeGroupRef.current.rotation.set(0.32, -1.28, 0);
    } else if (preset === "ENTITIES") {
      targetCamPosRef.current.set(0, 1.4, 5.0);
      globeGroupRef.current.rotation.set(0.42, -1.42, 0);
    } else if (preset === "EVIDENCE") {
      targetCamPosRef.current.set(0, 1.8, 6.2);
      globeGroupRef.current.rotation.set(0.48, -1.30, 0);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const aspect = container.clientWidth / Math.max(1, container.clientHeight);
    const camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 100);
    cameraRef.current = camera;
    camera.position.set(0, 2.5, 10.5); // Start far for the intro dolly sequence

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    rendererRef.current = renderer;
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x020712, 1);
    container.appendChild(renderer.domElement);

    // Background WebGL Starfield & Spatial Depth Particles
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 1000;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    const starColorPalette = [
      new THREE.Color(0x38bdf8),
      new THREE.Color(0x94a3b8),
      new THREE.Color(0xf8fafc),
      new THREE.Color(0x0284c7),
    ];

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const radius = 16 + Math.random() * 24;

      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = radius * Math.cos(phi);

      const color = starColorPalette[Math.floor(Math.random() * starColorPalette.length)]!;
      starColors[i * 3] = color.r;
      starColors[i * 3 + 1] = color.g;
      starColors[i * 3 + 2] = color.b;
    }

    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      sizeAttenuation: true,
    });
    const starField = new THREE.Points(starGeometry, starMaterial);
    starFieldRef.current = starField;
    scene.add(starField);

    // Master Globe Transform Group
    const globeGroup = new THREE.Group();
    globeGroupRef.current = globeGroup;
    scene.add(globeGroup);

    // Initial orientation: Face India toward the camera
    // Longitude ~78° E, Latitude ~22° N
    globeGroup.rotation.y = -1.35;
    globeGroup.rotation.x = 0.38;

    // 2. Earth Surface Mesh (Dark graphite land & deep navy absorption)
    const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
    const earthMaterial = new THREE.MeshStandardMaterial({
      color: 0x08101e,
      roughness: 0.85,
      metalness: 0.15,
      emissive: 0x02060f,
    });
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    globeGroup.add(earthMesh);

    // 3. Restrained Rim Lighting & Ambient Lights
    const ambientLight = new THREE.AmbientLight(0x18283f, 1.2);
    scene.add(ambientLight);

    const keyDirectionalLight = new THREE.DirectionalLight(0xa5d8ff, 2.2);
    keyDirectionalLight.position.set(5, 8, 7);
    scene.add(keyDirectionalLight);

    const rimLight = new THREE.DirectionalLight(0x0284c7, 1.8);
    rimLight.position.set(-6, -4, -5);
    scene.add(rimLight);

    // 4. Atmosphere Shell (Soft Fresnel Twilight Scattering)
    const atmosphereGeometry = new THREE.SphereGeometry(EARTH_RADIUS * 1.025, 48, 48);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x103a60,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.35,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    globeGroup.add(atmosphereMesh);

    // Outer Atmosphere Scattering Shell (Soft Multi-Layer Twilight Fresnel)
    const outerAtmosphereGeometry = new THREE.SphereGeometry(EARTH_RADIUS * 1.055, 48, 48);
    const outerAtmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.16,
    });
    const outerAtmosphereMesh = new THREE.Mesh(outerAtmosphereGeometry, outerAtmosphereMaterial);
    globeGroup.add(outerAtmosphereMesh);

    // 4. Authentic Sovereign India Strategic Corridors & Grid Vectors
    const corridorMaterial = new THREE.LineBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.72,
    });

    for (const corridor of INDIA_INTERNAL_CORRIDORS) {
      const points = corridor.map(([lon, lat]) =>
        latLonToVector3(lat, lon, EARTH_RADIUS, 0.012)
      );
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geom, corridorMaterial);
      globeGroup.add(line);
    }

    // India Strategic Ground Anchors with Pulsing Beacons
    const anchorBeacons: Array<{ mesh: ThreeMesh; ring: ThreeMesh }> = [];
    INDIA_STRATEGIC_ANCHORS.forEach((anchor) => {
      const pos = latLonToVector3(anchor.lat, anchor.lon, EARTH_RADIUS, 0.014);
      const dotGeom = new THREE.SphereGeometry(0.024, 8, 8);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const dotMesh = new THREE.Mesh(dotGeom, dotMat);
      dotMesh.position.copy(pos);

      const ringGeom = new THREE.RingGeometry(0.035, 0.05, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.position.copy(pos);
      ringMesh.lookAt(pos.clone().multiplyScalar(2));

      globeGroup.add(dotMesh);
      globeGroup.add(ringMesh);
      anchorBeacons.push({ mesh: dotMesh, ring: ringMesh });
    });

    // 5. Continents & Political Boundary Lines
    const continentMaterial = new THREE.LineBasicMaterial({
      color: 0x1c3148,
      transparent: true,
      opacity: 0.65,
    });

    for (const polygon of CONTINENT_OUTLINES) {
      const points = polygon.map(([lon, lat]) =>
        latLonToVector3(lat, lon, EARTH_RADIUS, 0.008)
      );
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.LineLoop(geom, continentMaterial);
      globeGroup.add(line);
    }

    // 6. India Sovereign Highlight Layer (Restrained Cyan/Blue Glow)
    const indiaPoints = INDIA_BORDER_GEO.map(([lon, lat]) =>
      latLonToVector3(lat, lon, EARTH_RADIUS, 0.015)
    );
    const indiaGeom = new THREE.BufferGeometry().setFromPoints(indiaPoints);
    const indiaLineMaterial = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.95,
    });
    const indiaBorder = new THREE.LineLoop(indiaGeom, indiaLineMaterial);
    globeGroup.add(indiaBorder);

    // Secondary subtle halo boundary
    const indiaHaloPoints = INDIA_BORDER_GEO.map(([lon, lat]) =>
      latLonToVector3(lat, lon, EARTH_RADIUS, 0.035)
    );
    const indiaHaloGeom = new THREE.BufferGeometry().setFromPoints(indiaHaloPoints);
    const indiaHaloMat = new THREE.LineBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.4,
    });
    globeGroup.add(new THREE.LineLoop(indiaHaloGeom, indiaHaloMat));

    // 7. Data Nodes Layer across Semantic Altitudes (Dancing OSINT Graph)
    const nodeMeshes = new Map<string, ThreeMesh>();
    const nodeBasePositions = new Map<string, ThreeVector3>();
    const nodePillarLines = new Map<string, { line: InstanceType<typeof THREE.Line>; geom: ThreeBufferGeometry; surfacePos: ThreeVector3 }>();
    nodeMeshesRef.current = nodeMeshes;

    INITIAL_INTELLIGENCE_NODES.forEach((node) => {
      const position = latLonToVector3(node.lat, node.lon, EARTH_RADIUS, node.altitude);
      nodeBasePositions.set(node.id, position.clone());
      const hexColor = SEMANTIC_COLORS[node.type] || "#38bdf8";

      // Node core sphere
      const size = node.id === "cap-source-registry" ? 0.09 : node.type === "LOCATION" ? 0.065 : 0.055;
      const sphereGeom = new THREE.SphereGeometry(size, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(hexColor),
      });
      const nodeMesh = new THREE.Mesh(sphereGeom, sphereMat);
      nodeMesh.position.copy(position);
      nodeMesh.userData = { nodeData: node };

      // Root beacon ring for the capability model entry point
      if (node.id === "cap-source-registry") {
        const ringGeom = new THREE.RingGeometry(0.12, 0.15, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xff9933,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.lookAt(position.clone().multiplyScalar(2));
        nodeMesh.add(ring);
      }

      // Elevation pillar connecting node down to the surface
      const surfacePos = latLonToVector3(node.lat, node.lon, EARTH_RADIUS, 0.005);
      const pillarGeom = new THREE.BufferGeometry().setFromPoints([surfacePos, position]);
      const pillarMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(hexColor),
        transparent: true,
        opacity: 0.35,
      });
      const pillar = new THREE.Line(pillarGeom, pillarMat);
      globeGroup.add(pillar);
      nodePillarLines.set(node.id, { line: pillar, geom: pillarGeom, surfacePos });

      globeGroup.add(nodeMesh);
      nodeMeshes.set(node.id, nodeMesh);
    });

    // 8. Great-Circle Curved Dynamic Network Arcs
    const arcObjects: Array<{
      sourceId: string;
      targetId: string;
      curve: ThreeCurve;
      lineGeom: ThreeBufferGeometry;
      pulseMesh: ThreeMesh;
      speed: number;
      arcAltitude: number;
    }> = [];

    INITIAL_INTELLIGENCE_ARCS.forEach((arc) => {
      const src = INITIAL_INTELLIGENCE_NODES.find((n) => n.id === arc.sourceId);
      const tgt = INITIAL_INTELLIGENCE_NODES.find((n) => n.id === arc.targetId);
      if (!src || !tgt) return;

      const p1 = latLonToVector3(src.lat, src.lon, EARTH_RADIUS, src.altitude);
      const p2 = latLonToVector3(tgt.lat, tgt.lon, EARTH_RADIUS, tgt.altitude);

      // Great-circle midpoint arching over globe curvature
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      const dist = p1.distanceTo(p2);
      const arcAltitude = dist * 0.38 + 0.15;
      mid.normalize().multiplyScalar(EARTH_RADIUS + arcAltitude);

      const curve = new THREE.CatmullRomCurve3([p1, mid, p2]);
      const curvePoints = curve.getPoints(40);

      const arcGeom = new THREE.BufferGeometry().setFromPoints(curvePoints);
      const arcMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(arc.color),
        transparent: true,
        opacity: 0.65,
      });
      const arcLine = new THREE.Line(arcGeom, arcMat);
      globeGroup.add(arcLine);

      // Travelling telemetry pulse packet
      const pulseGeom = new THREE.SphereGeometry(0.04, 8, 8);
      const pulseMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(arc.color),
      });
      const pulseMesh = new THREE.Mesh(pulseGeom, pulseMat);
      globeGroup.add(pulseMesh);

      arcObjects.push({
        sourceId: arc.sourceId,
        targetId: arc.targetId,
        curve,
        lineGeom: arcGeom,
        pulseMesh,
        speed: arc.pulseSpeed,
        arcAltitude,
      });
    });

    // 9. Interactive Drag to Orbit & Zoom
    const handlePointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (!isDraggingRef.current || !globeGroupRef.current) return;

      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      globeGroupRef.current.rotation.y += deltaX * 0.005;
      globeGroupRef.current.rotation.x = Math.max(
        -1.2,
        Math.min(1.2, globeGroupRef.current.rotation.x + deltaY * 0.005)
      );

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const currentDist = targetCamPosRef.current.z;
      const newDist = Math.max(4.6, Math.min(10.5, currentDist + e.deltaY * 0.005));
      targetCamPosRef.current.z = newDist;
    };

    // Node selection via Click
    const handleClick = () => {
      if (!cameraRef.current || !sceneRef.current) return;
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

      const meshes = Array.from(nodeMeshesRef.current.values());
      const intersects = raycasterRef.current.intersectObjects(meshes);

      if (intersects.length > 0) {
        const hit = intersects[0]?.object as ThreeMesh;
        const nodeData = hit.userData.nodeData as IntelligenceNode;
        if (nodeData) {
          setSelectedNode(nodeData);
          if (onNodeSelect) onNodeSelect(nodeData);

          // Focus camera toward selected node
          const worldPos = new THREE.Vector3();
          hit.getWorldPosition(worldPos);
          targetCamPosRef.current.set(worldPos.x * 0.6, worldPos.y * 0.6 + 0.4, 5.2);
        }
      }
    };

    container.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("click", handleClick);

    // Resize handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Initial sequence trigger: Camera settles in 1.8s
    applyPreset("INDIA");

    // 10. Master Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth camera interpolation towards target + subtle pointer parallax
      if (cameraRef.current) {
        const parallaxX = mouseRef.current.x > -100 ? mouseRef.current.x * 0.35 : 0;
        const parallaxY = mouseRef.current.y > -100 ? mouseRef.current.y * 0.25 : 0;
        const currentTarget = targetCamPosRef.current.clone();
        currentTarget.x += parallaxX;
        currentTarget.y += parallaxY;
        cameraRef.current.position.lerp(currentTarget, 0.04);
        cameraRef.current.lookAt(0, 0, 0);
      }

      // Restrained idle rotation when user is not dragging
      if (!isDraggingRef.current && globeGroupRef.current && !prefersReducedMotion) {
        globeGroupRef.current.rotation.y += 0.0006;
      }

      // Subtle celestial rotation of background starfield
      if (starFieldRef.current && !prefersReducedMotion) {
        starFieldRef.current.rotation.y -= 0.00015;
      }

      // Organic Dancing OSINT Graph Network
      INITIAL_INTELLIGENCE_NODES.forEach((node, idx) => {
        const mesh = nodeMeshes.get(node.id);
        const base = nodeBasePositions.get(node.id);
        const pillar = nodePillarLines.get(node.id);
        if (mesh && base && !prefersReducedMotion) {
          const waveY = Math.sin(elapsed * 1.6 + idx * 0.75) * 0.05;
          const waveX = Math.cos(elapsed * 1.2 + idx * 0.55) * 0.04;
          const waveZ = Math.sin(elapsed * 1.9 + idx * 0.95) * 0.035;
          mesh.position.set(base.x + waveX, base.y + waveY, base.z + waveZ);

          if (pillar) {
            pillar.geom.setFromPoints([pillar.surfacePos, mesh.position]);
          }
        }
      });

      // Update dynamic curved OSINT edges & telemetry pulses
      arcObjects.forEach((arc) => {
        const srcMesh = nodeMeshes.get(arc.sourceId);
        const tgtMesh = nodeMeshes.get(arc.targetId);
        if (srcMesh && tgtMesh) {
          const p1 = srcMesh.position;
          const p2 = tgtMesh.position;
          const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
          mid.normalize().multiplyScalar(EARTH_RADIUS + arc.arcAltitude);
          const curve = new THREE.CatmullRomCurve3([p1, mid, p2]);
          arc.curve = curve;
          const pts = curve.getPoints(36);
          arc.lineGeom.setFromPoints(pts);

          const t = (elapsed * arc.speed * 0.35) % 1;
          const point = curve.getPointAt(t);
          arc.pulseMesh.position.copy(point);
        }
      });

      // Dynamic scale pulsation for India strategic anchor ground beacons
      anchorBeacons.forEach((b, i) => {
        if (!prefersReducedMotion) {
          const scale = 1 + 0.32 * Math.sin(elapsed * 2.4 + i * 0.65);
          b.ring.scale.set(scale, scale, scale);
        }
      });

      // Hover Raycasting for Depth-Aware Tooltips
      if (cameraRef.current) {
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        const meshes = Array.from(nodeMeshesRef.current.values());
        const intersects = raycasterRef.current.intersectObjects(meshes);

        if (intersects.length > 0) {
          const hit = intersects[0]?.object as ThreeMesh;
          const nodeData = hit.userData.nodeData as IntelligenceNode;

          // Check if node is on the front side of Earth (Occlusion Test)
          const worldPos = new THREE.Vector3();
          hit.getWorldPosition(worldPos);
          const camDir = cameraRef.current.position.clone().normalize();
          const nodeDir = worldPos.clone().normalize();

          if (nodeDir.dot(camDir) > 0.1) {
            setHoveredNode(nodeData);
          } else {
            setHoveredNode(null);
          }
        } else {
          setHoveredNode(null);
        }
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

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
          if (item.geometry) {
            item.geometry.dispose();
          }
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
  }, [applyPreset, onNodeSelect]);

  return (
    <div className={styles.host} ref={containerRef}>
      {/* Visual Depth Grid & Horizon */}
      <div className={styles.gridOverlay} />

      {/* Top Left: Sovereign Header & Active Coordinates */}
      <div className={styles.topHud}>
        <div className={styles.systemTag}>
          <span className={styles.liveDot} />
          <span className={styles.systemName}>DISHA 6.6</span>
          <span className={styles.systemSep}>·</span>
          <span className={styles.runtimeBadge}>{mode === "pre-auth" ? "PRE-AUTH CAPABILITY MODEL" : "AUTHENTICATED RUNTIME"}</span>
        </div>
        <div className={styles.coords}>
          <span>{mode === "pre-auth" ? "NON-OPERATIONAL CAPABILITY SCENE" : "AUTHENTICATED DATA SCENE"}</span>
          <small>{mode === "pre-auth" ? "No live connector, incident, infrastructure, or intelligence status is asserted before login." : "Render only authenticated, source-backed runtime data."}</small>
        </div>
      </div>

      {/* Bottom Left: Navigable Spatial Camera Presets */}
      <div className={styles.cameraPresets}>
        <span className={styles.presetLabel}>
          <Compass size={13} />
          <span>SPATIAL PRESETS</span>
        </span>
        <div className={styles.presetButtons}>
          <button
            type="button"
            className={currentPreset === "INDIA" ? styles.activePreset : ""}
            onClick={() => applyPreset("INDIA")}
          >
            INDIA
          </button>
          <button
            type="button"
            className={currentPreset === "GLOBAL" ? styles.activePreset : ""}
            onClick={() => applyPreset("GLOBAL")}
          >
            GLOBAL
          </button>
          <button
            type="button"
            className={currentPreset === "INFRASTRUCTURE" ? styles.activePreset : ""}
            onClick={() => applyPreset("INFRASTRUCTURE")}
          >
            INFRASTRUCTURE
          </button>
          <button
            type="button"
            className={currentPreset === "ENTITIES" ? styles.activePreset : ""}
            onClick={() => applyPreset("ENTITIES")}
          >
            ENTITIES
          </button>
          <button
            type="button"
            className={currentPreset === "EVIDENCE" ? styles.activePreset : ""}
            onClick={() => applyPreset("EVIDENCE")}
          >
            EVIDENCE
          </button>
        </div>
      </div>

      {/* In-Scene Hover Inspection HUD */}
      {hoveredNode && (
        <div className={styles.hoverTooltip}>
          <div className={styles.tooltipHeader}>
            <span
              className={styles.typeBadge}
              style={{ backgroundColor: `${SEMANTIC_COLORS[hoveredNode.type]}22`, color: SEMANTIC_COLORS[hoveredNode.type], borderColor: SEMANTIC_COLORS[hoveredNode.type] }}
            >
              {hoveredNode.type}
            </span>
            <span className={styles.statusBadge}>{hoveredNode.status.toUpperCase()}</span>
          </div>
          <h4>{hoveredNode.name}</h4>
          <p>{hoveredNode.details}</p>
          <div className={styles.tooltipMeta}>
            {mode === "pre-auth" ? (
              <>
                <span>CAPABILITY PREVIEW</span>
                <span>NO LIVE STATUS</span>
              </>
            ) : (
              <>
                <span>LOC: {hoveredNode.lat.toFixed(4)}°, {hoveredNode.lon.toFixed(4)}°</span>
                <span>ALT: {(hoveredNode.altitude * 100).toFixed(0)}km</span>
                <span>CONF: {(hoveredNode.confidence * 100).toFixed(0)}%</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Selected Node Inspector Drawer (Non-blocking compact HUD) */}
      {selectedNode && (
        <div className={styles.inspectorCard}>
          <div className={styles.inspectorHead}>
            <div className={styles.headLeft}>
              <Crosshair size={16} />
              <span>{mode === "pre-auth" ? "CAPABILITY INSPECTION" : "ACTIVE NODE INSPECTION"}</span>
            </div>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setSelectedNode(null)}
            >
              ✕
            </button>
          </div>
          <h3>{selectedNode.name}</h3>
          <span
            className={styles.typeBadge}
            style={{ backgroundColor: `${SEMANTIC_COLORS[selectedNode.type]}22`, color: SEMANTIC_COLORS[selectedNode.type], borderColor: SEMANTIC_COLORS[selectedNode.type] }}
          >
            {selectedNode.type}
          </span>
          <p className={styles.nodeDetails}>{selectedNode.details}</p>
          <div className={styles.inspectorGrid}>
            {mode === "pre-auth" ? (
              <>
                <div>
                  <small>SCENE TYPE</small>
                  <strong>CAPABILITY ONLY</strong>
                </div>
                <div>
                  <small>RUNTIME CLAIM</small>
                  <strong>NONE</strong>
                </div>
                <div>
                  <small>CAPABILITY CLASS</small>
                  <strong>{selectedNode.sourceClass.toUpperCase()}</strong>
                </div>
                <div>
                  <small>DATA ACCESS</small>
                  <strong>AUTH REQUIRED</strong>
                </div>
              </>
            ) : (
              <>
                <div>
                  <small>COORDINATES</small>
                  <strong>{selectedNode.lat.toFixed(4)}° N, {selectedNode.lon.toFixed(4)}° E</strong>
                </div>
                <div>
                  <small>CONFIDENCE</small>
                  <strong>{(selectedNode.confidence * 100).toFixed(0)}%</strong>
                </div>
                <div>
                  <small>SOURCE CLASS</small>
                  <strong>{selectedNode.sourceClass.toUpperCase()}</strong>
                </div>
                <div>
                  <small>ALTITUDE LAYER</small>
                  <strong>{(selectedNode.altitude * 100).toFixed(0)}km SPHERE</strong>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Default export alias to guarantee backwards-compatibility
export default SovereignCyberMatrix3D;
