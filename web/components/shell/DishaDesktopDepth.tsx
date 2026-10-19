"use client";

import type { CSSProperties, PointerEvent } from "react";
import styles from "./disha-desktop-depth.module.css";

/** A CSS 3D paper sculpture: no canvas, network assets or animation loop. */
export function DishaDesktopDepth() {
  function tilt(event: PointerEvent<HTMLDivElement>) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    event.currentTarget.style.setProperty("--depth-x", `${-18 - y * 8}deg`);
    event.currentTarget.style.setProperty("--depth-y", `${-28 + x * 12}deg`);
  }

  function reset(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.style.removeProperty("--depth-x");
    event.currentTarget.style.removeProperty("--depth-y");
  }

  return <div className={styles.stage} onPointerMove={tilt} onPointerLeave={reset} aria-hidden="true">
    <div className={styles.sculpture}>
      {[0, 1, 2, 3, 4].map(layer => <div key={layer} className={styles.sheet} style={{ "--layer": layer } as CSSProperties} />)}
      <div className={styles.cover}><span>d.</span><small>DISHA / 6.6</small></div>
      <div className={styles.edge} />
    </div>
    <div className={styles.shadow} />
  </div>;
}
