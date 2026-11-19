"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { getVyuhaFormation, VYUHA_FORMATIONS, type VyuhaGeometry } from "./formation-catalog";

export type VyuhaCameraView = "orbit" | "overhead" | "side";

type Props = {
  formationId?: string;
  view?: VyuhaCameraView;
  paused?: boolean;
  ambient?: boolean;
};

const TAU = Math.PI * 2;
const NODE_COUNT = 144;

function positionFor(shape: VyuhaGeometry, index: number): THREE.Vector3 {
  const t = index / NODE_COUNT;
  const ring = index % 4;
  const theta = (Math.floor(index / 4) / (NODE_COUNT / 4)) * TAU + ring * 0.24;

  switch (shape) {
    case "chakra": {
      const radius = 0.82 + ring * 0.57;
      return new THREE.Vector3(radius * Math.cos(theta), (ring - 1.5) * 0.22, radius * Math.sin(theta));
    }
    case "padma": {
      const a = t * TAU * 3;
      const radius = 1.25 + 0.7 * Math.cos(8 * a) + ring * 0.075;
      return new THREE.Vector3(radius * Math.cos(a), Math.sin(8 * a) * 0.34, radius * Math.sin(a));
    }
    case "garuda": {
      const wing = index % 2 === 0 ? -1 : 1;
      const p = Math.floor(index / 2) / (NODE_COUNT / 2 - 1);
      return new THREE.Vector3(wing * (0.45 + 3.45 * p), Math.sin(p * Math.PI) * 1.24 - p * 0.5, 1.25 - p * 2.65 + Math.sin(p * 7 * Math.PI) * 0.14);
    }
    case "surya": {
      const ray = index % 18;
      const distance = 0.38 + Math.floor(index / 18) * 0.35;
      const a = (ray / 18) * TAU;
      return new THREE.Vector3(Math.cos(a) * distance, Math.sin(distance * 3 + a) * 0.26, Math.sin(a) * distance);
    }
    case "nakshatra": {
      const y = 1 - 2 * (index + 0.5) / NODE_COUNT;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      const angle = index * Math.PI * (3 - Math.sqrt(5));
      return new THREE.Vector3(2.35 * radius * Math.cos(angle), 2.35 * y, 2.35 * radius * Math.sin(angle));
    }
    case "sarvatobhadra": {
      const face = index % 6;
      const u = ((Math.floor(index / 6) % 6) / 5 - 0.5) * 4.4;
      const v = ((Math.floor(index / 36) % 4) / 3 - 0.5) * 4.4;
      if (face === 0) return new THREE.Vector3(2.2, u, v);
      if (face === 1) return new THREE.Vector3(-2.2, u, v);
      if (face === 2) return new THREE.Vector3(u, 2.2, v);
      if (face === 3) return new THREE.Vector3(u, -2.2, v);
      if (face === 4) return new THREE.Vector3(u, v, 2.2);
      return new THREE.Vector3(u, v, -2.2);
    }
    case "nyaya": {
      const row = Math.floor(index / 12);
      const column = index % 12;
      const side = column < 6 ? -1 : 1;
      return new THREE.Vector3(side * (0.4 + (column % 6) * 0.4), -1.65 + row * 0.31, side * 0.44 + Math.sin(row * 0.8) * 0.12);
    }
    case "setu": {
      const bridge = index % 2 === 0 ? -1 : 1;
      const p = Math.floor(index / 2) / (NODE_COUNT / 2 - 1);
      const x = (p - 0.5) * 5.7;
      return new THREE.Vector3(x, 1.35 * Math.sin(p * Math.PI) - 0.5, bridge * (0.85 + 0.22 * Math.sin(p * TAU * 3)));
    }
  }
}

function addLine(group: THREE.Group, points: THREE.Vector3[], color: THREE.Color, opacity = 0.4) {
  if (points.length < 2) return;
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  group.add(new THREE.Line(geometry, material));
}

function drawFormation(group: THREE.Group, id: string) {
  const formation = getVyuhaFormation(id);
  const color = new THREE.Color(formation.color);
  const nodes = Array.from({ length: NODE_COUNT }, (_, i) => positionFor(formation.geometry, i));

  const pointGeometry = new THREE.BufferGeometry().setFromPoints(nodes);
  group.add(new THREE.Points(pointGeometry, new THREE.PointsMaterial({
    color, size: 0.105, transparent: true, opacity: 0.97, sizeAttenuation: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })));

  const connections: number[] = [];
  for (let i = 0; i < nodes.length; i++) {
    if (i % 3 === 0) connections.push(0, 0, 0, nodes[i].x, nodes[i].y, nodes[i].z);
    if (i + 4 < nodes.length) {
      const a = nodes[i];
      const b = nodes[i + 4];
      connections.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  const wire = new THREE.BufferGeometry();
  wire.setAttribute("position", new THREE.Float32BufferAttribute(connections, 3));
  group.add(new THREE.LineSegments(wire, new THREE.LineBasicMaterial({
    color, transparent: true, opacity: 0.27, blending: THREE.AdditiveBlending, depthWrite: false,
  })));

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.32, 2),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.3, transparent: true, opacity: 0.84, wireframe: true }),
  );
  group.add(core);

  if (formation.geometry === "chakra" || formation.geometry === "padma" || formation.geometry === "surya") {
    for (let layer = 0; layer < 3; layer++) {
      const radius = 0.95 + layer * 0.7;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.014, 5, 128),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.34 + layer * 0.04, blending: THREE.AdditiveBlending }),
      );
      ring.rotation.x = Math.PI / 2 + layer * 0.16;
      group.add(ring);
    }
  } else if (formation.geometry === "nakshatra") {
    for (const axis of [0, 1, 2]) {
      const orbit = new THREE.Mesh(
        new THREE.TorusGeometry(2.45, 0.012, 5, 136),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.31 }),
      );
      orbit.rotation.set(axis === 0 ? Math.PI / 2 : 0, axis === 1 ? Math.PI / 2 : 0, axis === 2 ? Math.PI / 2 : 0);
      group.add(orbit);
    }
  } else if (formation.geometry === "sarvatobhadra") {
    const cube = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(4.4, 4.4, 4.4)),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.67 }),
    );
    group.add(cube);
  } else if (formation.geometry === "garuda") {
    addLine(group, [new THREE.Vector3(-3.9, -0.5, -1.4), new THREE.Vector3(0, 0.1, 0.5), new THREE.Vector3(3.9, -0.5, -1.4)], color, 0.85);
  } else if (formation.geometry === "nyaya") {
    addLine(group, [new THREE.Vector3(-2.6, 2.35, 0), new THREE.Vector3(2.6, 2.35, 0)], color, 0.75);
  } else if (formation.geometry === "setu") {
    addLine(group, nodes.filter((_, i) => i % 2 === 0), color, 0.76);
    addLine(group, nodes.filter((_, i) => i % 2 === 1), color, 0.76);
  }
}

function disposeGroup(group: THREE.Group) {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Points || child instanceof THREE.Line || child instanceof THREE.LineSegments) {
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) material.dispose();
    }
  });
  group.clear();
}

type Runtime = {
  select: (id: string) => void;
  setView: (view: VyuhaCameraView) => void;
  setPaused: (value: boolean) => void;
};

export function VyuhaCanvas({ formationId = "chakra_vyuha", view = "orbit", paused = false, ambient = false }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      setFallback(true);
      return;
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030917, 0.026);
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);
    camera.position.set(0, 5.5, 8.5);
    scene.add(new THREE.AmbientLight(0xc6d9ff, 0.95));
    const keyLight = new THREE.PointLight(0x7ca9ff, 40, 18);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const stage = new THREE.Group();
    scene.add(stage);
    const floor = new THREE.GridHelper(45, 60, 0x265276, 0x12263c);
    floor.position.y = -2.45;
    const floorMaterial = floor.material;
    if (!Array.isArray(floorMaterial)) {
      floorMaterial.transparent = true;
      floorMaterial.opacity = 0.28;
    }
    scene.add(floor);

    let seed = 239;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const stars: number[] = [];
    for (let i = 0; i < 900; i++) {
      stars.push((random() - 0.5) * 95, (random() - 0.5) * 55, (random() - 0.5) * 95);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(stars, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0x9dc2f7, transparent: true, opacity: 0.7, size: 0.065, depthWrite: false });
    scene.add(new THREE.Points(starGeometry, starMaterial));

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setClearColor(0x030917, 1);
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = ambient ? "auto" : "pan-y";
    mount.appendChild(renderer.domElement);

    let selectedId = formationId;
    let currentView = view;
    let isPaused = paused;
    let pointerHeld = false;
    let manualYaw = 0;
    let manualPitch = 0;
    let previousX = 0;
    let previousY = 0;
    let startTime = performance.now();
    let lastSwap = startTime;
    let currentIndex = Math.max(0, VYUHA_FORMATIONS.findIndex((f) => f.id === formationId));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function select(id: string) {
      if (getVyuhaFormation(id).id === selectedId && stage.children.length) return;
      selectedId = getVyuhaFormation(id).id;
      currentIndex = Math.max(0, VYUHA_FORMATIONS.findIndex((f) => f.id === selectedId));
      disposeGroup(stage);
      drawFormation(stage, selectedId);
      lastSwap = performance.now();
    }
    select(formationId);

    const onLost = (event: Event) => {
      event.preventDefault();
      isPaused = true;
      setFallback(true);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (ambient) return;
      pointerHeld = true;
      previousX = event.clientX;
      previousY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!pointerHeld) return;
      manualYaw += (event.clientX - previousX) * 0.005;
      manualPitch = THREE.MathUtils.clamp(manualPitch + (event.clientY - previousY) * 0.003, -0.7, 0.7);
      previousX = event.clientX;
      previousY = event.clientY;
    };
    const onPointerUp = () => { pointerHeld = false; };
    const canvas = renderer.domElement;
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    let frame = 0;
    let lastFrame = startTime;
    function animate(now: number) {
      frame = requestAnimationFrame(animate);
      if (document.hidden || isPaused) return;
      if (now - lastFrame < 1000 / (ambient ? 30 : 45) && !reducedMotion) return;
      const dt = Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;

      if (ambient && !reducedMotion && now - lastSwap > 11000) {
        currentIndex = (currentIndex + 1) % VYUHA_FORMATIONS.length;
        select(VYUHA_FORMATIONS[currentIndex].id);
      }

      const elapsed = reducedMotion ? 0 : (now - startTime) / 1000;
      stage.rotation.y += reducedMotion ? 0 : dt * 0.19;
      stage.rotation.z = reducedMotion ? 0 : Math.sin(elapsed * 0.23) * 0.075;
      const cameraTarget = new THREE.Vector3();
      if (currentView === "overhead") cameraTarget.set(0.03, 10.3, 0.04);
      else if (currentView === "side") cameraTarget.set(9.3, 1.2, 0.02);
      else cameraTarget.set(Math.sin(elapsed * 0.16 + manualYaw) * 8.2, 3.4 + manualPitch * 3, Math.cos(elapsed * 0.16 + manualYaw) * 8.2);
      camera.position.lerp(cameraTarget, reducedMotion ? 1 : 0.045);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    }
    frame = requestAnimationFrame(animate);

    runtimeRef.current = {
      select,
      setView: (next) => { currentView = next; },
      setPaused: (value) => { isPaused = value; },
    };

    return () => {
      runtimeRef.current = null;
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      disposeGroup(stage);
      floor.geometry.dispose();
      if (Array.isArray(floorMaterial)) floorMaterial.forEach((mat) => mat.dispose());
      else floorMaterial.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      keyLight.dispose();
      renderer.dispose();
      if (canvas.parentNode === mount) mount.removeChild(canvas);
    };
  }, [ambient]);

  useEffect(() => { runtimeRef.current?.select(formationId); }, [formationId]);
  useEffect(() => { runtimeRef.current?.setView(view); }, [view]);
  useEffect(() => { runtimeRef.current?.setPaused(paused); }, [paused]);

  return (
    <div ref={mountRef} className="absolute inset-0 overflow-hidden bg-[#030917]">
      {fallback && (
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,#173553_0%,#030917_72%)] text-center">
          <p className="max-w-xs px-5 text-xs tracking-[0.18em] text-cyan-100/70">
            VYUHA VISUALIZATION — GRAPHICS UNAVAILABLE. THE DEFENSE CATALOG REMAINS ACCESSIBLE.
          </p>
        </div>
      )}
    </div>
  );
}
