"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  Flame,
  GitCompare,
  Layers,
  Lock,
  Compass,
  Activity,
  Terminal,
  Cpu,
  UserCheck,
} from "lucide-react";
import styles from "./disha-shell-nav.module.css";

const NAV_ITEMS = [
  { href: "/workbench", label: "Mission Command", icon: Terminal },
  { href: "/intelligence", label: "Intelligence", icon: Compass },
  { href: "/surveillance", label: "Surveillance / Geo", icon: Activity },
  { href: "/dashboard", label: "Command Ops", icon: Layers },
  { href: "/cyber-defense", label: "Cyber Defense", icon: ShieldAlert },
  { href: "/contradictions", label: "Contradictions", icon: Flame },
  { href: "/corroboration", label: "Corroboration", icon: GitCompare },
  { href: "/vault", label: "Evidence Vault", icon: Lock },
  { href: "/system", label: "Control Plane", icon: Cpu },
  { href: "/account", label: "Audit & Access", icon: UserCheck },
];

export function DishaShellNav() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={styles.brandGroup}>
        <div className={styles.brandBadge}>
          <span className={styles.pulseDot} />
          <span className={styles.brandTitle}>DISHA 6.6</span>
        </div>
        <span className={styles.brandSub}>Constitutional Intelligence OS</span>
      </div>

      <nav className={styles.navRail} aria-label="Main Navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.securityMeta}>
        <span className={styles.secTag}>GOVERNED RUNTIME</span>
      </div>
    </header>
  );
}
