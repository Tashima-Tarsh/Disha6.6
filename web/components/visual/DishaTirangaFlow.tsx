"use client";

import React from "react";
import styles from "./disha-tiranga-flow.module.css";

interface DishaTirangaFlowProps {
  className?: string;
  variant?: "ribbon" | "header" | "glow" | "edge";
}

export function DishaTirangaFlow({ className = "", variant = "header" }: DishaTirangaFlowProps) {
  return (
    <div className={`${styles.tirangaContainer} ${styles[variant]} ${className}`} aria-hidden="true">
      <div className={styles.saffronTrail} />
      <div className={styles.whiteTrail} />
      <div className={styles.greenTrail} />
      <div className={styles.chakraGlow} />
    </div>
  );
}
