"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import styles from "./disha-3d-globe.module.css";

interface Disha3DHologramGlobeProps {
  size?: number;
  className?: string;
  interactive?: boolean;
}

export function Disha3DHologramGlobe({
  size = 280,
  className = "",
  interactive = true,
}: Disha3DHologramGlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL availability
    try {
      const testCanvas = document.createElement("canvas");
      const gl = testCanvas.getContext("webgl") || testCanvas.getContext("experimental-webgl");
      if (!gl) {
        const timer = window.setTimeout(() => setHasWebGL(false), 0);
        return () => window.clearTimeout(timer);
      }
    } catch {
      const timer = window.setTimeout(() => setHasWebGL(false), 0);
      return () => window.clearTimeout(timer);
    }

    // 1. Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.z = 4.2;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // 2. Core Globe - Translucent White-Glass Sphere with subtle wireframe
    const globeGeometry = new THREE.SphereGeometry(1.4, 36, 36);
    const globeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.22,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.85,
      ior: 1.45,
      reflectivity: 0.8,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const globeMesh = new THREE.Mesh(globeGeometry, globeMaterial);
    scene.add(globeMesh);

    // Wireframe grid cage
    const wireframeGeometry = new THREE.WireframeGeometry(new THREE.SphereGeometry(1.42, 24, 24));
    const wireframeMaterial = new THREE.LineBasicMaterial({
      color: 0x246bfd,
      transparent: true,
      opacity: 0.18,
    });
    const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
    scene.add(wireframe);

    // 3. Central Ashoka Blue Luminous Core
    const coreGeometry = new THREE.SphereGeometry(0.65, 24, 24);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x174ea6,
      transparent: true,
      opacity: 0.35,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(coreMesh);

    // 4. Prismatic Orbital Rings (Tiranga + Rainbow Refraction)
    const ringGroup = new THREE.Group();

    // Saffron Ring
    const ringGeo1 = new THREE.TorusGeometry(1.9, 0.016, 16, 100);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0xff9933, transparent: true, opacity: 0.75 });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 3;
    ring1.rotation.y = Math.PI / 8;
    ringGroup.add(ring1);

    // India Green Ring
    const ringGeo2 = new THREE.TorusGeometry(2.1, 0.014, 16, 100);
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x138f55, transparent: true, opacity: 0.7 });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = -Math.PI / 4;
    ring2.rotation.y = Math.PI / 6;
    ringGroup.add(ring2);

    // Cyan/Violet Prismatic Ring
    const ringGeo3 = new THREE.TorusGeometry(2.3, 0.012, 16, 100);
    const ringMat3 = new THREE.MeshBasicMaterial({ color: 0x18c9f2, transparent: true, opacity: 0.65 });
    const ring3 = new THREE.Mesh(ringGeo3, ringMat3);
    ring3.rotation.x = Math.PI / 6;
    ring3.rotation.z = Math.PI / 4;
    ringGroup.add(ring3);

    scene.add(ringGroup);

    // 5. Floating Particle Cloud
    const particleCount = 70;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const colorPalette = [
      new THREE.Color(0xff9933), // Saffron
      new THREE.Color(0x246bfd), // Primary Blue
      new THREE.Color(0x138f55), // Green
      new THREE.Color(0x8861ff), // Violet
      new THREE.Color(0x18c9f2), // Cyan
    ];

    for (let i = 0; i < particleCount; i++) {
      const radius = 1.5 + Math.random() * 0.9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = radius * Math.cos(phi);

      const color = colorPalette[i % colorPalette.length];
      particleColors[i * 3] = color.r;
      particleColors[i * 3 + 1] = color.g;
      particleColors[i * 3 + 2] = color.b;
    }

    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // 6. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xff9933, 1.2);
    dirLight1.position.set(3, 4, 3);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x18c9f2, 1.0);
    dirLight2.position.set(-3, -2, -3);
    scene.add(dirLight2);

    // 7. Mouse interaction & parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      mouseX = x * 2;
      mouseY = y * 2;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // 8. Animation Loop
    let animationFrameId: number;
    let isVisible = true;

    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    });
    observer.observe(container);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isVisible) return;

      // Globe rotation
      globeMesh.rotation.y += 0.004;
      wireframe.rotation.y += 0.004;
      coreMesh.rotation.y -= 0.003;

      // Rings rotation
      ring1.rotation.z += 0.005;
      ring2.rotation.z -= 0.004;
      ring3.rotation.y += 0.003;

      // Particles gentle orbit
      particles.rotation.y += 0.002;
      particles.rotation.x += 0.001;

      // Smooth parallax damping
      targetRotationY += (mouseX * 0.4 - targetRotationY) * 0.05;
      targetRotationX += (mouseY * 0.4 - targetRotationX) * 0.05;

      scene.rotation.y = targetRotationY;
      scene.rotation.x = targetRotationX;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      observer.disconnect();
      cancelAnimationFrame(animationFrameId);

      // Clean disposal
      globeGeometry.dispose();
      globeMaterial.dispose();
      wireframeGeometry.dispose();
      wireframeMaterial.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      ringGeo3.dispose();
      ringMat3.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [size, interactive]);

  return (
    <div
      className={`${styles.globeWrapper} ${className}`}
      style={{ width: size, height: size }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={styles.prismaticGlow} style={{ transform: isHovered ? "scale(1.08)" : "scale(1)" }} />
      <div ref={mountRef} className={styles.canvasContainer} />
      {!hasWebGL && (
        <div className={styles.fallbackGlobe} aria-label="3D Globe Representation">
          <div className={styles.fallbackRing1} />
          <div className={styles.fallbackRing2} />
          <div className={styles.fallbackCore} />
        </div>
      )}
    </div>
  );
}
