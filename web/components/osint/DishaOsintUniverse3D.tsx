"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { SOURCE_CATEGORIES, type Investigation } from "@/lib/investigation/types";
import styles from "@/app/investigate/investigate.module.css";
type VisualNode = { id: string; label: string; position: [number, number, number]; color: number; scale: number; evidenceId?: string };
const statusColor = (status: string) => status === "COMPLETED" ? 0x72d9c7 : status === "RUNNING" ? 0xe7b671 : ["FAILED", "BLOCKED", "RESTRICTED"].includes(status) ? 0xba686d : 0x667b99;
function orbit(index: number, count: number, radius: number, height = 0): [number, number, number] { const angle = index / Math.max(1, count) * Math.PI * 2; return [Math.cos(angle) * radius, height, Math.sin(angle) * radius]; }
function disposeGroup(group: THREE.Group) {
  group.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points || object instanceof THREE.Sprite) {
      if ("geometry" in object) object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) { if ("map" in material && material.map instanceof THREE.Texture) material.map.dispose(); material.dispose(); }
    }
  });
  group.clear();
}
export function DishaOsintUniverse3D({ investigation, onSelect }: { investigation: Investigation | null; onSelect: (id: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const graph = useRef<THREE.Group | null>(null);
  const selection = useRef(onSelect);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => { selection.current = onSelect; }, [onSelect]);
  const nodes = useMemo<VisualNode[]>(() => {
    const categories: VisualNode[] = SOURCE_CATEGORIES.map((label, index) => ({ id: `category-${label}`, label: label.toUpperCase(), position: orbit(index, 10, 8.8, -0.9), color: 0x40597c, scale: 0.08 }));
    if (!investigation) return categories;
    const target: VisualNode = { id: investigation.investigationId, label: investigation.normalizedTarget, position: [0, 0, 0], color: 0xe7b671, scale: 0.4 };
    const candidates = investigation.candidateClusters.map((candidate, index): VisualNode => ({ id: candidate.candidateId, label: `${candidate.label} · POSSIBLE`, position: orbit(index, investigation.candidateClusters.length, 2.5, 0.6), color: 0xbc9ce3, scale: 0.16, evidenceId: candidate.evidenceIds[0] }));
    const evidence = investigation.evidence.slice(0, 250).map((record, index): VisualNode => ({ id: record.evidenceId, label: index < 18 ? record.summary.slice(0, 55) : "", position: orbit(index, Math.min(250, investigation.evidence.length), 4.3 + index % 3 * 0.45, (index % 5 - 2) * 0.35), color: 0x72d9c7, scale: 0.1, evidenceId: record.evidenceId }));
    const sources = investigation.runs.map((run, index): VisualNode => ({ id: run.adapterId, label: `${run.sourceName} · ${run.status.replaceAll("_", " ")}`, position: orbit(index, investigation.runs.length, 6.8, 0), color: statusColor(run.status), scale: 0.2 }));
    return [target, ...candidates, ...evidence, ...sources, ...categories];
  }, [investigation]);
  useEffect(() => {
    const host = container.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" }); }
    catch {
      const fallback = requestAnimationFrame(() => setUnavailable(true));
      return () => cancelAnimationFrame(fallback);
    }
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 100);
    camera.position.set(0, 11.5, 16.5);
    const group = new THREE.Group();
    graph.current = group;
    scene.add(group, new THREE.AmbientLight(0xb4c6e1, 2.5));
    const light = new THREE.PointLight(0x76becb, 90, 30);
    light.position.set(2, 6, 5); scene.add(light);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x060b14, 0);
    host.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-label", "3D investigation universe. Drag to rotate, scroll to zoom. Evidence is also available in the results list.");
    renderer.domElement.setAttribute("role", "img");
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.07; controls.enablePan = false; controls.minDistance = 5; controls.maxDistance = 28;
    controls.maxPolarAngle = Math.PI * 0.8;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    controls.autoRotate = !reduced.matches; controls.autoRotateSpeed = 0.16;
    const motion = () => { controls.autoRotate = !reduced.matches; };
    reduced.addEventListener("change", motion);
    const resize = () => { const width = host.clientWidth; const height = Math.max(1, host.clientHeight); renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    const ray = new THREE.Raycaster();
    let down = [0, 0];
    const pointerDown = (event: PointerEvent) => { down = [event.clientX, event.clientY]; };
    const pointerUp = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 6) return;
      const rect = host.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
      const hit = ray.intersectObjects(group.children).find(item => item.object instanceof THREE.InstancedMesh);
      if (hit && hit.instanceId !== undefined) {
        const index: unknown = hit.object.userData.evidenceIds;
        const id: unknown = Array.isArray(index) ? index[hit.instanceId] : undefined;
        if (typeof id === "string") selection.current(id);
      }
    };
    let frame = 0;
    const animate = () => { if (!document.hidden) { controls.update(); renderer.render(scene, camera); } frame = requestAnimationFrame(animate); };
    const lost = (event: Event) => { event.preventDefault(); setUnavailable(true); };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    renderer.domElement.addEventListener("webglcontextlost", lost);
    animate();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); reduced.removeEventListener("change", motion);
      renderer.domElement.removeEventListener("pointerdown", pointerDown); renderer.domElement.removeEventListener("pointerup", pointerUp); renderer.domElement.removeEventListener("webglcontextlost", lost);
      controls.dispose(); disposeGroup(group); graph.current = null; renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    };
  }, []);
  useEffect(() => {
    const group = graph.current;
    if (!group) return;
    disposeGroup(group);
    const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.45 }), nodes.length);
    const object = new THREE.Object3D();
    const positions = new Map<string, THREE.Vector3>();
    mesh.userData.evidenceIds = nodes.map(node => node.evidenceId);
    nodes.forEach((node, index) => {
      object.position.set(...node.position); object.scale.setScalar(node.scale); object.updateMatrix();
      mesh.setMatrixAt(index, object.matrix); mesh.setColorAt(index, new THREE.Color(node.color)); positions.set(node.id, new THREE.Vector3(...node.position));
      if (!node.label) return;
      const canvas = document.createElement("canvas"); canvas.width = 768; canvas.height = 64;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.font = "22px sans-serif"; context.fillStyle = `#${node.color.toString(16).padStart(6, "0")}`; context.textAlign = "center";
      context.fillText(node.label.slice(0, 64), 384, 36);
      const material = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false, depthTest: false });
      const sprite = new THREE.Sprite(material); sprite.position.set(node.position[0], node.position[1] + 0.42, node.position[2]); sprite.scale.set(3.8, 0.32, 1); group.add(sprite);
    });
    group.add(mesh);
    // Rings communicate layout only. Intelligence edges come exclusively from backend evidence.
    for (const radius of investigation ? [2.5, 4.7, 6.8, 8.8] : [8.8]) {
      const points = Array.from({ length: 129 }, (_, index) => new THREE.Vector3(...orbit(index, 128, radius, -0.9)));
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0x25354d, transparent: true, opacity: 0.55 })));
    }
    const edgePoints: THREE.Vector3[] = [];
    for (const edge of investigation?.edges ?? []) {
      const a = positions.get(edge.sourceId); const b = positions.get(edge.targetId);
      if (a && b && investigation?.evidence.some(item => item.evidenceId === edge.evidenceId)) edgePoints.push(a, b);
    }
    if (edgePoints.length) group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(edgePoints), new THREE.LineBasicMaterial({ color: 0x619795, transparent: true, opacity: 0.28 })));
  }, [nodes, investigation]);
  return <div className={styles.universe} ref={container}>{unavailable && <p className={styles.webglNotice}>3D rendering is unavailable. Search and evidence results remain available below.</p>}</div>;
}
