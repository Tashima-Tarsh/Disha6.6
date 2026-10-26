"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export function CyberGlobeScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check WebGL availability
    try {
      const testCanvas = document.createElement("canvas");
      const gl = testCanvas.getContext("webgl") || testCanvas.getContext("experimental-webgl");
      if (!gl) {
        const timer = window.setTimeout(() => setWebglSupported(false), 0);
        return () => window.clearTimeout(timer);
      }
    } catch {
      const timer = window.setTimeout(() => setWebglSupported(false), 0);
      return () => window.clearTimeout(timer);
    }

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 600;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 5.2;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 2. Master Rotational Group
    const masterGroup = new THREE.Group();
    scene.add(masterGroup);

    // 3. Central Wireframe Cyber Sphere
    const sphereGeo = new THREE.IcosahedronGeometry(1.65, 3);
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    });
    const sphereMesh = new THREE.Mesh(sphereGeo, wireframeMat);
    masterGroup.add(sphereMesh);

    // 4. Inner Glowing Geometric Core
    const innerGeo = new THREE.OctahedronGeometry(1.0, 1);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    masterGroup.add(innerMesh);

    // 5. Equatorial and Polar Orbital Rings
    const ringMat1 = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.6,
    });
    const ringMat2 = new THREE.LineBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.4,
    });

    const ringGeo1 = new THREE.RingGeometry(2.1, 2.12, 64);
    const ring1 = new THREE.Line(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 2.3;
    masterGroup.add(ring1);

    const ringGeo2 = new THREE.RingGeometry(2.35, 2.37, 64);
    const ring2 = new THREE.Line(ringGeo2, ringMat2);
    ring2.rotation.y = Math.PI / 3;
    masterGroup.add(ring2);

    // 6. Particle Field (1,200 Stars & Data Packets)
    const particleCount = 1200;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const colorCyan = new THREE.Color(0x00f0ff);
    const colorViolet = new THREE.Color(0xa855f7);
    const colorGreen = new THREE.Color(0x10b981);

    for (let i = 0; i < particleCount; i++) {
      // Distribute in a spherical cloud around the core
      const radius = 1.9 + Math.random() * 2.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      particlePositions[i * 3] = x;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = z;

      // Color variation
      const rand = Math.random();
      const c = rand < 0.6 ? colorCyan : rand < 0.85 ? colorViolet : colorGreen;
      particleColors[i * 3] = c.r;
      particleColors[i * 3 + 1] = c.g;
      particleColors[i * 3 + 2] = c.b;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });

    const particleSystem = new THREE.Points(particleGeo, particleMat);
    masterGroup.add(particleSystem);

    // 7. Tactical Beacon Nodes on the Surface
    const beaconGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const beaconGroup = new THREE.Group();

    for (let i = 0; i < 16; i++) {
      const lat = (Math.random() - 0.5) * Math.PI;
      const lon = Math.random() * Math.PI * 2;
      const r = 1.66;
      const bx = r * Math.cos(lat) * Math.cos(lon);
      const by = r * Math.sin(lat);
      const bz = r * Math.cos(lat) * Math.sin(lon);

      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(bx, by, bz);
      beaconGroup.add(beacon);
    }
    masterGroup.add(beaconGroup);

    // 8. Interactive Mouse Movement Tracking
    let targetRotationX = 0;
    let targetRotationY = 0;
    let mouseX = 0;
    let mouseY = 0;

    const onPointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotationY = mouseX * 0.45;
      targetRotationX = -mouseY * 0.35;
    };

    window.addEventListener("pointermove", onPointerMove);

    // 9. Resize Handling
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // 10. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Constant ambient rotation
      sphereMesh.rotation.y = elapsedTime * 0.12;
      sphereMesh.rotation.x = Math.sin(elapsedTime * 0.08) * 0.15;

      innerMesh.rotation.y = -elapsedTime * 0.22;
      innerMesh.rotation.z = Math.cos(elapsedTime * 0.15) * 0.2;

      ring1.rotation.z = elapsedTime * 0.09;
      ring2.rotation.x = -elapsedTime * 0.07;

      particleSystem.rotation.y = elapsedTime * 0.04;
      beaconGroup.rotation.y = elapsedTime * 0.12;
      beaconGroup.rotation.x = Math.sin(elapsedTime * 0.08) * 0.15;

      // Smooth lerp to mouse position
      masterGroup.rotation.y += (targetRotationY - masterGroup.rotation.y) * 0.05;
      masterGroup.rotation.x += (targetRotationX - masterGroup.rotation.x) * 0.05;

      // Subtle pulse on inner core
      const scale = 1.0 + Math.sin(elapsedTime * 2.0) * 0.05;
      innerMesh.scale.set(scale, scale, scale);

      renderer.render(scene, camera);
    };

    animate();

    // 11. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", handleResize);

      // Dispose geometries & materials
      sphereGeo.dispose();
      wireframeMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      ringGeo1.dispose();
      ringGeo2.dispose();
      ringMat1.dispose();
      ringMat2.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      beaconGeo.dispose();
      beaconMat.dispose();

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (!webglSupported) {
    return (
      <div className="w-full h-full flex items-center justify-center relative">
        <div className="w-72 h-72 rounded-full border border-cyan-500/30 bg-gradient-to-tr from-cyan-500/10 via-purple-500/10 to-transparent animate-pulse flex items-center justify-center">
          <div className="w-48 h-48 rounded-full border border-purple-500/40 animate-spin flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-cyan-400/20 blur-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[460px] md:min-h-[580px] flex items-center justify-center relative select-none pointer-events-auto cursor-grab active:cursor-grabbing"
      aria-label="Interactive 3D Cybernetic Threat Intelligence Globe"
    />
  );
}

