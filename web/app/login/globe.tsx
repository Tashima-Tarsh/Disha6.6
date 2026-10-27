"use client";

import { useEffect, useRef, useCallback, useState } from "react";

const BG = "#100E0B";
const DOT_COLOR = "#A8A29A";
const DOT_COLOR_REAR = "#4A443E";
const ARC_HEAD = "#F97316";
const ARC_STROKE = "#F97316";
const GRATICULE = "#2E2921";

interface Vec3 { x: number; y: number; z: number; }

function latLonToVec(lat: number, lon: number, r: number): Vec3 {
  const phi = (lat * Math.PI) / 180;
  const theta = (lon * Math.PI) / 180;
  return {
    x: r * Math.cos(phi) * Math.sin(theta),
    y: r * Math.sin(phi),
    z: r * Math.cos(phi) * Math.cos(theta),
  };
}

function project(v: Vec3, cx: number, cy: number, scale: number, cameraZ: number): { x: number; y: number; scale: number } | null {
  const fov = 400;
  const factor = fov / (fov + v.z + cameraZ);
  if (factor <= 0) return null;
  return { x: cx + v.x * factor * scale, y: cy - v.y * factor * scale, scale: factor };
}

export default function Globe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [mounted, setMounted] = useState(false);
  const stateRef = useRef({
    dots: [] as Vec3[],
    dotScreen: [] as { x: number; y: number; scale: number; depth: number }[],
    arcs: [] as { p1: Vec3; p2: Vec3; progress: number; head: Vec3 }[],
    angle: 0,
    dotScreenLen: 0,
  });

  const resize = useCallback(() => {
    const canvas = canvasRef.current!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.parentElement?.getBoundingClientRect() ?? { width: 640, height: 480 };
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const st = stateRef.current;

    const dotCount = 2000;
    st.dots = [];
    for (let i = 0; i < dotCount; i++) {
      const lat = -90 + Math.random() * 180;
      const lon = Math.random() * 360;
      const r = 180;
      const warp = Math.sin(lat * 0.06) * 8 + Math.cos(lon * 0.05) * 6 + Math.sin(lon * 0.12) * 4;
      const isLand = Math.abs(lat) < 75 && Math.abs(warp) > 4;
      const v = latLonToVec(lat, lon, r + (isLand ? 2 : 0));
      st.dots.push(v);
    }

    st.arcs = [];
    const arcCount = 6;
    for (let i = 0; i < arcCount; i++) {
      const a = latLonToVec(-20 + Math.random() * 60, Math.random() * 360, 185);
      const b = latLonToVec(-20 + Math.random() * 60, Math.random() * 360, 185);
      st.arcs.push({ p1: a, p2: b, progress: Math.random(), head: { x: 0, y: 0, z: 0 } });
    }

    let cameraZ = 0;
    let angle = st.angle;
    let lastTime = 0;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hidden = () => document.hidden === true;

    function frame(t: number) {
      if (hidden()) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }
      const dt = lastTime ? t - lastTime : 16;
      lastTime = t;

      const width = canvas.width;
      const height = canvas.height;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const drawW = width / dpr;
      const drawH = height / dpr;
      const cx = drawW / 2;
      const cy = drawH / 2;
      const scale = Math.min(drawW, drawH) * 0.42;

      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, drawW, drawH);

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(drawW, drawH) * 0.7);
      grad.addColorStop(0, "rgba(249, 115, 22, 0.06)");
      grad.addColorStop(1, "rgba(249, 115, 22, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, drawW, drawH);

      if (!prefersReduced) {
        angle += 0.00018 * dt;
        cameraZ = Math.sin(angle * 0.5) * 12;
      }
      st.angle = angle;

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      st.dotScreen = [];
      for (const v of st.dots) {
        const x = v.x * cosA + v.z * sinA;
        const z = -v.x * sinA + v.z * cosA;
        const y = v.y;
        const depth = z + cameraZ;
        if (depth > 180) continue;
        const p = project({ x, y, z: depth }, cx, cy, scale, cameraZ);
        if (p) {
          st.dotScreen.push({ x: p.x, y: p.y, scale: p.scale, depth });
        }
      }

      st.dotScreen.sort((a, b) => b.depth - a.depth);
      for (const d of st.dotScreen) {
        const alpha = 0.55 + 0.35 * (1 - d.depth / 360);
        const size = Math.max(0.6, 1.4 * d.scale);
        ctx.fillStyle = d.depth > 100 ? DOT_COLOR_REAR : DOT_COLOR;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(d.x, d.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.strokeStyle = GRATICULE;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 0.6;
      for (const lat of [-60, -30, 0, 30, 60]) {
        const points: { x: number; y: number }[] = [];
        for (let lon = 0; lon <= 360; lon += 6) {
          const v = latLonToVec(lat, lon, 180);
          const x = v.x * cosA + v.z * sinA;
          const z = -v.x * sinA + v.z * cosA;
          if (z + cameraZ > 180) continue;
          const p = project({ x, y: v.y, z: z + cameraZ }, cx, cy, scale, cameraZ);
          if (p) points.push({ x: p.x, y: p.y });
        }
        if (points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      if (!prefersReduced) {
        for (const arc of st.arcs) {
          arc.progress += 0.0012 * dt;
          if (arc.progress > 1) arc.progress = 0;
          const t = arc.progress;
          const p1 = arc.p1;
          const p2 = arc.p2;
          const x = p1.x + (p2.x - p1.x) * t + Math.sin(t * Math.PI) * 40;
          const y = p1.y + (p2.y - p1.y) * t + Math.sin(t * Math.PI) * 20;
          const z = p1.z + (p2.z - p1.z) * t;
          const depth = z + cameraZ;
          if (depth > 180) continue;
          const p = project({ x, y, z: depth }, cx, cy, scale, cameraZ);
          if (!p) continue;
          ctx.strokeStyle = ARC_STROKE;
          ctx.globalAlpha = 0.55;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - Math.sin(t * Math.PI) * 2, p.y - Math.cos(t * Math.PI) * 2);
          ctx.stroke();
          ctx.fillStyle = ARC_HEAD;
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.2 * p.scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      ctx.restore();
      rafRef.current = requestAnimationFrame(frame);
    }

    resize();
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mounted, resize]);

  return <canvas ref={canvasRef} className="block w-full h-full" aria-hidden="true" />;
}
