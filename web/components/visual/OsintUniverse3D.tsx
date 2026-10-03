"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export type UniverseNodeMode =
  | "builtin"
  | "connector_ready"
  | "requires_configuration"
  | "reference_only"
  | "blocked_by_default"
  | "live_result"
  | "gateway";

export type UniverseHealth = "healthy" | "degraded" | "unavailable" | "not_configured" | "unknown";

export type OsintUniverseNode = {
  id: string;
  name: string;
  category: string;
  mode: UniverseNodeMode;
  health?: UniverseHealth;
  capabilities?: string[];
  adapterId?: string;
  homeUrl?: string;
  risk?: string;
  notes?: string;
  provenanceHash?: string;
};

export type OsintUniverse3DProps = {
  nodes?: OsintUniverseNode[];
  selectedId?: string | null;
  onSelect?: (node: OsintUniverseNode | null) => void;
  mode?: "gateway" | "operational";
};

const GATEWAY_NODES: OsintUniverseNode[] = [
  { id: "gateway-public", name: "PUBLIC SOURCES", category: "source_plane", mode: "gateway" },
  { id: "gateway-policy", name: "POLICY GATE", category: "governance_plane", mode: "gateway" },
  { id: "gateway-evidence", name: "EVIDENCE LEDGER", category: "evidence_plane", mode: "gateway" },
  { id: "gateway-graph", name: "INTELLIGENCE GRAPH", category: "graph_plane", mode: "gateway" },
  { id: "gateway-search", name: "UNIVERSAL SEARCH", category: "retrieval_plane", mode: "gateway" },
  { id: "gateway-astra", name: "ASTRA WORKERS", category: "worker_plane", mode: "gateway" },
];

const MODE_COLORS: Record<UniverseNodeMode, number> = {
  builtin: 0x28d7f2,
  connector_ready: 0x36d399,
  requires_configuration: 0xa78bfa,
  reference_only: 0x64748b,
  blocked_by_default: 0xf97360,
  live_result: 0xf4d35e,
  gateway: 0x67e8f9,
};

function hashUnit(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function colorFor(node: OsintUniverseNode): number {
  if (node.health === "healthy" && node.mode === "builtin") return 0x38e8ff;
  if (node.health === "degraded") return 0xf5b942;
  if (node.health === "unavailable" || node.health === "not_configured") {
    return node.mode === "builtin" ? 0x8b93a7 : MODE_COLORS[node.mode];
  }
  return MODE_COLORS[node.mode];
}

export function OsintUniverse3D({
  nodes = [],
  selectedId,
  onSelect,
  mode = "operational",
}: OsintUniverse3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef<string | null | undefined>(selectedId);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const sourceNodes = mode === "gateway" ? GATEWAY_NODES : nodes;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x02050b, mode === "gateway" ? 0.025 : 0.018);

    const camera = new THREE.PerspectiveCamera(
      mode === "gateway" ? 48 : 55,
      mount.clientWidth / Math.max(1, mount.clientHeight),
      0.1,
      100,
    );
    camera.position.set(0, mode === "gateway" ? 1.4 : 2.4, mode === "gateway" ? 10.5 : 13.5);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x02050b, 0);
    mount.appendChild(renderer.domElement);

    const root = new THREE.Group();
    root.rotation.x = -0.08;
    scene.add(root);

    scene.add(new THREE.AmbientLight(0x183044, 1.8));
    const key = new THREE.PointLight(0x8ee8ff, 18, 35, 1.6);
    key.position.set(2, 4, 5);
    scene.add(key);
    const rim = new THREE.PointLight(0x6d5dfc, 12, 30, 2);
    rim.position.set(-7, -2, -5);
    scene.add(rim);

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(mode === "gateway" ? 1.15 : 0.95, 4),
      new THREE.MeshStandardMaterial({
        color: 0x0a2035,
        emissive: 0x0b6f8d,
        emissiveIntensity: 1.25,
        roughness: 0.38,
        metalness: 0.42,
      }),
    );
    core.userData = { core: true };
    root.add(core);

    const coreHalo = new THREE.Mesh(
      new THREE.SphereGeometry(mode === "gateway" ? 1.42 : 1.22, 40, 40),
      new THREE.MeshBasicMaterial({
        color: 0x2dd4ff,
        transparent: true,
        opacity: 0.07,
        side: THREE.BackSide,
      }),
    );
    root.add(coreHalo);

    const starCount = mode === "gateway" ? 900 : 1450;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      const radius = 14 + hashUnit(`star-${i}`) * 30;
      const theta = hashUnit(`theta-${i}`) * Math.PI * 2;
      const phi = Math.acos(2 * hashUnit(`phi-${i}`) - 1);
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.cos(phi);
      starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({ color: 0xc8e7ff, size: 0.028, transparent: true, opacity: 0.72 }),
    );
    scene.add(stars);

    const categoryOrder = [...new Set(sourceNodes.map((node) => node.category))].sort();
    const meshById = new Map<string, THREE.Mesh>();
    const nodeById = new Map(sourceNodes.map((node) => [node.id, node] as const));

    categoryOrder.forEach((category, categoryIndex) => {
      const radius = (mode === "gateway" ? 2.7 : 2.9) + categoryIndex * (mode === "gateway" ? 0.62 : 0.34);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(radius - 0.006, radius + 0.006, 128),
        new THREE.MeshBasicMaterial({
          color: categoryIndex % 2 === 0 ? 0x17445f : 0x2a365a,
          transparent: true,
          opacity: mode === "gateway" ? 0.28 : 0.16,
          side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = Math.PI / 2 + (categoryIndex % 3 - 1) * 0.07;
      root.add(ring);
    });

    sourceNodes.forEach((node, index) => {
      const categoryIndex = Math.max(0, categoryOrder.indexOf(node.category));
      const radius = (mode === "gateway" ? 2.7 : 2.9) + categoryIndex * (mode === "gateway" ? 0.62 : 0.34);
      const angle = hashUnit(node.id) * Math.PI * 2 + index * 0.11;
      const y = (hashUnit(`${node.id}-y`) - 0.5) * (mode === "gateway" ? 1.3 : 2.5);
      const baseSize = mode === "gateway" ? 0.16 : node.mode === "live_result" ? 0.14 : 0.08;
      const size = node.mode === "builtin" && node.health === "healthy" ? baseSize * 1.25 : baseSize;
      const material = new THREE.MeshStandardMaterial({
        color: colorFor(node),
        emissive: colorFor(node),
        emissiveIntensity: node.mode === "live_result" ? 1.15 : 0.48,
        roughness: 0.46,
        metalness: 0.28,
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 18, 18), material);
      mesh.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      mesh.userData = { nodeId: node.id };
      root.add(mesh);
      meshById.set(node.id, mesh);

      if (node.mode === "builtin" || node.mode === "live_result" || mode === "gateway") {
        const halo = new THREE.Mesh(
          new THREE.RingGeometry(size * 1.45, size * 1.8, 24),
          new THREE.MeshBasicMaterial({
            color: colorFor(node),
            transparent: true,
            opacity: node.mode === "live_result" ? 0.65 : 0.3,
            side: THREE.DoubleSide,
          }),
        );
        halo.position.copy(mesh.position);
        halo.lookAt(0, 0, 0);
        root.add(halo);
      }
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hoveredId: string | null = null;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let velocityX = 0;
    let velocityY = 0;

    const setPointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const pick = (event: PointerEvent): string | null => {
      setPointer(event);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects([...meshById.values()], false);
      return hits[0]?.object.userData.nodeId ?? null;
    };

    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (dragging) {
        const dx = event.clientX - lastX;
        const dy = event.clientY - lastY;
        velocityX = dx * 0.004;
        velocityY = dy * 0.0025;
        root.rotation.y += velocityX;
        root.rotation.x = THREE.MathUtils.clamp(root.rotation.x + velocityY, -0.65, 0.65);
        lastX = event.clientX;
        lastY = event.clientY;
        return;
      }
      hoveredId = pick(event);
      renderer.domElement.style.cursor = hoveredId ? "pointer" : "grab";
    };

    const onPointerUp = (event: PointerEvent) => {
      const movement = Math.hypot(event.clientX - lastX, event.clientY - lastY);
      dragging = false;
      try {
        renderer.domElement.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture may already be released by the browser.
      }
      if (movement < 8) {
        const nodeId = pick(event);
        onSelect?.(nodeId ? nodeById.get(nodeId) ?? null : null);
      }
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      camera.position.z = THREE.MathUtils.clamp(camera.position.z + event.deltaY * 0.006, 6.5, 28);
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    const onResize = () => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(mount);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clock = new THREE.Clock();
    let frame = 0;

    const animate = () => {
      frame = window.requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      if (!dragging && !reducedMotion) {
        root.rotation.y += mode === "gateway" ? 0.0007 : 0.00035;
        root.rotation.y += velocityX * 0.94;
        root.rotation.x = THREE.MathUtils.clamp(root.rotation.x + velocityY * 0.94, -0.65, 0.65);
        velocityX *= 0.91;
        velocityY *= 0.91;
        stars.rotation.y -= 0.00008;
      }

      for (const [id, mesh] of meshById.entries()) {
        const selected = selectedIdRef.current === id;
        const hovered = hoveredId === id;
        const pulse = 1 + (selected ? 0.22 : hovered ? 0.12 : 0.035) * Math.sin(elapsed * (selected ? 4.6 : 2.6));
        mesh.scale.setScalar(selected ? 1.45 * pulse : hovered ? 1.18 * pulse : pulse);
      }

      core.rotation.x = elapsed * 0.07;
      core.rotation.y = elapsed * 0.1;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      scene.traverse((object) => {
        const candidate = object as THREE.Mesh;
        candidate.geometry?.dispose?.();
        const material = candidate.material;
        if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
        else material?.dispose?.();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [mode, nodes, onSelect]);

  return <div ref={mountRef} style={{ width: "100%", height: "100%", minHeight: 320 }} aria-hidden="true" />;
}
