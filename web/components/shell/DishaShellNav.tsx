"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Brain,
  Cpu,
  Flame,
  GitCompare,
  Lock,
  LogOut,
  Search,
  Shield,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import styles from "./disha-shell-nav.module.css";

const NAV_ITEMS = [
  { href: "/investigate", label: "Unified Investigation", icon: Search },
  { href: "/investigate/osint-runtime", label: "OSINT Tools", icon: Wrench },
  { href: "/intelligence", label: "Intelligence", icon: Brain },
  { href: "/cyber-defense", label: "Cyber Defense", icon: ShieldAlert },
  { href: "/surveillance", label: "Surveillance / Geo", icon: Activity },
  { href: "/corroboration", label: "Corroboration", icon: GitCompare },
  { href: "/contradictions", label: "Contradictions", icon: Flame },
  { href: "/vault", label: "Evidence Vault", icon: Lock },
  { href: "/system", label: "System", icon: Cpu },
];

export function DishaShellNav() {
  const pathname = usePathname();

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <header className={styles.header}>
      <div className={styles.brandGroup}>
        <div className={styles.brandBadge}>
          <span className={styles.brandTitle}>DISHA 6.6</span>
        </div>
        <span className={styles.brandSub}>Evidence workspace</span>
      </div>

      <nav className={styles.navRail} aria-label="Main Navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/investigate" && pathname?.startsWith(`${item.href}`));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
            >
              <Icon size={14} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.securityMeta}>
        <span className={styles.secTag}>Authenticated</span>
        <button onClick={handleLogout} className={styles.logoutBtn} title="Sign Out">
          <LogOut size={13} />
        </button>
      </div>
    </header>
  );
}

export default DishaShellNav;
