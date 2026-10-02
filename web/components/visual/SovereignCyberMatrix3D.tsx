"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import styles from "./sovereign-cyber-matrix.module.css";

/** A conceptual evidence workflow. This artwork never represents live telemetry. */
export function SovereignCyberMatrix3D() {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = hostRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!host || reduced.matches || window.innerWidth < 768) return;
    let renderer: InstanceType<typeof THREE.WebGLRenderer>;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" }); }
    catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, .1, 40);
    camera.position.set(0, 0, 9);
    const group = new THREE.Group();
    scene.add(group);
    const geometry = new THREE.IcosahedronGeometry(.82, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xa8c7b6, wireframe: true, transparent: true, opacity: .55 });
    const nodes = [-2.15, 0, 2.15].map((x) => {
      const node = new THREE.Mesh(geometry, material);
      node.position.set(x, x === 0 ? .48 : -.3, 0);
      group.add(node);
      return node;
    });
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(nodes.map(node => node.position));
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x627e6e, transparent: true, opacity: .8 });
    group.add(new THREE.Line(lineGeometry, lineMaterial));
    const resize = () => {
      const width = host.clientWidth, height = Math.max(host.clientHeight, 1);
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(host);
    let visible = true, frame = 0;
    const render = (time: number) => {
      frame = 0;
      if (document.hidden || !visible) return;
      nodes.forEach((node, index) => { node.rotation.y = time * .00008 + index; node.rotation.z = .2; });
      renderer.render(scene, camera);
      if (!reduced.matches) frame = requestAnimationFrame(render);
    };
    const resume = () => { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(render); };
    const visibilityObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; resume(); });
    visibilityObserver.observe(host);
    document.addEventListener("visibilitychange", resume);
    reduced.addEventListener("change", resume);
    resume();
    return () => {
      cancelAnimationFrame(frame);
      visibilityObserver.disconnect(); sizeObserver.disconnect();
      document.removeEventListener("visibilitychange", resume); reduced.removeEventListener("change", resume);
      geometry.dispose(); material.dispose(); lineGeometry.dispose(); lineMaterial.dispose();
      renderer.dispose(); renderer.domElement.remove();
    };
  }, []);
  return <div className={styles.identity}>
    <div className={styles.brand}>disha<span>6.6</span></div>
    <p className={styles.eyebrow}>Evidence operations</p>
    <h2>From public signals<br />to supported decisions.</h2>
    <p className={styles.description}>Query sources, trace claims, and review the evidence behind every mission.</p>
    <div ref={hostRef} className={styles.art} aria-hidden="true" />
    <ol className={styles.workflow} aria-label="Evidence workflow">
      <li><span>01</span><strong>Observe</strong><p>Collect from public sources.</p></li>
      <li><span>02</span><strong>Verify</strong><p>Preserve origin and uncertainty.</p></li>
      <li><span>03</span><strong>Decide</strong><p>Review before taking action.</p></li>
    </ol>
    <p className={styles.caption}>Engineered in India. Built for accountable analysis.</p>
  </div>;
}
