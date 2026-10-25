"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface QuantumCoreSceneProps {
  activeMode?: "healing" | "osint" | "research" | "evidence";
}

export function QuantumCoreScene({ activeMode = "healing" }: QuantumCoreSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef({ r: 0, g: 0.94, b: 1 });

  // Update target color based on active mode
  useEffect(() => {
    switch (activeMode) {
      case "healing": // Emerald green
        colorRef.current = { r: 0.06, g: 0.72, b: 0.5 };
        break;
      case "osint": // Cyan blue
        colorRef.current = { r: 0, g: 0.94, b: 1 };
        break;
      case "research": // Violet purple
        colorRef.current = { r: 0.66, g: 0.33, b: 0.97 };
        break;
      case "evidence": // Saffron gold
        colorRef.current = { r: 0.96, g: 0.62, b: 0.04 };
        break;
    }
  }, [activeMode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 320;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 4.2;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    // Outer Torus Ring
    const torus1Geo = new THREE.TorusGeometry(1.2, 0.02, 16, 100);
    const torus1Mat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.7 });
    const torus1 = new THREE.Mesh(torus1Geo, torus1Mat);
    group.add(torus1);

    // Middle Torus Ring
    const torus2Geo = new THREE.TorusGeometry(0.9, 0.025, 16, 100);
    const torus2Mat = new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.7 });
    const torus2 = new THREE.Mesh(torus2Geo, torus2Mat);
    torus2.rotation.x = Math.PI / 2;
    group.add(torus2);

    // Inner Torus Ring
    const torus3Geo = new THREE.TorusGeometry(0.6, 0.03, 16, 100);
    const torus3Mat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.8 });
    const torus3 = new THREE.Mesh(torus3Geo, torus3Mat);
    torus3.rotation.y = Math.PI / 3;
    group.add(torus3);

    // Central Dodecahedron Core
    const coreGeo = new THREE.DodecahedronGeometry(0.38, 0);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      torus1.rotation.x = t * 0.8;
      torus1.rotation.y = t * 0.5;

      torus2.rotation.y = t * 0.7;
      torus2.rotation.z = t * 0.4;

      torus3.rotation.x = -t * 0.9;
      torus3.rotation.z = -t * 0.6;

      core.rotation.x = t * 1.2;
      core.rotation.y = t * 1.5;

      // Color transition
      const targetC = new THREE.Color(colorRef.current.r, colorRef.current.g, colorRef.current.b);
      torus1Mat.color.lerp(targetC, 0.08);
      torus3Mat.color.lerp(targetC, 0.08);

      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);

      torus1Geo.dispose();
      torus1Mat.dispose();
      torus2Geo.dispose();
      torus2Mat.dispose();
      torus3Geo.dispose();
      torus3Mat.dispose();
      coreGeo.dispose();
      coreMat.dispose();

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[260px] flex items-center justify-center select-none"
    />
  );
}

